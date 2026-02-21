import { describe, expect, it } from "vitest";

import app from "../../src/index";

describe("GET /health contract", () => {
  it("returns { status: \"ok\", environment }", async () => {
    const response = await app.request("/health", { method: "GET" }, {
      ENVIRONMENT: "local"
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { status: string; environment: string };
    expect(body).toEqual({
      status: "ok",
      environment: "local"
    });
  });
});
