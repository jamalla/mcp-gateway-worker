import { describe, expect, it } from "vitest";

import app from "../../src/index";

describe("MCP tools/list contract", () => {
  it("returns JSON-RPC success envelope with all 4 tools", async () => {
    const response = await app.request("/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer replace-me"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "req-1",
        method: "tools/list",
        params: {}
      })
    }, {
      AUTH_MODE: "static-token",
      CLIENT_AUTH_TOKEN: "replace-me",
      CLIENT_ALLOWED_SCOPES: "greetings:read,customers:read,math:sum,text:normalize"
    });

    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      jsonrpc: string;
      id: string;
      result: {
        request_id: string;
        tools: Array<{ name: string }>;
      };
    };

    expect(body.jsonrpc).toBe("2.0");
    expect(body.id).toBe("req-1");
    expect(body.result.request_id).toEqual(expect.any(String));

    const toolNames = body.result.tools.map((tool) => tool.name).sort();
    expect(toolNames).toEqual(["hello", "list-top-customers", "normalize-text", "sum"]);
  });
});
