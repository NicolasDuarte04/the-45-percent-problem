import Link from "next/link";
import type {
  BracketSnapshot,
  TournamentSnapshot,
} from "@/lib/data/schemas";
import { ProbabilityCell } from "@/components/primitives/ProbabilityCell";

interface BracketBoardProps {
  bracket: BracketSnapshot;
  tournament: TournamentSnapshot;
}

type RoundKey =
  | "p_r16"
  | "p_quarterfinal"
  | "p_semifinal"
  | "p_final"
  | "p_champion";

const ROUNDS: Array<{ key: RoundKey; short: string; label: string }> = [
  { key: "p_r16", short: "R16", label: "round of 16" },
  { key: "p_quarterfinal", short: "QF", label: "quarter-final" },
  { key: "p_semifinal", short: "SF", label: "semi-final" },
  { key: "p_final", short: "FIN", label: "final" },
  { key: "p_champion", short: "CHA", label: "champion" },
];

export function BracketBoard({ bracket, tournament }: BracketBoardProps) {
  const slotsPopulated = bracket.rounds.some((r) => r.slots.length > 0);

  const sortedTeams = tournament.teams
    .slice()
    .sort((a, b) => b.p_champion - a.p_champion);

  const topTeams = sortedTeams.slice(0, 16);

  const cellColor = (p: number) => {
    if (p < 0.02) return "var(--bg-panel-elev)";
    const scale = Math.min(1, p * 3);
    if (p < 0.15)
      return `color-mix(in oklch, var(--prism-cyan) ${10 + scale * 35}%, var(--bg-panel-elev))`;
    if (p < 0.35)
      return `color-mix(in oklch, var(--prism-peach) ${25 + scale * 55}%, var(--bg-panel-elev))`;
    return `color-mix(in oklch, var(--prism-plum) ${35 + scale * 55}%, var(--bg-panel-elev))`;
  };

  const textColor = (p: number) =>
    p > 0.35 ? "var(--bg-root)" : p > 0.08 ? "var(--text-primary)" : "var(--text-tertiary)";

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
              : "pre-tournament bracket · slots unresolved · showing marginal P(reach round) across top 16 by champion probability"}
          </div>
        </div>
        <div
          className="mono text-[10px] uppercase tracking-[.08em]"
          style={{ color: "var(--text-quiet)" }}
        >
          {sortedTeams.length} teams · {ROUNDS.length} rounds
        </div>
      </div>

      {/* CSS Grid bracket — native, no external library */}
      <div
        role="table"
        aria-label="Bracket board: per-round marginal probabilities"
        className="overflow-x-auto"
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: `minmax(160px, 1.2fr) repeat(${ROUNDS.length}, minmax(100px, 1fr))`,
            gap: 1,
            background: "var(--border-subtle)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 6,
            overflow: "hidden",
          }}
        >
          {/* Header row */}
          <div
            className="mono text-[10px] uppercase tracking-[.08em] px-3 py-2"
            style={{
              background: "var(--bg-panel-elev)",
              color: "var(--text-quiet)",
            }}
            role="columnheader"
          >
            team · seed · group
          </div>
          {ROUNDS.map((r) => (
            <div
              key={r.key}
              className="mono text-[10px] uppercase tracking-[.08em] px-3 py-2 text-center"
              style={{
                background: "var(--bg-panel-elev)",
                color: "var(--text-quiet)",
              }}
              role="columnheader"
            >
              {r.short}
            </div>
          ))}

          {/* Team rows */}
          {topTeams.map((team) => (
            <div key={team.fifa_code} className="contents" role="row">
              <Link
                href={`/team/${team.fifa_code}`}
                className="px-3 py-2 flex items-center gap-2"
                style={{
                  background: "var(--bg-panel)",
                  color: "var(--text-primary)",
                }}
              >
                <span
                  className="mono text-[11px]"
                  style={{ color: "var(--accent-focus)", minWidth: 36 }}
                >
                  {team.fifa_code}
                </span>
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
                  className="mono text-[10px] ml-auto"
                  style={{ color: "var(--text-quiet)" }}
                >
                  #{team.seed} · {team.group ?? "—"}
                </span>
              </Link>

              {ROUNDS.map((r) => {
                const p = team[r.key] as number;
                return (
                  <div
                    key={r.key}
                    role="cell"
                    aria-label={`${team.display_name} probability of reaching ${r.label}: ${(p * 100).toFixed(1)} percent`}
                    className="flex items-center justify-center py-2"
                    style={{
                      background: cellColor(p),
                      color: textColor(p),
                    }}
                  >
                    <ProbabilityCell p={p} decimals={1} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
        <div
          className="mono text-[10px] uppercase tracking-[.08em]"
          style={{ color: "var(--text-quiet)" }}
        >
          P(reach round) density
        </div>
        <div className="flex items-center gap-2" style={{ minWidth: 240 }}>
          <span
            className="mono text-[10px]"
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
            className="mono text-[10px]"
            style={{ color: "var(--text-quiet)" }}
          >
            100%
          </span>
        </div>
      </div>
    </div>
  );
}
