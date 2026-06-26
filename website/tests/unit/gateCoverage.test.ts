import { describe, it, expect } from "vitest";
import {
  gateRuleLabel,
  summarizeGateCoverage,
  type GateCoverage,
} from "@/lib/gateCoverage";

// Mirrors what market/divergence_generator.py emits per row: only Rule 5
// (Pinnacle staleness) is evaluable from one odds pull; the other four abstain.
const PRODUCER_COVERAGE: GateCoverage = {
  evaluated: ["LIQUIDITY_PINNACLE_STALE"],
  unavailable: {
    NAMED_EVENT_6H: "news monitor not wired into the divergence producer (Rule 1)",
    PRICE_DISCOVERY_INTRA_BOOK:
      "intra-book price history not captured; blocked on the odds-capture cadence (Rule 2)",
    PRICE_DISCOVERY_CROSS_BOOK:
      "Betfair cross-book odds not loaded by the divergence producer (Rule 3)",
    LIQUIDITY_POLYMARKET_LOW:
      "Polymarket 24h volume not loaded by the divergence producer (Rule 4)",
  },
};

describe("gateRuleLabel", () => {
  it("maps known rule codes to friendly labels", () => {
    expect(gateRuleLabel("LIQUIDITY_PINNACLE_STALE")).toBe("Pinnacle staleness");
    expect(gateRuleLabel("NAMED_EVENT_6H")).toBe("News events");
    expect(gateRuleLabel("PRICE_DISCOVERY_CROSS_BOOK")).toBe("Cross-book spread");
  });

  it("falls through to the raw code for an unknown rule", () => {
    expect(gateRuleLabel("SOME_FUTURE_RULE")).toBe("SOME_FUTURE_RULE");
  });
});

describe("summarizeGateCoverage", () => {
  it("returns an empty, null-line summary when coverage is absent", () => {
    expect(summarizeGateCoverage(undefined)).toEqual({
      evaluated: [],
      pending: [],
      line: null,
    });
    expect(summarizeGateCoverage(null)).toEqual({
      evaluated: [],
      pending: [],
      line: null,
    });
  });

  it("surfaces the evaluated rule and the four pending rules so OPEN is never bare", () => {
    const s = summarizeGateCoverage(PRODUCER_COVERAGE);
    expect(s.evaluated).toEqual(["Pinnacle staleness"]);
    expect(s.pending).toEqual([
      "News events",
      "Intra-book swing",
      "Cross-book spread",
      "Polymarket volume",
    ]);
    expect(s.line).toBe(
      "Pinnacle staleness evaluated; News events / Intra-book swing / Cross-book spread / Polymarket volume: pending data",
    );
  });

  it("reports no evaluated rule when even staleness abstains (no timestamp)", () => {
    const s = summarizeGateCoverage({
      evaluated: [],
      unavailable: {
        LIQUIDITY_PINNACLE_STALE: "Pinnacle last_refreshed timestamp absent (Rule 5)",
        NAMED_EVENT_6H: "news monitor not wired (Rule 1)",
      },
    });
    expect(s.evaluated).toEqual([]);
    expect(s.pending).toEqual(["Pinnacle staleness", "News events"]);
    expect(s.line).toBe(
      "Pinnacle staleness / News events: pending data",
    );
  });
});
