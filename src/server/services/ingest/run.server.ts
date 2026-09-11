/**
 * Shared ingestion pipeline wrapper: run a provider pass, record feed health
 * on success or failure, and return a uniform result. Every ingestion service
 * goes through this so error handling is defined once.
 */
import type { IngestResult } from "@/domain/live";
import { recordSourceHealth } from "@/server/db/sources.repository.server";

export async function runIngest(
  source: string,
  pass: () => Promise<number>,
): Promise<IngestResult> {
  try {
    const upserted = await pass();
    await recordSourceHealth(source, { rows: upserted });
    return { source, upserted };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await recordSourceHealth(source, { error: message });
    throw e;
  }
}
