import { SlidersHorizontal, TriangleAlert, ListOrdered, PanelRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PanelVisibility {
  filters: boolean;
  alerts: boolean;
  feed: boolean;
  details: boolean;
}

interface PanelTogglesProps {
  panels: PanelVisibility;
  onToggle: (key: keyof PanelVisibility) => void;
}

const ITEMS: Array<{ key: keyof PanelVisibility; label: string; Icon: typeof PanelRight }> = [
  { key: "filters", label: "Filters", Icon: SlidersHorizontal },
  { key: "alerts", label: "Alerts", Icon: TriangleAlert },
  { key: "feed", label: "Feed", Icon: ListOrdered },
  { key: "details", label: "Details", Icon: PanelRight },
];

/** Show/hide side panels so the map can take the full width. */
export function PanelToggles({ panels, onToggle }: PanelTogglesProps) {
  return (
    <div className="flex items-center gap-1 pr-3 shrink-0">
      {ITEMS.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onToggle(key)}
          aria-pressed={panels[key]}
          title={`${panels[key] ? "Hide" : "Show"} ${label.toLowerCase()}`}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-[4px] border text-[10px] font-mono uppercase tracking-wider transition-colors",
            panels[key]
              ? "border-primary/40 bg-primary/15 text-primary"
              : "border-console-border-subtle text-console-dim hover:text-console-text",
          )}
        >
          <Icon className="w-3 h-3" />
          <span className="hidden md:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
