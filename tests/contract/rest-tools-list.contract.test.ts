import { describe, expect, it } from "vitest";

import app from "../../src/index";

describe("REST /tools contract", () => {
  it("returns unified catalog and matches MCP tools/list names", async () => {
    const restResponse = await app.request("/tools", {
      method: "GET",
      headers: {
        authorization: "Bearer replace-me"
      }
    }, {
      AUTH_MODE: "static-token",
      CLIENT_AUTH_TOKEN: "replace-me",
      CLIENT_ALLOWED_SCOPES: "greetings:read,customers:read,math:sum,text:normalize"
    });

    expect(restResponse.status).toBe(200);

    const restBody = (await restResponse.json()) as {
      tools: Array<{ name: string; domain: string; required_scopes: string[] }>;
    };

    const mcpResponse = await app.request("/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer replace-me"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "req-2",
        method: "tools/list",
        params: {}
      })
    }, {
      AUTH_MODE: "static-token",
      CLIENT_AUTH_TOKEN: "replace-me",
      CLIENT_ALLOWED_SCOPES: "greetings:read,customers:read,math:sum,text:normalize"
    });

    expect(mcpResponse.status).toBe(200);

    const mcpBody = (await mcpResponse.json()) as {
      result: {
        tools: Array<{ name: string; domain: string; required_scopes: string[] }>;
      };
    };

    const restNames = restBody.tools.map((tool) => tool.name).sort();
    const mcpNames = mcpBody.result.tools.map((tool) => tool.name).sort();

    expect(restNames).toEqual(["hello", "list-top-customers", "normalize-text", "sum"]);
    expect(restNames).toEqual(mcpNames);
  });
});
