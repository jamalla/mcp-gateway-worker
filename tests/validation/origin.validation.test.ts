import { afterEach, describe, expect, it, vi } from "vitest";

import app from "../../src/index";

describe("origin validation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("enforces allowlist only when Origin header is present for REST and MCP", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ result: { value: 3 } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    const env = {
      AUTH_MODE: "static-token" as const,
      CLIENT_AUTH_TOKEN: "replace-me",
      CLIENT_ALLOWED_SCOPES: "math:sum",
      ALLOWED_ORIGINS: "https://allowed.example"
    };

    const restAllowed = await app.request("/tools/sum/call", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer replace-me",
        origin: "https://allowed.example"
      },
      body: JSON.stringify({ arguments: { a: 1, b: 2 } })
    }, env);

    expect(restAllowed.status).toBe(200);

    const restBlocked = await app.request("/tools/sum/call", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer replace-me",
        origin: "https://blocked.example"
      },
      body: JSON.stringify({ arguments: { a: 1, b: 2 } })
    }, env);

    expect(restBlocked.status).toBe(403);
    const restBlockedBody = (await restBlocked.json()) as { error: { error_code: string } };
    expect(restBlockedBody.error.error_code).toBe("FORBIDDEN");

    const restNoOrigin = await app.request("/tools/sum/call", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer replace-me"
      },
      body: JSON.stringify({ arguments: { a: 1, b: 2 } })
    }, env);

    expect(restNoOrigin.status).toBe(200);

    const mcpAllowed = await app.request("/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer replace-me",
        origin: "https://allowed.example"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "mcp-origin-allowed",
        method: "tools/list",
        params: {}
      })
    }, env);

    expect(mcpAllowed.status).toBe(200);
    const mcpAllowedBody = (await mcpAllowed.json()) as { result?: unknown; error?: unknown };
    expect(mcpAllowedBody.result).toBeDefined();
    expect(mcpAllowedBody.error).toBeUndefined();

    const mcpBlocked = await app.request("/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer replace-me",
        origin: "https://blocked.example"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "mcp-origin-blocked",
        method: "tools/list",
        params: {}
      })
    }, env);

    expect(mcpBlocked.status).toBe(200);
    const mcpBlockedBody = (await mcpBlocked.json()) as {
      error: { data: { error_code: string } };
    };
    expect(mcpBlockedBody.error.data.error_code).toBe("FORBIDDEN");

    const mcpNoOrigin = await app.request("/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer replace-me"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "mcp-origin-none",
        method: "tools/list",
        params: {}
      })
    }, env);

    expect(mcpNoOrigin.status).toBe(200);
    const mcpNoOriginBody = (await mcpNoOrigin.json()) as { result?: unknown; error?: unknown };
    expect(mcpNoOriginBody.result).toBeDefined();
    expect(mcpNoOriginBody.error).toBeUndefined();
  });
});
