// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { TimelineFeed } from "@/components/console/panels/TimelineFeed";
import type { TimelineEvent } from "@/domain/console";

const event: TimelineEvent = {
  id: "e1",
  type: "aircraft",
  entityId: "ac-abc123",
  title: "UAL933",
  description: "Position report received via ADSB.lol",
  timestamp: new Date(Date.now() - 90 * 60_000),
};

describe("TimelineFeed", () => {
  it("shows the event with its age", () => {
    render(<TimelineFeed events={[event]} onSelect={() => {}} />);
    expect(screen.getByText("UAL933")).toBeInTheDocument();
    expect(screen.getByText("1h ago")).toBeInTheDocument();
  });

  it("opens the object behind the event when clicked", async () => {
    const onSelect = vi.fn();
    render(<TimelineFeed events={[event]} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith("ac-abc123", "aircraft");
  });

  it("renders an empty feed without errors", () => {
    render(<TimelineFeed events={[]} onSelect={() => {}} />);
    expect(screen.getByText("Event Feed")).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
