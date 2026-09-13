import { describe, expect, it } from "vitest";
import { centroid, distanceKm, groupByCell, headingDelta, roundTo } from "@/domain/insights/shared";
import { detectHotspots } from "@/domain/insights/detectors/hotspots";
import { detectFormations } from "@/domain/insights/detectors/formations";
import { detectActivitySpike } from "@/domain/insights/detectors/activity";
import type { AircraftRow } from "@/domain/insights/types";

const NOW = Date.UTC(2026, 0, 1, 12, 0, 0);

function aircraft(i: number, over: Partial<AircraftRow> = {}): AircraftRow {
  return {
    icao24: `ac${i}`,
    callsign: `CS${i}`,
    lat: 50,
    lon: 10,
    altitude_m: 9000,
    heading_deg: 90,
    on_ground: false,
    updated_at: new Date(NOW).toISOString(),
    ...over,
  };
}

describe("geo helpers", () => {
  it("measures a known distance", () => {
    // ~111 km per degree of latitude
    expect(distanceKm(0, 0, 1, 0)).toBeGreaterThan(110);
    expect(distanceKm(0, 0, 1, 0)).toBeLessThan(112);
  });

  it("treats heading difference as circular", () => {
    expect(headingDelta(350, 10)).toBe(20);
    expect(headingDelta(10, 350)).toBe(20);
  });

  it("averages a centroid and rounds", () => {
    expect(centroid([{ lat: 0, lon: 0 }, { lat: 2, lon: 4 }])).toEqual({ lat: 1, lon: 2 });
    expect(roundTo(1.2345, 2)).toBe(1.23);
  });

  it("groups points into cells", () => {
    const cells = groupByCell(
      [{ lat: 50.1, lon: 10.1 }, { lat: 50.2, lon: 10.2 }, { lat: 20, lon: 20 }],
      2,
    );
    expect(cells.size).toBe(2);
  });
});

describe("hotspot detector", () => {
  it("stays quiet below the threshold", () => {
    const list = Array.from({ length: 5 }, (_, i) => aircraft(i));
    expect(detectHotspots(list, NOW)).toHaveLength(0);
  });

  it("reports a dense cell of airborne aircraft", () => {
    const list = Array.from({ length: 30 }, (_, i) => aircraft(i, { lon: 10 + i * 0.01 }));
    const found = detectHotspots(list, NOW);
    expect(found).toHaveLength(1);
    expect(found[0]!.category).toBe("hotspot");
    expect(found[0]!.signal["count"]).toBe(30);
  });

  it("ignores aircraft on the ground", () => {
    const list = Array.from({ length: 30 }, (_, i) => aircraft(i, { on_ground: true }));
    expect(detectHotspots(list, NOW)).toHaveLength(0);
  });
});

describe("formation detector", () => {
  it("reports tightly packed aircraft sharing altitude and heading", () => {
    const list = Array.from({ length: 4 }, (_, i) =>
      aircraft(i, { lat: 50 + i * 0.01, lon: 10 + i * 0.01, altitude_m: 9000 + i * 50 }),
    );
    const found = detectFormations(list, NOW);
    expect(found).toHaveLength(1);
    expect(found[0]!.category).toBe("formation");
  });

  it("ignores aircraft flying in different directions", () => {
    const list = Array.from({ length: 4 }, (_, i) =>
      aircraft(i, { lat: 50 + i * 0.01, heading_deg: i * 90 }),
    );
    expect(detectFormations(list, NOW)).toHaveLength(0);
  });
});

describe("activity detector", () => {
  it("needs a meaningful baseline", () => {
    expect(detectActivitySpike(1000, null, NOW)).toHaveLength(0);
    expect(detectActivitySpike(1000, 100, NOW)).toHaveLength(0);
  });

  it("flags a large swing", () => {
    const found = detectActivitySpike(1000, 500, NOW);
    expect(found).toHaveLength(1);
    expect(found[0]!.severity).toBe("warning");
  });

  it("ignores small drift", () => {
    expect(detectActivitySpike(1050, 1000, NOW)).toHaveLength(0);
  });
});
