import { INSIGHT_RULES } from "../rules";
import { dedupKey, distanceKm, roundTo } from "../shared";
import type { HistoryPoint, InsightCandidate } from "../types";

/** Aircraft that stayed inside a small radius for a long time (orbit/CAP). */
export function detectLoitering(points: HistoryPoint[], now: number): InsightCandidate[] {
  const { minPoints, maxRadiusKm, minMinutes } = INSIGHT_RULES.loitering;
  const byCraft = new Map<string, HistoryPoint[]>();
  for (const p of points) {
    const list = byCraft.get(p.craft_id);
    if (list) list.push(p);
    else byCraft.set(p.craft_id, [p]);
  }

  const out: InsightCandidate[] = [];
  for (const [craftId, track] of byCraft) {
    if (track.length < minPoints) continue;
    const first = new Date(track[0]!.recorded_at).getTime();
    const last = new Date(track[track.length - 1]!.recorded_at).getTime();
    const minutes = (last - first) / 60_000;
    if (minutes < minMinutes) continue;

    const lat = track.reduce((s, p) => s + p.lat, 0) / track.length;
    const lon = track.reduce((s, p) => s + p.lon, 0) / track.length;
    const radiusKm = track.reduce((max, p) => Math.max(max, distanceKm(lat, lon, p.lat, p.lon)), 0);
    if (radiusKm > maxRadiusKm) continue;

    out.push({
      kind: "alert",
      category: "loitering",
      severity: minutes > 120 ? "warning" : "info",
      entityType: "aircraft",
      entityId: craftId,
      title: "Loitering Pattern Detected",
      description: `Aircraft ${craftId.toUpperCase()} held a ${roundTo(radiusKm)} km orbit for ${Math.round(minutes)} minutes near ${roundTo(lat, 2)}, ${roundTo(lon, 2)}.`,
      signal: {
        icao24: craftId,
        minutes: Math.round(minutes),
        radiusKm: roundTo(radiusKm),
        lat: roundTo(lat, 2),
        lon: roundTo(lon, 2),
        points: track.length,
      },
      dedupKey: dedupKey("loitering", craftId, now),
    });
  }
  return out;
}
