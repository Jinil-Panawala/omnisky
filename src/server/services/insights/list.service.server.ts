/**
 * Read use case for the console: stored insights split into the two panels.
 */
import type { ActiveAlert, AiInsight, GeoPoint } from "@/domain/entities";
import type { InsightCategory, InsightRecord } from "@/domain/insights";
import { findInsights } from "@/server/db/insights.repository.server";

export interface InsightFeed {
  alerts: ActiveAlert[];
  insights: AiInsight[];
  generatedAt: string | null;
  aiGenerated: boolean;
}

/** Detectors record where they fired; the console uses it to fly the camera. */
function locationOf(row: InsightRecord): GeoPoint | undefined {
  const signal = row.signal;
  if (!signal) return undefined;
  const lat = Number(signal["lat"]);
  const lon = Number(signal["lon"]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return undefined;
  return { lat, lon };
}

function toAlert(row: InsightRecord): ActiveAlert {
  return {
    id: row.id,
    severity: row.severity,
    type: row.entity_type,
    title: row.title,
    description: row.description,
    timestamp: new Date(row.detected_at),
    entityId: row.entity_id ?? "",
    location: locationOf(row),
  };
}

function toInsight(row: InsightRecord): AiInsight {
  return {
    id: row.id,
    category: row.category as InsightCategory,
    title: row.title,
    description: row.description,
    timestamp: new Date(row.detected_at),
    severity: row.severity,
    location: locationOf(row),
  };
}

export async function listInsightFeed(): Promise<InsightFeed> {
  const rows = await findInsights();
  return {
    alerts: rows.filter((r) => r.kind === "alert").map(toAlert),
    insights: rows.filter((r) => r.kind === "insight").map(toInsight),
    generatedAt: rows[0]?.detected_at ?? null,
    aiGenerated: rows.some((r) => r.ai_generated),
  };
}
