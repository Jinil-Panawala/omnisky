/**
 * Query layer for generated alerts / insights and for the raw rows the
 * detectors need. Services never write SQL themselves.
 */
import { INSIGHT_RULES } from "@/domain/insights";
import type {
  AircraftRow,
  HistoryPoint,
  InsightCandidate,
  InsightRecord,
  LaunchRow,
  VesselRow,
} from "@/domain/insights";
import { getAdminClient, getPublicClient } from "./client.server";

const JOB_ID = "default";
const LEASE_MINUTES = 5;

/* ----------------------------- reads for the console ----------------------------- */

export async function findInsights(limit = 40): Promise<InsightRecord[]> {
  const client = await getPublicClient();
  const { data } = await client
    .from("insights")
    .select("id, kind, category, severity, entity_type, entity_id, title, description, ai_generated, detected_at")
    .gt("expires_at", new Date().toISOString())
    .order("detected_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as InsightRecord[];
}

/* ----------------------------- reads for the detectors ---------------------------- */

export async function findRecentAircraft(limit = 5000): Promise<AircraftRow[]> {
  const client = await getAdminClient();
  const { data } = await client
    .from("aircraft_positions")
    .select("icao24, callsign, lat, lon, altitude_m, heading_deg, on_ground, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as AircraftRow[];
}

export async function countAircraft(): Promise<number> {
  const client = await getAdminClient();
  const { count } = await client
    .from("aircraft_positions")
    .select("icao24", { count: "exact", head: true });
  return count ?? 0;
}

export async function findRecentVessels(limit = 5000): Promise<VesselRow[]> {
  const client = await getAdminClient();
  const { data } = await client
    .from("vessel_positions")
    .select("mmsi, ship_name, lat, lon, speed_kn, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as VesselRow[];
}

export async function findLaunchWindow(): Promise<LaunchRow[]> {
  const client = await getAdminClient();
  const now = Date.now();
  const { data } = await client
    .from("launches")
    .select("id, name, provider, pad_name, status, window_start")
    .gte("window_start", new Date(now - INSIGHT_RULES.launch.behindHours * 3_600_000).toISOString())
    .lte("window_start", new Date(now + INSIGHT_RULES.launch.aheadHours * 3_600_000).toISOString())
    .limit(20);
  return (data ?? []) as unknown as LaunchRow[];
}

export async function findAircraftHistory(minutes = 90, limit = 8000): Promise<HistoryPoint[]> {
  const client = await getAdminClient();
  const { data } = await client
    .from("position_history")
    .select("craft_id, lat, lon, recorded_at")
    .eq("craft_type", "aircraft")
    .gte("recorded_at", new Date(Date.now() - minutes * 60_000).toISOString())
    .order("recorded_at", { ascending: true })
    .limit(limit);
  return ((data ?? []) as Array<Partial<HistoryPoint>>).filter(
    (p): p is HistoryPoint => p.lat != null && p.lon != null && !!p.craft_id && !!p.recorded_at,
  );
}

/* ----------------------------- writes ----------------------------- */

export async function saveInsights(
  candidates: InsightCandidate[],
  aiGenerated: boolean,
): Promise<number> {
  if (candidates.length === 0) return 0;
  const client = await getAdminClient();
  const expiresAt = new Date(Date.now() + INSIGHT_RULES.lifetimeHours * 3_600_000).toISOString();
  const rows = candidates.map((c) => ({
    kind: c.kind,
    category: c.category,
    severity: c.severity,
    entity_type: c.entityType,
    entity_id: c.entityId,
    title: c.title,
    description: c.description,
    signal: c.signal,
    ai_generated: aiGenerated,
    dedup_key: c.dedupKey,
    detected_at: new Date().toISOString(),
    expires_at: expiresAt,
  }));
  const { error } = await client
    .from("insights")
    .upsert(rows as never, { onConflict: "dedup_key", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
  return rows.length;
}

/** Drops candidates already reported in the current dedup bucket. */
export async function filterNewCandidates(
  candidates: InsightCandidate[],
): Promise<InsightCandidate[]> {
  if (candidates.length === 0) return [];
  const client = await getAdminClient();
  const { data } = await client
    .from("insights")
    .select("dedup_key")
    .in("dedup_key", candidates.map((c) => c.dedupKey));
  const seen = new Set(((data ?? []) as Array<{ dedup_key: string }>).map((r) => r.dedup_key));
  return candidates.filter((c) => !seen.has(c.dedupKey));
}

export async function pruneExpiredInsights(): Promise<void> {
  const client = await getAdminClient();
  await client.from("insights").delete().lt("expires_at", new Date().toISOString());
}

/* ----------------------------- job state ----------------------------- */

export interface InsightJobState {
  status: "idle" | "running" | "paused";
  pause_reason: string | null;
  lease_expires_at: string | null;
  last_run_at: string | null;
  last_aircraft_count: number | null;
}

export async function readJobState(): Promise<InsightJobState | null> {
  const client = await getAdminClient();
  const { data } = await client
    .from("insight_jobs")
    .select("status, pause_reason, lease_expires_at, last_run_at, last_aircraft_count")
    .eq("id", JOB_ID)
    .maybeSingle();
  return (data ?? null) as unknown as InsightJobState | null;
}

/** Single-flight lease: false when another run holds an unexpired lease. */
export async function acquireLease(): Promise<boolean> {
  const client = await getAdminClient();
  const now = new Date();
  const state = await readJobState();
  if (
    state?.status === "running" &&
    state.lease_expires_at &&
    new Date(state.lease_expires_at) > now
  ) {
    return false;
  }
  const { error } = await client
    .from("insight_jobs")
    .update({
      status: "running",
      lease_expires_at: new Date(now.getTime() + LEASE_MINUTES * 60_000).toISOString(),
    } as never)
    .eq("id", JOB_ID);
  return !error;
}

export async function releaseLease(patch: {
  status: "idle" | "paused";
  pauseReason?: string | null;
  aircraftCount?: number | null;
}): Promise<void> {
  const client = await getAdminClient();
  await client
    .from("insight_jobs")
    .update({
      status: patch.status,
      pause_reason: patch.pauseReason ?? null,
      lease_expires_at: null,
      last_run_at: new Date().toISOString(),
      ...(patch.aircraftCount != null ? { last_aircraft_count: patch.aircraftCount } : {}),
    } as never)
    .eq("id", JOB_ID);
}
