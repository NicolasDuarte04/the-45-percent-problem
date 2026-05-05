/**
 * LiveAgreementGauge — Phase D Workstream 3.
 *
 * Per UX_POLISH_PLAN_SIMULATOR_PHASE_D.md §4.2 + §4.4 with the Option C
 * resolution (§4.1). The live build gauge speaks a 3-state viral
 * vocabulary only — REALISTIC / BOLD CALL / LONG SHOT — never the
 * post-submit rarity vocabulary (Common, Plausible, Uncommon, Rare,
 * Vanishingly rare). The post-submit hero is RealityScorePanel, which
 * MUST NOT import this component.
 *
 * Anatomy when isComplete=true:
 *   [ HOW THE MODEL READS YOUR CALL ]   (mono 9pt quiet header)
 *   █████░░░░░░░░░░░░░░░░░░░░░░░       (5-segment bar)
 *   [ BOLD CALL ]                       (mono uppercase hook)
 *                              1.84%    (mono tabular percentage)
 *
 * When isComplete=false the bar renders in a ghost outline state and
 * the hook + percentage are suppressed — preserving layout real estate
 * without committing to a verdict on a partial scenario (Patch v2.1
 * §3 spirit).
 *
 * Performance: primitive props only so React.memo stays effective.
 * Segment fill uses a CSS transition (.live-gauge-segment) — no
 * Framer Motion, no rAF, no JS loop. Score recompute happens in the
 * caller on drop, not on drag-over.
 */

import { memo } from "react";
import { getLiveHook } from "@/lib/sim/getLiveHook";

interface LiveAgreementGaugeProps {
  count: number;
  total: number;
  /** True only when the scenario meets the per-mode show-threshold. */
  isComplete: boolean;
  /** Reserved; do not use "full" — that surface is RealityScorePanel. */
  variant?: "compact" | "full";
}

const SEGMENT_COUNT = 5;

/**
 * Pick the active segment by raw probability buckets — same threshold
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

function formatLivePercent(count: number, total: number): string {
  if (total <= 0) return "0.00%";
  const pct = (count / total) * 100;
  if (pct < 1) return `${pct.toFixed(2)}%`;
  if (pct < 25) return `${pct.toFixed(1)}%`;
  return `${pct.toFixed(0)}%`;
}

function LiveAgreementGaugeImpl({
  count,
  total,
  isComplete,
}: LiveAgreementGaugeProps) {
  const activeIdx = isComplete ? activeSegmentIndex(count, total) : -1;
  const hook = isComplete ? getLiveHook(count, total) : null;
  const percent = isComplete ? formatLivePercent(count, total) : null;

  return (
    <section
      aria-labelledby="live-gauge-heading"
      aria-live="polite"
      className="border border-[var(--border-default)] p-4"
    >
      <h3
        id="live-gauge-heading"
        className="font-mono text-[9px] uppercase tracking-[0.10em] text-[var(--text-tertiary)] opacity-60"
      >
        How the model reads your call
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
              className={[
                "live-gauge-segment border border-[var(--text-primary)]",
                active
                  ? "bg-[var(--text-primary)] opacity-100"
                  : "bg-transparent opacity-100",
              ].join(" ")}
            />
          );
        })}
      </ul>

      <div className="mt-3 flex items-baseline justify-between gap-3">
        <span
          className="font-mono text-[14px] uppercase tracking-[0.10em] text-[var(--text-primary)] sm:text-[15px]"
          aria-label={hook ? `Live hook: ${hook}` : undefined}
        >
          {hook ?? " "}
        </span>
        <span className="font-mono text-[16px] tabular-nums text-[var(--text-primary)] sm:text-[18px]">
          {percent ?? " "}
        </span>
      </div>
    </section>
  );
}

export const LiveAgreementGauge = memo(LiveAgreementGaugeImpl);
