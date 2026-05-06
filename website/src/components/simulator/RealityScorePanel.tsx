/**
 * Hero number + denominator + rarity band + 1-in-N — the "Reality Score"
 * presentation per design v2 §3 + Patch v2.1 §3.
 *
 * The hero number is monospace with tabular figures so columns of digits
 * align vertically. The denominator never disappears (anti-casino
 * discipline per design v1 §3.1). The rarity band sits directly below
 * the percentage in a serif weight; tone caption below in sans. The
 * 1-in-N restatement is the most important translation in the product:
 * "1 in 54" is a frame any human can hold.
 *
 * Resolution-floor caveat (design v1 §3.2 + v2 §3.1): when count < 30,
 * append a quiet 12pt italic-sans line warning the user the simulation
 * resolution is below the threshold for trustworthy precision.
 *
 * Per Patch v2.1 §3, the rarity band and 1-in-N are NOT rendered by
 * caller code while the user is mid-build (only after submit). This
 * component itself does not enforce that — the parent decides whether
 * to mount it. Pure server component, takes count/total as props.
 */

import { getOneInN, getOneInNSentence } from "@/lib/sim/getOneInN";
import { getRarityBand } from "@/lib/sim/getRarityBand";
import { OneInNCountUp } from "@/components/simulator/reality/OneInNCountUp";

interface RealityScorePanelProps {
  count: number;
  total: number;
  /** Optional: gates the resolution-floor caveat label. Defaults to "submitted". */
  variant?: "submitted" | "promoted";
  /** Optional state badge for the dashboard's three variants. */
  state?: "alive" | "dead" | "promoted";
  /**
   * Phase E §9 (E.2) + Q3. When provided, the 1-in-N integer animates
   * from 1 → this target over 700ms cubic-out via OneInNCountUp.
   * When omitted (server-only contexts like dashboards / OG images),
   * the static `oneInNSentence` renders unchanged.
   */
  oneInNTarget?: number;
}

function formatPercent(count: number, total: number): string {
  if (total <= 0) return "0.00%";
  const pct = (count / total) * 100;
  // Two decimal places below 1%, one decimal place from 1% to 25%, none above.
  if (pct < 1) return `${pct.toFixed(2)}%`;
  if (pct < 25) return `${pct.toFixed(1)}%`;
  return `${pct.toFixed(0)}%`;
}

export function RealityScorePanel({
  count,
  total,
  variant = "submitted",
  state = "alive",
  oneInNTarget,
}: RealityScorePanelProps) {
  const reading = getRarityBand(count, total);
  const oneInN = getOneInN(count, total);
  const oneInNSentence = getOneInNSentence(count, total);

  const isDead = state === "dead";
  const isPromoted = state === "promoted";

  return (
    <section
      aria-labelledby="reality-score-label"
      data-state={state}
      className={
        isDead
          ? "opacity-40"
          : ""
      }
    >
      <div
        id="reality-score-label"
        className="font-mono text-[11px] uppercase tracking-[0.10em] text-[var(--text-tertiary)]"
      >
        Reality Score
      </div>

      {/* Hero number. Monospace with tabular figures so digit widths align.
          Strikethrough is a 1px diagonal rule rendered via inline gradient
          for the DEAD state — sharp, no fuzzy outline. */}
      <div className="mt-2 relative inline-block">
        <span
          className={`font-mono tabular-nums text-[48px] leading-[1] sm:text-[64px] ${
            isPromoted ? "text-[var(--state-promoted)]" : "text-[var(--text-primary)]"
          }`}
        >
          {isPromoted ? "▲ " : ""}
          {formatPercent(count, total)}
        </span>
        {isDead ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top_right,transparent_calc(50%_-_0.5px),var(--text-primary)_calc(50%_-_0.5px),var(--text-primary)_calc(50%_+_0.5px),transparent_calc(50%_+_0.5px))]"
          />
        ) : null}
      </div>

      {/* Denominator. Always renders — the anti-casino discipline. */}
      <div className="mt-2 font-mono text-[14px] tabular-nums text-[var(--text-tertiary)]">
        {count.toLocaleString("en-US")} / {total.toLocaleString("en-US")} simulations
      </div>

      {/* Rarity band — serif label + sans tone caption + optional
          resolution-floor caveat. Reveal class fades the whole group
          starting at t=100ms per IMPL_PROMPT §9. CSS-only animation,
          see globals.css; reduced-motion is handled there. */}
      <div className="reveal-band">
        <div className="mt-6 font-serif text-[28px] leading-[1.05] sm:text-[32px] text-[var(--text-primary)]">
          {reading.band}
        </div>
        <div className="mt-1 font-sans text-[14px] text-[var(--text-tertiary)]">
          {reading.caption}
        </div>
        {reading.belowResolutionFloor ? (
          <div className="mt-3 font-sans italic text-[12px] text-[var(--text-quiet)]">
            Fewer than 30 of {total.toLocaleString("en-US")}. Almost no one
            sees this coming.
          </div>
        ) : null}
      </div>

      {/* 1-in-N translator — the bridge from percentage to a frame any
          human can hold. Reveals at t=200ms. Phase E §9 (E.2) + Q3 —
          when oneInNTarget is provided, the integer counts up from
          1 → final over 700ms cubic-out; otherwise the static
          sentence renders unchanged. */}
      <div className="reveal-one-in-n mt-6 font-mono text-[16px] tabular-nums text-[var(--text-primary)]">
        {oneInNTarget !== undefined ? (
          <OneInNCountUp
            target={oneInNTarget}
            prefix="1 in "
            suffix=" simulated tournaments matched your prediction."
          />
        ) : (
          oneInNSentence
        )}
      </div>

      {/* Aria-only restatement for screen readers; visually redundant. */}
      <span className="sr-only">
        {variant === "submitted"
          ? `Reality Score: ${formatPercent(count, total)}, ${oneInN}.`
          : `Reality Score now ${formatPercent(count, total)}, ${oneInN}.`}
      </span>
    </section>
  );
}
