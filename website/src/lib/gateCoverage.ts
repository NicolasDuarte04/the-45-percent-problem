// Volatility Gate coverage helpers.
//
// The divergence producer (market/divergence_generator.py) reads ONE odds pull,
// from which only Rule 5 (Pinnacle staleness) is evaluable. The other four
// suppression rules abstain and are recorded in `gate_coverage.unavailable` with
// a per-rule reason. The UI surfaces this so a bare "Open" pill is never read as
// "all five rules cleared". These helpers are pure (no React) so they can be unit
// tested in the node vitest environment and reused by the pill and the table.

export type GateCoverage = {
  evaluated: string[];
  unavailable: Record<string, string>;
};

// Short, human-readable labels for the five gate rule codes. Falls through to the
// raw code so an unrecognised rule still renders something honest.
export const GATE_RULE_LABELS: Record<string, string> = {
  LIQUIDITY_PINNACLE_STALE: "Pinnacle staleness",
  NAMED_EVENT_6H: "News events",
  PRICE_DISCOVERY_INTRA_BOOK: "Intra-book swing",
  PRICE_DISCOVERY_CROSS_BOOK: "Cross-book spread",
  LIQUIDITY_POLYMARKET_LOW: "Polymarket volume",
};

export function gateRuleLabel(key: string): string {
  return GATE_RULE_LABELS[key] ?? key;
}

export interface GateCoverageSummary {
  // Friendly labels for the rules that were actually evaluated this snapshot.
  evaluated: string[];
  // Friendly labels for the rules that abstained (no input data this snapshot).
  pending: string[];
  // One-line summary for the pill hover-card, or null when no coverage is known.
  line: string | null;
}

export function summarizeGateCoverage(
  coverage?: GateCoverage | null,
): GateCoverageSummary {
  if (!coverage) return { evaluated: [], pending: [], line: null };

  const evaluated = (coverage.evaluated ?? []).map(gateRuleLabel);
  const pending = Object.keys(coverage.unavailable ?? {}).map(gateRuleLabel);

  const parts: string[] = [];
  if (evaluated.length) parts.push(`${evaluated.join(", ")} evaluated`);
  if (pending.length) parts.push(`${pending.join(" / ")}: pending data`);

  return { evaluated, pending, line: parts.length ? parts.join("; ") : null };
}
