/**
 * Client-callable RPC for generated alerts and AI insights.
 * Thin wrapper: logic lives in `src/server/services/insights`.
 */
import { createServerFn } from "@tanstack/react-start";
import type { InsightFeed } from "@/server/services/insights/list.service.server";

export const getInsightFeed = createServerFn({ method: "GET" }).handler(
  async (): Promise<InsightFeed> => {
    const service = await import("@/server/services/insights/list.service.server");
    return service.listInsightFeed();
  },
);
