"use client";

/**
 * BracketTree — Phase E §7 (C.1, C.3, C.4).
 *
 * Absolute-positioned tournament tree with right-angle SVG connectors,
 * winner-row highlight + loser-row dim, layoutId-based winner chip
 * propagation between rounds, and mobile horizontal scroll with a
 * Round breadcrumb.
 *
 * Source of truth lives in the parent (ModeFullBracket): koAdvancers
 * for who's through, getMatch(level, idx) for the pair sitting in each
 * cell. This component owns the *layout* and the *interaction surface*
 * but no app state.
 */

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Flag } from "@/components/primitives/Flag";
import { EmptySlot } from "@/components/simulator/EmptySlot";
import { useReducedMotionAware } from "@/lib/motion/useReducedMotionAware";
import type { TeamCode } from "@/lib/sim/types";
import { BracketConnectors } from "./BracketConnectors";
import {
  CELL_HEIGHT,
  CELL_WIDTH,
  COL_WIDTH,
  MOBILE_BREAKPOINT_PX,
  MOBILE_CELL_WIDTH,
  MOBILE_COL_WIDTH,
  MOBILE_TOTAL_WIDTH,
  ROUNDS,
  TOTAL_HEIGHT,
  TOTAL_WIDTH,
  matchLeftX,
  matchTopY,
} from "./geometry";

interface MatchPair {
  home: TeamCode | null;
  away: TeamCode | null;
}

interface BracketTreeProps {
  /** Returns the pair (home, away) sitting in match `matchIdx` of round `level`. */
  getMatch: (level: number, matchIdx: number) => MatchPair;
  /** Returns the chosen winner for a match, or null. */
  getAdvancer: (level: number, matchIdx: number) => TeamCode | null;
  /** User clicked a side. `code` may be null when the side hasn't resolved yet. */
  onAdvance: (level: number, matchIdx: number, code: TeamCode | null) => void;
}

export function BracketTree({ getMatch, getAdvancer, onAdvance }: BracketTreeProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const dropTransition = useReducedMotionAware("drop");
  // Lazy initial — read matchMedia once on mount. The resize listener
  // updates state when the viewport crosses the breakpoint. SSR
  // returns false (no window); first client render gets the real
  // value via lazy init, no extra render or hydration mismatch beyond
  // what's already standard for matchMedia hooks.
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`)
      .matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`);
    const update = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const colW = isMobile ? MOBILE_COL_WIDTH : COL_WIDTH;
  const cellW = isMobile ? MOBILE_CELL_WIDTH : CELL_WIDTH;
  const totalW = isMobile ? MOBILE_TOTAL_WIDTH : TOTAL_WIDTH;

  // Phase E §7 (C.2/C.3) — a connector is highlighted when its parent
  // has a winner picked AND that winner is the chip currently sitting
  // in the child match's slot.
  const highlightedParents = new Set<string>();
  for (let pIdx = 0; pIdx < ROUNDS.length - 1; pIdx++) {
    const parent = ROUNDS[pIdx];
    for (let m = 0; m < parent.count; m++) {
      const winner = getAdvancer(parent.level, m);
      if (winner) highlightedParents.add(`${parent.level}-${m}`);
    }
  }

  function scrollToRound(roundLevel: number) {
    const el = scrollRef.current;
    if (!el) return;
    const targetX = roundLevel * colW;
    el.scrollTo({ left: targetX, behavior: "smooth" });
  }

  return (
    <div className="mt-4">
      {/* Mobile breadcrumb (Phase E §7 (C.4)). The desktop layout shows
          all five round labels inline above their columns; on mobile we
          collapse them into a sticky tap-to-scroll breadcrumb. */}
      {isMobile ? (
        <nav
          aria-label="Bracket round navigation"
          className="sticky top-0 z-10 mb-2 flex gap-2 overflow-x-auto bg-[var(--bg-root)] py-2 font-mono text-[10px] uppercase tracking-[0.10em]"
        >
          {ROUNDS.map((r, i) => (
            <button
              key={r.key}
              type="button"
              onClick={() => scrollToRound(r.level)}
              className="shrink-0 px-2 py-1 text-[var(--text-quiet)] hover:text-[var(--accent-warm)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]"
            >
              {r.label}
              {i < ROUNDS.length - 1 ? (
                <span className="ml-2 text-[var(--text-quiet)]">→</span>
              ) : null}
            </button>
          ))}
        </nav>
      ) : null}

      <div
        ref={scrollRef}
        className="relative w-full overflow-x-auto overflow-y-visible"
      >
        <div
          className="relative"
          style={{ width: totalW, height: TOTAL_HEIGHT + CELL_HEIGHT }}
        >
          {/* Round labels — desktop only, anchored above each column. */}
          {!isMobile
            ? ROUNDS.map((r) => (
                <div
                  key={`label-${r.key}`}
                  className="absolute font-mono text-[10px] uppercase tracking-[0.10em] text-[var(--text-quiet)]"
                  style={{ left: matchLeftX(r.level), top: -22, width: cellW }}
                >
                  {r.label}
                </div>
              ))
            : null}

          {/* Connector overlay — sits behind the cells. */}
          <BracketConnectors
            highlightedParents={highlightedParents}
            mobile={isMobile}
          />

          {/* Match cells — absolute, positioned by geometry helpers. */}
          {ROUNDS.map((round) =>
            Array.from({ length: round.count }, (_, m) => {
              const pair = getMatch(round.level, m);
              const advancer = getAdvancer(round.level, m);
              return (
                <MatchCell
                  key={`${round.key}-${m}`}
                  level={round.level}
                  matchIdx={m}
                  pair={pair}
                  advancer={advancer}
                  cellWidth={cellW}
                  isMobile={isMobile}
                  onPick={(code) => onAdvance(round.level, m, code)}
                  dropTransition={dropTransition}
                />
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}

interface MatchCellProps {
  level: number;
  matchIdx: number;
  pair: MatchPair;
  advancer: TeamCode | null;
  cellWidth: number;
  isMobile: boolean;
  onPick: (code: TeamCode | null) => void;
  dropTransition: ReturnType<typeof useReducedMotionAware<"drop">>;
}

function MatchCell({
  level,
  matchIdx,
  pair,
  advancer,
  cellWidth,
  isMobile,
  onPick,
  dropTransition,
}: MatchCellProps) {
  const top = matchTopY(level, matchIdx);
  const left = matchLeftX(level, { mobile: isMobile });

  return (
    <div
      className="absolute border border-[var(--border-default)] bg-[var(--bg-root)]"
      style={{ top, left, width: cellWidth, height: CELL_HEIGHT }}
      aria-label={`Round ${level + 1} match ${matchIdx + 1}`}
    >
      <CellSide
        side="home"
        code={pair.home}
        isWinner={advancer !== null && advancer === pair.home}
        isLoser={advancer !== null && advancer !== pair.home}
        onPick={onPick}
        level={level}
        matchIdx={matchIdx}
        dropTransition={dropTransition}
      />
      <div className="h-px bg-[var(--border-default)]" />
      <CellSide
        side="away"
        code={pair.away}
        isWinner={advancer !== null && advancer === pair.away}
        isLoser={advancer !== null && advancer !== pair.away}
        onPick={onPick}
        level={level}
        matchIdx={matchIdx}
        dropTransition={dropTransition}
      />
    </div>
  );
}

interface CellSideProps {
  side: "home" | "away";
  code: TeamCode | null;
  isWinner: boolean;
  isLoser: boolean;
  onPick: (code: TeamCode | null) => void;
  level: number;
  matchIdx: number;
  dropTransition: ReturnType<typeof useReducedMotionAware<"drop">>;
}

function CellSide({
  side,
  code,
  isWinner,
  isLoser,
  onPick,
  level,
  matchIdx,
  dropTransition,
}: CellSideProps) {
  const half = (CELL_HEIGHT - 1) / 2; // 1px border between rows

  return (
    <button
      type="button"
      disabled={!code}
      onClick={() => code && onPick(code)}
      aria-pressed={isWinner}
      aria-label={
        code
          ? `${side === "home" ? "Top" : "Bottom"} side ${code}; ${
              isWinner ? "selected as winner" : "click to advance"
            }`
          : `${side === "home" ? "Top" : "Bottom"} side awaiting upstream pick`
      }
      style={{ height: half }}
      className={[
        "relative flex w-full items-center gap-2 px-2 font-mono text-[12px] tabular-nums transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]",
        isWinner
          ? // 6% accent-warm fill per Phase E §7 (C.3) + §8 (D.3).
            "bg-[color-mix(in_srgb,var(--accent-warm)_6%,transparent)] text-[var(--accent-warm)]"
          : isLoser
            ? "bg-transparent text-[var(--text-primary)] opacity-70"
            : code
              ? "bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-panel-elev)] cursor-pointer"
              : "bg-transparent text-[var(--text-quiet)] cursor-not-allowed",
      ].join(" ")}
    >
      {/* ▶ winner indicator on the left edge per §7 (C.3). */}
      {isWinner ? (
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 -translate-y-1/2 text-[var(--accent-warm)] text-[10px]"
        >
          ▶
        </span>
      ) : null}
      {code ? (
        <motion.span
          layoutId={`bracket-chip-${code}`}
          transition={dropTransition}
          className="ml-2 inline-flex items-center gap-1.5"
        >
          <Flag code={code} size={16} />
          <span>{code}</span>
        </motion.span>
      ) : (
        <span className="ml-2 flex h-4 w-full items-stretch">
          <EmptySlot
            size="sm"
            label="WINNER"
            ariaLabel={`Match ${level + 1}-${matchIdx + 1} ${side} side awaiting`}
          />
        </span>
      )}
    </button>
  );
}
