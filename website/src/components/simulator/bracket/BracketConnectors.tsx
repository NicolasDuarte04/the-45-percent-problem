"use client";

/**
 * BracketConnectors · Phase E §7 (C.2).
 *
 * Single SVG overlay that renders 30 right-angle connector paths from
 * each parent match's right edge to its child match's left edge. Two
 * paths per child (one per parent), 8 + 4 + 2 + 1 child matches across
 * R16, QF, SF, F = 15 children × 2 = 30 paths.
 *
 * Each path:
 *   1. Starts at the parent cell's right edge, vertical center.
 *   2. Goes horizontally for half the column gutter.
 *   3. Goes vertically to the child cell's vertical center.
 *   4. Goes horizontally into the child cell's left edge.
 *
 * Highlight: when the parent match has a winner picked AND that winner
 * is the team propagated into the child, the connector strokes in
 * `--accent-warm`. Otherwise it strokes in `--text-tertiary`.
 *
 * Champion path (V3 follow-up): once the user crowns an overall
 * champion (koAdvancers[30]), the subset of highlighted connectors
 * whose parent winner equals that champion strokes in `--ui-success`
 * green instead. This is the only line the simulator paints green —
 * the cells themselves keep the warm path tint regardless of
 * champion state. The intent is to draw a single green trail through
 * the bracket showing the path the champion took, without recoloring
 * any of the boxes.
 *
 * Draw-in animation (Q2: first session load only):
 *   - Each path is rendered with `stroke-dasharray = pathLength` and
 *     `stroke-dashoffset = pathLength` initially, then animated to 0.
 *   - Stagger by round level so R32→R16 lines fire first, then
 *     R16→QF, QF→SF, SF→F. Total ~600ms per Phase E §7 (C.2).
 *   - sessionStorage key `bracket-connectors-seen` gates this; once
 *     set, subsequent navigations within the session render the
 *     connectors at their final state, no animation.
 *   - Reduced motion: useReducedMotion skips the animation entirely.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  CELL_WIDTH,
  CELL_HEIGHT,
  COL_WIDTH,
  MOBILE_CELL_WIDTH,
  MOBILE_COL_WIDTH,
  MOBILE_TOTAL_WIDTH,
  ROUNDS,
  TOTAL_HEIGHT,
  TOTAL_WIDTH,
  matchCenterY,
} from "./geometry";

const SESSION_KEY = "bracket-connectors-seen";

interface ConnectorSeg {
  /** Stable key for React. */
  id: string;
  /** Source round level (parent). */
  parentLevel: number;
  /** SVG path d= attribute. */
  d: string;
  /** Full path length (for the dash-offset animation). */
  length: number;
  /** True when the parent winner has propagated into this connector's child. */
  highlighted: boolean;
  /** True when the parent winner equals the user-crowned champion. */
  isChampionPath: boolean;
}

interface BracketConnectorsProps {
  /**
   * Map of "is the parent's winner the chip currently sitting in this
   * child's slot": keyed `${parentLevel}-${parentMatchIdx}`. The
   * caller computes this from koAdvancers so the connector highlight
   * matches the cell highlight.
   */
  highlightedParents: ReadonlySet<string>;
  /**
   * Subset of `highlightedParents` whose parent winner is also the
   * user-crowned champion. These connectors stroke in `--ui-success`
   * instead of `--accent-warm`, lighting up a single green trail
   * from the champion's first KO match through the Final.
   */
  championPathParents: ReadonlySet<string>;
  /** Mobile pitch overrides desktop COL_WIDTH / CELL_WIDTH. */
  mobile?: boolean;
}

export function BracketConnectors({
  highlightedParents,
  championPathParents,
  mobile = false,
}: BracketConnectorsProps) {
  const prefersReduced = useReducedMotion();
  // Q2: first session load only. Lazy initial state computes once on
  // mount: probes sessionStorage, sets the seen flag if absent. SSR
  // returns false (no window), client mount returns true on first nav,
  // false on subsequent navs in the same session.
  const [shouldAnimate] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    if (prefersReduced) return false;
    try {
      const seen = window.sessionStorage.getItem(SESSION_KEY);
      if (!seen) {
        window.sessionStorage.setItem(SESSION_KEY, "1");
        return true;
      }
    } catch {
      // sessionStorage unavailable (Safari private mode etc.); skip
      // the animation rather than break the bracket.
    }
    return false;
  });

  const colW = mobile ? MOBILE_COL_WIDTH : COL_WIDTH;
  const cellW = mobile ? MOBILE_CELL_WIDTH : CELL_WIDTH;
  const totalW = mobile ? MOBILE_TOTAL_WIDTH : TOTAL_WIDTH;
  const gutter = colW - cellW; // horizontal whitespace between columns
  const halfGutter = gutter / 2;

  const segments = useMemo<ConnectorSeg[]>(() => {
    const out: ConnectorSeg[] = [];
    // Walk each child round (R16..F). For each child match, draw
    // connectors back to its two R-1 parent matches.
    for (let childIdx = 1; childIdx < ROUNDS.length; childIdx++) {
      const child = ROUNDS[childIdx];
      const parent = ROUNDS[childIdx - 1];
      const parentRightX = parent.level * colW + cellW;
      const childLeftX = child.level * colW;
      const midX = parentRightX + halfGutter;

      for (let m = 0; m < child.count; m++) {
        const childCenter = matchCenterY(child.level, m);
        for (const slot of [0, 1] as const) {
          const parentMatchIdx = m * 2 + slot;
          const parentCenter = matchCenterY(parent.level, parentMatchIdx);
          const d = `M ${parentRightX} ${parentCenter} H ${midX} V ${childCenter} H ${childLeftX}`;
          // Path length = horizontal_1 + vertical + horizontal_2.
          // horizontal_1 = halfGutter; horizontal_2 = childLeftX - midX = halfGutter.
          const length =
            halfGutter + Math.abs(childCenter - parentCenter) + halfGutter;
          const key = `${parent.level}-${parentMatchIdx}`;
          const highlighted = highlightedParents.has(key);
          const isChampionPath = championPathParents.has(key);
          out.push({
            id: `${parent.level}-${parentMatchIdx}->${child.level}-${m}`,
            parentLevel: parent.level,
            d,
            length,
            highlighted,
            isChampionPath,
          });
        }
      }
    }
    return out;
  }, [colW, cellW, halfGutter, highlightedParents, championPathParents]);

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${totalW} ${TOTAL_HEIGHT + CELL_HEIGHT}`}
      width={totalW}
      height={TOTAL_HEIGHT + CELL_HEIGHT}
      className="pointer-events-none absolute inset-0"
      style={{ overflow: "visible" }}
    >
      {segments.map((seg) => (
        <ConnectorPath
          key={seg.id}
          seg={seg}
          shouldAnimate={shouldAnimate}
          prefersReduced={prefersReduced ?? false}
        />
      ))}
    </svg>
  );
}

interface ConnectorPathProps {
  seg: ConnectorSeg;
  shouldAnimate: boolean;
  prefersReduced: boolean;
}

function ConnectorPath({ seg, shouldAnimate, prefersReduced }: ConnectorPathProps) {
  const ref = useRef<SVGPathElement | null>(null);
  // Stagger by round level. R32→R16 lines (parentLevel 0) start at 0,
  // R16→QF (parentLevel 1) at 100ms, and so on.
  const delayMs = shouldAnimate && !prefersReduced ? seg.parentLevel * 100 : 0;
  const durationMs = 600;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!shouldAnimate || prefersReduced) {
      el.style.strokeDasharray = "";
      el.style.strokeDashoffset = "";
      return;
    }
    el.style.strokeDasharray = `${seg.length}`;
    el.style.strokeDashoffset = `${seg.length}`;
    el.style.transition = `stroke-dashoffset ${durationMs}ms cubic-bezier(0.22, 1, 0.36, 1) ${delayMs}ms`;
    // Force layout flush, then start the draw.
    void el.getBoundingClientRect();
    el.style.strokeDashoffset = "0";
  }, [shouldAnimate, prefersReduced, seg.length, delayMs]);

  // Champion path beats highlighted beats default. Stroke-width bumps
  // by 0.5 on the champion line so the green trail reads as a single
  // continuous path even when the gutter colour around it is busy.
  const stroke = seg.isChampionPath
    ? "var(--ui-success)"
    : seg.highlighted
      ? "var(--accent-warm)"
      : "var(--text-tertiary)";

  return (
    <path
      ref={ref}
      d={seg.d}
      fill="none"
      stroke={stroke}
      strokeWidth={seg.isChampionPath ? 1.5 : 1}
      data-champion-path={seg.isChampionPath ? "true" : undefined}
      style={{ transition: "stroke 200ms ease-out" }}
    />
  );
}
