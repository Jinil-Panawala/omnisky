// Shared ingestion processing: normalise -> validate -> deduplicate -> persist.
// The queue boundary is the database itself; each source has one processing pass.

export interface IngestResult {
  source: string;
  upserted: number;
}

export function validCoord(lat: unknown, lon: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180 &&
    !(lat === 0 && lon === 0)
  );
}

/** Keep the newest record per key. */
export function dedupe<T>(rows: T[], key: (row: T) => string): T[] {
  const map = new Map<string, T>();
  for (const row of rows) map.set(key(row), row);
  return [...map.values()];
}

export async function recordSourceHealth(
  sourceKey: string,
  outcome: { rows?: number; error?: string },
): Promise<void> {
  try {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const now = new Date().toISOString();
    if (outcome.error) {
      await supabaseAdmin
        .from("data_sources")
        .update({
          status: "error",
          last_error: outcome.error.slice(0, 500),
          last_error_at: now,
        })
        .eq("source_key", sourceKey);
    } else {
      await supabaseAdmin
        .from("data_sources")
        .update({
          status: "ok",
          last_success_at: now,
          rows_written: outcome.rows ?? 0,
          last_error: null,
        })
        .eq("source_key", sourceKey);
    }
  } catch (e) {
    console.error("recordSourceHealth failed", e);
  }
}

/** Seconds since a source last reported success, or null when never. */
export async function secondsSinceSuccess(
  sourceKey: string,
): Promise<number | null> {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  const { data } = await supabaseAdmin
    .from("data_sources")
    .select("last_success_at")
    .eq("source_key", sourceKey)
    .maybeSingle();
  const ts = data?.last_success_at;
  if (!ts) return null;
  return (Date.now() - new Date(ts).getTime()) / 1000;
}
