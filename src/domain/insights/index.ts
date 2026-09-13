/**
 * Pure detection rules for automatically generated alerts and AI insights.
 *
 * Nothing here touches the database or the network: detectors take plain rows
 * and return `InsightCandidate` objects. The AI step only rewrites the wording
 * of these candidates, so the console still works when AI is unavailable.
 *
 * Adding a rule = one file in `detectors/`, its thresholds in `rules.ts`, and
 * one line here.
 */
export * from "./types";
export { INSIGHT_RULES, INSIGHT_SEVERITY_RANK } from "./rules";
export { distanceKm } from "./shared";

export { detectLoitering } from "./detectors/loitering";
export { detectDarkVessels } from "./detectors/dark-vessels";
export { detectHotspots } from "./detectors/hotspots";
export { detectFormations } from "./detectors/formations";
export { detectLaunchWindows } from "./detectors/launch-windows";
export { detectActivitySpike } from "./detectors/activity";
export { detectHighAltitude } from "./detectors/high-altitude";

import { INSIGHT_RULES, INSIGHT_SEVERITY_RANK } from "./rules";
import type { InsightCandidate } from "./types";

/** Highest-severity candidates first, capped for a single AI batch. */
export function rankCandidates(
  candidates: InsightCandidate[],
  max: number = INSIGHT_RULES.maxPerRun,
): InsightCandidate[] {
  return [...candidates]
    .sort((a, b) => INSIGHT_SEVERITY_RANK[a.severity] - INSIGHT_SEVERITY_RANK[b.severity])
    .slice(0, max);
}
