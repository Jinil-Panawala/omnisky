/**
 * Write side of the query layer. Every ingestion write goes through here, so
 * batching, conflict targets and retention pruning are defined in one place.
 */
import { getAdminClient } from "./client.server";

const UPSERT_BATCH = 500;

export interface PositionHistoryRow {
  craft_type: "aircraft" | "vessel";
  craft_id: string;
  lat: number | null;
  lon: number | null;
  altitude_m: number | null;
  speed: number | null;
}

/** Upsert in fixed-size batches; returns the number of rows written. */
async function upsertBatched(
  table: string,
  rows: object[],
  onConflict: string,
): Promise<number> {
  if (rows.length === 0) return 0;
  const supabase = await getAdminClient();
  let written = 0;
  for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
    const chunk = rows.slice(i, i + UPSERT_BATCH);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) throw new Error(error.message);
    written += chunk.length;
  }
  return written;
}

export const upsertAircraftPositions = (rows: object[]) =>
  upsertBatched("aircraft_positions", rows, "icao24");

export const upsertVesselPositions = (rows: object[]) =>
  upsertBatched("vessel_positions", rows, "mmsi");

export const upsertSatelliteTles = (rows: object[]) =>
  upsertBatched("satellite_tles", rows, "norad_id");

export const upsertLaunches = (rows: object[]) => upsertBatched("launches", rows, "id");

export async function insertPositionHistory(rows: PositionHistoryRow[]): Promise<void> {
  if (rows.length === 0) return;
  const supabase = await getAdminClient();
  await supabase.from("position_history").insert(rows);
}

/** Delete rows whose timestamp column is older than `cutoff` milliseconds ago. */
export async function pruneOlderThan(
  table: string,
  column: string,
  maxAgeMs: number,
): Promise<void> {
  const supabase = await getAdminClient();
  await supabase
    .from(table)
    .delete()
    .lt(column, new Date(Date.now() - maxAgeMs).toISOString());
}
