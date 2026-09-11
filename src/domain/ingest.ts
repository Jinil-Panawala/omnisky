/**
 * Pure ingestion domain rules: no I/O, no database, no provider knowledge.
 * Safe to import from anywhere.
 */

/** A position is usable only if it is finite, in range, and not null island. */
export function validCoord(lat: unknown, lon: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180 &&
    !(lat === 0 && lon === 0)
  );
}

/** Keep the newest record per key. */
export function dedupe<T>(rows: T[], key: (row: T) => string): T[] {
  const map = new Map<string, T>();
  for (const row of rows) map.set(key(row), row);
  return [...map.values()];
}

/** How long a live position stays in the database before it is pruned. */
export const POSITION_TTL_MS = 30 * 60 * 1000;

/** Launches are kept for a few days after their window closes. */
export const LAUNCH_RETENTION_MS = 3 * 24 * 60 * 60 * 1000;
