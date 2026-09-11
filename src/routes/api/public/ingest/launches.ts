import { createFileRoute } from "@tanstack/react-router";
import { runIngestRoute } from "@/server/http/ingest-route.server";
import { ingestLaunches } from "@/server/services/ingest/launches.service.server";

async function handle({ request }: { request: Request }): Promise<Response> {
  return runIngestRoute(request, ingestLaunches);
}

export const Route = createFileRoute("/api/public/ingest/launches")({
  server: { handlers: { POST: handle, GET: handle } },
});
