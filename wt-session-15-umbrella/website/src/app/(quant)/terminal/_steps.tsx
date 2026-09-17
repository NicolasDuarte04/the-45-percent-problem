"use client";

import type { TourStep } from "@/components/compositions/CanvasTour";

export const TERMINAL_DURATION_SEC = 90;

export const TERMINAL_STEPS: TourStep[] = [
  {
    id: "scope",
    selector: '[data-guide-id="masthead-title"]',
    side: "bottom",
    align: "start",
    title: "Scope of this terminal",
    body: (
      <>
        Each row reports a single market for which the model&rsquo;s posterior
        probability differs materially from the consensus implied by current
        prices. Rows are not recommendations; they are observations of
        disagreement, recorded for out-of-sample evaluation.
      </>
    ),
  },
  {
    id: "snapshot",
    selector: '[data-guide-id="snapshot-id"]',
    side: "bottom",
    align: "end",
    title: "Snapshot identifier",
    body: (
      <>
        A snapshot is the full row set captured at one wall-clock moment. The
        identifier is content-addressed: identical inputs yield identical IDs.
        Cite this string when referencing a result.
      </>
    ),
    footnote: (
      <>
        Format: <span className="mono">yyyy-mm-dd-HHMM-{`{hash}`}</span>.
      </>
    ),
  },
  {
    id: "edge",
    selector: '[data-guide-id="col-edge"]',
    side: "bottom",
    align: "center",
    title: "Edge",
    body: (
      <>
        <span className="mono">E = p_model &minus; q_devigged</span>. Positive
        values indicate the model assigns higher probability than the de-vigged
        market; negative values, lower. Rows are sorted by{" "}
        <span className="mono">|E|</span> descending so the largest
        disagreements appear first regardless of sign.
      </>
    ),
    footnote: <>See the Research Vault article on de-vigging.</>,
  },
  {
    id: "divergence",
    selector: '[data-guide-id="col-divergence"]',
    side: "bottom",
    align: "center",
    title: "Signed divergence",
    body: (
      <>
        Horizontal extent encodes <span className="mono">|E|</span>; direction
        encodes sign. A bar leaning right indicates the model assigns higher
        probability than the market; left, lower. The zero axis is the
        de-vigged consensus, not 0.5.
      </>
    ),
  },
  {
    id: "gate",
    selector: '[data-guide-id="col-gate"]',
    side: "left",
    align: "center",
    title: "Volatility Gate",
    body: (
      <>
        When the gate fires on a row, it is annotated with a{" "}
        <span style={{ color: "var(--gate-fired)" }}>&#9670;</span> marker, not
        removed from the table. The gate flags conditions under which a
        divergence is less reliable &mdash; stale price, named-event proximity,
        exchange disagreement, low liquidity &mdash; so the reader can discount
        the row, not so the system can hide it.{" "}
        <span className="mono">&epsilon; = 3%</span> mainline.
      </>
    ),
  },
  {
    id: "empty",
    selector: '[data-guide-id="all-gated-banner"]',
    side: "bottom",
    align: "start",
    title: "All rows gated",
    body: (
      <>
        When every row in a snapshot has the gate tripped, this banner is
        shown. Rows remain visible &mdash; the gate annotates, it does not
        filter &mdash; but the reader is warned that no divergence in this
        snapshot is currently in clean conditions.
      </>
    ),
  },
  {
    id: "osf",
    selector: '[data-guide-id="osf-link"]',
    side: "bottom",
    align: "end",
    title: "Pre-registration record",
    body: (
      <>
        Inclusion criteria, scoring rule, and stopping conditions were
        registered with the OSF prior to data collection. The link resolves to
        a timestamped, immutable record. Any divergence between this terminal
        and that document is a bug.
      </>
    ),
  },
];
