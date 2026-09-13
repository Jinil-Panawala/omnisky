/**
 * Read use case for the console: stored insights split into the two panels.
 */
import type { ActiveAlert, AiInsight } from "@/domain/entities";
import type { InsightCategory, InsightRecord } from "@/domain/insights";
import { findInsights } from "@/server/db/insights.repository.server";

export interface InsightFeed {
  alerts: ActiveAlert[];
  insights: AiInsight[];
  generatedAt: string | null;
  aiGenerated: boolean;
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
