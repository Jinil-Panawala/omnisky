import { INSIGHT_RULES } from "../rules";
import { centroid, dedupKey, groupByCell, roundTo } from "../shared";
import type { AircraftRow, InsightCandidate } from "../types";

/** Busiest airspace cells: routine context so the console always has a read. */
export function detectHotspots(aircraft: AircraftRow[], now: number): InsightCandidate[] {
  const { cellDeg, minCount, maxReports } = INSIGHT_RULES.hotspot;
  const airborne = aircraft.filter((a) => !a.on_ground);

  return [...groupByCell(airborne, cellDeg).entries()]
    .filter(([, list]) => list.length >= minCount)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, maxReports)
    .map(([key, list]) => {
      const { lat, lon } = centroid(list);
      return {
        kind: "insight" as const,
        category: "hotspot" as const,
        severity: "info" as const,
        entityType: "aircraft" as const,
        entityId: list[0]!.icao24,
        title: "Dense Air Traffic",
        description: `${list.length} aircraft are airborne within about ${cellDeg} degrees of ${roundTo(lat, 1)}, ${roundTo(lon, 1)}.`,
        signal: { count: list.length, lat: roundTo(lat, 1), lon: roundTo(lon, 1) },
        dedupKey: dedupKey("hotspot", key, now),
      };
    });
}
