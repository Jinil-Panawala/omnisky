import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { DigestSourceRow } from "@/server/db/digest.repository.server";
import { composeDigest } from "@/server/services/digest/compose.service.server";

describe("composeDigest", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env["LOVABLE_API_KEY"];
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  const rows: DigestSourceRow[] = [
    {
      id: "1",
      category: "dark-vessel",
      severity: "critical",
      title: "Vessel ABC went dark",
      description: "No AIS for 2 hours",
      detected_at: new Date().toISOString(),
    },
    {
      id: "2",
      category: "high-altitude",
      severity: "warning",
      title: "Aircraft at 18 km",
      description: "Unusually high",
      detected_at: new Date().toISOString(),
    },
    {
      id: 3 as unknown as string,
      category: "hotspot",
      severity: "info",
      title: "Dense traffic over Europe",
      description: "25 aircraft in one cell",
      detected_at: new Date().toISOString(),
    },
  ] as DigestSourceRow[];

  it("falls back to rule-written wording when no AI key is configured", async () => {
    const digest = await composeDigest(rows, { aircraft: 7_839, vessels: 412 });
    expect(digest.aiGenerated).toBe(false);
    expect(digest.headline).toContain("3 notable events");
    expect(digest.summary).toContain("7,839 aircraft");
    expect(digest.summary).toContain("412 vessels");
    expect(digest.highlights).toHaveLength(3);
  });

  it("reports a quiet day when there are no items", async () => {
    const digest = await composeDigest([], { aircraft: 1_200, vessels: 80 });
    expect(digest.headline.toLowerCase()).toContain("quiet");
    expect(digest.highlights).toHaveLength(0);
  });

  it("ranks highlights critical first and caps at six", async () => {
    const many: DigestSourceRow[] = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      category: "dark-vessel",
      severity: i % 3 === 0 ? "critical" : i % 3 === 1 ? "warning" : "info",
      title: `Item ${i}`,
      description: "...",
      detected_at: new Date().toISOString(),
    }));
    const digest = await composeDigest(many, { aircraft: 100, vessels: 10 });
    expect(digest.highlights).toHaveLength(6);
    expect(digest.highlights[0].severity).toBe("critical");
  });

  it("falls back when the AI gateway returns a non-ok response", async () => {
    process.env["LOVABLE_API_KEY"] = "test-key";
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 } as Response);
    const digest = await composeDigest(rows, { aircraft: 100, vessels: 10 });
    expect(digest.aiGenerated).toBe(false);
    expect(digest.headline).toContain("3 notable events");
  });

  it("falls back when the streamed response is not valid JSON", async () => {
    process.env["LOVABLE_API_KEY"] = "test-key";
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("data: not-json\n\n"));
        controller.close();
      },
    });
    global.fetch = vi.fn().mockResolvedValue({ ok: true, body, status: 200 } as unknown as Response);
    const digest = await composeDigest(rows, { aircraft: 100, vessels: 10 });
    expect(digest.aiGenerated).toBe(false);
  });
});
