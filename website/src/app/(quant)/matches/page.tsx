import Link from "next/link";
import { loadAllMatches, loadSnapshotMeta } from "@/lib/data/loadSnapshot";
import { Flag } from "@/components/primitives/Flag";
import { ProvenanceBlock } from "@/components/layout/ProvenanceBlock";
import { formatProbability } from "@/lib/formatters";
import type { MatchDetail } from "@/lib/data/schemas";
import {
  splitPlayedUpcoming,
  groupByDay,
  modalScoreline,
  formatDayLabel,
  formatKickoffTime,
  type MatchDayGroup,
} from "@/lib/data/matchListing";

export const dynamic = "force-static";

export const metadata = {
  title: "Matches · The 45% Problem",
  description:
    "Every World Cup 2026 fixture with the model's 1X2 probabilities and modal scoreline. Played matches carry their real final score and outcome.",
};

const ROUND_LABELS: Record<string, string> = {
  GRP: "Group stage",
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarter-final",
  SF: "Semi-final",
  "3P": "Third-place playoff",
  FIN: "Final",
};

const OUTCOME_LABELS: Record<"H" | "D" | "A", string> = {
  H: "Home win",
  D: "Draw",
  A: "Away win",
};

/** A team's name + flag, aligned toward or away from the centre column. */
function TeamLabel({
  code,
  name,
  align,
}: {
  code: string;
  name: string;
  align: "start" | "end";
}) {
  return (
    <span
      className={`flex items-center gap-2 min-w-0 ${
        align === "end" ? "justify-end text-right flex-row-reverse" : ""
      }`}
    >
      <Flag code={code} size={18} />
      <span className="truncate text-[14px]" style={{ color: "var(--text-primary)" }}>
        {name}
      </span>
    </span>
  );
}

/** Compact stacked H/D/A probability bar (home · draw · away). */
function ProbabilityBar({
  p,
  homeName,
  awayName,
}: {
  p: { H: number; D: number; A: number };
  homeName: string;
  awayName: string;
}) {
  return (
    <div
      className="flex overflow-hidden"
      style={{
        height: 6,
        borderRadius: 3,
        background: "var(--bg-root)",
        border: "0.5px solid var(--border-subtle)",
      }}
      role="img"
      aria-label={`Model 1X2: ${homeName} ${formatProbability(p.H)}, draw ${formatProbability(
        p.D,
      )}, ${awayName} ${formatProbability(p.A)}`}
    >
      <div style={{ flex: p.H, background: "var(--prism-peach)" }} />
      <div
        style={{
          flex: p.D,
          background: "color-mix(in oklch, var(--prism-sun) 55%, var(--bg-panel))",
        }}
      />
      <div style={{ flex: p.A, background: "var(--prism-cyan)" }} />
    </div>
  );
}

/** Three labelled percentages under the bar. */
function ProbabilityNumbers({
  p,
}: {
  p: { H: number; D: number; A: number };
}) {
  return (
    <div
      className="mono flex justify-between items-baseline mt-1.5 text-[11px]"
      style={{ color: "var(--text-secondary)" }}
    >
      <span>H {formatProbability(p.H)}</span>
      <span style={{ color: "var(--text-tertiary)" }}>D {formatProbability(p.D)}</span>
      <span>A {formatProbability(p.A)}</span>
    </div>
  );
}

function MatchRow({ match }: { match: MatchDetail }) {
  const { home, away, p_model_1x2: p } = match;
  const played = match.score != null;
  const modal = modalScoreline(match.p_model_goals);
  const roundLabel = ROUND_LABELS[match.round] ?? match.round;

  return (
    <Link
      href={`/match/${match.match_id}`}
      className="no-underline block rounded transition-colors"
      style={{
        border: "1px solid var(--border-subtle)",
        background: "var(--bg-panel)",
        padding: "12px 16px",
      }}
    >
      {/* meta line */}
      <div
        className="mono flex items-center justify-between text-[10px] uppercase tracking-[.06em] mb-2.5"
        style={{ color: "var(--text-tertiary)" }}
      >
        <span>
          {formatKickoffTime(match.kickoff_utc)} · {roundLabel}
        </span>
        <span>{match.match_id}</span>
      </div>

      <div
        className="grid items-center gap-3 md:gap-4"
        style={{ gridTemplateColumns: "1fr auto 1fr" }}
      >
        <TeamLabel code={home.fifa_code} name={home.display_name} align="end" />

        {/* centre: result for played, prediction for upcoming */}
        <div className="flex flex-col items-center w-[92px] md:w-[120px]">
          {played && match.score ? (
            <>
              <span
                className="mono text-[18px] font-medium leading-none"
                style={{ color: "var(--text-primary)" }}
              >
                {match.score.home}&thinsp;&ndash;&thinsp;{match.score.away}
              </span>
              <span
                className="mono text-[9px] uppercase tracking-[.08em] mt-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                {match.outcome_realized
                  ? OUTCOME_LABELS[match.outcome_realized]
                  : "Final"}
              </span>
            </>
          ) : (
            <>
              <span
                className="mono text-[9px] uppercase tracking-[.08em] mb-1"
                style={{ color: "var(--text-quiet)" }}
              >
                {modal ? `modal ${modal.home}–${modal.away}` : "1X2"}
              </span>
              <div className="w-full">
                <ProbabilityBar
                  p={p}
                  homeName={home.display_name}
                  awayName={away.display_name}
                />
              </div>
            </>
          )}
        </div>

        <TeamLabel code={away.fifa_code} name={away.display_name} align="start" />
      </div>

      {/* model probabilities: full row beneath, muted for played fixtures */}
      <div style={{ opacity: played ? 0.6 : 1 }}>
        <ProbabilityNumbers p={p} />
      </div>
    </Link>
  );
}

function MatchSection({
  title,
  count,
  groups,
  emptyNote,
}: {
  title: string;
  count: number;
  groups: MatchDayGroup[];
  emptyNote: string;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div
        className="flex items-baseline gap-3 border-b pb-2"
        style={{ borderColor: "var(--border-default)" }}
      >
        <h2
          className="text-[14px] font-medium tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </h2>
        <span className="mono text-[11px]" style={{ color: "var(--text-tertiary)" }}>
          {count} {count === 1 ? "match" : "matches"}
        </span>
      </div>

      {groups.length === 0 ? (
        <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
          {emptyNote}
        </p>
      ) : (
        groups.map((g) => (
          <div key={g.day} className="flex flex-col gap-2">
            <h3
              className="mono text-[11px] uppercase tracking-[.06em] mt-1"
              style={{ color: "var(--text-secondary)" }}
            >
              {formatDayLabel(g.day)}
            </h3>
            <div className="flex flex-col gap-2">
              {g.matches.map((m) => (
                <MatchRow key={m.match_id} match={m} />
              ))}
            </div>
          </div>
        ))
      )}
    </section>
  );
}

export default async function MatchesPage() {
  const matches = loadAllMatches();
  const meta = loadSnapshotMeta();
  const { played, upcoming } = splitPlayedUpcoming(matches);
  const playedGroups = groupByDay(played);
  const upcomingGroups = groupByDay(upcoming);

  return (
    <div
      className="flex flex-col"
      style={{ backgroundColor: "var(--bg-root)", color: "var(--text-primary)" }}
    >
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div
        className="shrink-0 px-4 md:px-6 pt-6 pb-4 border-b"
        style={{ borderColor: "var(--border-default)" }}
      >
        <div className="max-w-[1152px] mx-auto px-0 md:px-12">
          <h1
            className="text-[18px] font-medium tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Matches
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Every World Cup 2026 fixture with the model&rsquo;s 1X2 probabilities
            and modal scoreline. Played matches carry their real final score and
            outcome; times are UTC. Each row opens the full per-match breakdown.
          </p>
        </div>
      </div>

      <div className="max-w-[1152px] mx-auto w-full px-4 md:px-12 py-6 flex flex-col gap-10">
        <MatchSection
          title="Played"
          count={played.length}
          groups={playedGroups}
          emptyNote="No matches have been settled in this snapshot yet."
        />
        <MatchSection
          title="Upcoming"
          count={upcoming.length}
          groups={upcomingGroups}
          emptyNote="No upcoming fixtures in this snapshot."
        />

        <ProvenanceBlock meta={meta} />
      </div>
    </div>
  );
}
