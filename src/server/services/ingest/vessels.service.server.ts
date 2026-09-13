// AISStream adapter + processing pass for vessels.
// Free API key (server-side only). Worldwide bounding box, capped sample per tick.
import { dedupe, POSITION_TTL_MS, validCoord } from "@/domain/ingest";
import type { IngestResult } from "@/domain/live";
import {
  insertPositionHistory,
  pruneOlderThan,
  upsertVesselPositions,
} from "@/server/db/positions.repository.server";
import { runIngest } from "./run.server";
import { log } from "@/server/observability/log.server";

const COLLECT_MS = 8000;
const MAX_VESSELS = 2000;
const HISTORY_SAMPLE_CAP = 200;
export const VESSEL_SOURCE = "aisstream";

interface AisMessage {
  MessageType?: string;
  MetaData?: {
    MMSI?: number;
    ShipName?: string;
    latitude?: number;
    longitude?: number;
    time_utc?: string;
  };
  Message?: {
    PositionReport?: { Sog?: number; Cog?: number; TrueHeading?: number };
    StandardClassBPositionReport?: {
      Sog?: number;
      Cog?: number;
      TrueHeading?: number;
    };
  };
}

export interface VesselRow {
  mmsi: string;
  ship_name: string | null;
  lat: number;
  lon: number;
  speed_kn: number | null;
  course_deg: number | null;
  heading_deg: number | null;
  ship_type: string | null;
  updated_at: string;
}

function collectVessels(apiKey: string): Promise<VesselRow[]> {
  return new Promise((resolve) => {
    const vessels: VesselRow[] = [];
    let ws: WebSocket;
    try {
      ws = new WebSocket("wss://stream.aisstream.io/v0/stream");
    } catch (e) {
      log.error("ingest.vessels", "AISStream socket could not be opened", e);
      resolve([]);
      return;
    }
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws.close();
      } catch {
        /* noop */
      }
      resolve(dedupe(vessels, (v) => v.mmsi).slice(0, MAX_VESSELS));
    };
    const timer = setTimeout(done, COLLECT_MS);

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          APIKey: apiKey,
          BoundingBoxes: [
            [
              [-90, -180],
              [90, 180],
            ],
          ],
          FilterMessageTypes: [
            "PositionReport",
            "StandardClassBPositionReport",
          ],
        }),
      );
    };
    ws.onerror = (event) => {
      log.error("ingest.vessels", "AISStream socket error", event);
      done();
    };
    ws.onclose = () => done();
    const handleText = (text: string) => {
      try {
        const msg = JSON.parse(text) as AisMessage;
        const meta = msg.MetaData;
        if (!meta?.MMSI || !validCoord(meta.latitude, meta.longitude)) return;
        const report =
          msg.Message?.PositionReport ??
          msg.Message?.StandardClassBPositionReport;
        vessels.push({
          mmsi: String(meta.MMSI),
          ship_name: meta.ShipName?.trim() || null,
          lat: meta.latitude as number,
          lon: meta.longitude as number,
          speed_kn:
            typeof report?.Sog === "number" && report.Sog < 102.3
              ? report.Sog
              : null,
          course_deg: typeof report?.Cog === "number" ? report.Cog : null,
          heading_deg:
            typeof report?.TrueHeading === "number" &&
            report.TrueHeading !== 511
              ? report.TrueHeading
              : null,
          ship_type: null,
          updated_at: new Date().toISOString(),
        });
      } catch {
        /* ignore malformed message */
      }
    };

    ws.onmessage = (event: MessageEvent) => {
      const data: unknown = event.data;
      if (typeof data === "string") {
        handleText(data);
      } else if (data instanceof ArrayBuffer) {
        handleText(new TextDecoder().decode(data));
      } else if (data && typeof (data as Blob).text === "function") {
        void (data as Blob).text().then(handleText).catch(() => undefined);
      }
    };
  });
}

export function ingestVessels(): Promise<IngestResult> {
  return runIngest(VESSEL_SOURCE, async () => {
    const apiKey = process.env["AISSTREAM_API_KEY"];
    if (!apiKey) throw new Error("AISSTREAM_API_KEY not configured");

    const rows = await collectVessels(apiKey);
    if (rows.length === 0) return 0;

    const upserted = await upsertVesselPositions(rows);

    await insertPositionHistory(
      rows.slice(0, HISTORY_SAMPLE_CAP).map((r) => ({
        craft_type: "vessel" as const,
        craft_id: r.mmsi,
        lat: r.lat,
        lon: r.lon,
        altitude_m: null,
        speed: r.speed_kn,
      })),
    );

    await pruneOlderThan("vessel_positions", "updated_at", POSITION_TTL_MS);
    return upserted;
  });
}

