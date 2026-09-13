// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { TopBar } from "@/components/console/layout/TopBar";
import {
  DEFAULT_CONSOLE_SETTINGS,
  type ConsoleSettings,
} from "@/hooks/useConsoleSettings";

// TopBar links to /account; stub the router Link so no router is needed.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children: React.ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}));

function renderTopBar(overrides: Partial<Parameters<typeof TopBar>[0]> = {}) {
  const onSettingsChange = vi.fn();
  render(
    <TopBar
      settings={DEFAULT_CONSOLE_SETTINGS}
      onSettingsChange={onSettingsChange}
      {...overrides}
    />,
  );
  return { onSettingsChange };
}

describe("TopBar settings gear", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("hides the settings gear for signed-out visitors", () => {
    renderTopBar({ showSettings: false });
    expect(
      screen.queryByRole("button", { name: /console settings/i }),
    ).not.toBeInTheDocument();
  });

  it("hides the gear when showSettings is omitted (defaults to signed-out)", () => {
    renderTopBar();
    expect(
      screen.queryByRole("button", { name: /console settings/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the settings gear for signed-in users", () => {
    renderTopBar({ showSettings: true });
    expect(
      screen.getByRole("button", { name: /console settings/i }),
    ).toBeInTheDocument();
  });

  it("always shows the account link regardless of settings visibility", () => {
    renderTopBar({ showSettings: false });
    expect(
      screen.getByRole("link", { name: /your account/i }),
    ).toBeInTheDocument();
  });
});

describe("SettingsMenu popover", () => {
  it("opens with layer, panel and refresh sections", async () => {
    renderTopBar({ showSettings: true });
    fireEvent.click(screen.getByRole("button", { name: /console settings/i }));
    expect(await screen.findByText("Layers on startup")).toBeInTheDocument();
    expect(screen.getByText("Panels on startup")).toBeInTheDocument();
    expect(screen.getByText("Live refresh rate")).toBeInTheDocument();
  });

  it("toggling a layer switch reports the merged layers", async () => {
    const { onSettingsChange } = renderTopBar({ showSettings: true });
    fireEvent.click(screen.getByRole("button", { name: /console settings/i }));
    const aircraftRow = (await screen.findByText("Aircraft")).closest("label")!;
    fireEvent.click(aircraftRow.querySelector('[role="switch"]')!);
    expect(onSettingsChange).toHaveBeenCalledWith({
      defaultLayers: {
        ...DEFAULT_CONSOLE_SETTINGS.defaultLayers,
        aircraft: false,
      },
    });
  });

  it("toggling a panel switch reports the merged panels", async () => {
    const { onSettingsChange } = renderTopBar({ showSettings: true });
    fireEvent.click(screen.getByRole("button", { name: /console settings/i }));
    const alertsRow = (await screen.findByText("Alerts")).closest("label")!;
    fireEvent.click(alertsRow.querySelector('[role="switch"]')!);
    expect(onSettingsChange).toHaveBeenCalledWith({
      defaultPanels: {
        ...DEFAULT_CONSOLE_SETTINGS.defaultPanels,
        alerts: false,
      },
    });
  });

  it("reflects the current refresh interval in the select", async () => {
    const settings: ConsoleSettings = {
      ...DEFAULT_CONSOLE_SETTINGS,
      refreshIntervalMs: 60_000,
    };
    renderTopBar({ showSettings: true, settings });
    fireEvent.click(screen.getByRole("button", { name: /console settings/i }));
    expect(await screen.findByText("Every 60s")).toBeInTheDocument();
  });
});
