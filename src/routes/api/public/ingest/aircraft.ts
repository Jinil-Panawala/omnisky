import { createFileRoute } from "@tanstack/react-router";
import { runIngestRoute } from "@/lib/ingest/http.server";
import { ingestAircraft } from "@/lib/ingest/adsb.server";

async function handle({ request }: { request: Request }): Promise<Response> {
  return runIngestRoute(request, ingestAircraft);
}

export const Route = createFileRoute("/api/public/ingest/aircraft")({
  server: { handlers: { POST: handle, GET: handle } },
});
