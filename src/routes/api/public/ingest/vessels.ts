import { createFileRoute } from "@tanstack/react-router";
import { runIngestRoute } from "@/server/http/ingest-route.server";
import { ingestVessels } from "@/server/services/ingest/vessels.service.server";

async function handle({ request }: { request: Request }): Promise<Response> {
  return runIngestRoute(request, ingestVessels);
}

export const Route = createFileRoute("/api/public/ingest/vessels")({
  server: { handlers: { POST: handle, GET: handle } },
});
