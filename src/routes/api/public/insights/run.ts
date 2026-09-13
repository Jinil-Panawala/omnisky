import { createFileRoute } from "@tanstack/react-router";
import { authorizedIngest } from "@/server/http/ingest-route.server";
import { log } from "@/server/observability/log.server";

/** Scheduled insight generation (pg_cron, every 10 minutes). */
async function handle({ request }: { request: Request }): Promise<Response> {
  if (!(await authorizedIngest(request))) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const service = await import("@/server/services/insights/run.service.server");
    const result = await service.runInsightGeneration();
    return Response.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log.error("api.insights", "insight run failed", message);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/public/insights/run")({
  server: { handlers: { POST: handle, GET: handle } },
});
