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
import { COVERAGE_REGIONS } from "./coverage-regions";

const REGION_RADIUS_NM = 250;
const MAX_AIRCRAFT = 20000;
// ADSB.lol rate-limits bursts hard (429 after a handful of calls), so each pull
// covers a rotating slice of the world and positions are kept until they age
// out — a few pulls in, the whole map is populated.
const REGIONS_PER_PULL = 3;
const REGION_PACE_MS = 2000;
const HISTORY_SAMPLE_CAP = 500;
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
  const groups = Math.ceil(COVERAGE_REGIONS.length / REGIONS_PER_PULL);
  const group = Math.floor(Date.now() / 30000) % groups;
  const start = group * REGIONS_PER_PULL;
  return COVERAGE_REGIONS.slice(start, start + REGIONS_PER_PULL);
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

