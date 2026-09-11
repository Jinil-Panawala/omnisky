// ADSB.lol adapter + processing pass for aircraft.
// Free, keyless, courtesy API. Attribution required; coverage is not complete.
import { dedupe, POSITION_TTL_MS, validCoord } from "@/domain/ingest";
import type { IngestResult } from "@/domain/live";
import {
  insertPositionHistory,
  pruneOlderThan,
  upsertAircraftPositions,
} from "@/server/db/positions.repository.server";
import { runIngest } from "./run.server";

// The global /v2/all snapshot is frequently rate-limited, so sample the world
// with radius queries (250 nm cap per query) and merge the results. Coverage
// still depends on volunteer ground receivers, so mid-ocean gaps remain where
// no receiver can hear an aircraft.
const REGIONS: Array<[number, number]> = [
  // North America
  [40.6, -73.8], // New York
  [33.9, -118.4], // Los Angeles
  [41.9, -87.9], // Chicago
  [29.6, -95.3], // Houston
  [25.8, -80.3], // Miami
  [37.6, -122.4], // San Francisco
  [43.7, -79.6], // Toronto
  [39.8, -104.7], // Denver
  [47.5, -122.3], // Seattle
  [19.4, -99.1], // Mexico City
  [21.3, -157.9], // Honolulu
  [61.2, -149.9], // Anchorage
  // North Atlantic corridor
  [47.6, -52.7], // Gander / NL
  [44.9, -63.5], // Halifax
  [64.1, -21.9], // Reykjavik
  [61.6, -6.8], // Faroe Islands
  [52.7, -8.9], // Shannon
  [37.7, -25.7], // Azores
  [32.4, -64.7], // Bermuda
  [64.2, -51.7], // Nuuk
  [18.4, -66.0], // San Juan
  // Europe
  [51.5, -0.1], // London
  [50.0, 8.6], // Frankfurt
  [40.5, -3.6], // Madrid
  [41.9, 12.5], // Rome
  [59.6, 17.9], // Stockholm
  [52.3, 4.8], // Amsterdam
  [37.9, 23.7], // Athens
  [55.7, 37.6], // Moscow
  [41.0, 28.8], // Istanbul
  // Africa & Middle East
  [30.1, 31.4], // Cairo
  [6.6, 3.3], // Lagos
  [-1.3, 36.9], // Nairobi
  [-26.1, 28.2], // Johannesburg
  [-33.9, 18.6], // Cape Town
  [25.3, 55.4], // Dubai
  [24.7, 46.7], // Riyadh
  // Asia
  [28.6, 77.1], // Delhi
  [19.1, 72.9], // Mumbai
  [13.7, 100.7], // Bangkok
  [1.36, 103.99], // Singapore
  [-6.1, 106.7], // Jakarta
  [22.3, 114.2], // Hong Kong
  [31.2, 121.5], // Shanghai
  [39.5, 116.4], // Beijing
  [37.5, 126.8], // Seoul
  [35.6, 139.8], // Tokyo
  [14.5, 121.0], // Manila
  // Oceania & South America
  [-33.9, 151.2], // Sydney
  [-37.7, 144.8], // Melbourne
  [-36.9, 174.8], // Auckland
  [-18.1, 178.4], // Fiji
  [-23.5, -46.6], // Sao Paulo
  [-34.8, -58.5], // Buenos Aires
  [-12.0, -77.1], // Lima
  [4.7, -74.1], // Bogota
  [-33.4, -70.8], // Santiago
];
const REGION_RADIUS_NM = 250;
const MAX_AIRCRAFT = 20000;
// ADSB.lol rate-limits bursts hard (429 after a handful of calls), so each pull
// covers a rotating slice of the world and positions are kept until they age
// out — a few pulls in, the whole map is populated.
const REGIONS_PER_PULL = 3;
const REGION_PACE_MS = 2000;
const POSITION_TTL_MS = 30 * 60 * 1000;
const BATCH = 500;
export const AIRCRAFT_SOURCE = "adsb.lol";

interface AircraftRow {
  icao24: string;
  callsign: string | null;
  lat: number;
  lon: number;
  altitude_m: number | null;
  velocity_ms: number | null;
  heading_deg: number | null;
  vertical_rate_ms: number | null;
  on_ground: boolean;
  updated_at: string;
}

function normalise(raw: Array<Record<string, unknown>>): AircraftRow[] {
  const now = new Date().toISOString();
  const rows = raw
    .filter((a) => validCoord(a["lat"], a["lon"]))
    .map((a) => ({
      icao24: String(a["hex"] ?? "").trim(),
      callsign:
        typeof a["flight"] === "string" ? (a["flight"] as string).trim() : null,
      lat: a["lat"] as number,
      lon: a["lon"] as number,
      altitude_m:
        typeof a["alt_baro"] === "number"
          ? (a["alt_baro"] as number) * 0.3048
          : null,
      velocity_ms:
        typeof a["gs"] === "number" ? (a["gs"] as number) * 0.514444 : null,
      heading_deg:
        typeof a["track"] === "number" ? (a["track"] as number) : null,
      vertical_rate_ms:
        typeof a["baro_rate"] === "number"
          ? (a["baro_rate"] as number) * 0.00508
          : null,
      on_ground: a["alt_baro"] === "ground",
      updated_at: now,
    }))
    .filter((r) => r.icao24.length > 0);
  return dedupe(rows, (r) => r.icao24).slice(0, MAX_AIRCRAFT);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchRegionOnce(
  lat: number,
  lon: number,
): Promise<Array<Record<string, unknown>>> {
  const res = await fetch(
    `https://api.adsb.lol/v2/point/${lat}/${lon}/${REGION_RADIUS_NM}`,
    {
      headers: {
        Accept: "application/json",
        // ADSB.lol requires an identifying User-Agent with contact info.
        "User-Agent":
          "OmniSky/1.0 (open-data traffic map; contact via https://lovable.dev)",
      },
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!res.ok) throw new Error(`ADSB.lol [${res.status}]`);
  const data = (await res.json()) as { ac?: Array<Record<string, unknown>> };
  return data.ac ?? [];
}

/** The courtesy API throttles bursts, so back off once on failure. */
async function fetchRegion(
  lat: number,
  lon: number,
): Promise<Array<Record<string, unknown>>> {
  try {
    return await fetchRegionOnce(lat, lon);
  } catch {
    await sleep(2000);
    return fetchRegionOnce(lat, lon);
  }
}

/** Rotate through the region list so consecutive pulls cover the whole globe. */
function regionSlice(): Array<[number, number]> {
  const groups = Math.ceil(REGIONS.length / REGIONS_PER_PULL);
  const group = Math.floor(Date.now() / 30000) % groups;
  const start = group * REGIONS_PER_PULL;
  return REGIONS.slice(start, start + REGIONS_PER_PULL);
}

export function ingestAircraft(): Promise<IngestResult> {
  return runIngest(AIRCRAFT_SOURCE, async () => {
    const raw: Array<Record<string, unknown>> = [];
    const failures: string[] = [];
    for (const [lat, lon] of regionSlice()) {
      try {
        raw.push(...(await fetchRegion(lat, lon)));
      } catch (e) {
        failures.push(String(e));
      }
      await sleep(REGION_PACE_MS);
    }
    if (raw.length === 0) {
      throw new Error(
        `ADSB.lol returned no aircraft (${failures[0] ?? "empty response"})`,
      );
    }

    const rows = normalise(raw);
    const upserted = await upsertAircraftPositions(rows);

    // Sample every 10th aircraft for trails; full history would be enormous.
    await insertPositionHistory(
      rows
        .filter((_, i) => i % 10 === 0)
        .slice(0, HISTORY_SAMPLE_CAP)
        .map((r) => ({
          craft_type: "aircraft" as const,
          craft_id: r.icao24,
          lat: r.lat,
          lon: r.lon,
          altitude_m: r.altitude_m,
          speed: r.velocity_ms,
        })),
    );

    await pruneOlderThan("aircraft_positions", "updated_at", POSITION_TTL_MS);
    return upserted;
  });
}

