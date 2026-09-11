import { createFileRoute } from "@tanstack/react-router";
import { runIngestRoute } from "@/server/http/ingest-route.server";
import { ingestSatellites } from "@/server/services/ingest/satellites.service.server";

async function handle({ request }: { request: Request }): Promise<Response> {
  return runIngestRoute(request, ingestSatellites);
}

export const Route = createFileRoute("/api/public/ingest/satellites")({
  server: { handlers: { POST: handle, GET: handle } },
});
