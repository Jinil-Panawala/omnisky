import { INSIGHT_RULES } from "../rules";
import { dedupKey, roundTo } from "../shared";
import type { InsightCandidate, VesselLastSeen } from "../types";

/**
 * Vessels whose AIS track stops: they appear in recent history but no longer
 * report a live position. Live rows expire on a short TTL, so absence from the
 * live table is the signal, not a stale timestamp.
 */
export function detectDarkVessels(
  lastSeen: VesselLastSeen[],
  activeMmsi: Set<string>,
  now: number,
): InsightCandidate[] {
  const { minQuietMinutes, maxQuietMinutes, maxReports } = INSIGHT_RULES.dark;
  const out: InsightCandidate[] = [];
  for (const v of lastSeen) {
    if (activeMmsi.has(v.mmsi)) continue;
    const quietMinutes = (now - v.lastSeenMs) / 60_000;
    if (quietMinutes < minQuietMinutes || quietMinutes > maxQuietMinutes) continue;
    out.push({
      kind: "alert",
      category: "dark",
      severity: quietMinutes > 90 ? "critical" : "warning",
      entityType: "ship",
      entityId: v.mmsi,
      title: "AIS Signal Lost",
      description: `Vessel MMSI ${v.mmsi} stopped broadcasting AIS ${Math.round(quietMinutes)} minutes ago; last fix near ${roundTo(v.lat, 2)}, ${roundTo(v.lon, 2)}.`,
      signal: {
        mmsi: v.mmsi,
        quietMinutes: Math.round(quietMinutes),
        lat: roundTo(v.lat, 2),
        lon: roundTo(v.lon, 2),
      },
      dedupKey: dedupKey("dark", v.mmsi, now),
    });
    if (out.length >= maxReports) break;
  }
  return out;
}
