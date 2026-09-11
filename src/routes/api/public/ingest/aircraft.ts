import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

// ADSB.lol global snapshot -> upsert latest aircraft positions.
// Called by pg_cron every minute. Auth: cron secret bearer OR publishable apikey.
const ADSB_URL = "https://api.adsb.lol/v2/all";
const MAX_AIRCRAFT = 5000;
const BATCH = 500;

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

async function handlePost({ request }: { request: Request }): Promise<Response> {
  if (!(await authorized(request))) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const res = await fetch(ADSB_URL, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`ADSB.lol fetch failed [${res.status}]: ${body}`);
      return Response.json(
        { ok: false, status: res.status, error: body.slice(0, 500) },
        { status: 502 },
      );
    }
    const data = (await res.json()) as {
      ac?: Array<Record<string, unknown>>;
    };
    const list = (data.ac ?? [])
      .filter(
        (a) =>
          typeof a["lat"] === "number" && typeof a["lon"] === "number",
      )
      .slice(0, MAX_AIRCRAFT);

    const rows = list.map((a) => ({
      icao24: String(a["hex"] ?? ""),
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
      updated_at: new Date().toISOString(),
    })).filter((r) => r.icao24.length > 0);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    let upserted = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      const { error } = await supabaseAdmin
        .from("aircraft_positions")
        .upsert(chunk, { onConflict: "icao24" });
      if (error) throw new Error(error.message);
      upserted += chunk.length;
    }

    // History sample (bounded): every Nth aircraft
    const historyRows = rows
      .filter((_, i) => i % 10 === 0)
      .map((r) => ({
        craft_type: "aircraft" as const,
        craft_id: r.icao24,
        lat: r.lat,
        lon: r.lon,
        altitude_m: r.altitude_m,
        speed: r.velocity_ms,
      }));
    if (historyRows.length > 0) {
      await supabaseAdmin
        .from("position_history")
        .insert(historyRows.slice(0, BATCH));
    }

    // Prune stale aircraft not seen for 10 minutes
    await supabaseAdmin
      .from("aircraft_positions")
      .delete()
      .lt(
        "updated_at",
        new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      );

    return Response.json({ ok: true, upserted });
  } catch (e) {
    console.error("aircraft ingest error", e);
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export const Route = createFileRoute("/api/public/ingest/aircraft")({
  server: {
    handlers: {
      POST: handlePost,
      GET: handlePost,
    },
  },
});
