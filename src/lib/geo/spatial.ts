// Scalable map rendering support: normalized object model, priority scoring,
// zoom-dependent level-of-detail and O(n) grid clustering.
//
// This module is deliberately renderer-agnostic so the globe engine (currently
// Cesium) can be swapped or extended with vector tiles later without touching
// the React UI.
import type { Entity, EntityType } from "@/data/mock/types";

/** Normalized object model shared by every renderer/back-end. */
export interface TrackedObject {
  id: string;
  type: EntityType;
  latitude: number;
  longitude: number;
  altitude?: number | undefined;
  heading?: number | undefined;
  speed?: number | undefined;
  timestamp: string;
  category?: string | undefined;
  priority: number;
  name?: string | undefined;
  callsign?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface SpatialCluster {
  id: string;
  latitude: number;
  longitude: number;
  count: number;
  objectTypes: EntityType[];
  priority: number;
}

export interface ViewportBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface CameraView {
  /** null means "whole globe visible" (query everything). */
  bounds: ViewportBounds | null;
  heightM: number;
}

/** priority: 0 normal, 1 interesting, 2 high, 3 critical */
export function objectPriority(entity: Entity): number {
  if (entity.type === "launch") return 3;
  const risk = "riskScore" in entity ? (entity.riskScore ?? 0) : 0;
  if (risk >= 80) return 3;
  if (risk >= 60) return 2;
  if (entity.type === "aircraft") {
    const affiliation = entity.affiliation?.toLowerCase() ?? "";
    if (affiliation.includes("military") || affiliation.includes("gov")) return 2;
  }
  if (entity.type === "ship") {
    const kind = entity.shipType?.toLowerCase() ?? "";
    if (kind.includes("military") || kind.includes("law")) return 2;
  }
  if (entity.type === "satellite") return 1;
  return risk >= 40 ? 1 : 0;
}

export function toTrackedObject(entity: Entity): TrackedObject {
  return {
    id: entity.id,
    type: entity.type,
    latitude: entity.lat,
    longitude: entity.lon,
    altitude:
      "altitudeM" in entity ? (entity.altitudeM ?? undefined) : undefined,
    heading: "headingDeg" in entity ? (entity.headingDeg ?? undefined) : undefined,
    speed:
      "velocityMs" in entity
        ? (entity.velocityMs ?? undefined)
        : "speedKn" in entity
          ? (entity.speedKn ?? undefined)
          : undefined,
    timestamp: entity.updatedAt.toISOString(),
    category: "classification" in entity ? entity.classification : undefined,
    priority: objectPriority(entity),
    name: entity.name,
    callsign: "callsign" in entity ? entity.callsign : undefined,
  };
}

export interface LodConfig {
  /** Grid cell size in degrees; 0 means "never cluster". */
  cellDeg: number;
  /** Cells holding at least this many objects collapse into a cluster. */
  minClusterSize: number;
  /** Budget of individually rendered objects. */
  maxIndividual: number;
  /** Minimum priority for a lone object to survive the budget trim. */
  minPriority: number;
  labels: "none" | "priority" | "all";
}

const LEVELS: Array<{ minHeightM: number } & LodConfig> = [
  { minHeightM: 12_000_000, cellDeg: 30, minClusterSize: 2, maxIndividual: 250, minPriority: 2, labels: "none" },
  { minHeightM: 7_000_000, cellDeg: 20, minClusterSize: 2, maxIndividual: 400, minPriority: 2, labels: "none" },
  { minHeightM: 4_000_000, cellDeg: 10, minClusterSize: 3, maxIndividual: 700, minPriority: 1, labels: "none" },
  { minHeightM: 2_000_000, cellDeg: 5, minClusterSize: 3, maxIndividual: 1200, minPriority: 1, labels: "priority" },
  { minHeightM: 1_000_000, cellDeg: 2.5, minClusterSize: 4, maxIndividual: 2000, minPriority: 0, labels: "priority" },
  { minHeightM: 400_000, cellDeg: 1, minClusterSize: 5, maxIndividual: 3500, minPriority: 0, labels: "priority" },
  { minHeightM: 150_000, cellDeg: 0.35, minClusterSize: 8, maxIndividual: 5000, minPriority: 0, labels: "all" },
  { minHeightM: 0, cellDeg: 0, minClusterSize: 0, maxIndividual: 6000, minPriority: 0, labels: "all" },
];

/** perfScale < 1 degrades gracefully on weak devices. */
export function lodForHeight(heightM: number, perfScale = 1): LodConfig {
  const level = LEVELS.find((l) => heightM >= l.minHeightM) ?? LEVELS[LEVELS.length - 1]!;
  const scale = Math.max(0.25, Math.min(1, perfScale));
  return {
    cellDeg: level.cellDeg,
    minClusterSize: level.minClusterSize,
    minPriority: level.minPriority,
    maxIndividual: Math.round(level.maxIndividual * scale),
    labels: scale < 0.7 && level.labels === "all" ? "priority" : level.labels,
  };
}

export function boundsContain(bounds: ViewportBounds | null, lat: number, lon: number): boolean {
  if (!bounds) return true;
  if (lat < bounds.south || lat > bounds.north) return false;
  if (bounds.west <= bounds.east) return lon >= bounds.west && lon <= bounds.east;
  // crosses the antimeridian
  return lon >= bounds.west || lon <= bounds.east;
}

/** Pad bounds so panning does not immediately reveal empty space. */
export function padBounds(bounds: ViewportBounds, factor = 0.15): ViewportBounds {
  const height = bounds.north - bounds.south;
  const width =
    bounds.west <= bounds.east ? bounds.east - bounds.west : 360 - bounds.west + bounds.east;
  const dy = Math.max(0.5, height * factor);
  const dx = Math.max(0.5, width * factor);
  if (width + 2 * dx >= 360) {
    return { west: -180, east: 180, south: Math.max(-90, bounds.south - dy), north: Math.min(90, bounds.north + dy) };
  }
  const wrap = (v: number) => ((((v + 180) % 360) + 360) % 360) - 180;
  return {
    west: wrap(bounds.west - dx),
    east: wrap(bounds.east + dx),
    south: Math.max(-90, bounds.south - dy),
    north: Math.min(90, bounds.north + dy),
  };
}

export interface RenderPoint {
  entity: Entity;
  priority: number;
}

export interface RenderCluster extends SpatialCluster {
  type: EntityType;
}

export interface RenderStats {
  visible: number;
  rendered: number;
  clusters: number;
  clustered: number;
  computeMs: number;
}

export interface RenderSet {
  points: RenderPoint[];
  clusters: RenderCluster[];
  stats: RenderStats;
}

export interface BuildOptions {
  view: CameraView;
  selectedId?: string | null | undefined;
  hoveredId?: string | null | undefined;
  perfScale?: number;
  /** Types that never cluster (low volume, always relevant). */
  alwaysIndividual?: EntityType[];
}

const DEFAULT_ALWAYS: EntityType[] = ["launch"];

/**
 * Single O(n) pass: viewport cull -> grid bucket -> cluster/individual split ->
 * priority-aware budget trim. Never iterates pairs of objects.
 */
export function buildRenderSet(entities: Entity[], opts: BuildOptions): RenderSet {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const lod = lodForHeight(opts.view.heightM, opts.perfScale ?? 1);
  const always = new Set(opts.alwaysIndividual ?? DEFAULT_ALWAYS);
  const bounds = opts.view.bounds;

  const buckets = new Map<
    string,
    { type: EntityType; latSum: number; lonSum: number; count: number; priority: number; members: RenderPoint[] }
  >();
  const forced: RenderPoint[] = [];
  let visible = 0;

  for (const e of entities) {
    const isSelected = e.id === opts.selectedId || e.id === opts.hoveredId;
    if (!isSelected && !boundsContain(bounds, e.lat, e.lon)) continue;
    visible += 1;
    const priority = objectPriority(e);

    if (isSelected || always.has(e.type) || lod.cellDeg === 0) {
      if (lod.cellDeg === 0 && !isSelected && !always.has(e.type)) {
        // full-detail zoom: still budget-limited below
        forced.push({ entity: e, priority });
        continue;
      }
      forced.push({ entity: e, priority });
      continue;
    }

    const cellY = Math.floor((e.lat + 90) / lod.cellDeg);
    const cellX = Math.floor((e.lon + 180) / lod.cellDeg);
    const key = `${e.type}:${cellX}:${cellY}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { type: e.type, latSum: 0, lonSum: 0, count: 0, priority: 0, members: [] };
      buckets.set(key, bucket);
    }
    bucket.latSum += e.lat;
    bucket.lonSum += e.lon;
    bucket.count += 1;
    bucket.priority = Math.max(bucket.priority, priority);
    if (bucket.members.length < lod.minClusterSize) bucket.members.push({ entity: e, priority });
    else if (priority >= 2) bucket.members.push({ entity: e, priority });
  }

  const clusters: RenderCluster[] = [];
  const loose: RenderPoint[] = [];
  let clustered = 0;

  for (const [key, bucket] of buckets) {
    if (bucket.count >= lod.minClusterSize) {
      clusters.push({
        id: `cl-${key}`,
        type: bucket.type,
        latitude: bucket.latSum / bucket.count,
        longitude: bucket.lonSum / bucket.count,
        count: bucket.count,
        objectTypes: [bucket.type],
        priority: bucket.priority,
      });
      clustered += bucket.count;
      // high-priority members stay individually visible on top of the cluster
      for (const m of bucket.members) if (m.priority >= 2) loose.push(m);
    } else {
      for (const m of bucket.members) loose.push(m);
    }
  }

  // Budget trim: forced objects first, then by priority.
  loose.sort((a, b) => b.priority - a.priority);
  const budget = Math.max(0, lod.maxIndividual - forced.length);
  const kept = loose
    .filter((p) => p.priority >= lod.minPriority || lod.cellDeg === 0)
    .slice(0, budget);
  const points = [...forced.slice(0, lod.maxIndividual), ...kept];

  const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();
  return {
    points,
    clusters,
    stats: {
      visible,
      rendered: points.length,
      clusters: clusters.length,
      clustered,
      computeMs: Math.round((t1 - t0) * 10) / 10,
    },
  };
}

export function shouldLabel(
  point: RenderPoint,
  lod: LodConfig,
  selectedId?: string | null,
  hoveredId?: string | null,
): boolean {
  if (point.entity.id === selectedId || point.entity.id === hoveredId) return true;
  if (point.entity.type === "launch") return lod.labels !== "none";
  if (lod.labels === "all") return true;
  if (lod.labels === "priority") return point.priority >= 2;
  return false;
}
