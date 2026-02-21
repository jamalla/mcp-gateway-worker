import { describe, expect, it } from "vitest";

import app from "../../src/index";

describe("unsupported MCP method validation", () => {
  it("returns canonical METHOD_NOT_SUPPORTED JSON-RPC error", async () => {
    const response = await app.request("/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer replace-me"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "x-1",
        method: "foo/bar",
        params: {}
      })
    }, {
      AUTH_MODE: "static-token",
      CLIENT_AUTH_TOKEN: "replace-me",
      CLIENT_ALLOWED_SCOPES: "math:sum"
    });

    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      jsonrpc: string;
      id: string;
      error: { data: { error_code: string; request_id: string } };
    };

    expect(body.jsonrpc).toBe("2.0");
    expect(body.id).toBe("x-1");
    expect(body.error.data.error_code).toBe("METHOD_NOT_SUPPORTED");
    expect(body.error.data.request_id).toEqual(expect.any(String));
  });
});
