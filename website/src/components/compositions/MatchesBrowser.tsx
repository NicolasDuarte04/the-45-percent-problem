"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { Flag } from "@/components/primitives/Flag";
import { formatProbability } from "@/lib/formatters";
import type { MatchDetail, LiveKnockoutMatch } from "@/lib/data/schemas";
import {
  splitPlayedUpcoming,
  groupByDay,
  partitionToday,
  filterByTeam,
  audienceDayKeyFromMs,
  modalScoreline,
  formatDayLabel,
  formatKickoffTime,
  type MatchDayGroup,
} from "@/lib/data/matchListing";

/**
 * A row is either a graded group card (matches/) or a live, ungraded knockout
 * card (matches_live/). They share the per-match shape; the knockout card adds
 * advance / tie-level fields and a `live_provenance` block carrying
 * `graded: false`, which is also how we tell them apart at runtime.
 */
type MatchListItem = MatchDetail | LiveKnockoutMatch;

function isLiveKnockout(m: MatchListItem): m is LiveKnockoutMatch {
  return (
    "live_provenance" in m &&
    (m as LiveKnockoutMatch).live_provenance != null &&
    (m as LiveKnockoutMatch).live_provenance.graded === false
  );
}

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
function ProbabilityNumbers({ p }: { p: { H: number; D: number; A: number } }) {
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

/**
 * The model's pre-match knockout advance probability (the headline knockout
 * number): home and away chance of progressing past this tie, including extra
 * time and penalties. Rendered only for live knockout cards (round != "GRP").
 */
function AdvanceRow({ match }: { match: LiveKnockoutMatch }) {
  const { home, away } = match;
  return (
    <div
      className="mono flex justify-between items-baseline mt-1.5 text-[11px]"
      style={{ color: "var(--text-secondary)" }}
    >
      <span style={{ color: "var(--text-tertiary)" }}>advance</span>
      <span>
        {home.fifa_code} {formatProbability(match.p_advance_home)}
        <span style={{ color: "var(--text-tertiary)" }}> · </span>
        {away.fifa_code} {formatProbability(match.p_advance_away)}
      </span>
    </div>
  );
}

function MatchRowBody({ match }: { match: MatchListItem }) {
  const { home, away, p_model_1x2: p } = match;
  const played = match.score != null;
  const modal = modalScoreline(match.p_model_goals);
  const roundLabel = ROUND_LABELS[match.round] ?? match.round;
  const live = isLiveKnockout(match);

  return (
    <>
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
        {/* ONE conditional row: the advance probability for live knockout cards. */}
        {live && match.round !== "GRP" && (
          <AdvanceRow match={match as LiveKnockoutMatch} />
        )}
      </div>

      {/* Explicit, visible ungraded label on knockout cards. */}
      {live && (
        <div
          className="mono text-[9px] uppercase tracking-[.07em] mt-2 pt-2 border-t"
          style={{ color: "var(--text-quiet)", borderColor: "var(--border-subtle)" }}
        >
          Live · not graded — only the frozen pre-tournament group forecast is
          scored
        </div>
      )}
    </>
  );
}

function MatchRow({ match }: { match: MatchListItem }) {
  const cardStyle = {
    border: "1px solid var(--border-subtle)",
    background: "var(--bg-panel)",
    padding: "12px 16px",
  } as const;

  // Group cards link to their full per-match breakdown. Live knockout cards
  // (KO-FD ids) have no priced detail page, so they render as a non-interactive
  // panel rather than a link that would 404.
  if (isLiveKnockout(match)) {
    return (
      <div className="block rounded" style={cardStyle}>
        <MatchRowBody match={match} />
      </div>
    );
  }

  return (
    <Link
      href={`/match/${match.match_id}`}
      className="no-underline block rounded transition-colors"
      style={cardStyle}
    >
      <MatchRowBody match={match} />
    </Link>
  );
}

/** A day-divider plus its fixtures. Shared by every section. */
function DayGroups({ groups }: { groups: MatchDayGroup<MatchListItem>[] }) {
  return (
    <>
      {groups.map((g) => (
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
      ))}
    </>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
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
  );
}

/**
 * Download affordance for the daily Instagram share card. Each link hits the
 * /api/og/daily route, which renders a branded 1080x1350 PNG from the live
 * snapshot (recap = the latest played day, preview = the next day to be
 * played). The PNG content is Colombian Spanish; this operator-facing control
 * matches the rest of the English page chrome.
 */
function ShareCard() {
  const linkStyle = {
    border: "1px solid var(--border-default)",
    background: "var(--bg-panel)",
    color: "var(--text-primary)",
  } as const;
  return (
    <div className="flex flex-col gap-1.5">
      <span
        className="mono text-[10px] uppercase tracking-[.08em]"
        style={{ color: "var(--text-tertiary)" }}
      >
        Daily share card
      </span>
      <div className="flex gap-2 flex-wrap">
        <a
          href="/api/og/daily?variant=recap"
          download="45analytics-dia-recap.png"
          className="no-underline inline-flex items-center gap-1.5 text-[13px] rounded px-3 py-2"
          style={linkStyle}
        >
          <Download size={14} aria-hidden="true" />
          Results recap
        </a>
        <a
          href="/api/og/daily?variant=preview"
          download="45analytics-dia-preview.png"
          className="no-underline inline-flex items-center gap-1.5 text-[13px] rounded px-3 py-2"
          style={linkStyle}
        >
          <Download size={14} aria-hidden="true" />
          Today&rsquo;s preview
        </a>
      </div>
    </div>
  );
}

export function MatchesBrowser({
  matches,
  knockouts = [],
}: {
  matches: MatchDetail[];
  knockouts?: LiveKnockoutMatch[];
}) {
  const [query, setQuery] = useState("");
  // The route is force-static, so "now" must come from the client to avoid a
  // hydration mismatch. It stays null through SSR and the first paint (no
  // Today section, matching the prerendered HTML); the effect sets it after
  // mount, which lifts today's fixtures into their own section.
  const [now, setNow] = useState<number | null>(null);
  const [playedOpen, setPlayedOpen] = useState(false);
  useEffect(() => {
    setNow(Date.now());
  }, []);

  const teamListId = useId();
  const playedPanelId = useId();

  // Graded group cards and ungraded live knockout cards are merged for display
  // only; they arrived through disjoint loaders. As knockout pairings resolve
  // round by round they appear in Upcoming, and settle into Played once their
  // result lands.
  const allItems = useMemo<MatchListItem[]>(
    () => [...matches, ...knockouts],
    [matches, knockouts],
  );

  const filtered = useMemo(() => filterByTeam(allItems, query), [allItems, query]);
  const { played, upcoming } = useMemo(
    () => splitPlayedUpcoming(filtered),
    [filtered],
  );

  const todayKey = now != null ? audienceDayKeyFromMs(now) : null;
  const { today, rest } = useMemo(() => {
    if (todayKey == null) return { today: [] as MatchListItem[], rest: upcoming };
    return partitionToday(upcoming, todayKey);
  }, [upcoming, todayKey]);

  const todayGroups = useMemo(() => groupByDay(today), [today]);
  const upcomingGroups = useMemo(() => groupByDay(rest), [rest]);
  const playedGroups = useMemo(() => groupByDay(played), [played]);

  // Autocomplete suggestions: every distinct team name in the schedule.
  const teamNames = useMemo(() => {
    const names = new Set<string>();
    for (const m of allItems) {
      names.add(m.home.display_name);
      names.add(m.away.display_name);
    }
    return Array.from(names).sort();
  }, [allItems]);

  const hasResults = filtered.length > 0;

  return (
    <div className="flex flex-col gap-10">
      {/* ── Daily share card ────────────────────────────────────────────── */}
      <ShareCard />

      {/* ── Search ──────────────────────────────────────────────────────── */}
      <div role="search" className="flex flex-col gap-1.5">
        <label
          htmlFor="match-team-search"
          className="mono text-[10px] uppercase tracking-[.08em]"
          style={{ color: "var(--text-tertiary)" }}
        >
          Search by team
        </label>
        <input
          id="match-team-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Mexico, ENG, Croatia&hellip;"
          aria-label="Filter fixtures by team name"
          list={teamListId}
          autoComplete="off"
          className="text-[13px] rounded px-3 py-2 w-full max-w-[320px]"
          style={{
            border: "1px solid var(--border-default)",
            background: "var(--bg-panel)",
            color: "var(--text-primary)",
          }}
        />
        <datalist id={teamListId}>
          {teamNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </div>

      {!hasResults ? (
        <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
          No fixtures match &ldquo;{query.trim()}&rdquo;.
        </p>
      ) : (
        <>
          {/* ── Today ─────────────────────────────────────────────────────── */}
          {today.length > 0 && (
            <section className="flex flex-col gap-4">
              <SectionHeader title="Today" count={today.length} />
              <DayGroups groups={todayGroups} />
            </section>
          )}

          {/* ── Upcoming ──────────────────────────────────────────────────── */}
          <section className="flex flex-col gap-4">
            <SectionHeader title="Upcoming" count={rest.length} />
            {upcomingGroups.length === 0 ? (
              <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                No upcoming fixtures match this filter.
              </p>
            ) : (
              <DayGroups groups={upcomingGroups} />
            )}
          </section>

          {/* ── Played (collapsible) ──────────────────────────────────────── */}
          {played.length > 0 && (
            <section className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => setPlayedOpen((v) => !v)}
                aria-expanded={playedOpen}
                aria-controls={playedPanelId}
                className="flex items-baseline gap-3 border-b pb-2 w-full text-left cursor-pointer"
                style={{ borderColor: "var(--border-default)" }}
              >
                <span
                  className="mono text-[11px] w-3 inline-block"
                  style={{ color: "var(--text-tertiary)" }}
                  aria-hidden="true"
                >
                  {playedOpen ? "▾" : "▸"}
                </span>
                <h2
                  className="text-[14px] font-medium tracking-tight"
                  style={{ color: "var(--text-primary)" }}
                >
                  Played
                </h2>
                <span
                  className="mono text-[11px]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {played.length} {played.length === 1 ? "match" : "matches"}
                </span>
              </button>
              {playedOpen && (
                <div id={playedPanelId} className="flex flex-col gap-4">
                  <DayGroups groups={playedGroups} />
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
