import { Radar, Search, User } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/domain/constants";
import { cn } from "@/lib/utils";
import { SettingsMenu } from "./SettingsMenu";
import type { ConsoleSettings } from "@/hooks/useConsoleSettings";

export type DataMode = "demo" | "live";

interface TopBarProps {
  onSearch?: (value: string) => void;
  mode?: DataMode;
  onModeChange?: (mode: DataMode) => void;
  feedStatus?: "connecting" | "live" | "stale" | "error";
  lastUpdated?: Date | null;
  settings: ConsoleSettings;
  onSettingsChange: (patch: Partial<ConsoleSettings>) => void;
}

const STATUS_STYLES: Record<string, { dot: string; label: string }> = {
  connecting: { dot: "bg-amber-400 animate-pulse", label: "Connecting" },
  live: { dot: "bg-emerald-400 animate-pulse", label: "Live" },
  stale: { dot: "bg-amber-400", label: "Stale" },
  error: { dot: "bg-red-500", label: "Feed error" },
};

export function TopBar({
  onSearch,
  mode = "demo",
  onModeChange,
  feedStatus = "connecting",
  lastUpdated,
  settings,
  onSettingsChange,
}: TopBarProps) {
  const status = STATUS_STYLES[feedStatus] ?? STATUS_STYLES["connecting"]!;
  return (
    <header className="h-14 flex items-center justify-between px-4 bg-console-panel border-b border-console-border shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/15 text-primary console-glow">
          <Radar className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-wide text-console-text uppercase">
            {APP_NAME}
          </h1>
          <p className="text-[10px] text-console-dim font-mono">See the world in motion</p>
        </div>
      </div>

      <div className="flex-1 max-w-md mx-6">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-console-dim" />
          <Input
            type="text"
            placeholder="Search callsign, vessel, satellite, mission..."
            className="pl-9 h-8 bg-console-bg border-console-border-subtle text-xs text-console-text placeholder:text-console-dim focus-visible:ring-primary/50"
            onChange={(e) => onSearch?.(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-md border border-console-border-subtle bg-console-bg p-0.5">
          {(["demo", "live"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onModeChange?.(value)}
              className={cn(
                "px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider rounded-[4px] transition-colors",
                mode === value
                  ? "bg-primary/20 text-primary"
                  : "text-console-dim hover:text-console-text",
              )}
            >
              {value}
            </button>
          ))}
        </div>

        {mode === "live" && (
          <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-md border border-console-border-subtle">
            <span className={cn("w-1.5 h-1.5 rounded-full", status.dot)} />
            <span className="text-[10px] font-mono uppercase tracking-wider text-console-muted">
              {status.label}
            </span>
            {lastUpdated && (
              <span className="text-[10px] font-mono text-console-dim">
                {lastUpdated.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            )}
          </div>
        )}

        <SettingsMenu settings={settings} onChange={onSettingsChange} />
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="text-console-muted hover:text-console-text hover:bg-console-panel-raised"
        >
          <Link to="/account" aria-label="Your account">
            <User className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
