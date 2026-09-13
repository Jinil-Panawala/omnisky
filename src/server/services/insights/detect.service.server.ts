/**
 * Detection pass: reads live rows and applies the pure rules in
 * `@/domain/insights`. Costs nothing — no AI is involved here.
 */
import {
  detectActivitySpike,
  detectDarkVessels,
  detectFormations,
  detectHotspots,
  detectLaunchWindows,
  detectLoitering,
  rankCandidates,
} from "@/domain/insights";
import type { InsightCandidate } from "@/domain/insights";
import * as repo from "@/server/db/insights.repository.server";

export interface DetectionResult {
  candidates: InsightCandidate[];
  aircraftCount: number;
}

export async function detectCandidates(baseline: number | null): Promise<DetectionResult> {
  const now = Date.now();
  const [aircraft, vesselLastSeen, activeVessels, launches, history, aircraftCount] =
    await Promise.all([
      repo.findRecentAircraft(),
      repo.findVesselLastSeen(),
      repo.findActiveVesselIds(),
      repo.findLaunchWindow(),
      repo.findAircraftHistory(),
      repo.countAircraft(),
    ]);

  const candidates = [
    ...detectLoitering(history, now),
    ...detectDarkVessels(vesselLastSeen, activeVessels, now),
    ...detectFormations(aircraft, now),
    ...detectLaunchWindows(launches, now),
    ...detectHotspots(aircraft, now),
    ...detectActivitySpike(aircraftCount, baseline, now),
  ];

  const fresh = await repo.filterNewCandidates(candidates);
  return { candidates: rankCandidates(fresh), aircraftCount };
}
