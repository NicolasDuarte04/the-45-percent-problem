/** Ledger hit/miss/neutral label tokens shared by LedgerTable, forecast detail, and summary callouts. */

export type LedgerLabel = "HIT" | "MISS" | "NEUTRAL";

/** Background + glyph + text color triple for the LabelChip (§7.2). */
export const LABEL_STYLES: Record<LedgerLabel, { color: string; bg: string; glyph: string }> = {
  HIT: {
    color: "var(--ledger-hit)",
    bg: "rgba(167,243,208,0.08)",
    glyph: "◆",
  },
  MISS: {
    color: "var(--ledger-miss)",
    bg: "rgba(253,164,175,0.08)",
    glyph: "◆",
  },
  NEUTRAL: {
    color: "var(--text-tertiary)",
    bg: "transparent",
    glyph: "●",
  },
};

/** Simple color-only map for callers that don't need the full chip styling. */
export const LABEL_COLOR: Record<LedgerLabel, string> = {
  HIT: "var(--ledger-hit)",
  MISS: "var(--ledger-miss)",
  NEUTRAL: "var(--text-tertiary)",
};
