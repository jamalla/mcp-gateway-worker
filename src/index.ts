import { Hono } from "hono";
import { z } from "zod";

import { extractRequestContext, type GatewayRequestContext } from "./context";
import { validateStaticClientAuth } from "./auth";
import { mapZodErrorToValidationError, toCanonicalError, toJsonRpcErrorResponse, toRestErrorResponseBody } from "./errors";
import { getToolByName, listTools } from "./registry";
import { checkOriginAllowed, getMissingScopes } from "./security";
import { invokeToolUpstream } from "./upstream";
import {
  createJsonRpcSuccessEnvelope,
  JsonRpcRequestSchema,
  McpToolsCallResultSchema,
  McpToolsListResultSchema,
  RestToolCallSuccessSchema,
  ToolCallBodySchema,
  ToolsCallParamsSchema,
  ToolsListResponseSchema,
  type GatewayEnv,
  type JsonRpcId
} from "./types";

type Bindings = {
  ENVIRONMENT: string;
  DOMAIN_A_URL?: string;
  DOMAIN_B_URL?: string;
  ALLOWED_ORIGINS?: string;
  AUTH_MODE?: "static-token" | "none";
  CLIENT_AUTH_TOKEN?: string;
  CLIENT_ALLOWED_SCOPES?: string;
  DOMAIN_SHARED_SECRET?: string;
  UPSTREAM_TIMEOUT_MS?: number;
  REQUEST_BODY_MAX_BYTES?: number;
  TOOL_ARGUMENT_MAX_BYTES?: number;
};

type Variables = {
  requestContext: GatewayRequestContext;
  trustedScopes: string[];
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", async (context, next) => {
  const requestContext = extractRequestContext(context.req.raw.headers);
  context.set("requestContext", requestContext);

  const toolName = context.req.param("name") ?? null;
  const endpoint = context.req.path;

  console.info(
    JSON.stringify({
      request_id: requestContext.request_id,
      endpoint,
      tool_name: toolName,
      domain: null,
      status: "start",
      outcome: "request_received"
    })
  );

  await next();

  console.info(
    JSON.stringify({
      request_id: requestContext.request_id,
      endpoint,
      tool_name: toolName,
      domain: null,
      status: context.res.status,
      outcome: context.res.ok ? "success" : "error"
    })
  );
});

app.use("/tools", async (context, next) => {
  const authResult = validateStaticClientAuth(context.req.raw.headers, resolveEnv(context.env), context.get("requestContext").request_id);
  if (!authResult.ok) {
    context.status(authResult.error.httpStatus as 400 | 401 | 403 | 404 | 422 | 502);
    return context.json(toRestErrorResponseBody(authResult.error));
  }

  context.set("trustedScopes", authResult.scopes);
  await next();
});

app.use("/tools/:name/call", async (context, next) => {
  const requestContext = context.get("requestContext");
  const originResult = checkOriginAllowed(context.req.header("origin"), resolveEnv(context.env).ALLOWED_ORIGINS);
  if (!originResult.allowed) {
    const error = toCanonicalError({
      errorCode: "FORBIDDEN",
      requestId: requestContext.request_id,
      message: "Origin is not allowed"
    });
    context.status(error.httpStatus as 400 | 401 | 403 | 404 | 422 | 502);
    return context.json(toRestErrorResponseBody(error));
  }

  await next();
});

app.use("/tools/:name/call", async (context, next) => {
  const authResult = validateStaticClientAuth(context.req.raw.headers, resolveEnv(context.env), context.get("requestContext").request_id);
  if (!authResult.ok) {
    context.status(authResult.error.httpStatus as 400 | 401 | 403 | 404 | 422 | 502);
    return context.json(toRestErrorResponseBody(authResult.error));
  }

  context.set("trustedScopes", authResult.scopes);
  await next();
});

app.use("/mcp", async (context, next) => {
  const requestContext = context.get("requestContext");
  const originResult = checkOriginAllowed(context.req.header("origin"), resolveEnv(context.env).ALLOWED_ORIGINS);
  if (!originResult.allowed) {
    const error = toCanonicalError({
      errorCode: "FORBIDDEN",
      requestId: requestContext.request_id,
      message: "Origin is not allowed"
    });
    return context.json(toJsonRpcErrorResponse(error, null), 200);
  }

  const authResult = validateStaticClientAuth(context.req.raw.headers, resolveEnv(context.env), context.get("requestContext").request_id);
  if (!authResult.ok) {
    return context.json(toJsonRpcErrorResponse(authResult.error, null), 200);
  }

  context.set("trustedScopes", authResult.scopes);
  await next();
});

app.get("/", (context) => {
  const requestContext = context.get("requestContext");
  return context.json({
    status: "scaffolded",
    service: "mcp-gateway-worker",
    request_id: requestContext.request_id,
    environment: context.env.ENVIRONMENT ?? "unknown"
  });
});

app.get("/health", (context) => {
  const env = resolveEnv(context.env);
  return context.json({
    status: "ok",
    environment: env.ENVIRONMENT
  }, 200);
});

app.get("/tools", (context) => {
  const requestContext = context.get("requestContext");

  const payload = {
    tools: listTools().map((tool) => ({
      name: tool.name,
      domain: tool.domain,
      required_scopes: tool.requiredScopes
    }))
  };

  const parsed = ToolsListResponseSchema.safeParse(payload);
  if (!parsed.success) {
    const error = mapZodErrorToValidationError(parsed.error, requestContext.request_id);
    context.status(error.httpStatus as 400 | 401 | 403 | 404 | 422 | 502);
    return context.json(toRestErrorResponseBody(error));
  }

  return context.json(parsed.data, 200);
});

app.post("/mcp", async (context) => {
  const requestContext = context.get("requestContext");
  const trustedScopes = context.get("trustedScopes") ?? [];

  let rawPayload: unknown;
  try {
    rawPayload = await context.req.json();
  } catch {
    const error = toCanonicalError({
      errorCode: "VALIDATION_ERROR",
      requestId: requestContext.request_id,
      message: "Invalid JSON body"
    });
    return context.json(toJsonRpcErrorResponse(error, null), 200);
  }

  const parsedRequest = JsonRpcRequestSchema.safeParse(rawPayload);
  if (!parsedRequest.success) {
    const id = extractJsonRpcId(rawPayload);
    const error = mapZodErrorToValidationError(parsedRequest.error, requestContext.request_id);
    return context.json(toJsonRpcErrorResponse(error, id), 200);
  }

  if (parsedRequest.data.method === "tools/list") {
    const resultPayload = {
      request_id: requestContext.request_id,
      tools: listTools().map((tool) => ({
        name: tool.name,
        domain: tool.domain,
        required_scopes: tool.requiredScopes
      }))
    };

    const result = McpToolsListResultSchema.safeParse(resultPayload);
    if (!result.success) {
      const error = mapZodErrorToValidationError(result.error, requestContext.request_id);
      return context.json(toJsonRpcErrorResponse(error, parsedRequest.data.id), 200);
    }

    return context.json(createJsonRpcSuccessEnvelope(parsedRequest.data.id, result.data), 200);
  }

  if (parsedRequest.data.method === "tools/call") {
    const params = ToolsCallParamsSchema.safeParse(parsedRequest.data.params);
    if (!params.success) {
      const error = mapZodErrorToValidationError(params.error, requestContext.request_id);
      return context.json(toJsonRpcErrorResponse(error, parsedRequest.data.id), 200);
    }

    const tool = getToolByName(params.data.name);
    if (!tool) {
      const error = toCanonicalError({
        errorCode: "TOOL_NOT_FOUND",
        requestId: requestContext.request_id,
        details: { tool_name: params.data.name }
      });
      return context.json(toJsonRpcErrorResponse(error, parsedRequest.data.id), 200);
    }

    const missingScopes = getMissingScopes(tool.requiredScopes, trustedScopes);
    if (missingScopes.length > 0) {
      const error = toCanonicalError({
        errorCode: "SCOPE_MISSING",
        requestId: requestContext.request_id,
        details: { missing_scopes: missingScopes }
      });
      return context.json(toJsonRpcErrorResponse(error, parsedRequest.data.id), 200);
    }

    const validatedArguments = tool.inputSchema.safeParse(params.data.arguments);
    if (!validatedArguments.success) {
      const error = mapZodErrorToValidationError(validatedArguments.error, requestContext.request_id);
      return context.json(toJsonRpcErrorResponse(error, parsedRequest.data.id), 200);
    }

    const propagatedContext = {
      ...requestContext,
      scopes: trustedScopes
    };

    const upstreamResponse = await invokeToolUpstream(resolveEnv(context.env), {
      domain: tool.domain,
      toolName: tool.name,
      argumentsPayload: validatedArguments.data,
      context: propagatedContext
    });

    if (!upstreamResponse.ok) {
      return context.json(toJsonRpcErrorResponse(upstreamResponse.error, parsedRequest.data.id), 200);
    }

    const resultPayload = McpToolsCallResultSchema.parse({
      request_id: requestContext.request_id,
      output: upstreamResponse.data.result
    });

    return context.json(createJsonRpcSuccessEnvelope(parsedRequest.data.id, resultPayload), 200);
  }

  const methodNotSupported = toCanonicalError({
    errorCode: "METHOD_NOT_SUPPORTED",
    requestId: requestContext.request_id
  });
  return context.json(toJsonRpcErrorResponse(methodNotSupported, parsedRequest.data.id), 200);
});

app.post("/tools/:name/call", async (context) => {
  const requestContext = context.get("requestContext");
  const trustedScopes = context.get("trustedScopes") ?? [];

  let rawBody: unknown;
  try {
    rawBody = await context.req.json();
  } catch {
    const error = toCanonicalError({
      errorCode: "VALIDATION_ERROR",
      requestId: requestContext.request_id,
      message: "Invalid JSON body"
    });
    context.status(error.httpStatus as 400 | 401 | 403 | 404 | 422 | 502);
    return context.json(toRestErrorResponseBody(error));
  }

  const parsedBody = ToolCallBodySchema.safeParse(rawBody);
  if (!parsedBody.success) {
    const error = mapZodErrorToValidationError(parsedBody.error, requestContext.request_id);
    context.status(error.httpStatus as 400 | 401 | 403 | 404 | 422 | 502);
    return context.json(toRestErrorResponseBody(error));
  }

  const toolName = context.req.param("name");
  const tool = getToolByName(toolName);
  if (!tool) {
    const error = toCanonicalError({
      errorCode: "TOOL_NOT_FOUND",
      requestId: requestContext.request_id,
      details: { tool_name: toolName }
    });
    context.status(error.httpStatus as 400 | 401 | 403 | 404 | 422 | 502);
    return context.json(toRestErrorResponseBody(error));
  }

  const missingScopes = getMissingScopes(tool.requiredScopes, trustedScopes);
  if (missingScopes.length > 0) {
    const error = toCanonicalError({
      errorCode: "SCOPE_MISSING",
      requestId: requestContext.request_id,
      details: { missing_scopes: missingScopes }
    });
    context.status(error.httpStatus as 400 | 401 | 403 | 404 | 422 | 502);
    return context.json(toRestErrorResponseBody(error));
  }

  const validatedArguments = tool.inputSchema.safeParse(parsedBody.data.arguments);
  if (!validatedArguments.success) {
    const error = mapZodErrorToValidationError(validatedArguments.error, requestContext.request_id);
    context.status(error.httpStatus as 400 | 401 | 403 | 404 | 422 | 502);
    return context.json(toRestErrorResponseBody(error));
  }

  const propagatedContext = {
    ...requestContext,
    scopes: trustedScopes
  };

  const upstreamResponse = await invokeToolUpstream(resolveEnv(context.env), {
    domain: tool.domain,
    toolName: tool.name,
    argumentsPayload: validatedArguments.data,
    context: propagatedContext
  });

  if (!upstreamResponse.ok) {
    context.status(upstreamResponse.error.httpStatus as 400 | 401 | 403 | 404 | 422 | 502);
    return context.json(toRestErrorResponseBody(upstreamResponse.error));
  }

  const payload = RestToolCallSuccessSchema.parse({
    request_id: requestContext.request_id,
    result: upstreamResponse.data.result
  });
  return context.json(payload, 200);
});

function extractJsonRpcId(payload: unknown): JsonRpcId {
  if (!payload || typeof payload !== "object" || !("id" in payload)) {
    return null;
  }

  const id = (payload as { id?: unknown }).id;
  if (typeof id === "string" || typeof id === "number" || id === null) {
    return id;
  }

  return null;
}

function resolveEnv(bindings: Partial<Bindings>): GatewayEnv {
  const parsed = z
    .object({
      ENVIRONMENT: z.string().default("local"),
      DOMAIN_A_URL: z.string().default("http://127.0.0.1:8788"),
      DOMAIN_B_URL: z.string().default("http://127.0.0.1:8789"),
      ALLOWED_ORIGINS: z.string().default(""),
      AUTH_MODE: z.enum(["static-token", "none"]).default("static-token"),
      CLIENT_AUTH_TOKEN: z.string().default("replace-me"),
      CLIENT_ALLOWED_SCOPES: z.string().default("greetings:read,customers:read,math:sum,text:normalize"),
      DOMAIN_SHARED_SECRET: z.string().default("local-secret"),
      UPSTREAM_TIMEOUT_MS: z.number().int().positive().optional(),
      REQUEST_BODY_MAX_BYTES: z.number().int().positive().optional(),
      TOOL_ARGUMENT_MAX_BYTES: z.number().int().positive().optional()
    })
    .parse(bindings);

  return parsed as GatewayEnv;
}

export default app;
