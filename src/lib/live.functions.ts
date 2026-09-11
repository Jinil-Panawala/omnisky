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

const AIRCRAFT_LIMIT = 2000;
const VESSEL_LIMIT = 2000;
const SATELLITE_LIMIT = 600;
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

export const getLiveSnapshot = createServerFn({ method: "GET" }).handler(
  async (): Promise<LiveSnapshot> => {
    const supabase = await publicClient();
    const [aircraft, vessels, satellites, launches, sources] = await Promise.all([
      supabase
        .from("aircraft_positions")
        .select(
          "icao24, callsign, lat, lon, altitude_m, velocity_ms, heading_deg, vertical_rate_ms, on_ground, updated_at",
        )
        .order("updated_at", { ascending: false })
        .limit(AIRCRAFT_LIMIT),
      supabase
        .from("vessel_positions")
        .select(
          "mmsi, ship_name, lat, lon, speed_kn, course_deg, heading_deg, ship_type, updated_at",
        )
        .order("updated_at", { ascending: false })
        .limit(VESSEL_LIMIT),
      supabase
        .from("satellite_tles")
        .select("norad_id, name, tle_line1, tle_line2, category, updated_at")
        .limit(SATELLITE_LIMIT),
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
