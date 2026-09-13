/**
 * Orchestrates one insight generation run: single-flight lease → detect →
 * optional AI wording → store → prune. Called by the scheduled public route.
 *
 * Circuit breaker: a 402/403 from the AI gateway parks the job in `paused`
 * until an operator resumes it or a later probe succeeds. While paused the job
 * still stores rule-worded candidates, so alerts keep flowing without AI spend.
 */
import * as repo from "@/server/db/insights.repository.server";
import { detectCandidates } from "./detect.service.server";
import { AiBlockedError, generateWording } from "./generate.service.server";

export interface InsightRunResult {
  skipped?: string;
  detected: number;
  stored: number;
  aiUsed: boolean;
  paused?: string;
}

export async function runInsightGeneration(): Promise<InsightRunResult> {
  const state = await repo.readJobState();
  const paused = state?.status === "paused";

  if (!(await repo.acquireLease())) {
    return { skipped: "another run in progress", detected: 0, stored: 0, aiUsed: false };
  }

  let nextStatus: "idle" | "paused" = paused ? "paused" : "idle";
  let pauseReason = paused ? (state?.pause_reason ?? null) : null;

  try {
    const { candidates, aircraftCount } = await detectCandidates(
      state?.last_aircraft_count ?? null,
    );
    if (candidates.length === 0) {
      await repo.pruneExpiredInsights();
      return { detected: 0, stored: 0, aiUsed: false, ...(pauseReason ? { paused: pauseReason } : {}) };
    }

    let worded = candidates;
    let aiUsed = false;
    try {
      // While paused, probe with a single candidate: a denial costs nothing and
      // a success clears the pause.
      const batch = paused ? candidates.slice(0, 1) : candidates;
      const result = await generateWording(batch);
      if (result) {
        aiUsed = true;
        worded = paused ? [...result, ...candidates.slice(1)] : result;
        nextStatus = "idle";
        pauseReason = null;
      }
    } catch (e) {
      if (e instanceof AiBlockedError) {
        nextStatus = "paused";
        pauseReason = e.message;
      } else {
        console.error("AI wording failed", e);
      }
    }

    const stored = await repo.saveInsights(worded, aiUsed);
    await repo.pruneExpiredInsights();
    return {
      detected: candidates.length,
      stored,
      aiUsed,
      ...(pauseReason ? { paused: pauseReason } : {}),
    };
  } finally {
    const { aircraftCount } = { aircraftCount: undefined as number | undefined };
    void aircraftCount;
    await repo.releaseLease({ status: nextStatus, pauseReason });
  }
}
