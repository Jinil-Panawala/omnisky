import { useCallback, useState } from "react";
import type { LayerVisibility, PanelVisibility } from "@/domain/console";

/**
 * User-tunable console preferences, persisted to localStorage so they survive
 * reloads for everyone (no account needed). Applied as the initial state for
 * layers/panels and as the live snapshot polling interval.
 */
export interface ConsoleSettings {
  /** Which layers start on when the page loads. */
  defaultLayers: LayerVisibility;
  /** Which side panels start open. */
  defaultPanels: PanelVisibility;
  /** How often the live snapshot refetches, in milliseconds. */
  refreshIntervalMs: number;
}

export const DEFAULT_CONSOLE_SETTINGS: ConsoleSettings = {
  defaultLayers: { aircraft: true, ship: true, satellite: true, launch: true },
  defaultPanels: { filters: true, alerts: true, feed: true, details: true },
  refreshIntervalMs: 20_000,
};

/** Refresh-rate choices offered in the settings popover. */
export const REFRESH_OPTIONS = [
  { label: "10s", value: 10_000 },
  { label: "20s", value: 20_000 },
  { label: "30s", value: 30_000 },
  { label: "60s", value: 60_000 },
] as const;

const STORAGE_KEY = "omnisky.console.settings";

function loadSettings(): ConsoleSettings {
  if (typeof window === "undefined") return DEFAULT_CONSOLE_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONSOLE_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<ConsoleSettings>;
    return {
      defaultLayers: { ...DEFAULT_CONSOLE_SETTINGS.defaultLayers, ...parsed.defaultLayers },
      defaultPanels: { ...DEFAULT_CONSOLE_SETTINGS.defaultPanels, ...parsed.defaultPanels },
      refreshIntervalMs:
        typeof parsed.refreshIntervalMs === "number" && parsed.refreshIntervalMs >= 5_000
          ? parsed.refreshIntervalMs
          : DEFAULT_CONSOLE_SETTINGS.refreshIntervalMs,
    };
  } catch {
    return DEFAULT_CONSOLE_SETTINGS;
  }
}

/**
 * Console preferences for signed-in users. When `enabled` is false (signed
 * out), returns the defaults and ignores updates — nothing is read or saved.
 */
export function useConsoleSettings(enabled = true) {
  const [settings, setSettings] = useState<ConsoleSettings>(() =>
    enabled ? loadSettings() : DEFAULT_CONSOLE_SETTINGS,
  );

  const updateSettings = useCallback(
    (patch: Partial<ConsoleSettings>) => {
      if (!enabled) return;
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* storage unavailable — keep in-memory only */
        }
        return next;
      });
    },
    [enabled],
  );

  return { settings: enabled ? settings : DEFAULT_CONSOLE_SETTINGS, updateSettings };
}
