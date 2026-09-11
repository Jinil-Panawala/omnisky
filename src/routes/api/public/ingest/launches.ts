import { createFileRoute } from "@tanstack/react-router";
import { runIngestRoute } from "@/server/ingest/http.server";
import { ingestLaunches } from "@/server/ingest/launchlibrary.server";

async function handle({ request }: { request: Request }): Promise<Response> {
  return runIngestRoute(request, ingestLaunches);
}

export const Route = createFileRoute("/api/public/ingest/launches")({
  server: { handlers: { POST: handle, GET: handle } },
});
