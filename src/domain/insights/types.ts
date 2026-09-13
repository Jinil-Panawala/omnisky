/** Shared vocabulary for the automatic alert / insight pipeline. */
import type { EntityType } from "../entities";

export type InsightKind = "alert" | "insight";
export type InsightSeverity = "critical" | "warning" | "info";
export type InsightCategory =
  | "loitering"
  | "dark"
  | "activity"
  | "formation"
  | "launch"
  | "hotspot"
  | "altitude";

/** A detected situation, before the AI wording pass. */
export interface InsightCandidate {
  kind: InsightKind;
  category: InsightCategory;
  severity: InsightSeverity;
  entityType: EntityType;
  entityId: string | null;
  title: string;
  description: string;
  signal: Record<string, unknown>;
  dedupKey: string;
}

/** A stored insight as the console consumes it. */
export interface InsightRecord {
  id: string;
  kind: InsightKind;
  category: InsightCategory;
  severity: InsightSeverity;
  entity_type: EntityType;
  entity_id: string | null;
  title: string;
  description: string;
  signal: Record<string, unknown> | null;
  ai_generated: boolean;
  detected_at: string;
}

/* ----- detector inputs ------------------------------------------------ */

export interface HistoryPoint {
  craft_id: string;
  lat: number;
  lon: number;
  recorded_at: string;
}

export interface AircraftRow {
  icao24: string;
  callsign: string | null;
  lat: number | null;
  lon: number | null;
  altitude_m: number | null;
  heading_deg: number | null;
  on_ground: boolean | null;
  updated_at: string;
}

/** Last known history fix for a vessel, used to spot AIS drop-outs. */
export interface VesselLastSeen {
  mmsi: string;
  lat: number;
  lon: number;
  lastSeenMs: number;
}

export interface LaunchRow {
  id: string;
  name: string;
  provider: string | null;
  pad_name: string | null;
  status: string | null;
  window_start: string | null;
}
