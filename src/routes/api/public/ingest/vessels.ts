import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

// AISStream websocket: connect for a short window per tick, collect position
// reports, upsert vessel positions. Requires AISSTREAM_API_KEY secret.
const COLLECT_MS = 8000;
const MAX_VESSELS = 2000;

async function authorized(request: Request): Promise<boolean> {
  const cronDeny = await authenticateCronRequest(request);
  if (cronDeny === null) return true;
  const apikey =
    request.headers.get("apikey") ??
    request.headers.get("x-apikey") ??
    "";
  return (
    apikey.length > 0 && apikey === process.env["SUPABASE_PUBLISHABLE_KEY"]
  );
}

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
    PositionReport?: {
      Sog?: number;
      Cog?: number;
      TrueHeading?: number;
    };
    StandardClassBPositionReport?: {
      Sog?: number;
      Cog?: number;
      TrueHeading?: number;
    };
  };
}

async function collectVessels(apiKey: string): Promise<
  Array<{
    mmsi: string;
    ship_name: string | null;
    lat: number;
    lon: number;
    speed_kn: number | null;
    course_deg: number | null;
    heading_deg: number | null;
    ship_type: string | null;
    updated_at: string;
  }>
> {
  return new Promise((resolve) => {
    const vessels = new Map<string, (typeof rows)[number]>();
    const rows: Array<never> = [];
    let ws: WebSocket;
    try {
      ws = new WebSocket("wss://stream.aisstream.io/v0/stream");
    } catch {
      resolve([]);
      return;
    }
    const done = () => {
      try {
        ws.close();
      } catch {
        /* noop */
      }
      resolve([...vessels.values()].slice(0, MAX_VESSELS));
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
    ws.onerror = () => {
      clearTimeout(timer);
      done();
    };
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(String(event.data)) as AisMessage;
        const meta = msg.MetaData;
        if (
          !meta?.MMSI ||
          typeof meta.latitude !== "number" ||
          typeof meta.longitude !== "number"
        ) {
          return;
        }
        const report =
          msg.Message?.PositionReport ??
          msg.Message?.StandardClassBPositionReport;
        const mmsi = String(meta.MMSI);
        vessels.set(mmsi, {
          mmsi,
          ship_name: meta.ShipName?.trim() || null,
          lat: meta.latitude,
          lon: meta.longitude,
          speed_kn: typeof report?.Sog === "number" ? report.Sog : null,
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
  });
}

export const Route = createFileRoute("/api/public/ingest/vessels")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await authorized(request))) {
          return new Response("Unauthorized", { status: 401 });
        }
        const apiKey = process.env["AISSTREAM_API_KEY"];
        if (!apiKey) {
          return Response.json(
            { ok: false, error: "AISSTREAM_API_KEY not configured" },
            { status: 503 },
          );
        }
        try {
          const rows = await collectVessels(apiKey);
          if (rows.length === 0) {
            return Response.json({ ok: true, upserted: 0 });
          }
          const { supabaseAdmin } = await import(
            "@/integrations/supabase/client.server"
          );
          const { error } = await supabaseAdmin
            .from("vessel_positions")
            .upsert(rows, { onConflict: "mmsi" });
          if (error) throw new Error(error.message);

          await supabaseAdmin.from("position_history").insert(
            rows.slice(0, 200).map((r) => ({
              craft_type: "vessel",
              craft_id: r.mmsi,
              lat: r.lat,
              lon: r.lon,
              altitude_m: null,
              speed: r.speed_kn,
            })),
          );

          await supabaseAdmin
            .from("vessel_positions")
            .delete()
            .lt(
              "updated_at",
              new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            );

          return Response.json({ ok: true, upserted: rows.length });
        } catch (e) {
          console.error("vessel ingest error", e);
          return Response.json(
            { ok: false, error: e instanceof Error ? e.message : String(e) },
            { status: 500 },
          );
        }
      },
      GET: async ({ request }) =>
        Route.options.server!.handlers!.POST!({ request } as never),
    },
  },
});
