/** Feed-health bookkeeping in the `data_sources` table. */
import { getAdminClient } from "./client.server";

export async function recordSourceHealth(
  sourceKey: string,
  outcome: { rows?: number; error?: string },
): Promise<void> {
  try {
    const supabase = await getAdminClient();
    const now = new Date().toISOString();
    const patch = outcome.error
      ? {
          status: "error",
          last_error: outcome.error.slice(0, 500),
          last_error_at: now,
        }
      : {
          status: "ok",
          last_success_at: now,
          rows_written: outcome.rows ?? 0,
          last_error: null,
        };
    await supabase.from("data_sources").update(patch).eq("source_key", sourceKey);
  } catch (e) {
    console.error("recordSourceHealth failed", e);
  }
}

/** Seconds since a source last reported success, or null when never. */
export async function secondsSinceSuccess(sourceKey: string): Promise<number | null> {
  const supabase = await getAdminClient();
  const { data } = await supabase
    .from("data_sources")
    .select("last_success_at")
    .eq("source_key", sourceKey)
    .maybeSingle();
  const ts = data?.last_success_at;
  if (!ts) return null;
  return (Date.now() - new Date(ts).getTime()) / 1000;
}
