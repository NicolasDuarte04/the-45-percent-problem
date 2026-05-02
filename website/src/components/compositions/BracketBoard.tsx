"use client";
// rev: bracket-matrix-crosshair-v1

import { useState } from "react";
import Link from "next/link";
import type {
  BracketSnapshot,
  TournamentSnapshot,
  TournamentTeam,
} from "@/lib/data/schemas";
import { NumericCell } from "@/components/primitives/NumericCell";
import { Flag } from "@/components/primitives/Flag";
import { formatProbability } from "@/lib/formatters";

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

function cellBackground(p: number): string {
  // Prism-only density ramp (cyan → peach → plum). Canvas-invariant hues
  // mixed into the elevated-panel background via oklch interpolation, so
  // the ramp reads consistently on the Quant (warm slate) canvas.
  if (p < 0.01) return "var(--bg-panel-elev)";
  const scale = Math.min(1, p * 3);
  if (p < 0.15) {
    return `color-mix(in oklch, var(--prism-cyan) ${10 + scale * 35}%, var(--bg-panel-elev))`;
  }
  if (p < 0.35) {
    return `color-mix(in oklch, var(--prism-peach) ${25 + scale * 55}%, var(--bg-panel-elev))`;
  }
  return `color-mix(in oklch, var(--prism-plum) ${35 + scale * 55}%, var(--bg-panel-elev))`;
}

function cellTextColor(p: number): string {
  if (p > 0.35) return "var(--bg-root)";
  if (p > 0.08) return "var(--text-primary)";
  return "var(--text-tertiary)";
}

export function BracketBoard({ bracket, tournament }: BracketBoardProps) {
  const slotsPopulated = bracket.rounds.some((r) => r.slots.length > 0);

  const sortedTeams: TournamentTeam[] = tournament.teams
    .slice()
    .sort((a, b) => b.p_champion - a.p_champion);

  // Crosshair hover. Hovering a cell sets both row and col; hovering a team
  // label sets only the row; hovering a round header sets only the col.
  // Hover-clear is hoisted to the grid wrapper so the cursor moving across
  // gridlines inside the matrix never flickers — the highlight stays lit
  // until the cursor leaves the grid.
  const [hoverRow, setHoverRow] = useState<string | null>(null);
  const [hoverCol, setHoverCol] = useState<RoundKey | null>(null);

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
          requires resolved slots — in the pre-tournament phase we have no
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
            A traditional knockout tree cannot be drawn yet — the draw has not
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

      <style>{crosshairStyles}</style>

      {/* Native CSS Grid — no external bracket library (§12.7) */}
      <div
        role="table"
        data-guide-id="bracket-matrix"
        aria-label="Bracket board: per-round marginal probabilities"
        className="brk-grid grid no-scrollbar"
        data-hover-row={hoverRow !== null ? "" : undefined}
        data-hover-col={hoverCol !== null ? "" : undefined}
        onMouseLeave={() => {
          setHoverRow(null);
          setHoverCol(null);
        }}
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
          {/* Header row — sticky so it stays visible during vertical scroll.
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
              data-col-active={hoverCol === r.key ? "" : undefined}
              onMouseEnter={() => {
                setHoverRow(null);
                setHoverCol(r.key);
              }}
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
            const rowActive = hoverRow === team.fifa_code;
            return (
            <div key={team.fifa_code} className="contents" role="row">
              <Link
                href={`/team/${team.fifa_code}`}
                className="brk-team px-3 py-2 flex items-center gap-2 transition-colors duration-[120ms]"
                data-row-active={rowActive ? "" : undefined}
                onMouseEnter={() => {
                  setHoverRow(team.fifa_code);
                  setHoverCol(null);
                }}
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
                  #{team.seed} · {team.group ?? "—"}
                </span>
              </Link>

              {ROUNDS.map((r) => {
                const p = team[r.key] as number;
                const colActive = hoverCol === r.key;
                return (
                  <div
                    key={r.key}
                    role="cell"
                    aria-label={`${team.display_name} probability of reaching ${r.label}: ${(p * 100).toFixed(1)} percent`}
                    className="brk-cell flex items-center justify-center py-2"
                    data-row-active={rowActive ? "" : undefined}
                    data-col-active={colActive ? "" : undefined}
                    onMouseEnter={() => {
                      setHoverRow(team.fifa_code);
                      setHoverCol(r.key);
                    }}
                    style={{
                      background: cellBackground(p),
                      color: cellTextColor(p),
                    }}
                  >
                    <NumericCell
                      value={p}
                      formatter={(x) => formatProbability(x, 1)}
                      ariaLabel={`${(p * 100).toFixed(1)} percent`}
                    />
                  </div>
                );
              })}
            </div>
            );
          })}
      </div>

      {/* Legend — Prism ramp strip */}
      <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
        <div
          className="mono text-[10px] uppercase tracking-[.08em]"
          style={{ color: "var(--text-quiet)" }}
        >
          P(reach round) density · Prism ramp
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
                "linear-gradient(90deg, var(--bg-panel-elev) 0%, color-mix(in oklch, var(--prism-cyan) 40%, var(--bg-panel-elev)) 30%, color-mix(in oklch, var(--prism-peach) 75%, var(--bg-panel-elev)) 65%, var(--prism-plum) 100%)",
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

// Crosshair: hovering any team-row label, round header, or probability cell
// dims everything off the active axis. Three rules drive the effect:
//   - data-hover-row on the grid + :not([data-row-active]) on team labels
//   - data-hover-col on the grid + :not([data-col-active]) on round headers
//   - either axis active + cells that match neither row nor col
// The team-label header (.brk-col-header--axis) never dims; it's the matrix
// origin, not a column.
//
// IMPORTANT: opacity is intentionally avoided on the sticky column headers —
// a semi-transparent sticky strip lets scrolling cells leak through and
// reads as broken UI. We dim text colour instead and keep bg-panel-elev
// solid. Cells are dimmed via filter: saturate/brightness rather than
// opacity for the same reason — opacity bleeds the dark gridline colour
// through the heatmap fill and looks muddy. Filter mutes the colour while
// preserving the cell's visual presence.
const crosshairStyles = `
.brk-team,
.brk-col-header,
.brk-cell {
  transition: filter 150ms ease, color 150ms ease;
}
.brk-col-header {
  color: var(--text-primary);
}
.brk-grid[data-hover-row] .brk-team:not([data-row-active]) {
  filter: brightness(0.62);
}
.brk-grid[data-hover-col] .brk-col-header:not(.brk-col-header--axis):not([data-col-active]) {
  color: var(--text-tertiary);
}
.brk-grid[data-hover-row] .brk-cell:not([data-row-active]):not([data-col-active]),
.brk-grid[data-hover-col] .brk-cell:not([data-row-active]):not([data-col-active]) {
  filter: saturate(0.35) brightness(0.82);
}
.brk-grid[data-hover-row] .brk-cell[data-row-active],
.brk-grid[data-hover-col] .brk-cell[data-col-active] {
  filter: brightness(1.06);
}
.brk-grid[data-hover-row][data-hover-col] .brk-cell[data-row-active][data-col-active] {
  filter: brightness(1.14);
}
.brk-col-header:not(.brk-col-header--axis) {
  cursor: default;
}
`;
