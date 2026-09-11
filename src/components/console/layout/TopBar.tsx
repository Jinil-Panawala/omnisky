import { Radar, Search, Bell, Settings, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";

interface TopBarProps {
  onSearch?: (value: string) => void;
}

export function TopBar({ onSearch }: TopBarProps) {
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
        <Button variant="ghost" size="icon" className="text-console-muted hover:text-console-text hover:bg-console-panel-raised">
          <Bell className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="text-console-muted hover:text-console-text hover:bg-console-panel-raised">
          <Settings className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="text-console-muted hover:text-console-text hover:bg-console-panel-raised">
          <User className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
