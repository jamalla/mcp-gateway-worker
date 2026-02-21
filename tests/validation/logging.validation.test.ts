import { afterEach, describe, expect, it, vi } from "vitest";

import app from "../../src/index";

describe("structured logging validation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs request and upstream success fields with request_id correlation", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ result: { value: 3 } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    const logSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);

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

    const parsedLogs = logSpy.mock.calls
      .map((call) => call[0])
      .filter((value) => typeof value === "string")
      .map((line) => JSON.parse(String(line)) as Record<string, unknown>);

    const withRequestId = parsedLogs.filter((line) => typeof line.request_id === "string");
    expect(withRequestId.length).toBeGreaterThan(0);

    const hasUpstreamSuccess = parsedLogs.some(
      (line) => line.outcome === "upstream_ok" && line.status === "success" && line.domain === "domain-b"
    );
    expect(hasUpstreamSuccess).toBe(true);
  });

  it("logs upstream error_code on failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    const logSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);

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
      CLIENT_ALLOWED_SCOPES: "math:sum"
    });

    const parsedLogs = logSpy.mock.calls
      .map((call) => call[0])
      .filter((value) => typeof value === "string")
      .map((line) => JSON.parse(String(line)) as Record<string, unknown>);

    const hasUpstreamError = parsedLogs.some(
      (line) => line.outcome === "upstream_exception" && line.error_code === "UPSTREAM_ERROR"
    );
    expect(hasUpstreamError).toBe(true);
  });
});
