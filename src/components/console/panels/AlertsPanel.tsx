import { AlertTriangle, ShieldAlert, Info } from "lucide-react";
import type { ActiveAlert } from "@/domain/console";

interface AlertsPanelProps {
  alerts: ActiveAlert[];
  onSelect: (entityId: string) => void;
}

function formatRelative(date: Date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diff < 1) return "now";
  if (diff < 60) return `${diff}m`;
  return `${Math.floor(diff / 60)}h`;
}

export function AlertsPanel({ alerts, onSelect }: AlertsPanelProps) {
  return (
    <div className="flex flex-col h-full bg-console-panel border-l border-console-border">
      <div className="flex items-center justify-between px-4 py-3 border-b border-console-border">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-alert" />
          <span className="text-xs font-semibold uppercase tracking-wider text-console-text">Active Alerts</span>
        </div>
        <span className="text-[10px] font-mono text-console-dim">{alerts.length} open</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {alerts.map((alert) => {
          const Icon = alert.severity === "critical" ? AlertTriangle : alert.severity === "warning" ? ShieldAlert : Info;
          const colorClass = alert.severity === "critical" ? "text-alert" : alert.severity === "warning" ? "text-alert-warning" : "text-alert-info";
          return (
            <button
              key={alert.id}
              onClick={() => onSelect(alert.entityId)}
              className="w-full text-left p-3 rounded-md bg-console-bg border border-console-border-subtle hover:border-console-border transition-colors"
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-4 h-4 mt-0.5 ${colorClass}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className={`text-[10px] font-mono uppercase ${colorClass}`}>{alert.severity}</span>
                    <span className="text-[10px] font-mono text-console-dim">{formatRelative(alert.timestamp)}</span>
                  </div>
                  <h3 className="text-xs font-medium text-console-text leading-snug">{alert.title}</h3>
                  <p className="text-[11px] text-console-muted mt-1 line-clamp-2">{alert.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
