"use client";

import type { TourStep } from "@/components/compositions/CanvasTour";

export const BRACKET_DURATION_SEC = 45;

export const BRACKET_STEPS: TourStep[] = [
  {
    id: "scope",
    selector: '[data-guide-id="bracket-masthead-title"]',
    side: "bottom",
    align: "start",
    title: "Scope of this view",
    body: (
      <>
        An unconditional, ensemble-level summary of how each team progresses
        through the World Cup under M&#9733;. The view is a substitute for a
        traditional knockout tree: before the draw is played, slots are
        unresolved, so a tree cannot be drawn &mdash; the matrix below is the
        faithful alternative.
      </>
    ),
  },
  {
    id: "matrix",
    selector: '[data-guide-id="bracket-matrix"]',
    side: "right",
    align: "start",
    title: "Monte Carlo matrix",
    body: (
      <>
        Rows are teams, columns are rounds (R16 through Champion). Each cell
        encodes the marginal probability of reaching that round across{" "}
        <span className="mono">10k</span> Monte Carlo simulations. Cell
        shading is monotonic in probability &mdash; deeper peach on the Prism
        scale corresponds to higher probability. Rows are sorted by champion
        probability descending.
      </>
    ),
  },
  {
    id: "marginal",
    selector: '[data-guide-id="bracket-round-legend"]',
    side: "top",
    align: "start",
    title: "Marginal, not conditional",
    body: (
      <>
        Each cell reports{" "}
        <span className="mono">P(team reaches round R)</span> &mdash; marginal
        over all possible group-stage and bracket realisations. These are not
        conditional probabilities of the form{" "}
        <span className="mono">P(reach R | reached R&minus;1)</span>; the
        latter become reportable only after the draw resolves and slots are
        populated.
      </>
    ),
  },
];
