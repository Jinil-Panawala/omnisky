// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { PanelToggles } from "@/components/console/layout/PanelToggles";

const panels = { filters: true, alerts: false, feed: true, details: true };

describe("PanelToggles", () => {
  it("reflects which panels are open", () => {
    render(<PanelToggles panels={panels} onToggle={() => {}} />);
    expect(screen.getByTitle("Hide filters")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTitle("Show alerts")).toHaveAttribute("aria-pressed", "false");
  });

  it("reports the panel the user clicked", async () => {
    const onToggle = vi.fn();
    render(<PanelToggles panels={panels} onToggle={onToggle} />);
    await userEvent.click(screen.getByTitle("Show alerts"));
    expect(onToggle).toHaveBeenCalledWith("alerts");
  });

  it("offers one toggle per panel", () => {
    render(<PanelToggles panels={panels} onToggle={() => {}} />);
    expect(screen.getAllByRole("button")).toHaveLength(4);
  });
});
