/**
 * Wire format between the backend snapshot API and the browser.
 * Rows mirror database columns (snake_case); adapters in
 * `src/lib/live/adapters.ts` turn them into the `Entity` model the UI uses.
 */
import type { GeoBounds } from "./console";

export interface AircraftSnapshotRow {
  icao24: string;
  callsign: string | null;
  lat: number | null;
  lon: number | null;
  altitude_m: number | null;
  velocity_ms: number | null;
  heading_deg: number | null;
  vertical_rate_ms: number | null;
  on_ground: boolean | null;
  updated_at: string;
}

export interface VesselSnapshotRow {
  mmsi: string;
  ship_name: string | null;
  lat: number | null;
  lon: number | null;
  speed_kn: number | null;
  course_deg: number | null;
  heading_deg: number | null;
  ship_type: string | null;
  updated_at: string;
}

export interface SatelliteSnapshotRow {
  norad_id: number;
  name: string;
  tle_line1: string;
  tle_line2: string;
  category: string | null;
  updated_at: string;
}

export interface LaunchSnapshotRow {
  id: string;
  name: string;
  rocket: string | null;
  mission: string | null;
  provider: string | null;
  pad_name: string | null;
  pad_lat: number | null;
  pad_lon: number | null;
  window_start: string | null;
  window_end: string | null;
  status: string | null;
  updated_at: string;
}

export interface SourceHealthRow {
  source_key: string;
  label: string;
  status: string;
  last_success_at: string | null;
  last_error: string | null;
  last_error_at: string | null;
  rows_written: number;
}

export interface LiveSnapshot {
  aircraft: AircraftSnapshotRow[];
  vessels: VesselSnapshotRow[];
  satellites: SatelliteSnapshotRow[];
  launches: LaunchSnapshotRow[];
  sources: SourceHealthRow[];
  fetchedAt: string;
}

/** Viewport-scoped query input; null bounds means "whole globe". */
export type SnapshotBounds = GeoBounds;

export interface SnapshotInput {
  bounds?: SnapshotBounds | null;
  /** Rendering-density budget hint from the client. */
  limit?: number | null;
}

export interface TrackPoint {
  lat: number;
  lon: number;
  recorded_at: string;
}

export interface TrackInput {
  craftType: "aircraft" | "ship";
  craftId: string;
}

/** Result of a provider pull, reported by the ingestion layer. */
export interface IngestResult {
  source: string;
  upserted: number;
}

/** Keys used in the `data_sources` health table. */
export const SOURCE_KEYS = {
  aircraft: "adsb.lol",
  vessels: "aisstream",
  satellites: "celestrak",
  launches: "launchlibrary",
} as const;
