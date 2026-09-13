/**
 * Live-data service: the only backend entry point the client uses for reads.
 * It composes the query layer (`src/server/db`) and the ingestion services;
 * `src/functions/live.functions.ts` exposes these as RPC with no logic of its own.
 */
import { ON_DEMAND_REFRESH_MIN_INTERVAL_S, SNAPSHOT_LIMITS } from "@/domain/constants";
import { SOURCE_KEYS, type LiveSnapshot, type SnapshotInput, type TrackInput, type TrackPoint } from "@/domain/live";
import { getPublicClient } from "@/server/db/client.server";
import {
  findAircraftInBounds,
  findLaunches,
  findSatellites,
  findSourceHealth,
  findTrack,
  findVesselsInBounds,
} from "@/server/db/snapshot.repository.server";
import { secondsSinceSuccess } from "@/server/db/sources.repository.server";
import { log } from "@/server/observability/log.server";

/** Everything the console renders in one round trip, scoped to the viewport. */
export async function getLiveSnapshot(input: SnapshotInput): Promise<LiveSnapshot> {
  const client = await getPublicClient();
  const bounds = input.bounds ?? null;
  const rows = Math.min(
    SNAPSHOT_LIMITS.maxRows,
    Math.max(SNAPSHOT_LIMITS.minRows, input.limit ?? SNAPSHOT_LIMITS.defaultRows),
  );

  const [aircraft, vessels, satellites, launches, sources] = await Promise.all([
    findAircraftInBounds(client, bounds, rows),
    findVesselsInBounds(client, bounds, rows),
    findSatellites(client),
    findLaunches(client),
    findSourceHealth(client),
  ]);

  return { aircraft, vessels, satellites, launches, sources, fetchedAt: new Date().toISOString() };
}

/** Recent trail for a single object — only ever fetched for the selection. */
export async function getObjectTrack(input: TrackInput): Promise<TrackPoint[]> {
  const client = await getPublicClient();
  return findTrack(client, input);
}

export interface RefreshResult {
  aircraft: number | null;
  vessels: number | null;
}

/**
 * Pulls fresh aircraft + vessel data while someone is watching the map.
 * Throttled per source so many open tabs cannot amplify provider load.
 */
export async function refreshLiveFeeds(): Promise<RefreshResult> {
  const [aircraft, vessels] = await Promise.all([
    runIfStale(SOURCE_KEYS.aircraft, async () => {
      const { ingestAircraft } = await import("@/server/services/ingest/aircraft.service.server");
      return (await ingestAircraft()).upserted;
    }),
    runIfStale(SOURCE_KEYS.vessels, async () => {
      const { ingestVessels } = await import("@/server/services/ingest/vessels.service.server");
      return (await ingestVessels()).upserted;
    }),
  ]);
  return { aircraft, vessels };
}

async function runIfStale(
  sourceKey: string,
  run: () => Promise<number>,
): Promise<number | null> {
  const age = await secondsSinceSuccess(sourceKey);
  if (age !== null && age <= ON_DEMAND_REFRESH_MIN_INTERVAL_S) return null;
  try {
    return await run();
  } catch (e) {
    log.error("live.refresh", `on-demand ingest failed for ${sourceKey}`, e);
    return null;
  }
}
