import { INSIGHT_RULES } from "../rules";
import { dedupKey, roundTo } from "../shared";
import type { InsightCandidate, LaunchRow } from "../types";

/** Launch windows opening shortly or just closed. */
export function detectLaunchWindows(launches: LaunchRow[], now: number): InsightCandidate[] {
  const { aheadHours, behindHours } = INSIGHT_RULES.launch;
  const out: InsightCandidate[] = [];
  for (const l of launches) {
    if (!l.window_start) continue;
    const deltaH = (new Date(l.window_start).getTime() - now) / 3_600_000;
    if (deltaH > aheadHours || deltaH < -behindHours) continue;
    const when =
      deltaH >= 0
        ? `opens in ${Math.round(deltaH * 60)} minutes`
        : `opened ${Math.round(-deltaH * 60)} minutes ago`;
    out.push({
      kind: "alert",
      category: "launch",
      severity: Math.abs(deltaH) < 1 ? "warning" : "info",
      entityType: "launch",
      entityId: l.id,
      title: "Launch Window Active",
      description: `${l.name} (${l.provider ?? "unknown provider"}) window ${when} from ${l.pad_name ?? "an undisclosed pad"}. Status: ${l.status ?? "unknown"}.`,
      signal: {
        launchId: l.id,
        name: l.name,
        provider: l.provider,
        pad: l.pad_name,
        status: l.status,
        hoursToWindow: roundTo(deltaH),
      },
      dedupKey: dedupKey("launch", l.id, now),
    });
  }
  return out;
}
