import type { LiveKnockoutMatch } from "@/lib/data/schemas";

/**
 * cp-27: the live conditional bracket, round by round.
 *
 * The frozen bracket above is a per-team marginal-probability matrix held fixed
 * from before the tournament. The LIVE view is a real, advancing bracket: it
 * renders the actual knockout pairings the draw produced (learned from the
 * schedule feed into data/live/knockout_pairings.json and emitted as the
 * ungraded matches_live/ cards), round by round, with the settled result on each
 * decided match and the model's conditional advance probabilities on each match
 * still to play. As rounds settle, the next round's pairings appear here, so the
 * tree fills in with reality rather than staying a static marginal grid.
 *
 * Ungraded, like every live surface: these cards are never scored by the public
 * ledger (the frozen forecast is). No canonical bracket geometry is assumed; the
 * rounds are rendered in order from the concrete pairings the feed resolved.
 */

const ROUND_ORDER = ["R32", "R16", "QF", "SF", "3P", "FIN"] as const;
const ROUND_LABEL: Record<string, string> = {
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarter-finals",
  SF: "Semi-finals",
  "3P": "Third place",
  FIN: "Final",
};

function pct(p: number | undefined): string {
  if (p == null || Number.isNaN(p)) return "-";
  return `${Math.round(p * 100)}%`;
}

function Side({
  name,
  code,
  goals,
  isWinner,
  settled,
  advance,
}: {
  name: string;
  code: string;
  goals: number | null;
  isWinner: boolean;
  settled: boolean;
  advance: number | undefined;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span
        className="text-[12px] truncate"
        style={{
          color: settled
            ? isWinner
              ? "var(--text-primary)"
              : "var(--text-tertiary)"
            : "var(--text-secondary)",
          fontWeight: settled && isWinner ? 600 : 400,
        }}
        title={name}
      >
        {name}
      </span>
      {settled ? (
        <span
          className="mono text-[12px] tabular-nums"
          style={{
            color: isWinner ? "var(--text-primary)" : "var(--text-tertiary)",
            fontWeight: isWinner ? 600 : 400,
          }}
        >
          {goals ?? "-"}
        </span>
      ) : (
        <span
          className="mono text-[11px] tabular-nums"
          style={{ color: "var(--text-tertiary)" }}
          title={`Model advance probability for ${code}`}
        >
          {pct(advance)}
        </span>
      )}
    </div>
  );
}

function MatchCard({ m }: { m: LiveKnockoutMatch }) {
  const settled = m.score != null;
  const hg = m.score?.home ?? null;
  const ag = m.score?.away ?? null;
  // outcome_realized is "H" | "A" | "D" (a penalty-decided win is a regulation
  // draw); fall back to the shootout winner when the regulation result is level.
  const homeWon =
    settled &&
    (m.outcome_realized === "H" ||
      (m.outcome_realized === "D" && m.shootout?.winner === "H"));
  const awayWon =
    settled &&
    (m.outcome_realized === "A" ||
      (m.outcome_realized === "D" && m.shootout?.winner === "A"));
  const pens =
    settled && m.outcome_realized === "D" && m.shootout
      ? `pens ${m.shootout.home ?? "?"}-${m.shootout.away ?? "?"}`
      : null;

  return (
    <div
      className="rounded border px-2.5 py-2 flex flex-col gap-1"
      style={{
        borderColor: "var(--border-default)",
        backgroundColor: "var(--bg-subtle, rgba(127,127,127,0.05))",
      }}
    >
      <Side
        name={m.home.display_name}
        code={m.home.fifa_code}
        goals={hg}
        isWinner={homeWon}
        settled={settled}
        advance={m.p_advance_home}
      />
      <Side
        name={m.away.display_name}
        code={m.away.fifa_code}
        goals={ag}
        isWinner={awayWon}
        settled={settled}
        advance={m.p_advance_away}
      />
      <div
        className="text-[10px] flex items-center justify-between gap-2 pt-0.5"
        style={{ color: "var(--text-tertiary)" }}
      >
        <span>{settled ? "settled" : "to play · P(advance)"}</span>
        {pens ? <span className="mono">{pens}</span> : null}
      </div>
    </div>
  );
}

export function LiveKnockoutRounds({
  knockouts,
}: {
  knockouts: LiveKnockoutMatch[];
}) {
  if (knockouts.length === 0) return null;

  const byRound = new Map<string, LiveKnockoutMatch[]>();
  for (const m of knockouts) {
    const r = m.round ?? "R32";
    if (!byRound.has(r)) byRound.set(r, []);
    byRound.get(r)!.push(m);
  }
  const rounds = ROUND_ORDER.filter((r) => byRound.has(r));

  return (
    <div className="flex flex-col gap-3" data-guide-id="live-knockout-rounds">
      <div>
        <h3
          className="text-[13px] font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          Final bracket · resolved pairings, round by round
        </h3>
        <p
          className="text-[11px] mt-0.5"
          style={{ color: "var(--text-tertiary)" }}
        >
          The actual draw as it resolved: settled results on every decided match,
          with the model&apos;s conditional advance probability recorded alongside.
          Ungraded.
        </p>
      </div>
      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-fit">
          {rounds.map((r) => (
            <div key={r} className="flex flex-col gap-2 min-w-[168px]">
              <div
                className="text-[11px] font-medium uppercase tracking-wide"
                style={{ color: "var(--text-secondary)" }}
              >
                {ROUND_LABEL[r] ?? r}
              </div>
              {byRound.get(r)!.map((m) => (
                <MatchCard key={m.match_id} m={m} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
