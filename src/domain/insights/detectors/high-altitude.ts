import { INSIGHT_RULES } from "../rules";
import { dedupKey, roundTo } from "../shared";
import type { AircraftRow, InsightCandidate } from "../types";

/**
 * Aircraft reporting an altitude well above airline cruise. Usually high-flying
 * survey, research or state aircraft — rare enough to be worth an alert.
 */
export function detectHighAltitude(aircraft: AircraftRow[], now: number): InsightCandidate[] {
  const { minAltitudeM, maxReports } = INSIGHT_RULES.highAltitude;
  return aircraft
    .filter(
      (a) => !a.on_ground && a.lat != null && a.lon != null && (a.altitude_m ?? 0) >= minAltitudeM,
    )
    .sort((a, b) => (b.altitude_m ?? 0) - (a.altitude_m ?? 0))
    .slice(0, maxReports)
    .map((a) => {
      const altitudeM = Math.round(a.altitude_m ?? 0);
      const label = a.callsign?.trim() || a.icao24.toUpperCase();
      return {
        kind: "alert" as const,
        category: "altitude" as const,
        severity: altitudeM >= minAltitudeM + 4000 ? "warning" : ("info" as const),
        entityType: "aircraft" as const,
        entityId: a.icao24,
        title: "Unusually High Altitude",
        description: `${label} is flying at about ${altitudeM.toLocaleString()} m near ${roundTo(a.lat!, 2)}, ${roundTo(a.lon!, 2)} — far above normal airline cruise.`,
        signal: {
          icao24: a.icao24,
          callsign: a.callsign,
          altitudeM,
          lat: roundTo(a.lat!, 2),
          lon: roundTo(a.lon!, 2),
        },
        dedupKey: dedupKey("altitude", a.icao24, now),
      };
    });
}
