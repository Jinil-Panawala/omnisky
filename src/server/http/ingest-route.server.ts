import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import type { IngestResult } from "@/domain/live";

/** Cron secret bearer OR the publishable apikey header. */
export async function authorizedIngest(request: Request): Promise<boolean> {
  const cronDeny = await authenticateCronRequest(request);
  if (cronDeny === null) return true;
  const apikey =
    request.headers.get("apikey") ?? request.headers.get("x-apikey") ?? "";
  return apikey.length > 0 && apikey === process.env["SUPABASE_PUBLISHABLE_KEY"];
}

export async function runIngestRoute(
  request: Request,
  run: () => Promise<IngestResult>,
): Promise<Response> {
  if (!(await authorizedIngest(request))) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const result = await run();
    return Response.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("ingest failed", message);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
