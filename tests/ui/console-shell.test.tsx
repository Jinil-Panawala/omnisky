// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ConsoleFooter } from "@/components/console/layout/ConsoleFooter";
import { ConsoleLoading } from "@/components/console/layout/ConsoleLoading";
import { STRINGS } from "@/domain/strings";
import { SOURCE_ATTRIBUTION } from "@/domain/constants";

describe("ConsoleFooter", () => {
  it("labels live and demo modes differently", () => {
    const { unmount } = render(<ConsoleFooter mode="live" />);
    expect(screen.getByText(STRINGS.footer.liveLabel)).toBeInTheDocument();
    unmount();
    render(<ConsoleFooter mode="demo" />);
    expect(screen.getByText(STRINGS.footer.demoLabel)).toBeInTheDocument();
  });

  it("credits every data source with a safe outbound link", () => {
    render(<ConsoleFooter mode="live" />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(SOURCE_ATTRIBUTION.length);
    for (const link of links) {
      expect(link).toHaveAttribute("rel", "noreferrer noopener");
      expect(link.getAttribute("href")).toMatch(/^https?:\/\//);
    }
  });

  it("keeps the disclaimer visible", () => {
    render(<ConsoleFooter mode="live" />);
    expect(screen.getByText(STRINGS.footer.disclaimer)).toBeInTheDocument();
  });
});

describe("ConsoleLoading", () => {
  it("tells the user the console is starting", () => {
    render(<ConsoleLoading />);
    expect(screen.getByText(STRINGS.app.loadingConsole)).toBeInTheDocument();
  });
});
