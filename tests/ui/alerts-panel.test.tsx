// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { AlertsPanel } from "@/components/console/panels/AlertsPanel";
import { STRINGS } from "@/domain/strings";
import type { ActiveAlert } from "@/domain/console";

const alert: ActiveAlert = {
  id: "a1",
  severity: "critical",
  title: "Vessel went dark",
  description: "MMSI 123456789 stopped reporting 2 hours ago.",
  timestamp: new Date(Date.now() - 30 * 60_000),
  entityId: "ship-1",
  location: { lat: 10, lon: 20 },
};

describe("AlertsPanel", () => {
  it("explains itself when there is nothing to show", () => {
    render(<AlertsPanel alerts={[]} onSelect={() => {}} />);
    expect(screen.getByText(STRINGS.panels.alertsEmpty)).toBeInTheDocument();
    expect(screen.getByText("0 open")).toBeInTheDocument();
  });

  it("lists alerts with severity, age and count", () => {
    render(<AlertsPanel alerts={[alert]} onSelect={() => {}} />);
    expect(screen.getByText("Vessel went dark")).toBeInTheDocument();
    expect(screen.getByText("critical")).toBeInTheDocument();
    expect(screen.getByText("30m ago")).toBeInTheDocument();
    expect(screen.getByText("1 open")).toBeInTheDocument();
  });

  it("passes the alert back when clicked so the globe can fly there", async () => {
    const onSelect = vi.fn();
    render(<AlertsPanel alerts={[alert]} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith(alert);
  });

  it("hints that a located alert is clickable", () => {
    render(<AlertsPanel alerts={[alert]} onSelect={() => {}} />);
    expect(screen.getByRole("button")).toHaveAttribute("title", STRINGS.panels.clickToLocate);
  });
});
