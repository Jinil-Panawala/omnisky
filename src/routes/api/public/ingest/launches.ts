import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

// Launch Library 2: upcoming + recent rocket launches -> launches table.
const UPCOMING_URL =
  "https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=60&mode=detailed";
const PREVIOUS_URL =
  "https://ll.thespacedevs.com/2.2.0/launch/previous/?limit=20&mode=detailed";

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

interface Ll2Launch {
  id: string;
  name: string;
  window_start?: string | null;
  window_end?: string | null;
  status?: { name?: string; abbrev?: string };
  rocket?: { configuration?: { full_name?: string; name?: string } };
  mission?: { name?: string; description?: string };
  launch_service_provider?: { name?: string };
  pad?: { name?: string; latitude?: string | null; longitude?: string | null };
}

function toRow(l: Ll2Launch) {
  const lat = l.pad?.latitude ? Number(l.pad.latitude) : null;
  const lon = l.pad?.longitude ? Number(l.pad.longitude) : null;
  return {
    id: l.id,
    name: l.name,
    rocket: l.rocket?.configuration?.full_name ?? l.rocket?.configuration?.name ?? null,
    mission: l.mission?.name ?? null,
    provider: l.launch_service_provider?.name ?? null,
    pad_name: l.pad?.name ?? null,
    pad_lat: lat,
    pad_lon: lon,
    window_start: l.window_start ?? null,
    window_end: l.window_end ?? null,
    status: l.status?.name ?? l.status?.abbrev ?? null,
    updated_at: new Date().toISOString(),
  };
}

export const Route = createFileRoute("/api/public/ingest/launches")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await authorized(request))) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const rows: Array<ReturnType<typeof toRow>> = [];
          for (const url of [UPCOMING_URL, PREVIOUS_URL]) {
            const res = await fetch(url, {
              headers: { Accept: "application/json" },
              signal: AbortSignal.timeout(15000),
            });
            if (!res.ok) {
              const body = await res.text();
              console.error(`LL2 fetch failed [${res.status}]: ${body}`);
              continue;
            }
            const data = (await res.json()) as { results?: Ll2Launch[] };
            for (const l of data.results ?? []) rows.push(toRow(l));
          }
          const { supabaseAdmin } = await import(
            "@/integrations/supabase/client.server"
          );
          if (rows.length > 0) {
            const { error } = await supabaseAdmin
              .from("launches")
              .upsert(rows, { onConflict: "id" });
            if (error) throw new Error(error.message);
          }
          // Drop launches whose window ended more than 3 days ago
          await supabaseAdmin
            .from("launches")
            .delete()
            .lt(
              "window_end",
              new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            );
          return Response.json({ ok: true, upserted: rows.length });
        } catch (e) {
          console.error("launch ingest error", e);
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
