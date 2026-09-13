import type { InsightSeverity } from "./types";

/** Tunable thresholds — one place for a new developer to adjust sensitivity. */
export const INSIGHT_RULES = {
  /** Aircraft loitering: circling inside a small radius for a long while. */
  loitering: { minPoints: 8, maxRadiusKm: 28, minMinutes: 40 },
  /** Vessels last seen underway that have since gone quiet on AIS. */
  dark: { minQuietMinutes: 35, maxQuietMinutes: 180, maxReports: 6 },
  /**
   * Real formations, not busy airspace: aircraft packed into a few km at a
   * shared altitude and heading.
   */
  formation: {
    cellDeg: 0.4,
    minCount: 4,
    minAltitudeM: 3000,
    maxSpreadKm: 15,
    maxAltitudeSpreadM: 1200,
    maxHeadingSpreadDeg: 30,
  },
  /** Busiest patches of airspace right now — situational context, not a threat. */
  hotspot: { cellDeg: 2, minCount: 25, maxReports: 2 },
  /** Global aircraft-count change versus the previous run. */
  activity: { minChangePct: 25, minBaseline: 300 },
  /** Launch windows opening or just closed. */
  launch: { aheadHours: 6, behindHours: 2 },
  /** Candidates carried into a single AI batch. */
  maxPerRun: 10,
  /** How long a generated insight stays on screen. */
  lifetimeHours: 3,
  /** Re-alerting the same situation is suppressed within this bucket. */
  dedupBucketMinutes: 60,
} as const;

export const INSIGHT_SEVERITY_RANK: Record<InsightSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};
