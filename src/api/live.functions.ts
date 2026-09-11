/**
 * Client-callable RPC surface. These are thin wrappers: all logic lives in
 * `src/server/services`, all SQL in `src/server/db`.
 */
import { createServerFn } from "@tanstack/react-start";
import type { LiveSnapshot, SnapshotInput, TrackInput, TrackPoint } from "@/domain/live";

export const getLiveSnapshot = createServerFn({ method: "GET" })
  .inputValidator((data: SnapshotInput | undefined): SnapshotInput => data ?? {})
  .handler(async ({ data }): Promise<LiveSnapshot> => {
    const service = await import("@/server/services/live.service.server");
    return service.getLiveSnapshot(data);
  });

export const getObjectTrack = createServerFn({ method: "GET" })
  .inputValidator((data: TrackInput): TrackInput => data)
  .handler(async ({ data }): Promise<TrackPoint[]> => {
    const service = await import("@/server/services/live.service.server");
    return service.getObjectTrack(data);
  });

export const refreshLiveFeeds = createServerFn({ method: "POST" }).handler(async () => {
  const service = await import("@/server/services/live.service.server");
  return service.refreshLiveFeeds();
});
