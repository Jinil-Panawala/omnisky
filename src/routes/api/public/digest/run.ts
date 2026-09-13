import { createFileRoute } from "@tanstack/react-router";
import { authorizedIngest } from "@/server/http/ingest-route.server";

/** Scheduled daily digest composition (pg_cron, once a day). */
async function handle({ request }: { request: Request }): Promise<Response> {
  if (!(await authorizedIngest(request))) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const force = new URL(request.url).searchParams.get("force") === "1";
    const service = await import("@/server/services/digest/run.service.server");
    const result = await service.runDailyDigest(force);
    return Response.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("digest run failed", message);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/public/digest/run")({
  server: { handlers: { POST: handle, GET: handle } },
});
