"use client";
// rev: bracket-matrix-heatmap-hover-v2

import Link from "next/link";
import type {
  BracketSnapshot,
  TournamentSnapshot,
  TournamentTeam,
} from "@/lib/data/schemas";
import { Flag } from "@/components/primitives/Flag";
import { formatProbability } from "@/lib/formatters";
import {
  probabilityToColor,
  probabilityTextColorHex,
} from "@/lib/viz/probabilityRamp";

interface BracketBoardProps {
  bracket: BracketSnapshot;
  tournament: TournamentSnapshot;
}

type RoundKey =
  | "p_group_qualification"
  | "p_r16"
  | "p_quarterfinal"
  | "p_semifinal"
  | "p_final"
  | "p_champion";

const ROUNDS: Array<{ key: RoundKey; short: string; label: string }> = [
  { key: "p_group_qualification", short: "GRP", label: "group qualification" },
  { key: "p_r16", short: "R16", label: "round of 16" },
  { key: "p_quarterfinal", short: "QF", label: "quarter-final" },
  { key: "p_semifinal", short: "SF", label: "semi-final" },
  { key: "p_final", short: "FIN", label: "final" },
  { key: "p_champion", short: "CHA", label: "champion" },
];

export function BracketBoard({ bracket, tournament }: BracketBoardProps) {
  const slotsPopulated = bracket.rounds.some((r) => r.slots.length > 0);

  const sortedTeams: TournamentTeam[] = tournament.teams
    .slice()
    .sort((a, b) => b.p_champion - a.p_champion);

  // V2-04 follow-up: row/column crosshair removed. Users found the
  // dim-everything-off-axis effect visually noisy and asked for the
  // GoalMatrixHeatmap interaction language instead (cell-only hover
  // with a scale + glow lift). The hover is now driven entirely by
  // the CSS `:hover` pseudo-class against `.brk-cell`, so no React
  // hover state is needed.

  return (
    <div
      className="rounded-lg"
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border-subtle)",
        padding: 20,
      }}
    >
      <div className="flex justify-between items-baseline mb-4 flex-wrap gap-2">
        <div>
          <h3
            className="text-[13px] font-medium"
            style={{
              fontFamily: "var(--font-sans)",
              color: "var(--text-primary)",
            }}
          >
            Bracket · per-round marginal probabilities
          </h3>
          <div
            className="mono text-[11px] mt-[3px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            {slotsPopulated
              ? "draw-resolved bracket with per-round conditional probabilities"
              : `pre-tournament bracket · slots unresolved · showing marginal P(reach round) for all ${sortedTeams.length} teams, sorted by champion probability`}
          </div>
        </div>
        <div
          className="mono text-[10px] uppercase tracking-[.08em]"
          style={{ color: "var(--text-quiet)" }}
        >
          {sortedTeams.length} teams · {ROUNDS.length} rounds
        </div>
      </div>

      {/* Pre-tournament empty-state note. A traditional knockout tree
          requires resolved slots: in the pre-tournament phase we have no
          match-to-match edges to draw, so we explain the fallback instead
          of showing an empty lattice. Once the draw is played and the
          bracket.json slots populate, this note hides and the matrix is
          augmented with slot labels. */}
      {!slotsPopulated && (
        <div
          className="mb-4 rounded px-4 py-3"
          role="note"
          style={{
            background: "color-mix(in oklch, var(--prism-peach) 6%, var(--bg-panel-elev))",
            border: "1px solid color-mix(in oklch, var(--prism-peach) 28%, var(--border-subtle))",
          }}
        >
          <div
            className="mono text-[10px] uppercase tracking-[.1em] font-semibold"
            style={{ color: "var(--prism-peach)", marginBottom: 4 }}
          >
            Pre-tournament · slots unresolved
          </div>
          <p
            className="text-[12.5px]"
            style={{
              fontFamily: "var(--font-sans)",
              color: "var(--text-secondary)",
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            A traditional knockout tree cannot be drawn yet; the draw has not
            been played, so the model has no match-to-match edges between
            slots. The matrix below is the faithful substitute: each row is a
            team, each column is a round, and each cell is the marginal
            probability that the team reaches that round across {" "}
            <span className="mono">10k</span> Monte Carlo simulations. Once
            the draw resolves, this view augments with slot labels and the
            conditional (reach-given-survival) probabilities.
          </p>
        </div>
      )}

      <style>{cellHoverStyles}</style>

      {/* Native CSS Grid: no external bracket library (§12.7) */}
      <div
        role="table"
        data-guide-id="bracket-matrix"
        aria-label="Bracket board: per-round marginal probabilities"
        className="brk-grid grid no-scrollbar"
        style={{
          gridTemplateColumns: `minmax(180px, 1.4fr) repeat(${ROUNDS.length}, minmax(92px, 1fr))`,
          gap: 1,
          background: "var(--border-subtle)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 6,
          maxHeight: 640,
          overflowY: "auto",
          overflowX: "auto",
        }}
      >
          {/* Header row: sticky so it stays visible during vertical scroll.
              Color lifted to --text-primary (slate-ink / paper-ink) so the
              round labels are unmistakably legible above the Prism heatmap.
              Weight semibold, tracking .14em, with a hairline bottom border
              so the header strip reads as its own register. */}
          <div
            className="brk-col-header brk-col-header--axis mono text-[11px] uppercase font-semibold tracking-[.14em] px-3 py-3"
            style={{
              background: "var(--bg-panel-elev)",
              position: "sticky",
              top: 0,
              zIndex: 2,
              borderBottom: "1px solid var(--border-default)",
            }}
            role="columnheader"
          >
            team · seed · group
          </div>
          {ROUNDS.map((r) => (
            <div
              key={r.key}
              className="brk-col-header mono text-[11px] uppercase font-semibold tracking-[.14em] px-3 py-3 text-center"
              style={{
                background: "var(--bg-panel-elev)",
                position: "sticky",
                top: 0,
                zIndex: 2,
                borderBottom: "1px solid var(--border-default)",
              }}
              role="columnheader"
              title={r.label}
            >
              {r.short}
            </div>
          ))}

          {/* Team rows */}
          {sortedTeams.map((team) => {
            return (
            <div key={team.fifa_code} className="contents" role="row">
              <Link
                href={`/team/${team.fifa_code}`}
                className="brk-team px-3 py-2 flex items-center gap-2"
                style={{
                  background: "var(--bg-panel)",
                  color: "var(--text-primary)",
                }}
              >
                <span
                  className="mono inline-flex items-center justify-center shrink-0"
                  style={{
                    height: 17,
                    padding: "0 6px",
                    borderRadius: 2,
                    fontSize: 9.5,
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                    color: "var(--text-primary)",
                    background: "rgb(31 31 31 / 0.05)",
                    border: "1px solid rgb(31 31 31 / 0.18)",
                  }}
                >
                  {team.fifa_code}
                </span>
                <Flag code={team.fifa_code} size={16} />
                <span
                  className="text-[12px] truncate"
                  style={{
                    fontFamily: "var(--font-sans)",
                    color: "var(--text-primary)",
                  }}
                >
                  {team.display_name}
                </span>
                <span
                  className="mono text-[10px] ml-auto tabular-nums"
                  style={{ color: "var(--text-quiet)" }}
                >
                  #{team.seed} · {team.group ?? "-"}
                </span>
              </Link>

              {ROUNDS.map((r) => {
                const p = team[r.key] as number;
                const bg = probabilityToColor(p);
                return (
                  <div
                    key={r.key}
                    role="cell"
                    aria-label={`${team.display_name} probability of reaching ${r.label}: ${(p * 100).toFixed(1)} percent`}
                    className="brk-cell flex items-center justify-center py-2"
                    style={
                      {
                        background: bg,
                        color: probabilityTextColorHex(p),
                        "--cell-fill": bg,
                      } as React.CSSProperties
                    }
                  >
                    <span
                      className="mono inline-block text-right tabular-nums"
                      aria-label={`${(p * 100).toFixed(1)} percent`}
                    >
                      {formatProbability(p, 1)}
                    </span>
                  </div>
                );
              })}
            </div>
            );
          })}
      </div>

      {/* Legend · sequential ramp strip (sourced from probabilityRamp.ts) */}
      <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
        <div
          className="mono text-[10px] uppercase tracking-[.08em]"
          style={{ color: "var(--text-quiet)" }}
        >
          P(reach round) density
        </div>
        <div className="flex items-center gap-2" style={{ minWidth: 240 }}>
          <span
            className="mono text-[10px] tabular-nums"
            style={{ color: "var(--text-quiet)" }}
          >
            0%
          </span>
          <div
            className="flex-1"
            style={{
              height: 8,
              borderRadius: 2,
              background:
                "linear-gradient(90deg, #1C222B 0%, #263542 5%, #3A6B82 15%, #4F8FA8 30%, #8B8898 45%, #C99878 60%, #A87AA4 80%, #8E5A8A 100%)",
            }}
          />
          <span
            className="mono text-[10px] tabular-nums"
            style={{ color: "var(--text-quiet)" }}
          >
            100%
          </span>
        </div>
      </div>
    </div>
  );
}

// V2-04 follow-up: quiet cell-only hover. The earlier scale + drop
// shadow lift was loud against the dense 48-row grid and could push
// hovered cells out of the layout: at the top of the grid the lifted
// cell visually collided with the sticky column header strip. The
// final treatment keeps the cell anchored in its grid slot and signals
// "you are here" with two minimal cues: a small brightness lift and
// an inset 1px ring whose hue inherits from the cell's own fill
// (mixed with white so the ring reads as a brightened edge rather
// than a duplicate fill). Less is more.
const cellHoverStyles = `
.brk-cell {
  transition: filter 140ms ease, box-shadow 140ms ease;
}
.brk-cell:hover {
  filter: brightness(1.08);
  box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--cell-fill) 35%, white 65%);
}
.brk-col-header {
  color: var(--text-primary);
  cursor: default;
}
`;
