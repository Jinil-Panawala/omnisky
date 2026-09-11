import { Sparkles, BrainCircuit } from "lucide-react";
import type { AiInsight } from "./types";

interface AiInsightsProps {
  insights: AiInsight[];
}

function formatRelative(date: Date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diff < 1) return "now";
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ago`;
}

export function AiInsights({ insights }: AiInsightsProps) {
  return (
    <div className="flex flex-col h-full bg-console-panel border-l border-console-border">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-console-border">
        <BrainCircuit className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-console-text">AI Insights</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {insights.map((insight) => {
          const colorClass = insight.severity === "critical" ? "text-alert" : insight.severity === "warning" ? "text-alert-warning" : "text-alert-info";
          return (
            <div key={insight.id} className="p-3 rounded-md bg-console-bg border border-console-border-subtle">
              <div className="flex items-start gap-3">
                <Sparkles className={`w-4 h-4 mt-0.5 ${colorClass}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className={`text-[10px] font-mono uppercase ${colorClass}`}>{insight.category}</span>
                    <span className="text-[10px] font-mono text-console-dim">{formatRelative(insight.timestamp)}</span>
                  </div>
                  <h3 className="text-xs font-medium text-console-text leading-snug">{insight.title}</h3>
                  <p className="text-[11px] text-console-muted mt-1">{insight.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
