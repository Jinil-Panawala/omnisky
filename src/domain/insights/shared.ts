import { INSIGHT_RULES } from "./rules";
import type { InsightCategory } from "./types";

const EARTH_RADIUS_KM = 6371;

export function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const toRad = Math.PI / 180;
  const dLat = (bLat - aLat) * toRad;
  const dLon = (bLon - aLon) * toRad;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * toRad) * Math.cos(bLat * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Same situation inside the same time bucket is reported once. */
export function dedupKey(category: InsightCategory, scope: string, now: number): string {
  const bucket = Math.floor(now / (INSIGHT_RULES.dedupBucketMinutes * 60_000));
  return `${category}:${scope}:${bucket}`;
}

export function roundTo(value: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

/** Smallest angle between two compass headings, in degrees. */
export function headingDelta(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** Mean latitude / longitude of a set of points (small extents only). */
export function centroid(points: { lat: number | null; lon: number | null }[]): {
  lat: number;
  lon: number;
} {
  const lat = points.reduce((s, p) => s + (p.lat ?? 0), 0) / points.length;
  const lon = points.reduce((s, p) => s + (p.lon ?? 0), 0) / points.length;
  return { lat, lon };
}

/** Group rows into a coarse lat/lon grid; the cheap pre-filter every detector uses. */
export function groupByCell<T extends { lat: number | null; lon: number | null }>(
  rows: T[],
  cellDeg: number,
): Map<string, T[]> {
  const cells = new Map<string, T[]>();
  for (const row of rows) {
    if (row.lat == null || row.lon == null) continue;
    const key = `${Math.floor(row.lat / cellDeg)}|${Math.floor(row.lon / cellDeg)}`;
    const list = cells.get(key);
    if (list) list.push(row);
    else cells.set(key, [row]);
  }
  return cells;
}
