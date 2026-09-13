import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getInsightFeed } from "@/api/insights.functions";
import { INSIGHT_FEED_POLL_MS } from "@/domain/constants";
import type { ActiveAlert, AiInsight } from "@/domain/entities";

export interface InsightFeedState {
  alerts: ActiveAlert[];
  insights: AiInsight[];
  generatedAt: Date | null;
  loading: boolean;
}

/**
 * Generated alerts/insights are produced by a scheduled backend job, so the
 * browser only polls the stored result — it never triggers a model call.
 */
export function useInsightFeed(enabled: boolean): InsightFeedState {
  const fetchFeed = useServerFn(getInsightFeed);
  const { data, isLoading } = useQuery({
    queryKey: ["insight-feed"],
    queryFn: () => fetchFeed(),
    enabled,
    refetchInterval: INSIGHT_FEED_POLL_MS,
    staleTime: INSIGHT_FEED_POLL_MS,
  });

  return {
    alerts: (data?.alerts ?? []).map((a) => ({ ...a, timestamp: new Date(a.timestamp) })),
    insights: (data?.insights ?? []).map((i) => ({ ...i, timestamp: new Date(i.timestamp) })),
    generatedAt: data?.generatedAt ? new Date(data.generatedAt) : null,
    loading: isLoading,
  };
}
