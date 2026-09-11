import { createFileRoute } from "@tanstack/react-router";
import { runIngestRoute } from "@/server/ingest/http.server";
import { ingestVessels } from "@/server/ingest/aisstream.server";

async function handle({ request }: { request: Request }): Promise<Response> {
  return runIngestRoute(request, ingestVessels);
}

export const Route = createFileRoute("/api/public/ingest/vessels")({
  server: { handlers: { POST: handle, GET: handle } },
});
