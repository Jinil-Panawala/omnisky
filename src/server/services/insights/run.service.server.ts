/**
 * Orchestrates one insight generation run: single-flight lease → detect →
 * optional AI wording → store → prune. Called by the scheduled public route.
 *
 * Circuit breaker: a 402/403 from the AI gateway parks the job in `paused`
 * until a later probe succeeds. While paused the job still stores rule-worded
 * candidates, so alerts keep flowing with no AI spend.
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
  const wasPaused = state?.status === "paused";

  if (!(await repo.acquireLease())) {
    return { skipped: "another run in progress", detected: 0, stored: 0, aiUsed: false };
  }

  let pauseReason: string | null = wasPaused ? (state?.pause_reason ?? null) : null;
  let aircraftCount: number | null = null;

  try {
    const detection = await detectCandidates(state?.last_aircraft_count ?? null);
    aircraftCount = detection.aircraftCount;
    const candidates = detection.candidates;

    if (candidates.length === 0) {
      await repo.pruneExpiredInsights();
      return {
        detected: 0,
        stored: 0,
        aiUsed: false,
        ...(pauseReason ? { paused: pauseReason } : {}),
      };
    }

    let worded = candidates;
    let aiUsed = false;
    try {
      // While paused, probe with one candidate: a denial costs nothing and a
      // success clears the pause.
      const batch = wasPaused ? candidates.slice(0, 1) : candidates;
      const result = await generateWording(batch);
      if (result) {
        aiUsed = true;
        worded = wasPaused ? [...result, ...candidates.slice(1)] : result;
        pauseReason = null;
      }
    } catch (e) {
      if (e instanceof AiBlockedError) {
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
    await repo.releaseLease({
      status: pauseReason ? "paused" : "idle",
      pauseReason,
      aircraftCount,
    });
  }
}
