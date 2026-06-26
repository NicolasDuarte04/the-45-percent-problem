import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GateStatusPill } from "@/components/primitives/GateStatusPill";
import type { GateCoverage } from "@/lib/gateCoverage";

const COVERAGE: GateCoverage = {
  evaluated: ["LIQUIDITY_PINNACLE_STALE"],
  unavailable: {
    NAMED_EVENT_6H: "news monitor not wired (Rule 1)",
    PRICE_DISCOVERY_INTRA_BOOK: "intra-book history not captured (Rule 2)",
    PRICE_DISCOVERY_CROSS_BOOK: "Betfair not loaded (Rule 3)",
    LIQUIDITY_POLYMARKET_LOW: "Polymarket volume not loaded (Rule 4)",
  },
};

function render(node: ReturnType<typeof createElement>): string {
  return renderToStaticMarkup(createElement(TooltipProvider, null, node));
}

describe("GateStatusPill rendering", () => {
  it("an OPEN pill with coverage is not bare: aria-label flags pending rules", () => {
    const html = render(
      createElement(GateStatusPill, { status: "OPEN", coverage: COVERAGE }),
    );
    expect(html).toContain("Open");
    expect(html).toContain("gate status OPEN");
    expect(html).toContain("4 rules pending data");
  });

  it("an OPEN pill without coverage stays a plain pill (no pending claim)", () => {
    const html = render(createElement(GateStatusPill, { status: "OPEN" }));
    expect(html).toContain("Open");
    expect(html).not.toContain("pending data");
  });
});
