// Canonical entity adapters: database rows -> the shared Entity model the UI
// renders. Provider-specific shapes never reach components.
import type {
  AircraftEntity,
  Entity,
  LaunchEntity,
  SatelliteEntity,
  ShipEntity,
} from "@/domain/entities";
import type {
  AircraftSnapshotRow,
  LaunchSnapshotRow,
  SatelliteSnapshotRow,
  VesselSnapshotRow,
} from "@/api/live.functions";

export const SOURCE_ATTRIBUTION = [
  { label: "ADSB.lol", href: "https://adsb.lol", scope: "Aircraft" },
  { label: "AISStream", href: "https://aisstream.io", scope: "Vessels" },
  { label: "CelesTrak", href: "https://celestrak.org", scope: "Satellites" },
  {
    label: "Launch Library 2",
    href: "https://thespacedevs.com",
    scope: "Launches",
  },
] as const;

export function aircraftFromRow(row: AircraftSnapshotRow): AircraftEntity | null {
  if (row.lat == null || row.lon == null) return null;
  const callsign = row.callsign?.trim() || row.icao24.toUpperCase();
  return {
    id: `ac-${row.icao24}`,
    type: "aircraft",
    name: callsign,
    lat: row.lat,
    lon: row.lon,
    updatedAt: new Date(row.updated_at),
    icao24: row.icao24,
    callsign,
    altitudeM: row.altitude_m,
    velocityMs: row.velocity_ms,
    headingDeg: row.heading_deg,
    verticalRateMs: row.vertical_rate_ms,
    onGround: row.on_ground ?? false,
    affiliation: "Unknown",
    classification: row.on_ground ? "On ground" : "Airborne",
    riskScore: 0,
  };
}

export function vesselFromRow(row: VesselSnapshotRow): ShipEntity | null {
  if (row.lat == null || row.lon == null) return null;
  const name = row.ship_name?.trim() || `MMSI ${row.mmsi}`;
  return {
    id: `sh-${row.mmsi}`,
    type: "ship",
    name,
    lat: row.lat,
    lon: row.lon,
    updatedAt: new Date(row.updated_at),
    mmsi: row.mmsi,
    shipName: name,
    speedKn: row.speed_kn,
    courseDeg: row.course_deg,
    headingDeg: row.heading_deg,
    shipType: row.ship_type,
    affiliation: "Unknown",
    classification: (row.speed_kn ?? 0) > 0.5 ? "Under way" : "Stationary",
    riskScore: 0,
  };
}

export interface PropagatedPosition {
  lat: number;
  lon: number;
  altitudeKm: number;
}

export function satelliteFromRow(
  row: SatelliteSnapshotRow,
  position: PropagatedPosition,
): SatelliteEntity {
  return {
    id: `sat-${row.norad_id}`,
    type: "satellite",
    name: row.name,
    lat: position.lat,
    lon: position.lon,
    updatedAt: new Date(row.updated_at),
    noradId: row.norad_id,
    tleLine1: row.tle_line1,
    tleLine2: row.tle_line2,
    category: row.category ?? "unknown",
    classification: `${Math.round(position.altitudeKm)} km orbit`,
    riskScore: 0,
  };
}

export function launchFromRow(row: LaunchSnapshotRow): LaunchEntity | null {
  if (row.pad_lat == null || row.pad_lon == null) return null;
  const start = row.window_start ? new Date(row.window_start) : new Date();
  const end = row.window_end ? new Date(row.window_end) : start;
  return {
    id: `ln-${row.id}`,
    type: "launch",
    name: row.name,
    lat: row.pad_lat,
    lon: row.pad_lon,
    updatedAt: new Date(row.updated_at),
    rocket: row.rocket ?? "Unknown rocket",
    mission: row.mission ?? "Unknown mission",
    provider: row.provider ?? "Unknown provider",
    padName: row.pad_name ?? "Unknown pad",
    windowStart: start,
    windowEnd: end,
    status: row.status ?? "Unknown",
    classification: row.status ?? "Scheduled",
    riskScore: 0,
  };
}

export function isFresh(entity: Entity, maxAgeMs = 5 * 60 * 1000): boolean {
  return Date.now() - entity.updatedAt.getTime() < maxAgeMs;
}
