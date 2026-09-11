/**
 * Read side of the query layer: every SELECT the console needs, expressed once.
 * Repositories know about tables and columns; services know about use cases.
 */
import { SNAPSHOT_LIMITS } from "@/domain/constants";
import type {
  AircraftSnapshotRow,
  LaunchSnapshotRow,
  SatelliteSnapshotRow,
  SnapshotBounds,
  SourceHealthRow,
  TrackInput,
  TrackPoint,
  VesselSnapshotRow,
} from "@/domain/live";
import { getPublicClient } from "./client.server";

const AIRCRAFT_COLUMNS =
  "icao24, callsign, lat, lon, altitude_m, velocity_ms, heading_deg, vertical_rate_ms, on_ground, updated_at";
const VESSEL_COLUMNS =
  "mmsi, ship_name, lat, lon, speed_kn, course_deg, heading_deg, ship_type, updated_at";
const SATELLITE_COLUMNS = "norad_id, name, tle_line1, tle_line2, category, updated_at";
const LAUNCH_COLUMNS =
  "id, name, rocket, mission, provider, pad_name, pad_lat, pad_lon, window_start, window_end, status, updated_at";
const SOURCE_COLUMNS =
  "source_key, label, status, last_success_at, last_error, last_error_at, rows_written";

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

type Client = Awaited<ReturnType<typeof getPublicClient>>;

export async function findAircraftInBounds(
  client: Client,
  bounds: SnapshotBounds | null,
  rows: number,
): Promise<AircraftSnapshotRow[]> {
  const { data } = await withinBounds(
    client.from("aircraft_positions").select(AIRCRAFT_COLUMNS),
    bounds,
  )
    .order("updated_at", { ascending: false })
    .range(0, rows - 1);
  return (data ?? []) as AircraftSnapshotRow[];
}

export async function findVesselsInBounds(
  client: Client,
  bounds: SnapshotBounds | null,
  rows: number,
): Promise<VesselSnapshotRow[]> {
  const { data } = await withinBounds(
    client.from("vessel_positions").select(VESSEL_COLUMNS),
    bounds,
  )
    .order("updated_at", { ascending: false })
    .range(0, rows - 1);
  return (data ?? []) as VesselSnapshotRow[];
}

export async function findSatellites(client: Client): Promise<SatelliteSnapshotRow[]> {
  const { data } = await client
    .from("satellite_tles")
    .select(SATELLITE_COLUMNS)
    .range(0, SNAPSHOT_LIMITS.satellites - 1);
  return (data ?? []) as SatelliteSnapshotRow[];
}

export async function findLaunches(client: Client): Promise<LaunchSnapshotRow[]> {
  const { data } = await client
    .from("launches")
    .select(LAUNCH_COLUMNS)
    .order("window_start", { ascending: true })
    .limit(SNAPSHOT_LIMITS.launches);
  return (data ?? []) as LaunchSnapshotRow[];
}

export async function findSourceHealth(client: Client): Promise<SourceHealthRow[]> {
  const { data } = await client.from("data_sources").select(SOURCE_COLUMNS);
  return (data ?? []) as SourceHealthRow[];
}

export async function findTrack(
  client: Client,
  { craftType, craftId }: TrackInput,
): Promise<TrackPoint[]> {
  const { data } = await client
    .from("position_history")
    .select("lat, lon, recorded_at")
    .eq("craft_type", craftType)
    .eq("craft_id", craftId)
    .order("recorded_at", { ascending: true })
    .limit(SNAPSHOT_LIMITS.trackPoints);
  return ((data ?? []) as Array<{ lat: number | null; lon: number | null; recorded_at: string }>)
    .filter((r): r is TrackPoint => r.lat != null && r.lon != null)
    .map((r) => ({ lat: r.lat, lon: r.lon, recorded_at: r.recorded_at }));
}
