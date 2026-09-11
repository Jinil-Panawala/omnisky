import { createFileRoute } from "@tanstack/react-router";
import { runIngestRoute } from "@/server/http/ingest-route.server";
import { ingestAircraft } from "@/server/services/ingest/aircraft.service.server";

async function handle({ request }: { request: Request }): Promise<Response> {
  return runIngestRoute(request, ingestAircraft);
}

export const Route = createFileRoute("/api/public/ingest/aircraft")({
  server: { handlers: { POST: handle, GET: handle } },
});
