import { AlertTriangle, ShieldAlert, Info } from "lucide-react";
import type { ActiveAlert } from "@/domain/console";
import { STRINGS } from "@/domain/strings";
import { formatRelativeShort, severityColorClass } from "./panel-format";

interface AlertsPanelProps {
  alerts: ActiveAlert[];
  onSelect: (alert: ActiveAlert) => void;
}

export function AlertsPanel({ alerts, onSelect }: AlertsPanelProps) {
  return (
    <div className="flex flex-col h-full bg-console-panel border-l border-console-border">
      <div className="flex items-center justify-between px-4 py-3 border-b border-console-border">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-alert" />
          <span className="text-xs font-semibold uppercase tracking-wider text-console-text">
            {STRINGS.panels.alerts}
          </span>
        </div>
        <span className="text-[10px] font-mono text-console-dim">{alerts.length} open</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {alerts.length === 0 && (
          <p className="p-3 text-[11px] leading-relaxed text-console-dim">
            {STRINGS.panels.alertsEmpty}
            <span className="block mt-1">{STRINGS.panels.alertsHint}</span>
          </p>
        )}
        {alerts.map((alert) => {
          const Icon =
            alert.severity === "critical"
              ? AlertTriangle
              : alert.severity === "warning"
                ? ShieldAlert
                : Info;
          const colorClass = severityColorClass(alert.severity);
          return (
            <button
              key={alert.id}
              onClick={() => onSelect(alert)}
              title={alert.location ? STRINGS.panels.clickToLocate : undefined}
              className="w-full text-left p-3 rounded-md bg-console-bg border border-console-border-subtle hover:border-console-border transition-colors"
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-4 h-4 mt-0.5 ${colorClass}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className={`text-[10px] font-mono uppercase ${colorClass}`}>
                      {alert.severity}
                    </span>
                    <span className="text-[10px] font-mono text-console-dim">
                      {formatRelativeShort(alert.timestamp)}
                    </span>
                  </div>
                  <h3 className="text-xs font-medium text-console-text leading-snug">
                    {alert.title}
                  </h3>
                  <p className="text-[11px] text-console-muted mt-1 line-clamp-2">
                    {alert.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
