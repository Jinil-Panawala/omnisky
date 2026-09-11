import { createFileRoute } from "@tanstack/react-router";
import { runIngestRoute } from "@/server/ingest/http.server";
import { ingestSatellites } from "@/server/ingest/celestrak.server";

async function handle({ request }: { request: Request }): Promise<Response> {
  return runIngestRoute(request, ingestSatellites);
}

export const Route = createFileRoute("/api/public/ingest/satellites")({
  server: { handlers: { POST: handle, GET: handle } },
});
