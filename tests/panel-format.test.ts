import { describe, expect, it } from "vitest";
import { formatRelativeShort, severityColorClass } from "@/components/console/panels/panel-format";

describe("formatRelativeShort", () => {
  it("says now for fresh timestamps", () => {
    expect(formatRelativeShort(new Date())).toBe("now");
  });

  it("counts minutes then hours", () => {
    expect(formatRelativeShort(new Date(Date.now() - 5 * 60_000))).toBe("5m ago");
    expect(formatRelativeShort(new Date(Date.now() - 150 * 60_000))).toBe("2h ago");
  });
});

describe("severityColorClass", () => {
  it("maps each severity to its own token class", () => {
    expect(severityColorClass("critical")).toBe("text-alert");
    expect(severityColorClass("warning")).toBe("text-alert-warning");
    expect(severityColorClass("info")).toBe("text-alert-info");
  });
});
