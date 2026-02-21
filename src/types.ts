import { z } from "zod";

export const MAX_REQUEST_BODY_BYTES = 256 * 1024;
export const MAX_TOOL_ARGUMENT_BYTES = 64 * 1024;
export const DEFAULT_UPSTREAM_TIMEOUT_MS = 2_000;

export const AppErrorCodeSchema = z.enum([
	"TOOL_NOT_FOUND",
	"SCOPE_MISSING",
	"VALIDATION_ERROR",
	"UPSTREAM_ERROR",
	"FORBIDDEN",
	"METHOD_NOT_SUPPORTED",
	"UNAUTHORIZED"
]);

export type AppErrorCode = z.infer<typeof AppErrorCodeSchema>;

export const AuthModeSchema = z.enum(["static-token", "none"]);
export type AuthMode = z.infer<typeof AuthModeSchema>;

export const EnvSchema = z
	.object({
		ENVIRONMENT: z.string().min(1),
		DOMAIN_A_URL: z.string().url(),
		DOMAIN_B_URL: z.string().url(),
		ALLOWED_ORIGINS: z.string().optional().default(""),
		AUTH_MODE: AuthModeSchema.optional().default("static-token"),
		CLIENT_AUTH_TOKEN: z.string().optional(),
		CLIENT_ALLOWED_SCOPES: z.string().optional().default(""),
		DOMAIN_SHARED_SECRET: z.string().min(1),
		UPSTREAM_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
		REQUEST_BODY_MAX_BYTES: z.coerce.number().int().positive().optional(),
		TOOL_ARGUMENT_MAX_BYTES: z.coerce.number().int().positive().optional()
	})
	.superRefine((value, context) => {
		if (value.AUTH_MODE === "static-token" && !value.CLIENT_AUTH_TOKEN) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				message: "CLIENT_AUTH_TOKEN is required when AUTH_MODE=static-token",
				path: ["CLIENT_AUTH_TOKEN"]
			});
		}
	});

export type GatewayEnv = z.infer<typeof EnvSchema>;

export const RequestHeadersSchema = z.object({
	authorization: z.string().optional(),
	origin: z.string().optional(),
	"x-request-id": z.string().optional(),
	"x-tenant-id": z.string().optional(),
	"x-actor-id": z.string().optional(),
	"x-scopes": z.string().optional()
});

export type RequestHeadersShape = z.infer<typeof RequestHeadersSchema>;

export const JsonRpcIdSchema = z.union([z.string(), z.number().int(), z.null()]);
export type JsonRpcId = z.infer<typeof JsonRpcIdSchema>;

export const JsonRpcMethodSchema = z.string().min(1);
export type JsonRpcMethod = z.infer<typeof JsonRpcMethodSchema>;

export const ToolArgumentsSchema = z.record(z.string(), z.unknown()).or(z.object({}).passthrough());

export const ToolsCallParamsSchema = z.object({
	name: z.string().min(1),
	arguments: ToolArgumentsSchema
});

export const ToolsListParamsSchema = z.object({}).passthrough();

export const JsonRpcRequestSchema = z.object({
	jsonrpc: z.literal("2.0"),
	id: JsonRpcIdSchema,
	method: JsonRpcMethodSchema,
	params: z.record(z.string(), z.unknown())
});

export type JsonRpcRequest = z.infer<typeof JsonRpcRequestSchema>;

export const CanonicalErrorDataSchema = z.object({
	error_code: AppErrorCodeSchema,
	request_id: z.string().min(1),
	details: z.record(z.string(), z.unknown()).optional()
});

export type CanonicalErrorData = z.infer<typeof CanonicalErrorDataSchema>;

export const JsonRpcErrorEnvelopeSchema = z.object({
	jsonrpc: z.literal("2.0"),
	id: JsonRpcIdSchema,
	error: z.object({
		code: z.number().int(),
		message: z.string(),
		data: CanonicalErrorDataSchema
	})
});

export const JsonRpcSuccessEnvelopeSchema = z.object({
	jsonrpc: z.literal("2.0"),
	id: JsonRpcIdSchema,
	result: z.record(z.string(), z.unknown())
});

export function createJsonRpcSuccessEnvelope(id: JsonRpcId, result: Record<string, unknown>) {
	return JsonRpcSuccessEnvelopeSchema.parse({
		jsonrpc: "2.0",
		id,
		result
	});
}

export function createJsonRpcErrorEnvelope(
	id: JsonRpcId,
	error: {
		code: number;
		message: string;
		data: CanonicalErrorData;
	}
) {
	return JsonRpcErrorEnvelopeSchema.parse({
		jsonrpc: "2.0",
		id,
		error
	});
}

export function estimateJsonBytes(payload: unknown): number {
	const serialized = JSON.stringify(payload ?? null);
	return new TextEncoder().encode(serialized).length;
}

export function isWithinBytes(payload: unknown, maxBytes: number): boolean {
	return estimateJsonBytes(payload) <= maxBytes;
}

export const ToolCallBodySchema = z.object({
	arguments: ToolArgumentsSchema
});

export const ToolListItemSchema = z.object({
	name: z.string().min(1),
	domain: z.enum(["domain-a", "domain-b"]),
	required_scopes: z.array(z.string())
});

export const ToolsListResponseSchema = z.object({
	tools: z.array(ToolListItemSchema)
});

export const McpToolsListResultSchema = z.object({
	request_id: z.string().min(1),
	tools: z.array(ToolListItemSchema)
});

export const RestToolCallSuccessSchema = z.object({
	request_id: z.string().min(1),
	result: z.record(z.string(), z.unknown())
});

export const McpToolsCallResultSchema = z.object({
	request_id: z.string().min(1),
	output: z.record(z.string(), z.unknown())
});

export const UpstreamSuccessPayloadSchema = z.object({
	result: z.record(z.string(), z.unknown())
});

export type UpstreamSuccessPayload = z.infer<typeof UpstreamSuccessPayloadSchema>;

export function getRequestBodyByteLimit(env: Partial<GatewayEnv>): number {
	return env.REQUEST_BODY_MAX_BYTES ?? MAX_REQUEST_BODY_BYTES;
}

export function getToolArgumentByteLimit(env: Partial<GatewayEnv>): number {
	return env.TOOL_ARGUMENT_MAX_BYTES ?? MAX_TOOL_ARGUMENT_BYTES;
}

