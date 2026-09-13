import { describe, expect, it } from "vitest";
import {
  boundsContain,
  buildRenderSet,
  lodForHeight,
  objectPriority,
  padBounds,
  shouldLabel,
  toTrackedObject,
} from "@/lib/geo/spatial";
import type { Entity } from "@/domain/entities";

function plane(id: string, lat: number, lon: number, over: Record<string, unknown> = {}): Entity {
  return {
    id,
    type: "aircraft",
    name: id,
    lat,
    lon,
    updatedAt: new Date("2026-01-01T12:00:00Z"),
    icao24: id,
    callsign: id,
    altitudeM: 10_000,
    velocityMs: 220,
    headingDeg: 90,
    verticalRateMs: 0,
    onGround: false,
    affiliation: "Unknown",
    classification: "Airborne",
    riskScore: 0,
    ...over,
  } as Entity;
}

describe("viewport bounds", () => {
  it("treats a null viewport as the whole globe", () => {
    expect(boundsContain(null, 80, -170)).toBe(true);
  });

  it("contains points inside a normal box", () => {
    const b = { west: 0, east: 20, south: 40, north: 60 };
    expect(boundsContain(b, 50, 10)).toBe(true);
    expect(boundsContain(b, 50, 30)).toBe(false);
    expect(boundsContain(b, 10, 10)).toBe(false);
  });

  it("handles boxes crossing the antimeridian", () => {
    const b = { west: 170, east: -170, south: -10, north: 10 };
    expect(boundsContain(b, 0, 179)).toBe(true);
    expect(boundsContain(b, 0, -179)).toBe(true);
    expect(boundsContain(b, 0, 0)).toBe(false);
  });

  it("pads bounds outward and clamps latitude", () => {
    const padded = padBounds({ west: 0, east: 20, south: -89, north: 89 });
    expect(padded.south).toBeGreaterThanOrEqual(-90);
    expect(padded.north).toBeLessThanOrEqual(90);
    expect(padded.west).toBeLessThan(0);
  });

  it("widens to the full globe when padding wraps around", () => {
    const padded = padBounds({ west: -175, east: 175, south: -20, north: 20 });
    expect(padded.west).toBe(-180);
    expect(padded.east).toBe(180);
  });
});

describe("level of detail", () => {
  it("clusters aggressively when zoomed far out", () => {
    const far = lodForHeight(15_000_000);
    expect(far.cellDeg).toBe(30);
    expect(far.labels).toBe("none");
  });

  it("stops clustering when zoomed all the way in", () => {
    const near = lodForHeight(1000);
    expect(near.cellDeg).toBe(0);
    expect(near.labels).toBe("all");
  });

  it("shrinks the render budget on weak devices", () => {
    expect(lodForHeight(1000, 0.5).maxIndividual).toBeLessThan(lodForHeight(1000).maxIndividual);
  });
});

describe("priority", () => {
  it("ranks launches highest and plain aircraft lowest", () => {
    const launch = { id: "l", type: "launch" } as unknown as Entity;
    expect(objectPriority(launch)).toBe(3);
    expect(objectPriority(plane("a", 0, 0))).toBe(0);
  });

  it("lifts military aircraft and high-risk objects", () => {
    expect(objectPriority(plane("m", 0, 0, { affiliation: "Military" }))).toBe(2);
    expect(objectPriority(plane("r", 0, 0, { riskScore: 85 }))).toBe(3);
  });
});

describe("buildRenderSet", () => {
  it("culls objects outside the viewport", () => {
    const entities = [plane("in", 50, 10), plane("out", -50, -170)];
    const set = buildRenderSet(entities, {
      view: { bounds: { west: 0, east: 20, south: 40, north: 60 }, heightM: 1000 },
    });
    expect(set.stats.visible).toBe(1);
    expect(set.points.map((p) => p.entity.id)).toEqual(["in"]);
  });

  it("keeps the selected object even when it is off screen", () => {
    const entities = [plane("out", -50, -170)];
    const set = buildRenderSet(entities, {
      view: { bounds: { west: 0, east: 20, south: 40, north: 60 }, heightM: 1000 },
      selectedId: "out",
    });
    expect(set.points).toHaveLength(1);
  });

  it("collapses a dense patch into clusters when zoomed out", () => {
    const entities = Array.from({ length: 50 }, (_, i) => plane(`p${i}`, 50 + i * 0.001, 10));
    const set = buildRenderSet(entities, { view: { bounds: null, heightM: 15_000_000 } });
    expect(set.clusters.length).toBeGreaterThan(0);
    expect(set.stats.clustered).toBeGreaterThan(0);
    expect(set.points.length).toBeLessThan(entities.length);
  });

  it("renders everything individually when fully zoomed in", () => {
    const entities = Array.from({ length: 20 }, (_, i) => plane(`p${i}`, 50 + i * 0.001, 10));
    const set = buildRenderSet(entities, { view: { bounds: null, heightM: 500 } });
    expect(set.clusters).toHaveLength(0);
    expect(set.points).toHaveLength(20);
  });

  it("respects the individual render budget", () => {
    const entities = Array.from({ length: 9000 }, (_, i) => plane(`p${i}`, 50, 10 + i * 0.0001));
    const set = buildRenderSet(entities, { view: { bounds: null, heightM: 500 } });
    expect(set.points.length).toBeLessThanOrEqual(lodForHeight(500).maxIndividual);
  });
});

describe("labels", () => {
  const point = { entity: plane("p", 0, 0), priority: 0 };

  it("always labels the selected object", () => {
    expect(shouldLabel(point, lodForHeight(15_000_000), "p")).toBe(true);
  });

  it("hides labels when zoomed far out", () => {
    expect(shouldLabel(point, lodForHeight(15_000_000))).toBe(false);
  });

  it("labels everything when zoomed in", () => {
    expect(shouldLabel(point, lodForHeight(500))).toBe(true);
  });
});

describe("toTrackedObject", () => {
  it("normalizes an aircraft entity", () => {
    const t = toTrackedObject(plane("ac1", 12, 34));
    expect(t).toMatchObject({ id: "ac1", type: "aircraft", latitude: 12, longitude: 34, speed: 220 });
    expect(t.timestamp).toBe("2026-01-01T12:00:00.000Z");
  });
});
