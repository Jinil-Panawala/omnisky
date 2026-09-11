// Launch Library 2 adapter. Free, keyless, rate limited (~15 req/hour anonymous).
import { dedupe, recordSourceHealth, type IngestResult } from "./shared.server";

export const LAUNCH_SOURCE = "launchlibrary2";

const UPCOMING_URL =
  "https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=100";
const PREVIOUS_URL =
  "https://ll.thespacedevs.com/2.2.0/launch/previous/?limit=50";

interface Ll2Launch {
  id?: string;
  name?: string;
  rocket?: { configuration?: { name?: string; full_name?: string } };
  mission?: { name?: string };
  launch_service_provider?: { name?: string };
  pad?: {
    name?: string;
    latitude?: string | number | null;
    longitude?: string | number | null;
  };
  window_start?: string;
  window_end?: string;
  status?: { name?: string; abbrev?: string };
}

function num(value: string | number | null | undefined): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function toRow(l: Ll2Launch) {
  return {
    id: l.id ?? crypto.randomUUID(),
    name: l.name ?? "Unknown launch",
    rocket:
      l.rocket?.configuration?.full_name ??
      l.rocket?.configuration?.name ??
      null,
    mission: l.mission?.name ?? null,
    provider: l.launch_service_provider?.name ?? null,
    pad_name: l.pad?.name ?? null,
    pad_lat: num(l.pad?.latitude),
    pad_lon: num(l.pad?.longitude),
    window_start: l.window_start ?? null,
    window_end: l.window_end ?? null,
    status: l.status?.name ?? l.status?.abbrev ?? null,
    updated_at: new Date().toISOString(),
  };
}

export async function ingestLaunches(): Promise<IngestResult> {
  try {
    const collected: Array<ReturnType<typeof toRow>> = [];
    for (const url of [UPCOMING_URL, PREVIOUS_URL]) {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        console.error(`LL2 fetch failed [${res.status}]`);
        continue;
      }
      const data = (await res.json()) as { results?: Ll2Launch[] };
      for (const l of data.results ?? []) collected.push(toRow(l));
    }
    const rows = dedupe(collected, (r) => r.id);


    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    if (rows.length > 0) {
      const { error } = await supabaseAdmin
        .from("launches")
        .upsert(rows, { onConflict: "id" });
      if (error) throw new Error(error.message);
    }
    await supabaseAdmin
      .from("launches")
      .delete()
      .lt(
        "window_end",
        new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      );

    await recordSourceHealth(LAUNCH_SOURCE, { rows: rows.length });
    return { source: LAUNCH_SOURCE, upserted: rows.length };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await recordSourceHealth(LAUNCH_SOURCE, { error: message });
    throw e;
  }
}
