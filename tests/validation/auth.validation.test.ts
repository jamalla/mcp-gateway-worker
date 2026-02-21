import { describe, expect, it } from "vitest";

import app from "../../src/index";

describe("static token auth validation", () => {
  it("rejects missing token", async () => {
    const response = await app.request("/tools", { method: "GET" }, {
      AUTH_MODE: "static-token",
      CLIENT_AUTH_TOKEN: "replace-me",
      CLIENT_ALLOWED_SCOPES: "math:sum"
    });

    expect(response.status).toBe(403);
    const body = (await response.json()) as { error: { error_code: string } };
    expect(body.error.error_code).toBe("FORBIDDEN");
  });

  it("rejects invalid token", async () => {
    const response = await app.request("/tools", {
      method: "GET",
      headers: {
        authorization: "Bearer bad-token"
      }
    }, {
      AUTH_MODE: "static-token",
      CLIENT_AUTH_TOKEN: "replace-me",
      CLIENT_ALLOWED_SCOPES: "math:sum"
    });

    expect(response.status).toBe(403);
    const body = (await response.json()) as { error: { error_code: string } };
    expect(body.error.error_code).toBe("FORBIDDEN");
  });

  it("allows valid token", async () => {
    const response = await app.request("/tools", {
      method: "GET",
      headers: {
        authorization: "Bearer replace-me"
      }
    }, {
      AUTH_MODE: "static-token",
      CLIENT_AUTH_TOKEN: "replace-me",
      CLIENT_ALLOWED_SCOPES: "math:sum"
    });

    expect(response.status).toBe(200);
  });
});
