import { describe, expect, it } from "vitest";

import app from "../../src/index";

describe("scope validation", () => {
  it("returns SCOPE_MISSING with missing_scopes detail", async () => {
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
});
