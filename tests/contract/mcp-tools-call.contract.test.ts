import { afterEach, describe, expect, it, vi } from "vitest";

import app from "../../src/index";

describe("MCP tools/call contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns JSON-RPC success with result and request_id for valid scoped call", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          result: { value: 12 }
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      )
    );

    const response = await app.request("/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer replace-me"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "call-1",
        method: "tools/call",
        params: {
          name: "sum",
          arguments: {
            a: 5,
            b: 7
          }
        }
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
      result: { request_id: string; output: { value: number } };
    };

    expect(body.jsonrpc).toBe("2.0");
    expect(body.id).toBe("call-1");
    expect(body.result.request_id).toEqual(expect.any(String));
    expect(body.result.output.value).toBe(12);
  });
});
