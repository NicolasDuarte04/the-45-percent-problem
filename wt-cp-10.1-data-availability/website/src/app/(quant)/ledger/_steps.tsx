"use client";

import type { TourStep } from "@/components/compositions/CanvasTour";

export const LEDGER_DURATION_SEC = 60;

export const LEDGER_STEPS: TourStep[] = [
  {
    id: "scope",
    selector: '[data-guide-id="ledger-masthead-title"]',
    side: "bottom",
    align: "start",
    title: "Scope of this ledger",
    body: (
      <>
        An append-only record of every forecast M&#9733; has issued, with
        realised outcomes when matches settle. Pre-registration §7.2 binds
        this page to a single invariant: hits and misses are rendered with
        identical visual weight. No record is ever deleted; corrections are
        appended.
      </>
    ),
  },
  {
    id: "scoring",
    selector: '[data-guide-id="ledger-scoring-table"]',
    side: "right",
    align: "start",
    title: "Proper scoring rules",
    body: (
      <>
        Three rules, all lower-is-better.{" "}
        <span className="mono">Brier</span> penalises squared error on each
        outcome&rsquo;s probability;{" "}
        <span className="mono">Log-loss</span> penalises confident wrongness
        more sharply; <span className="mono">RPS</span> generalises Brier to
        ranked outcomes. Columns report each model variant; M&#9733; is the
        production model selected before kickoff.
      </>
    ),
    footnote: (
      <>
        Diebold-Mariano tests below report whether M&#9733;&rsquo;s score
        differs significantly from M0.
      </>
    ),
  },
  {
    id: "clv",
    selector: '[data-guide-id="ledger-clv-block"]',
    side: "left",
    align: "start",
    title: "Closing-line value",
    body: (
      <>
        <span className="mono">CLV</span> measures whether the market moved
        toward our position between forecast issuance and market close, in basis
        points. The <span className="mono">z-score</span> normalises
        cumulative CLV by its sampling standard error, giving a dimensionless
        test statistic. Reported for M&#9733; only.
      </>
    ),
  },
  {
    id: "reliability",
    selector: '[data-guide-id="ledger-reliability-diagram"]',
    side: "left",
    align: "start",
    title: "Reliability diagram",
    body: (
      <>
        Each point is a decile bin of forecast probabilities. The x-axis is
        the bin&rsquo;s mean predicted probability; the y-axis is the
        empirical frequency in that bin. Points on the diagonal indicate
        perfect calibration. Point area encodes sample count &mdash; small
        bins are noisier and should be discounted accordingly.
      </>
    ),
  },
];
