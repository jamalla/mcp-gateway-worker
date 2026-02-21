import { afterEach, describe, expect, it, vi } from "vitest";

import app from "../../src/index";

describe("MCP error snapshots", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes upstream failures to canonical UPSTREAM_ERROR", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));

    const response = await app.request("/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer replace-me"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "upstream-1",
        method: "tools/call",
        params: {
          name: "sum",
          arguments: { a: 1, b: 2 }
        }
      })
    }, {
      AUTH_MODE: "static-token",
      CLIENT_AUTH_TOKEN: "replace-me",
      CLIENT_ALLOWED_SCOPES: "math:sum"
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body?.error?.code).toBe(-32020);
    expect(body?.error?.message).toBe("Upstream service failed");
    expect(body?.error?.data?.error_code).toBe("UPSTREAM_ERROR");
    expect(body?.error?.data?.request_id).toEqual(expect.any(String));
    expect({
      ...body,
      error: {
        ...body.error,
        data: {
          ...body.error.data,
          request_id: "<request_id>"
        }
      }
    }).toMatchSnapshot();
  });
});
