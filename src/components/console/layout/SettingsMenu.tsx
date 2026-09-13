import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REFRESH_OPTIONS, type ConsoleSettings } from "@/hooks/useConsoleSettings";

interface SettingsMenuProps {
  settings: ConsoleSettings;
  onChange: (patch: Partial<ConsoleSettings>) => void;
}

const LAYER_LABELS: Array<{ key: keyof ConsoleSettings["defaultLayers"]; label: string }> = [
  { key: "aircraft", label: "Aircraft" },
  { key: "ship", label: "Vessels" },
  { key: "satellite", label: "Satellites" },
  { key: "launch", label: "Launches" },
];

const PANEL_LABELS: Array<{ key: keyof ConsoleSettings["defaultPanels"]; label: string }> = [
  { key: "filters", label: "Filters" },
  { key: "alerts", label: "Alerts" },
  { key: "feed", label: "Event feed" },
  { key: "details", label: "Details" },
];

/** Gear-icon popover: default layers, default panels, live refresh rate. */
export function SettingsMenu({ settings, onChange }: SettingsMenuProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Console settings"
          className="text-console-muted hover:text-console-text hover:bg-console-panel-raised"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-64 bg-console-panel border-console-border text-console-text"
      >
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-console-dim mb-2">
              Layers on startup
            </p>
            <div className="space-y-2">
              {LAYER_LABELS.map(({ key, label }) => (
                <label key={key} className="flex items-center justify-between text-xs">
                  <span>{label}</span>
                  <Switch
                    checked={settings.defaultLayers[key]}
                    onCheckedChange={(checked) =>
                      onChange({
                        defaultLayers: { ...settings.defaultLayers, [key]: checked },
                      })
                    }
                  />
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-console-dim mb-2">
              Panels on startup
            </p>
            <div className="space-y-2">
              {PANEL_LABELS.map(({ key, label }) => (
                <label key={key} className="flex items-center justify-between text-xs">
                  <span>{label}</span>
                  <Switch
                    checked={settings.defaultPanels[key]}
                    onCheckedChange={(checked) =>
                      onChange({
                        defaultPanels: { ...settings.defaultPanels, [key]: checked },
                      })
                    }
                  />
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-console-dim mb-2">
              Live refresh rate
            </p>
            <Select
              value={String(settings.refreshIntervalMs)}
              onValueChange={(value) => onChange({ refreshIntervalMs: Number(value) })}
            >
              <SelectTrigger className="h-8 text-xs bg-console-bg border-console-border-subtle">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REFRESH_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    Every {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-console-dim mt-2">
              Applies to new sessions and the next live refresh.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
