import { describe, expect, it } from "vitest";

import app from "../../src/index";

describe("invalid tool validation", () => {
  it("returns stable TOOL_NOT_FOUND payload", async () => {
    const response = await app.request("/tools/not-a-tool/call", {
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

    const body = (await response.json()) as {
      request_id: string;
      error: { error_code: string };
    };

    expect(body.request_id).toEqual(expect.any(String));
    expect(body.error.error_code).toBe("TOOL_NOT_FOUND");
  });
});
