import { Layers, Plane, Ship, Satellite, Rocket, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LayerVisibility } from "@/domain/console";

interface ControlPanelProps {
  layers: LayerVisibility;
  onToggleLayer: (key: keyof LayerVisibility) => void;
  onRefresh?: () => void;
}

const layerItems: {
  key: keyof LayerVisibility;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
}[] = [
  { key: "aircraft", label: "Aircraft", icon: Plane, colorClass: "text-aircraft" },
  { key: "ship", label: "Ships", icon: Ship, colorClass: "text-ship" },
  { key: "satellite", label: "Satellites", icon: Satellite, colorClass: "text-satellite" },
  { key: "launch", label: "Launches", icon: Rocket, colorClass: "text-launch" },
];

export function ControlPanel({ layers, onToggleLayer, onRefresh }: ControlPanelProps) {
  return (
    <div className="w-14 flex flex-col items-center gap-3 py-3 bg-console-panel border-r border-console-border shrink-0">
      <div className="p-1.5 rounded-md bg-console-panel-raised border border-console-border">
        <Layers className="w-4 h-4 text-console-muted" />
      </div>
      {layerItems.map((item) => {
        const Icon = item.icon;
        const active = layers[item.key];
        return (
          <Button
            key={item.key}
            variant="ghost"
            size="icon"
            title={item.label}
            onClick={() => onToggleLayer(item.key)}
            className={`relative w-9 h-9 rounded-md border transition-all ${
              active
                ? `bg-console-panel-raised border-current ${item.colorClass} console-glow`
                : "border-console-border-subtle text-console-dim hover:text-console-text hover:bg-console-panel-raised"
            }`}
          >
            <Icon className="w-4 h-4" />
            {!active && (
              <span className="absolute bottom-0.5 right-0.5 w-1 h-1 rounded-full bg-console-dim" />
            )}
          </Button>
        );
      })}
      <div className="mt-auto">
        <Button
          variant="ghost"
          size="icon"
          title="Refresh data"
          onClick={onRefresh}
          className="w-9 h-9 rounded-md border border-console-border-subtle text-console-muted hover:text-console-text hover:bg-console-panel-raised"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
