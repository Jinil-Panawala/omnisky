/**
 * Query layer for the daily digest: what happened in the last 24 hours, who
 * subscribed, and what has already been delivered.
 */
import type { Json } from "@/integrations/supabase/types";
import { getAdminClient } from "./client.server";

export interface DigestSourceRow {
  kind: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  detected_at: string;
}

export interface DigestRecord {
  digest_date: string;
  headline: string;
  summary: string;
  highlights: Json;
}

export interface Subscriber {
  id: string;
  display_name: string | null;
}

export async function findDigestSource(limit = 60): Promise<DigestSourceRow[]> {
  const client = await getAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data } = await client
    .from("insights")
    .select("kind, category, severity, title, description, detected_at")
    .gte("detected_at", since)
    .order("detected_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as DigestSourceRow[];
}

export async function countTracked(): Promise<{ aircraft: number; vessels: number }> {
  const client = await getAdminClient();
  const [aircraft, vessels] = await Promise.all([
    client.from("aircraft_positions").select("icao24", { count: "exact", head: true }),
    client.from("vessel_positions").select("mmsi", { count: "exact", head: true }),
  ]);
  return { aircraft: aircraft.count ?? 0, vessels: vessels.count ?? 0 };
}

export async function findDigest(date: string): Promise<DigestRecord | null> {
  const client = await getAdminClient();
  const { data } = await client
    .from("daily_digests")
    .select("digest_date, headline, summary, highlights")
    .eq("digest_date", date)
    .maybeSingle();
  return (data as DigestRecord | null) ?? null;
}

export async function saveDigest(record: {
  digest_date: string;
  headline: string;
  summary: string;
  highlights: Json;
  ai_generated: boolean;
}): Promise<void> {
  const client = await getAdminClient();
  await client.from("daily_digests").upsert(record, { onConflict: "digest_date" });
}

export async function findSubscribers(): Promise<Subscriber[]> {
  const client = await getAdminClient();
  const { data } = await client
    .from("profiles")
    .select("id, display_name")
    .eq("digest_enabled", true);
  return (data ?? []) as Subscriber[];
}

/** Inserts one delivery row per subscriber; conflicts mean "already sent today". */
export async function recordDeliveries(
  userIds: string[],
  date: string,
  status: string,
  detail?: string,
): Promise<number> {
  if (userIds.length === 0) return 0;
  const client = await getAdminClient();
  const rows = userIds.map((user_id) => ({ user_id, digest_date: date, status, detail: detail ?? null }));
  const { data } = await client
    .from("digest_deliveries")
    .upsert(rows, { onConflict: "user_id,digest_date", ignoreDuplicates: true })
    .select("id");
  return data?.length ?? 0;
}
