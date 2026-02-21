import { afterEach, describe, expect, it, vi } from "vitest";

import app from "../../src/index";

describe("context propagation validation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("forwards tenant_id, actor_id, scopes, and request_id to upstream", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ result: { value: 3 } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    await app.request("/tools/sum/call", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer replace-me",
        "x-tenant-id": "tenant-1",
        "x-actor-id": "actor-1"
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

    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(init.body)) as {
      context: {
        tenant_id: string;
        actor_id: string;
        scopes: string[];
        request_id: string;
      };
    };

    expect(body.context.tenant_id).toBe("tenant-1");
    expect(body.context.actor_id).toBe("actor-1");
    expect(body.context.scopes).toEqual(["math:sum"]);
    expect(body.context.request_id).toEqual(expect.any(String));
  });
});
