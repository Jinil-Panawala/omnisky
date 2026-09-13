import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

describe("authenticateCronRequest", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env["LOVABLE_CRON_SECRET"];
    delete process.env["LOVABLE_CRON_SECRET_PREVIOUS"];
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns 500 when the cron secret is not configured", async () => {
    const request = new Request("http://localhost/api/public/ingest/aircraft", {
      headers: { authorization: "Bearer any-token" },
    });
    const response = await authenticateCronRequest(request);
    expect(response).not.toBeNull();
    expect(response!.status).toBe(500);
  });

  it("returns 401 when no authorization header is present", async () => {
    process.env["LOVABLE_CRON_SECRET"] = "current-secret";
    const request = new Request("http://localhost/api/public/ingest/aircraft");
    const response = await authenticateCronRequest(request);
    expect(response).not.toBeNull();
    expect(response!.status).toBe(401);
  });

  it("returns 401 when the bearer token does not match", async () => {
    process.env["LOVABLE_CRON_SECRET"] = "current-secret";
    const request = new Request("http://localhost/api/public/ingest/aircraft", {
      headers: { authorization: "Bearer wrong-token" },
    });
    const response = await authenticateCronRequest(request);
    expect(response).not.toBeNull();
    expect(response!.status).toBe(401);
  });

  it("allows the request when the bearer matches the current secret", async () => {
    process.env["LOVABLE_CRON_SECRET"] = "current-secret";
    const request = new Request("http://localhost/api/public/ingest/aircraft", {
      headers: { authorization: "Bearer current-secret" },
    });
    const response = await authenticateCronRequest(request);
    expect(response).toBeNull();
  });

  it("allows the request during a secret rollover using the previous secret", async () => {
    process.env["LOVABLE_CRON_SECRET"] = "new-secret";
    process.env["LOVABLE_CRON_SECRET_PREVIOUS"] = "old-secret";
    const request = new Request("http://localhost/api/public/ingest/aircraft", {
      headers: { authorization: "Bearer old-secret" },
    });
    const response = await authenticateCronRequest(request);
    expect(response).toBeNull();
  });
});

describe("authorizedIngest", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env["LOVABLE_CRON_SECRET"];
    delete process.env["SUPABASE_PUBLISHABLE_KEY"];
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("approves a valid cron bearer", async () => {
    process.env["LOVABLE_CRON_SECRET"] = "cron-secret";
    const { authorizedIngest } = await import("@/server/http/ingest-route.server");
    const request = new Request("http://localhost/api/public/ingest/aircraft", {
      headers: { authorization: "Bearer cron-secret" },
    });
    expect(await authorizedIngest(request)).toBe(true);
  });

  it("approves a valid publishable apikey header", async () => {
    process.env["SUPABASE_PUBLISHABLE_KEY"] = "publishable-key";
    const { authorizedIngest } = await import("@/server/http/ingest-route.server");
    const request = new Request("http://localhost/api/public/ingest/aircraft", {
      headers: { apikey: "publishable-key" },
    });
    expect(await authorizedIngest(request)).toBe(true);
  });

  it("approves a valid x-apikey header", async () => {
    process.env["SUPABASE_PUBLISHABLE_KEY"] = "publishable-key";
    const { authorizedIngest } = await import("@/server/http/ingest-route.server");
    const request = new Request("http://localhost/api/public/ingest/aircraft", {
      headers: { "x-apikey": "publishable-key" },
    });
    expect(await authorizedIngest(request)).toBe(true);
  });

  it("rejects a mismatched apikey", async () => {
    process.env["SUPABASE_PUBLISHABLE_KEY"] = "publishable-key";
    const { authorizedIngest } = await import("@/server/http/ingest-route.server");
    const request = new Request("http://localhost/api/public/ingest/aircraft", {
      headers: { apikey: "wrong-key" },
    });
    expect(await authorizedIngest(request)).toBe(false);
  });

  it("rejects requests with no credentials", async () => {
    process.env["LOVABLE_CRON_SECRET"] = "cron-secret";
    process.env["SUPABASE_PUBLISHABLE_KEY"] = "publishable-key";
    const { authorizedIngest } = await import("@/server/http/ingest-route.server");
    const request = new Request("http://localhost/api/public/ingest/aircraft");
    expect(await authorizedIngest(request)).toBe(false);
  });
});
