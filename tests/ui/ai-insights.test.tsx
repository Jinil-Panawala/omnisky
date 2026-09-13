// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { AiInsights } from "@/components/console/panels/AiInsights";
import { STRINGS } from "@/domain/strings";
import type { AiInsight } from "@/domain/console";

const insight: AiInsight = {
  id: "i1",
  category: "hotspot",
  severity: "info",
  title: "38-Aircraft Hotspot",
  description: "Dense air traffic over the English Channel.",
  timestamp: new Date(),
  location: { lat: 50, lon: 1 },
};

describe("AiInsights", () => {
  it("shows the empty explanation with no insights", () => {
    render(<AiInsights insights={[]} />);
    expect(screen.getByText(STRINGS.panels.insightsEmpty)).toBeInTheDocument();
  });

  it("renders title, category and freshness", () => {
    render(<AiInsights insights={[insight]} />);
    expect(screen.getByText("38-Aircraft Hotspot")).toBeInTheDocument();
    expect(screen.getByText("hotspot")).toBeInTheDocument();
    expect(screen.getByText("now")).toBeInTheDocument();
  });

  it("is clickable only in the sense that it reports the selection", async () => {
    const onSelect = vi.fn();
    render(<AiInsights insights={[insight]} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith(insight);
  });

  it("does not crash when no handler is provided", async () => {
    render(<AiInsights insights={[insight]} />);
    await userEvent.click(screen.getByRole("button"));
    expect(screen.getByText("38-Aircraft Hotspot")).toBeInTheDocument();
  });
});
