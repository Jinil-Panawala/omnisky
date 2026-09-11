import { Clock, Bookmark, Plane, Ship, Satellite, Rocket, AlertTriangle } from "lucide-react";
import type { TimelineEvent, EntityType } from "../types";

interface TimelineFeedProps {
  events: TimelineEvent[];
  onSelect: (entityId: string, type: EntityType) => void;
}

const typeIcons: Record<EntityType | "alert", React.ComponentType<{ className?: string }>> = {
  aircraft: Plane,
  ship: Ship,
  satellite: Satellite,
  launch: Rocket,
  alert: AlertTriangle,
};

function formatRelative(date: Date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diff < 1) return "now";
  if (diff < 60) return `${diff}m ago`;
  const hours = Math.floor(diff / 60);
  return `${hours}h ago`;
}

export function TimelineFeed({ events, onSelect }: TimelineFeedProps) {
  return (
    <div className="flex flex-col h-full bg-console-panel border-l border-console-border">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-console-border">
        <Clock className="w-4 h-4 text-console-muted" />
        <span className="text-xs font-semibold uppercase tracking-wider text-console-text">Event Feed</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {events.map((event) => {
          const Icon = typeIcons[event.type];
          return (
            <button
              key={event.id}
              onClick={() => onSelect(event.entityId, event.type === "alert" ? "aircraft" : event.type)}
              className="w-full text-left p-3 rounded-md bg-console-bg border border-console-border-subtle hover:border-console-border transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 rounded bg-console-panel-raised border border-console-border-subtle text-console-muted group-hover:text-console-text">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-mono text-console-dim uppercase">{event.type}</span>
                    <span className="text-[10px] font-mono text-console-dim">{formatRelative(event.timestamp)}</span>
                  </div>
                  <h3 className="text-xs font-medium text-console-text leading-snug">{event.title}</h3>
                  <p className="text-[11px] text-console-muted mt-1 line-clamp-2">{event.description}</p>
                </div>
                {event.bookmarked && (
                  <svg className="w-3 h-3 text-primary flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M5 3h14v18l-7-5-7 5V3z" />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
