import { Sparkles, BrainCircuit } from "lucide-react";
import type { AiInsight } from "@/domain/console";
import { STRINGS } from "@/domain/strings";
import { formatRelativeShort, severityColorClass } from "./panel-format";

interface AiInsightsProps {
  insights: AiInsight[];
  onSelect?: ((insight: AiInsight) => void) | undefined;
}

export function AiInsights({ insights, onSelect }: AiInsightsProps) {
  return (
    <div className="flex flex-col h-full bg-console-panel border-l border-console-border">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-console-border">
        <BrainCircuit className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-console-text">
          {STRINGS.panels.insights}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {insights.length === 0 && (
          <p className="p-3 text-[11px] leading-relaxed text-console-dim">
            {STRINGS.panels.insightsEmpty}
          </p>
        )}
        {insights.map((insight) => {
          const colorClass = severityColorClass(insight.severity);
          return (
            <button
              key={insight.id}
              type="button"
              onClick={() => onSelect?.(insight)}
              title={insight.location ? STRINGS.panels.clickToLocate : undefined}
              className="w-full text-left p-3 rounded-md bg-console-bg border border-console-border-subtle hover:border-console-border transition-colors"
            >
              <div className="flex items-start gap-3">
                <Sparkles className={`w-4 h-4 mt-0.5 ${colorClass}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className={`text-[10px] font-mono uppercase ${colorClass}`}>
                      {insight.category}
                    </span>
                    <span className="text-[10px] font-mono text-console-dim">
                      {formatRelativeShort(insight.timestamp)}
                    </span>
                  </div>
                  <h3 className="text-xs font-medium text-console-text leading-snug">
                    {insight.title}
                  </h3>
                  <p className="text-[11px] text-console-muted mt-1">{insight.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
