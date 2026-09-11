import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getLiveSnapshot,
  refreshLiveFeeds,
  type LiveSnapshot,
  type SourceHealthRow,
} from "@/api/live.functions";
import {
  aircraftFromRow,
  launchFromRow,
  satelliteFromRow,
  vesselFromRow,
} from "@/lib/live/adapters";
import type { Entity, SatelliteEntity, TimelineEvent } from "@/domain/entities";

const SNAPSHOT_INTERVAL_MS = 20000;
const REFRESH_INTERVAL_MS = 30000;
const PROPAGATE_INTERVAL_MS = 1500;

export type FeedStatus = "connecting" | "live" | "stale" | "error";

export interface LiveState {
  entities: Entity[];
  events: TimelineEvent[];
  sources: SourceHealthRow[];
  status: FeedStatus;
  lastUpdated: Date | null;
  loading: boolean;
  fetching: boolean;
  refresh: () => void;
}

/** Propagate TLEs in the browser so satellites move smoothly between pulls. */
function useSatellitePositions(
  snapshot: LiveSnapshot | undefined,
  enabled: boolean,
): SatelliteEntity[] {
  const [satellites, setSatellites] = useState<SatelliteEntity[]>([]);
  const rows = snapshot?.satellites;

  useEffect(() => {
    if (!enabled || !rows || rows.length === 0) {
      setSatellites([]);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    void (async () => {
      const satlib = await import("satellite.js");
      if (cancelled) return;

      const propagate = () => {
        const now = new Date();
        const gmst = satlib.gstime(now);
        const out: SatelliteEntity[] = [];
        for (const row of rows) {
          try {
            const rec = satlib.twoline2satrec(row.tle_line1, row.tle_line2);
            const pv = satlib.propagate(rec, now);
            const position = pv?.position;
            if (!position || typeof position === "boolean") continue;
            const geo = satlib.eciToGeodetic(position, gmst);
            const lat = satlib.degreesLat(geo.latitude);
            const lon = satlib.degreesLong(geo.longitude);
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
            out.push(satelliteFromRow(row, { lat, lon, altitudeKm: geo.height }));
          } catch {
            /* skip malformed TLE */
          }
        }
        if (!cancelled) setSatellites(out);
      };

      propagate();
      timer = setInterval(propagate, PROPAGATE_INTERVAL_MS);
    })();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [rows, enabled]);

  return satellites;
}

export interface LiveViewport {
  bounds: { west: number; south: number; east: number; north: number } | null;
  limit: number;
}

export function useLiveEntities(enabled: boolean, viewport?: LiveViewport): LiveState {
  const fetchSnapshot = useServerFn(getLiveSnapshot);
  const triggerRefresh = useServerFn(refreshLiveFeeds);
  const kickedOff = useRef(false);

  // Round the bounds so small camera jitters do not invalidate the cache.
  const bounds = viewport?.bounds ?? null;
  const roundedKey = bounds
    ? [bounds.west, bounds.south, bounds.east, bounds.north].map((v) => Math.round(v * 2) / 2)
    : null;
  const limit = viewport?.limit ?? 3000;

  const query = useQuery({
    queryKey: ["live-snapshot", roundedKey, limit],
    queryFn: () => fetchSnapshot({ data: { bounds, limit } }),
    enabled,
    refetchInterval: enabled ? SNAPSHOT_INTERVAL_MS : false,
    staleTime: SNAPSHOT_INTERVAL_MS,
    // Keep the previous objects on the globe while the new viewport loads.
    placeholderData: (prev) => prev,
  });


  // Keep the feeds warm while somebody is watching the map.
  useEffect(() => {
    if (!enabled) return;
    const run = () => {
      void triggerRefresh({ data: undefined }).catch(() => undefined);
    };
    if (!kickedOff.current) {
      kickedOff.current = true;
      run();
    }
    const timer = setInterval(run, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [enabled, triggerRefresh]);

  const snapshot = query.data;
  const satellites = useSatellitePositions(snapshot, enabled);

  const entities = useMemo<Entity[]>(() => {
    if (!snapshot) return [];
    const list: Entity[] = [];
    for (const row of snapshot.aircraft) {
      const e = aircraftFromRow(row);
      if (e) list.push(e);
    }
    for (const row of snapshot.vessels) {
      const e = vesselFromRow(row);
      if (e) list.push(e);
    }
    for (const row of snapshot.launches) {
      const e = launchFromRow(row);
      if (e) list.push(e);
    }
    return [...list, ...satellites];
  }, [snapshot, satellites]);

  const events = useMemo<TimelineEvent[]>(() => {
    if (!snapshot) return [];
    const items: TimelineEvent[] = [];
    for (const row of snapshot.launches.slice(0, 6)) {
      items.push({
        id: `ev-launch-${row.id}`,
        timestamp: new Date(row.window_start ?? row.updated_at),
        type: "launch",
        entityId: `ln-${row.id}`,
        title: row.name,
        description: `${row.status ?? "Scheduled"} — ${row.pad_name ?? "unknown pad"}`,
      });
    }
    for (const row of snapshot.aircraft.slice(0, 8)) {
      items.push({
        id: `ev-ac-${row.icao24}`,
        timestamp: new Date(row.updated_at),
        type: "aircraft",
        entityId: `ac-${row.icao24}`,
        title: row.callsign?.trim() || row.icao24.toUpperCase(),
        description: `Position report received via ADSB.lol`,
      });
    }
    for (const row of snapshot.vessels.slice(0, 8)) {
      items.push({
        id: `ev-sh-${row.mmsi}`,
        timestamp: new Date(row.updated_at),
        type: "ship",
        entityId: `sh-${row.mmsi}`,
        title: row.ship_name?.trim() || `MMSI ${row.mmsi}`,
        description: `AIS position report received via AISStream`,
      });
    }
    return items
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 20);
  }, [snapshot]);

  const status: FeedStatus = useMemo(() => {
    if (!enabled) return "connecting";
    if (query.isError) return "error";
    if (!snapshot) return "connecting";
    const newest = snapshot.sources
      .map((s) => (s.last_success_at ? new Date(s.last_success_at).getTime() : 0))
      .reduce((a, b) => Math.max(a, b), 0);
    if (newest === 0) return "connecting";
    return Date.now() - newest < 5 * 60 * 1000 ? "live" : "stale";
  }, [enabled, query.isError, snapshot]);

  const refresh = useCallback(() => {
    void triggerRefresh({ data: undefined }).catch(() => undefined);
    void query.refetch();
  }, [query, triggerRefresh]);

  return {
    entities,
    events,
    sources: snapshot?.sources ?? [],
    status,
    lastUpdated: snapshot ? new Date(snapshot.fetchedAt) : null,
    loading: query.isLoading,
    fetching: query.isFetching,
    refresh,
  };
}
