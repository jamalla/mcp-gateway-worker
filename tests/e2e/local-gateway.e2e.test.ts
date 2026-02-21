import { describe, expect, it } from "vitest";

type ToolEntry = {
  name: string;
  domain: "domain-a" | "domain-b";
};

const gatewayBaseUrl = process.env.E2E_GATEWAY_BASE_URL;
const clientToken = process.env.E2E_CLIENT_TOKEN;
const runE2E = Boolean(gatewayBaseUrl && clientToken);

describe.skipIf(!runE2E)("local gateway e2e", () => {
  const authHeaders = {
    authorization: `Bearer ${clientToken as string}`,
    "content-type": "application/json"
  };

  it("verifies list, cross-domain calls, and canonical error paths", async () => {
    const toolsResponse = await fetch(`${gatewayBaseUrl as string}/tools`, {
      method: "GET",
      headers: authHeaders
    });

    expect(toolsResponse.status).toBe(200);
    const toolsBody = (await toolsResponse.json()) as { tools: ToolEntry[] };
    const names = toolsBody.tools.map((tool) => tool.name).sort();
    expect(names).toEqual(["hello", "list-top-customers", "normalize-text", "sum"]);

    const domains = new Set(toolsBody.tools.map((tool) => tool.domain));
    expect(domains.has("domain-a")).toBe(true);
    expect(domains.has("domain-b")).toBe(true);

    const helloResponse = await fetch(`${gatewayBaseUrl as string}/tools/hello/call`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ arguments: { name: "Copilot" } })
    });
    expect(helloResponse.status).toBe(200);

    const sumResponse = await fetch(`${gatewayBaseUrl as string}/tools/sum/call`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ arguments: { a: 4, b: 6 } })
    });
    expect(sumResponse.status).toBe(200);

    const unknownToolResponse = await fetch(`${gatewayBaseUrl as string}/tools/does-not-exist/call`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ arguments: {} })
    });

    expect(unknownToolResponse.status).toBe(404);
    const unknownBody = (await unknownToolResponse.json()) as { error: { error_code: string } };
    expect(unknownBody.error.error_code).toBe("TOOL_NOT_FOUND");
  });
});
