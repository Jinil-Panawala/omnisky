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

/** Viewport-scoped query input. Null bounds means "whole globe". */
export interface SnapshotBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface SnapshotInput {
  bounds?: SnapshotBounds | null;
  /** Rendering density budget hint from the client. */
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

type Filterable = {
  gte: (col: string, v: number) => Filterable;
  lte: (col: string, v: number) => Filterable;
  or: (expr: string) => Filterable;
};

/** Applies the spatial predicate; indexes on (lat, lon) keep this off full scans. */
function applyBounds<T extends Filterable>(query: T, bounds?: SnapshotBounds | null): T {
  if (!bounds) return query;
  let q = query.gte("lat", bounds.south).lte("lat", bounds.north) as T;
  if (bounds.west <= bounds.east) {
    q = q.gte("lon", bounds.west).lte("lon", bounds.east) as T;
  } else {
    q = q.or(`lon.gte.${bounds.west},lon.lte.${bounds.east}`) as T;
  }
  return q;
}

export const getLiveSnapshot = createServerFn({ method: "GET" })
  .inputValidator((data: SnapshotInput | undefined): SnapshotInput => data ?? {})
  .handler(async ({ data }): Promise<LiveSnapshot> => {
    const supabase = await publicClient();
    const bounds = data.bounds ?? null;
    const rows = Math.min(MAX_ROWS, Math.max(200, data.limit ?? DEFAULT_ROWS));

    const [aircraft, vessels, satellites, launches, sources] = await Promise.all([
      applyBounds(
        supabase
          .from("aircraft_positions")
          .select(
            "icao24, callsign, lat, lon, altitude_m, velocity_ms, heading_deg, vertical_rate_ms, on_ground, updated_at",
          ) as unknown as Filterable,
        bounds,
      )
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .  // placeholder
        , 
      supabase,
    ]);


    return {
      aircraft: (aircraft.data ?? []) as AircraftSnapshotRow[],
      vessels: (vessels.data ?? []) as VesselSnapshotRow[],
      satellites: (satellites.data ?? []) as SatelliteSnapshotRow[],
      launches: (launches.data ?? []) as LaunchSnapshotRow[],
      sources: (sources.data ?? []) as SourceHealthRow[],
      fetchedAt: new Date().toISOString(),
    };
  },
);

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
