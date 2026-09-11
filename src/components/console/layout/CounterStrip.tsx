import { Plane, Ship, Satellite, Rocket, AlertTriangle } from "lucide-react";

interface CounterStripProps {
  counts: {
    aircraft: number;
    ships: number;
    satellites: number;
    launches: number;
    alerts: number;
  };
  active?: keyof CounterStripProps["counts"];
}

const items: {
  key: keyof CounterStripProps["counts"];
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
}[] = [
  { key: "aircraft", label: "Aircraft", icon: Plane, colorClass: "text-aircraft" },
  { key: "ships", label: "Ships", icon: Ship, colorClass: "text-ship" },
  { key: "satellites", label: "Satellites", icon: Satellite, colorClass: "text-satellite" },
  { key: "launches", label: "Launches", icon: Rocket, colorClass: "text-launch" },
  { key: "alerts", label: "Alerts", icon: AlertTriangle, colorClass: "text-alert" },
];

export function CounterStrip({ counts, active }: CounterStripProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-console-bg border-b border-console-border shrink-0 overflow-x-auto">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.key;
        return (
          <div
            key={item.key}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md border transition-colors ${
              isActive
                ? "bg-console-panel-raised border-console-border"
                : "bg-console-panel border-console-border-subtle"
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${item.colorClass}`} />
            <div className="flex flex-col leading-none">
              <span className="text-[10px] text-console-dim uppercase tracking-wider">{item.label}</span>
              <span className={`text-sm font-mono font-semibold ${item.colorClass}`}>
                {counts[item.key].toLocaleString()}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
