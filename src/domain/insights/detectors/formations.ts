import { INSIGHT_RULES } from "../rules";
import { centroid, dedupKey, distanceKm, groupByCell, headingDelta, roundTo } from "../shared";
import type { AircraftRow, InsightCandidate } from "../types";

/** Aircraft flying as a tight group: close together, same altitude and heading. */
export function detectFormations(aircraft: AircraftRow[], now: number): InsightCandidate[] {
  const {
    cellDeg,
    minCount,
    minAltitudeM,
    maxSpreadKm,
    maxAltitudeSpreadM,
    maxHeadingSpreadDeg,
  } = INSIGHT_RULES.formation;

  // Grid cells are only a cheap pre-filter; the real test is the tightness
  // check below, so ordinary busy airspace does not raise an insight.
  const candidates = aircraft.filter(
    (a) => !a.on_ground && (a.altitude_m ?? 0) >= minAltitudeM && a.heading_deg != null,
  );

  const out: InsightCandidate[] = [];
  for (const [key, cell] of groupByCell(candidates, cellDeg)) {
    if (cell.length < minCount) continue;
    const group = tightestGroup(cell, maxSpreadKm, maxAltitudeSpreadM, maxHeadingSpreadDeg);
    if (group.length < minCount) continue;

    const { lat, lon } = centroid(group);
    const altitudeM = Math.round(group.reduce((s, a) => s + (a.altitude_m ?? 0), 0) / group.length);
    const callsigns = group
      .map((a) => a.callsign?.trim())
      .filter((c): c is string => Boolean(c))
      .slice(0, 6);

    out.push({
      kind: "insight",
      category: "formation",
      severity: group.length >= minCount * 2 ? "warning" : "info",
      entityType: "aircraft",
      entityId: group[0]!.icao24,
      title: "Aircraft Flying in Formation",
      description: `${group.length} aircraft are holding station within ${maxSpreadKm} km at about ${altitudeM} m on a common heading near ${roundTo(lat, 2)}, ${roundTo(lon, 2)}.`,
      signal: {
        count: group.length,
        lat: roundTo(lat, 2),
        lon: roundTo(lon, 2),
        altitudeM,
        headingDeg: Math.round(group[0]!.heading_deg ?? 0),
        callsigns,
      },
      dedupKey: dedupKey("formation", key, now),
    });
  }
  return out;
}

/** Largest subset of a cell that is close, co-altitude and co-heading. */
function tightestGroup(
  cell: AircraftRow[],
  maxSpreadKm: number,
  maxAltitudeSpreadM: number,
  maxHeadingSpreadDeg: number,
): AircraftRow[] {
  let best: AircraftRow[] = [];
  for (const seed of cell) {
    const group = cell.filter(
      (a) =>
        distanceKm(seed.lat!, seed.lon!, a.lat!, a.lon!) <= maxSpreadKm &&
        Math.abs((a.altitude_m ?? 0) - (seed.altitude_m ?? 0)) <= maxAltitudeSpreadM &&
        headingDelta(a.heading_deg ?? 0, seed.heading_deg ?? 0) <= maxHeadingSpreadDeg,
    );
    if (group.length > best.length) best = group;
  }
  return best;
}
