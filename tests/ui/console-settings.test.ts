// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  DEFAULT_CONSOLE_SETTINGS,
  useConsoleSettings,
} from "@/hooks/useConsoleSettings";

const STORAGE_KEY = "omnisky.console.settings";

describe("useConsoleSettings", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts with defaults when nothing is stored", () => {
    const { result } = renderHook(() => useConsoleSettings());
    expect(result.current.settings).toEqual(DEFAULT_CONSOLE_SETTINGS);
  });

  it("returns defaults and ignores updates when disabled (signed out)", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ refreshIntervalMs: 60_000 }));
    const { result } = renderHook(() => useConsoleSettings(false));
    expect(result.current.settings).toEqual(DEFAULT_CONSOLE_SETTINGS);
    act(() => result.current.updateSettings({ refreshIntervalMs: 10_000 }));
    expect(result.current.settings.refreshIntervalMs).toBe(
      DEFAULT_CONSOLE_SETTINGS.refreshIntervalMs,
    );
  });

  it("persists updates to localStorage", () => {
    const { result } = renderHook(() => useConsoleSettings());
    act(() => result.current.updateSettings({ refreshIntervalMs: 60_000 }));
    expect(result.current.settings.refreshIntervalMs).toBe(60_000);
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    expect(stored.refreshIntervalMs).toBe(60_000);
  });

  it("merges stored values over the defaults on load", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ defaultLayers: { satellite: false }, refreshIntervalMs: 30_000 }),
    );
    const { result } = renderHook(() => useConsoleSettings());
    expect(result.current.settings.defaultLayers).toEqual({
      aircraft: true,
      ship: true,
      satellite: false,
      launch: true,
    });
    expect(result.current.settings.refreshIntervalMs).toBe(30_000);
  });

  it("rejects corrupt JSON and implausible intervals", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json");
    const bad = renderHook(() => useConsoleSettings());
    expect(bad.result.current.settings).toEqual(DEFAULT_CONSOLE_SETTINGS);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ refreshIntervalMs: 100 }));
    const low = renderHook(() => useConsoleSettings());
    expect(low.result.current.settings.refreshIntervalMs).toBe(
      DEFAULT_CONSOLE_SETTINGS.refreshIntervalMs,
    );
  });
});
