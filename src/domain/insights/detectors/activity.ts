import { INSIGHT_RULES } from "../rules";
import { dedupKey } from "../shared";
import type { InsightCandidate } from "../types";

/** Global tracked-aircraft volume compared with the previous run. */
export function detectActivitySpike(
  current: number,
  baseline: number | null,
  now: number,
): InsightCandidate[] {
  const { minChangePct, minBaseline } = INSIGHT_RULES.activity;
  if (!baseline || baseline < minBaseline) return [];
  const changePct = ((current - baseline) / baseline) * 100;
  if (Math.abs(changePct) < minChangePct) return [];
  const direction = changePct > 0 ? "increase" : "decrease";
  return [
    {
      kind: "insight",
      category: "activity",
      severity: Math.abs(changePct) > 50 ? "warning" : "info",
      entityType: "aircraft",
      entityId: null,
      title: "Tracked Air Activity Shift",
      description: `Tracked aircraft volume shows a ${Math.abs(Math.round(changePct))}% ${direction} versus the previous sweep (${baseline} → ${current}).`,
      signal: { current, baseline, changePct: Math.round(changePct) },
      dedupKey: dedupKey("activity", "global", now),
    },
  ];
}
