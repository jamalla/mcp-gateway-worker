import { afterEach, describe, expect, it, vi } from "vitest";

import app from "../../src/index";

describe("domain routing contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("routes hello and list-top-customers to Domain A", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ result: { ok: true } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    await app.request("/tools/hello/call", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer replace-me"
      },
      body: JSON.stringify({ arguments: { name: "Dev" } })
    }, {
      AUTH_MODE: "static-token",
      CLIENT_AUTH_TOKEN: "replace-me",
      CLIENT_ALLOWED_SCOPES: "greetings:read",
      DOMAIN_A_URL: "http://domain-a.local",
      DOMAIN_B_URL: "http://domain-b.local",
      DOMAIN_SHARED_SECRET: "shared-secret"
    });

    await app.request("/tools/list-top-customers/call", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer replace-me"
      },
      body: JSON.stringify({ arguments: { limit: 2 } })
    }, {
      AUTH_MODE: "static-token",
      CLIENT_AUTH_TOKEN: "replace-me",
      CLIENT_ALLOWED_SCOPES: "customers:read",
      DOMAIN_A_URL: "http://domain-a.local",
      DOMAIN_B_URL: "http://domain-b.local",
      DOMAIN_SHARED_SECRET: "shared-secret"
    });

    const calledUrls = fetchSpy.mock.calls.map((call) => String(call[0]));
    expect(calledUrls.some((url) => url.startsWith("http://domain-a.local/tools/hello/call"))).toBe(true);
    expect(calledUrls.some((url) => url.startsWith("http://domain-a.local/tools/list-top-customers/call"))).toBe(true);
  });

  it("routes sum and normalize-text to Domain B", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ result: { ok: true } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    await app.request("/tools/sum/call", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer replace-me"
      },
      body: JSON.stringify({ arguments: { a: 1, b: 2 } })
    }, {
      AUTH_MODE: "static-token",
      CLIENT_AUTH_TOKEN: "replace-me",
      CLIENT_ALLOWED_SCOPES: "math:sum",
      DOMAIN_A_URL: "http://domain-a.local",
      DOMAIN_B_URL: "http://domain-b.local",
      DOMAIN_SHARED_SECRET: "shared-secret"
    });

    await app.request("/tools/normalize-text/call", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer replace-me"
      },
      body: JSON.stringify({ arguments: { text: "  Hi  " } })
    }, {
      AUTH_MODE: "static-token",
      CLIENT_AUTH_TOKEN: "replace-me",
      CLIENT_ALLOWED_SCOPES: "text:normalize",
      DOMAIN_A_URL: "http://domain-a.local",
      DOMAIN_B_URL: "http://domain-b.local",
      DOMAIN_SHARED_SECRET: "shared-secret"
    });

    const calledUrls = fetchSpy.mock.calls.map((call) => String(call[0]));
    expect(calledUrls.some((url) => url.startsWith("http://domain-b.local/tools/sum/call"))).toBe(true);
    expect(calledUrls.some((url) => url.startsWith("http://domain-b.local/tools/normalize-text/call"))).toBe(true);
  });
});
