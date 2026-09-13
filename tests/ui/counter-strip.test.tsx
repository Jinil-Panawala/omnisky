// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CounterStrip } from "@/components/console/layout/CounterStrip";

describe("CounterStrip", () => {
  it("shows every tracked category with grouped numbers", () => {
    render(
      <CounterStrip
        counts={{ aircraft: 12345, ships: 80, satellites: 300, launches: 2, alerts: 9 }}
      />,
    );
    expect(screen.getByText("12,345")).toBeInTheDocument();
    expect(screen.getByText("Ships")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
  });

  it("renders zeroes rather than blanks", () => {
    render(
      <CounterStrip counts={{ aircraft: 0, ships: 0, satellites: 0, launches: 0, alerts: 0 }} />,
    );
    expect(screen.getAllByText("0")).toHaveLength(5);
  });
});
