import { afterEach, describe, expect, it, vi } from "vitest";

import app from "../../src/index";

describe("REST /tools/:name/call contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns success for valid scoped call", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          result: { value: 7 }
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      )
    );

    const response = await app.request("/tools/sum/call", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer replace-me"
      },
      body: JSON.stringify({ arguments: { a: 3, b: 4 } })
    }, {
      AUTH_MODE: "static-token",
      CLIENT_AUTH_TOKEN: "replace-me",
      CLIENT_ALLOWED_SCOPES: "math:sum"
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { request_id: string; result: { value: number } };
    expect(body.request_id).toEqual(expect.any(String));
    expect(body.result.value).toBe(7);
  });

  it("returns TOOL_NOT_FOUND for unknown tool", async () => {
    const response = await app.request("/tools/does-not-exist/call", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer replace-me"
      },
      body: JSON.stringify({ arguments: {} })
    }, {
      AUTH_MODE: "static-token",
      CLIENT_AUTH_TOKEN: "replace-me",
      CLIENT_ALLOWED_SCOPES: "math:sum"
    });

    expect(response.status).toBe(404);
    const body = (await response.json()) as { error: { error_code: string } };
    expect(body.error.error_code).toBe("TOOL_NOT_FOUND");
  });

  it("returns SCOPE_MISSING when required scope is absent", async () => {
    const response = await app.request("/tools/sum/call", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer replace-me"
      },
      body: JSON.stringify({ arguments: { a: 1, b: 2 } })
    }, {
      AUTH_MODE: "static-token",
      CLIENT_AUTH_TOKEN: "replace-me",
      CLIENT_ALLOWED_SCOPES: "customers:read"
    });

    expect(response.status).toBe(403);
    const body = (await response.json()) as { error: { error_code: string; details: { missing_scopes: string[] } } };
    expect(body.error.error_code).toBe("SCOPE_MISSING");
    expect(body.error.details.missing_scopes).toEqual(["math:sum"]);
  });

  it("returns VALIDATION_ERROR for malformed arguments", async () => {
    const response = await app.request("/tools/sum/call", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer replace-me"
      },
      body: JSON.stringify({ arguments: { a: "oops", b: 2 } })
    }, {
      AUTH_MODE: "static-token",
      CLIENT_AUTH_TOKEN: "replace-me",
      CLIENT_ALLOWED_SCOPES: "math:sum"
    });

    expect(response.status).toBe(422);
    const body = (await response.json()) as { error: { error_code: string } };
    expect(body.error.error_code).toBe("VALIDATION_ERROR");
  });

  it("returns UPSTREAM_ERROR when execution fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network failure"));

    const response = await app.request("/tools/sum/call", {
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

    expect(response.status).toBe(502);
    const body = (await response.json()) as { error: { error_code: string } };
    expect(body.error.error_code).toBe("UPSTREAM_ERROR");
  });

  it("returns FORBIDDEN for missing client token", async () => {
    const response = await app.request("/tools/sum/call", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ arguments: { a: 1, b: 2 } })
    }, {
      AUTH_MODE: "static-token",
      CLIENT_AUTH_TOKEN: "replace-me",
      CLIENT_ALLOWED_SCOPES: "math:sum"
    });

    expect(response.status).toBe(403);
    const body = (await response.json()) as { error: { error_code: string } };
    expect(body.error.error_code).toBe("FORBIDDEN");
  });
});
