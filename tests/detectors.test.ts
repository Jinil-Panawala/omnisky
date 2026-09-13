import { describe, expect, it } from "vitest";
import { detectDarkVessels } from "@/domain/insights/detectors/dark-vessels";
import { detectHighAltitude } from "@/domain/insights/detectors/high-altitude";
import { detectLoitering } from "@/domain/insights/detectors/loitering";
import { detectLaunchWindows } from "@/domain/insights/detectors/launch-windows";
import { rankCandidates } from "@/domain/insights";
import { INSIGHT_RULES } from "@/domain/insights/rules";
import type {
  AircraftRow,
  HistoryPoint,
  InsightCandidate,
  LaunchRow,
  VesselLastSeen,
} from "@/domain/insights/types";

const NOW = Date.UTC(2026, 0, 1, 12, 0, 0);

function vessel(mmsi: string, quietMinutes: number): VesselLastSeen {
  return { mmsi, lat: 10, lon: 20, lastSeenMs: NOW - quietMinutes * 60_000 };
}

function aircraft(i: number, over: Partial<AircraftRow> = {}): AircraftRow {
  return {
    icao24: `ac${i}`,
    callsign: `CS${i}`,
    lat: 45,
    lon: 5,
    altitude_m: 10_000,
    heading_deg: 90,
    on_ground: false,
    updated_at: new Date(NOW).toISOString(),
    ...over,
  };
}

function point(craftId: string, minutesAgo: number, lat: number, lon: number): HistoryPoint {
  return {
    craft_id: craftId,
    lat,
    lon,
    recorded_at: new Date(NOW - minutesAgo * 60_000).toISOString(),
  };
}

describe("dark vessel detector", () => {
  it("flags a vessel that went quiet inside the window", () => {
    const found = detectDarkVessels([vessel("111", 60)], new Set(), NOW);
    expect(found).toHaveLength(1);
    expect(found[0]!.category).toBe("dark");
    expect(found[0]!.severity).toBe("warning");
  });

  it("escalates to critical past 90 quiet minutes", () => {
    const found = detectDarkVessels([vessel("111", 120)], new Set(), NOW);
    expect(found[0]!.severity).toBe("critical");
  });

  it("ignores vessels still reporting live", () => {
    expect(detectDarkVessels([vessel("111", 60)], new Set(["111"]), NOW)).toHaveLength(0);
  });

  it("ignores too-recent and too-old silences", () => {
    expect(detectDarkVessels([vessel("111", 5)], new Set(), NOW)).toHaveLength(0);
    expect(detectDarkVessels([vessel("111", 600)], new Set(), NOW)).toHaveLength(0);
  });

  it("caps the number of reports", () => {
    const many = Array.from({ length: 20 }, (_, i) => vessel(`m${i}`, 60));
    expect(detectDarkVessels(many, new Set(), NOW)).toHaveLength(INSIGHT_RULES.dark.maxReports);
  });
});

describe("high altitude detector", () => {
  it("ignores normal cruise altitudes", () => {
    expect(detectHighAltitude([aircraft(1)], NOW)).toHaveLength(0);
  });

  it("reports the highest fliers first and caps the list", () => {
    const list = [
      aircraft(1, { altitude_m: 15_000 }),
      aircraft(2, { altitude_m: 19_000 }),
      aircraft(3, { altitude_m: 16_000 }),
      aircraft(4, { altitude_m: 14_500 }),
    ];
    const found = detectHighAltitude(list, NOW);
    expect(found).toHaveLength(INSIGHT_RULES.highAltitude.maxReports);
    expect(found[0]!.signal["altitudeM"]).toBe(19_000);
    expect(found[0]!.severity).toBe("warning");
    expect(found[2]!.severity).toBe("info");
  });

  it("skips grounded aircraft and rows without a position", () => {
    const list = [
      aircraft(1, { altitude_m: 18_000, on_ground: true }),
      aircraft(2, { altitude_m: 18_000, lat: null, lon: null }),
    ];
    expect(detectHighAltitude(list, NOW)).toHaveLength(0);
  });
});

describe("loitering detector", () => {
  it("flags a long tight orbit", () => {
    const track = Array.from({ length: 8 }, (_, i) =>
      point("abc123", 60 - i * 7, 45 + (i % 2) * 0.05, 5 + (i % 2) * 0.05),
    );
    const found = detectLoitering(track, NOW);
    expect(found).toHaveLength(1);
    expect(found[0]!.category).toBe("loitering");
  });

  it("ignores aircraft transiting a wide area", () => {
    const track = Array.from({ length: 8 }, (_, i) => point("abc123", 60 - i * 7, 45 + i, 5 + i));
    expect(detectLoitering(track, NOW)).toHaveLength(0);
  });

  it("ignores short histories", () => {
    const track = [point("abc123", 30, 45, 5), point("abc123", 20, 45, 5)];
    expect(detectLoitering(track, NOW)).toHaveLength(0);
  });
});

describe("launch window detector", () => {
  function launch(hoursFromNow: number): LaunchRow {
    return {
      id: "l1",
      name: "Test Flight",
      provider: "Test Provider",
      pad_name: "Pad A",
      status: "Go",
      window_start: new Date(NOW + hoursFromNow * 3_600_000).toISOString(),
    } as LaunchRow;
  }

  it("flags an imminent window as a warning", () => {
    const found = detectLaunchWindows([launch(0.5)], NOW);
    expect(found).toHaveLength(1);
    expect(found[0]!.severity).toBe("warning");
  });

  it("includes a soon-but-not-imminent window as info", () => {
    expect(detectLaunchWindows([launch(4)], NOW)[0]!.severity).toBe("info");
  });

  it("ignores windows outside the horizon", () => {
    expect(detectLaunchWindows([launch(48)], NOW)).toHaveLength(0);
    expect(detectLaunchWindows([launch(-10)], NOW)).toHaveLength(0);
  });
});

describe("rankCandidates", () => {
  const make = (severity: InsightCandidate["severity"], id: string): InsightCandidate =>
    ({
      kind: "alert",
      category: "dark",
      severity,
      entityType: "ship",
      entityId: id,
      title: id,
      description: id,
      signal: {},
      dedupKey: id,
    }) as InsightCandidate;

  it("puts critical first and respects the cap", () => {
    const ranked = rankCandidates([make("info", "a"), make("critical", "b"), make("warning", "c")], 2);
    expect(ranked.map((c) => c.entityId)).toEqual(["b", "c"]);
  });
});
