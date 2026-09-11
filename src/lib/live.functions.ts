import { createServerFn } from "@tanstack/react-start";

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
export interface SnapshotBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface SnapshotInput {
  bounds?: SnapshotBounds | null;
  /** Rendering-density budget hint from the client. */
  limit?: number | null;
}

const MAX_ROWS = 8000;
const DEFAULT_ROWS = 3000;
const SATELLITE_LIMIT = 800;
const LAUNCH_LIMIT = 60;

async function publicClient() {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

interface SpatialFilterable {
  gte(column: string, value: number): SpatialFilterable;
  lte(column: string, value: number): SpatialFilterable;
  or(filter: string): SpatialFilterable;
}

/**
 * Applies the spatial predicate. Indexes on (lat, lon) keep the map from
 * triggering a full table scan on every camera move.
 */
function withinBounds<T>(query: T, bounds: SnapshotBounds | null): T {
  if (!bounds) return query;
  let q = query as unknown as SpatialFilterable;
  q = q.gte("lat", bounds.south).lte("lat", bounds.north);
  q =
    bounds.west <= bounds.east
      ? q.gte("lon", bounds.west).lte("lon", bounds.east)
      : q.or(`lon.gte.${bounds.west},lon.lte.${bounds.east}`);
  return q as unknown as T;
}

export const getLiveSnapshot = createServerFn({ method: "GET" })
  .inputValidator((data: SnapshotInput | undefined): SnapshotInput => data ?? {})
  .handler(async ({ data }): Promise<LiveSnapshot> => {
    const supabase = await publicClient();
    const bounds = data.bounds ?? null;
    const rows = Math.min(MAX_ROWS, Math.max(200, data.limit ?? DEFAULT_ROWS));

    const aircraftQuery = withinBounds(
      supabase
        .from("aircraft_positions")
        .select(
          "icao24, callsign, lat, lon, altitude_m, velocity_ms, heading_deg, vertical_rate_ms, on_ground, updated_at",
        ),
      bounds,
    )
      .order("updated_at", { ascending: false })
      .range(0, rows - 1);

    const vesselQuery = withinBounds(
      supabase
        .from("vessel_positions")
        .select(
          "mmsi, ship_name, lat, lon, speed_kn, course_deg, heading_deg, ship_type, updated_at",
        ),
      bounds,
    )
      .order("updated_at", { ascending: false })
      .range(0, rows - 1);

    const [aircraft, vessels, satellites, launches, sources] = await Promise.all([
      aircraftQuery,
      vesselQuery,
      supabase
        .from("satellite_tles")
        .select("norad_id, name, tle_line1, tle_line2, category, updated_at")
        .range(0, SATELLITE_LIMIT - 1),
      supabase
        .from("launches")
        .select(
          "id, name, rocket, mission, provider, pad_name, pad_lat, pad_lon, window_start, window_end, status, updated_at",
        )
        .order("window_start", { ascending: true })
        .limit(LAUNCH_LIMIT),
      supabase
        .from("data_sources")
        .select(
          "source_key, label, status, last_success_at, last_error, last_error_at, rows_written",
        ),
    ]);

    return {
      aircraft: (aircraft.data ?? []) as AircraftSnapshotRow[],
      vessels: (vessels.data ?? []) as VesselSnapshotRow[],
      satellites: (satellites.data ?? []) as SatelliteSnapshotRow[],
      launches: (launches.data ?? []) as LaunchSnapshotRow[],
      sources: (sources.data ?? []) as SourceHealthRow[],
      fetchedAt: new Date().toISOString(),
    };
  });

export interface TrackPoint {
  lat: number;
  lon: number;
  recorded_at: string;
}

export interface TrackInput {
  craftType: "aircraft" | "ship";
  craftId: string;
}

/** Recent trail for a single object — only ever fetched for the selection. */
export const getObjectTrack = createServerFn({ method: "GET" })
  .inputValidator((data: TrackInput): TrackInput => data)
  .handler(async ({ data }): Promise<TrackPoint[]> => {
    const supabase = await publicClient();
    const { data: rows } = await supabase
      .from("position_history")
      .select("lat, lon, recorded_at")
      .eq("craft_type", data.craftType)
      .eq("craft_id", data.craftId)
      .order("recorded_at", { ascending: true })
      .limit(200);
    return ((rows ?? []) as Array<{ lat: number | null; lon: number | null; recorded_at: string }>)
      .filter((r): r is TrackPoint => r.lat != null && r.lon != null)
      .map((r) => ({ lat: r.lat, lon: r.lon, recorded_at: r.recorded_at }));
  });

/**
 * Pulls fresh aircraft + vessel data on demand while someone is watching the
 * map. Throttled server-side so many open tabs cannot amplify provider load.
 */
export const refreshLiveFeeds = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ aircraft: number | null; vessels: number | null }> => {
    const { secondsSinceSuccess } = await import("@/lib/ingest/shared.server");
    const MIN_INTERVAL_S = 25;

    const result: { aircraft: number | null; vessels: number | null } = {
      aircraft: null,
      vessels: null,
    };

    const aircraftAge = await secondsSinceSuccess("adsb.lol");
    if (aircraftAge === null || aircraftAge > MIN_INTERVAL_S) {
      try {
        const { ingestAircraft } = await import("@/lib/ingest/adsb.server");
        result.aircraft = (await ingestAircraft()).upserted;
      } catch (e) {
        console.error("on-demand aircraft ingest failed", e);
      }
    }

    const vesselAge = await secondsSinceSuccess("aisstream");
    if (vesselAge === null || vesselAge > MIN_INTERVAL_S) {
      try {
        const { ingestVessels } = await import("@/lib/ingest/aisstream.server");
        result.vessels = (await ingestVessels()).upserted;
      } catch (e) {
        console.error("on-demand vessel ingest failed", e);
      }
    }

    return result;
  },
);
