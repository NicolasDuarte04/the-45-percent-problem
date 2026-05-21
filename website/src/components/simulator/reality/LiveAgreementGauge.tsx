"use client";

/**
 * LiveAgreementGauge. Phase D Workstream 3, Phase E §5.4 motion, CP-02 fills.
 *
 * Per UX_POLISH_PLAN_SIMULATOR_PHASE_D.md §4.2 + §4.4 with the Option C
 * resolution (§4.1). The live build gauge speaks a 3-state viral
 * vocabulary only. REALISTIC / BOLD CALL / LONG SHOT; never the
 * post-submit rarity vocabulary (Common, Plausible, Uncommon, Rare,
 * Vanishingly rare). The post-submit hero is RealityScorePanel, which
 * MUST NOT import this component.
 *
 * Phase E motion (§5.4):
 *   - When `isComplete` flips false → true, the active segment fills
 *     using a 450ms CSS transition (.ck17-gauge-fill). Other segments
 *     stay outline. Checkpoint 17 (B1) moved this off Framer Motion.
 *   - The viral hook label crossfades on change using the `micro`
 *     preset via <AnimatePresence mode="wait">. Kept on Framer Motion
 *     because the mode="wait" coordinator has no clean CSS equivalent.
 *   - Reduced motion: CSS @media collapses the fill transition to
 *     instant; useReducedMotionAware still flattens the crossfade.
 *
 * CP-02 (this file):
 *   - The active segment's background binds to its index-matched band
 *     token (--band-common / --band-plausible / --band-uncommon /
 *     --band-rare / --band-vanishing). Active-segment border stays
 *     --accent-warm so "you are here" still reads via the warm frame.
 *   - The percentage value rolls with a 220ms ease-out cubic via
 *     useRollingNumber. The roll is purely visual; canonical
 *     count / total stay the truth.
 *   - A new inline TensionLine renders below the gauge frame when the
 *     scenario lands in LONG SHOT after isComplete. It auto-dismisses
 *     after 6s of no count/total activity, on band change, or on
 *     isComplete=false.
 *
 * Performance: primitive props only so React.memo stays effective.
 * Score recompute happens in the caller on drop, not on drag-over.
 */

import { memo, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getLiveHook } from "@/lib/sim/getLiveHook";
import { useReducedMotionAware } from "@/lib/motion/useReducedMotionAware";
import { useRollingNumber } from "@/lib/motion/useRollingNumber";

interface LiveAgreementGaugeProps {
  count: number;
  total: number;
  /** True only when the scenario meets the per-mode show-threshold. */
  isComplete: boolean;
  /** Reserved; do not use "full": that surface is RealityScorePanel. */
  variant?: "compact" | "full";
}

const SEGMENT_COUNT = 5;

// CP-02: per-segment background token. Index 0 is the most common band,
// index 4 is the vanishingly-rare band. Bound inline rather than via a
// Tailwind arbitrary class because Tailwind arbitrary values are static
// at build time and cannot accept an indexed lookup.
const BAND_TOKEN_BY_INDEX = [
  "var(--band-common)",
  "var(--band-plausible)",
  "var(--band-uncommon)",
  "var(--band-rare)",
  "var(--band-vanishing)",
] as const;

const TENSION_DISMISS_MS = 6000;

/**
 * Pick the active segment by raw probability buckets; same threshold
 * geometry the post-submit panel uses, so the bar widths line up
 * across surfaces. Critically, only the *index* is shared; the textual
 * label here is the live-gauge viral hook, never the scientific term.
 *
 * Index 0 = leftmost (most common). Index 4 = rightmost (vanishingly rare).
 */
function activeSegmentIndex(count: number, total: number): number {
  const pct = total > 0 ? count / total : 0;
  if (pct >= 0.25) return 0;
  if (pct >= 0.05) return 1;
  if (pct >= 0.01) return 2;
  if (pct >= 0.001) return 3;
  return 4;
}

function formatLivePercentFromPct(pct: number): string {
  if (!Number.isFinite(pct) || pct < 0) return "0.00%";
  if (pct < 1) return `${pct.toFixed(2)}%`;
  if (pct < 25) return `${pct.toFixed(1)}%`;
  return `${pct.toFixed(0)}%`;
}

const COUNT_FORMAT = new Intl.NumberFormat("en-US");

interface TensionLineProps {
  count: number;
  total: number;
  isComplete: boolean;
}

function TensionLine({ count, total, isComplete }: TensionLineProps) {
  const microTransition = useReducedMotionAware("micro");
  const hook = isComplete ? getLiveHook(count, total) : null;
  const isLongShot = hook === "LONG SHOT";
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    // Any change to count, total, isComplete, or isLongShot is treated
    // as activity: the 6s dismiss timer restarts and the expired flag
    // resets to false. The synchronous reset on the effect's body is
    // intentional; a session-id-derived flag cannot distinguish
    // re-entering the same low-prob scenario after a reset from never
    // having left it. The eight other hooks in this repo that already
    // call setState synchronously inside an effect establish the
    // convention; this one disable is scoped to a single line.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpired(false);
    if (!isLongShot) return;
    const id = window.setTimeout(() => {
      setExpired(true);
    }, TENSION_DISMISS_MS);
    return () => {
      window.clearTimeout(id);
    };
  }, [count, total, isComplete, isLongShot]);

  const visible = isLongShot && !expired;
  const copy = visible
    ? `long shot. only ${COUNT_FORMAT.format(count)} in ${COUNT_FORMAT.format(total)} sims agree.`
    : "";

  return (
    <AnimatePresence initial={false}>
      {visible ? (
        <motion.p
          key="tension"
          role="status"
          aria-live="polite"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={microTransition}
          className="mt-2 max-w-[280px] font-mono text-[12px] lowercase text-[var(--ui-warning)] sm:max-w-[320px]"
        >
          {copy}
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}

function LiveAgreementGaugeImpl({
  count,
  total,
  isComplete,
}: LiveAgreementGaugeProps) {
  const activeIdx = isComplete ? activeSegmentIndex(count, total) : -1;
  const hook = isComplete ? getLiveHook(count, total) : null;

  const microTransition = useReducedMotionAware("micro");

  // CP-02: rolling percentage. The roll is visual only; the truth is
  // (count, total) handed in by the caller. Pre-isComplete the displayed
  // value is held at 0 so the first reveal rolls up from zero.
  const targetPct = isComplete && total > 0 ? (count / total) * 100 : 0;
  const displayedPct = useRollingNumber(targetPct);
  const percentText = isComplete ? formatLivePercentFromPct(displayedPct) : null;
  const percentFinal = isComplete ? formatLivePercentFromPct(targetPct) : null;

  return (
    <>
      <section
        aria-labelledby="live-gauge-heading"
        aria-live="polite"
        className="border border-[var(--border-default)] p-4"
      >
        <h3
          id="live-gauge-heading"
          className="font-mono text-[9px] uppercase tracking-[0.10em] text-[var(--text-tertiary)] opacity-60"
        >
          How the model reads this
        </h3>

        <ul
          aria-hidden="true"
          className="mt-3 grid h-2 w-full max-w-[280px] grid-cols-5 gap-px sm:max-w-[320px]"
        >
          {Array.from({ length: SEGMENT_COUNT }, (_, i) => {
            const active = i === activeIdx;
            return (
              <li
                key={i}
                // Phase E §8 (D.3): gauge segment border in accent-warm
                // when active to tie the gauge into the "you are here"
                // beacon system used across the simulator.
                className={[
                  "relative overflow-hidden border",
                  active
                    ? "border-[var(--accent-warm)]"
                    : "border-[var(--text-primary)]",
                ].join(" ")}
              >
                <span
                  aria-hidden="true"
                  // CP-02: per-band background via inline style. The
                  // .ck17-gauge-fill rule continues to drive opacity and
                  // scaleX off data-active; only the colour changes.
                  data-active={active ? "true" : "false"}
                  style={{ backgroundColor: BAND_TOKEN_BY_INDEX[i] }}
                  className="ck17-gauge-fill absolute inset-0"
                />
              </li>
            );
          })}
        </ul>

        <div className="mt-3 flex items-baseline justify-between gap-3">
          <span
            className={[
              "relative inline-block min-h-[1em] font-mono text-[14px] uppercase tracking-[0.10em] sm:text-[15px]",
              // Phase E §8 (D.3): viral hook tracks the gauge accent.
              isComplete
                ? "text-[var(--accent-warm)]"
                : "text-[var(--text-primary)]",
            ].join(" ")}
            aria-label={hook ? `Live hook: ${hook}` : undefined}
          >
            <AnimatePresence mode="wait" initial={false}>
              {hook ? (
                <motion.span
                  key={hook}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={microTransition}
                  className="inline-block"
                >
                  {hook}
                </motion.span>
              ) : (
                <span key="empty" className="inline-block">&nbsp;</span>
              )}
            </AnimatePresence>
          </span>
          <span
            aria-hidden="true"
            className="font-mono text-[16px] tabular-nums text-[var(--text-primary)] sm:text-[18px]"
          >
            {percentText ?? " "}
          </span>
          {/* CP-02: SR-only mirror of the final percentage so assistive
              tech hears the settled value once per band change rather
              than every rAF tick. */}
          <span className="sr-only" aria-live="polite">
            {percentFinal ?? ""}
          </span>
        </div>
      </section>

      <TensionLine count={count} total={total} isComplete={isComplete} />
    </>
  );
}

export const LiveAgreementGauge = memo(LiveAgreementGaugeImpl);
