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
  partitionByState,
  filterByTeam,
  audienceDayKeyFromMs,
  modalScoreline,
  formatDayLabel,
  formatKickoffTime,
  isLiveKnockout,
  outcomeLabel,
  shootoutLine,
  ROUND_LABELS,
  type MatchDayGroup,
} from "@/lib/data/matchListing";

// Re-exported so the existing unit tests (tests/unit/matchesBrowser.test.ts)
// keep importing them from here, while the single implementations now live in
// the pure matchListing module and are shared with the live knockout detail
// route (/match/live/[id]).
export { outcomeLabel, shootoutLine } from "@/lib/data/matchListing";

/**
 * A row is either a graded group card (matches/) or a live, ungraded knockout
 * card (matches_live/). They share the per-match shape; the knockout card adds
 * advance / tie-level fields and a `live_provenance` block carrying
 * `graded: false`, which is also how we tell them apart at runtime.
 */
type MatchListItem = MatchDetail | LiveKnockoutMatch;

/**
 * The message shown when the Upcoming section is empty. When a team filter is
 * active the emptiness is attributable to the filter; when no filter is active
 * (the inter-round gap before the next knockout pairings resolve) it is not, so
 * we must not imply a phantom filter is hiding fixtures.
 */
export function upcomingEmptyMessage(query: string): string {
  return query.trim().length > 0
    ? "No upcoming fixtures match this filter."
    : "No upcoming fixtures yet; knockout pairings appear here once the draw resolves.";
}


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
  const penLine = shootoutLine(match);

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
                {match.score.home}&thinsp;-&thinsp;{match.score.away}
              </span>
              <span
                className="mono text-[9px] uppercase tracking-[.08em] mt-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                {outcomeLabel(match.outcome_realized, live)}
              </span>
              {penLine && (
                <span
                  className="mono text-[9px] tracking-[.04em] mt-0.5 text-center"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {penLine}
                </span>
              )}
            </>
          ) : (
            <>
              <span
                className="mono text-[9px] uppercase tracking-[.08em] mb-1"
                style={{ color: "var(--text-quiet)" }}
              >
                {modal ? `modal ${modal.home}-${modal.away}` : "1X2"}
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
          Live · not graded. Only the frozen pre-tournament group forecast is
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

  // Both card kinds open a per-match breakdown, but through DISJOINT routes so
  // the graded wall stays auditable. Group cards go to the graded, frozen
  // /match/[id] page; live knockout cards (KO-FD ids) go to the separate,
  // explicitly ungraded /match/live/[id] page, which only ever reads
  // matches_live/ and never the ledger.
  const href = isLiveKnockout(match)
    ? `/match/live/${match.match_id}`
    : `/match/${match.match_id}`;

  return (
    <Link
      href={href}
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
 * cp-44: completed-tournament note. Once the WC 2026 is over there are no
 * upcoming fixtures, so the old "knockout pairings appear once the draw
 * resolves" empty state is stale. This replaces it with the archive framing:
 * the record is final, every settled card is still browsable below (the Played
 * section), and the reader is pointed at the graded ledger, the bracket, and
 * the research vault. `settledCount` is read from the snapshot meta so the line
 * stays true to the published record rather than hardcoding a total.
 */
function CompletedArchiveNote({ settledCount }: { settledCount: number }) {
  const linkStyle = { color: "var(--accent-focus)" } as const;
  return (
    <section
      className="flex flex-col gap-3"
      aria-label="Tournament complete"
    >
      <div
        className="flex items-baseline gap-3 border-b pb-2"
        style={{ borderColor: "var(--border-default)" }}
      >
        <h2
          className="text-[14px] font-medium tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Tournament complete
        </h2>
      </div>
      <p className="text-[13px]" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
        The tournament is complete. All {settledCount} fixtures are settled.
        Every settled match stays browsable below, each with its real final
        score and the probability the model gave the result.
      </p>
      <p className="text-[13px]" style={{ color: "var(--text-tertiary)", lineHeight: 1.6 }}>
        Read the record: the graded{" "}
        <Link href="/ledger" style={linkStyle}>
          ledger
        </Link>{" "}
        of the 72 pre-registered group-stage forecasts, the{" "}
        <Link href="/bracket" style={linkStyle}>
          bracket
        </Link>
        , and the research{" "}
        <Link href="/vault" style={linkStyle}>
          vault
        </Link>
        .
      </p>
    </section>
  );
}

/**
 * Download affordance for the Instagram share card. Each link hits the
 * /api/og/daily route, which renders a branded 1080x1350 PNG.
 *
 * During the tournament this offered two day-cards (recap = the latest played
 * day, preview = the next day to be played). cp-44: once the tournament is
 * complete the route renders a single completed-tournament summary card for
 * every variant, so here we collapse to one honest "Tournament summary" link
 * rather than two labels that both now resolve to the same summary. The PNG
 * content is English, matching the rest of the page chrome.
 */
function ShareCard({ tournamentComplete }: { tournamentComplete: boolean }) {
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
        {tournamentComplete ? "Share card" : "Daily share card"}
      </span>
      <div className="flex gap-2 flex-wrap">
        {tournamentComplete ? (
          <a
            href="/api/og/daily"
            download="45analytics-tournament-summary.png"
            className="no-underline inline-flex items-center gap-1.5 text-[13px] rounded px-3 py-2"
            style={linkStyle}
          >
            <Download size={14} aria-hidden="true" />
            Tournament summary
          </a>
        ) : (
          <>
            <a
              href="/api/og/daily?variant=recap"
              download="45analytics-day-recap.png"
              className="no-underline inline-flex items-center gap-1.5 text-[13px] rounded px-3 py-2"
              style={linkStyle}
            >
              <Download size={14} aria-hidden="true" />
              Results recap
            </a>
            <a
              href="/api/og/daily?variant=preview"
              download="45analytics-day-preview.png"
              className="no-underline inline-flex items-center gap-1.5 text-[13px] rounded px-3 py-2"
              style={linkStyle}
            >
              <Download size={14} aria-hidden="true" />
              Today&rsquo;s preview
            </a>
          </>
        )}
      </div>
    </div>
  );
}

export function MatchesBrowser({
  matches,
  knockouts = [],
  tournamentComplete = false,
  settledCount = 0,
}: {
  matches: MatchDetail[];
  knockouts?: LiveKnockoutMatch[];
  /** cp-44: true once the tournament is over (meta phase "completed", 0
   * remaining). Swaps the in-tournament "Upcoming" empty state for the
   * completed-archive note and collapses the share card to one summary link. */
  tournamentComplete?: boolean;
  /** Settled-fixture count from the snapshot meta, shown in the completed note. */
  settledCount?: number;
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

  // cp-39: the global find-a-team control (masthead) links here as
  // /matches?team=<name>. Prefill the filter from that param on mount. We read
  // window.location directly rather than useSearchParams so this force-static,
  // fully-prerendered page needs no Suspense boundary (which, wrapping the
  // whole list, would leave it client-rendered). The query is already a
  // client-only concern: it starts empty at SSR to match the prerendered HTML,
  // and this effect lifts the filter after hydration, exactly like `now` above.
  useEffect(() => {
    const team = new URLSearchParams(window.location.search).get("team");
    if (team) setQuery(team);
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
  const { awaiting, today, rest } = useMemo(() => {
    // Pre-hydration (now == null) the page keeps its prerendered shape: no
    // clock, so nothing is split off as Today or Awaiting and every unplayed
    // fixture sits under Upcoming. The effect sets `now` after mount, which
    // then lifts today's and past-kickoff fixtures into their honest sections.
    if (todayKey == null || now == null) {
      return { awaiting: [] as MatchListItem[], today: [] as MatchListItem[], rest: upcoming };
    }
    return partitionByState(upcoming, todayKey, now);
  }, [upcoming, todayKey, now]);

  const awaitingGroups = useMemo(() => groupByDay(awaiting), [awaiting]);
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
      {/* ── Share card ──────────────────────────────────────────────────── */}
      <ShareCard tournamentComplete={tournamentComplete} />

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
          {/* ── Awaiting result ───────────────────────────────────────────── */}
          {/* Past-kickoff fixtures whose score has not been ingested yet. They
              have started (or finished) but are not settled, so they read as
              "awaiting result" rather than sitting under Upcoming as if still
              to come. */}
          {awaiting.length > 0 && (
            <section className="flex flex-col gap-4">
              <SectionHeader title="Awaiting result" count={awaiting.length} />
              <DayGroups groups={awaitingGroups} />
            </section>
          )}

          {/* ── Today ─────────────────────────────────────────────────────── */}
          {today.length > 0 && (
            <section className="flex flex-col gap-4">
              <SectionHeader title="Today" count={today.length} />
              <DayGroups groups={todayGroups} />
            </section>
          )}

          {/* ── Upcoming / Completed ──────────────────────────────────────── */}
          {/* cp-44: once the tournament is complete there are no upcoming
              fixtures, so with no team filter active we show the completed
              archive note instead of the in-tournament "Upcoming" section and
              its "pairings appear once the draw resolves" empty state. A filter
              keeps the normal Upcoming section (its emptiness is then
              attributable to the filter, not to the tournament being over). */}
          {tournamentComplete && query.trim().length === 0 ? (
            <CompletedArchiveNote settledCount={settledCount} />
          ) : (
            <section className="flex flex-col gap-4">
              <SectionHeader title="Upcoming" count={rest.length} />
              {upcomingGroups.length === 0 ? (
                <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                  {upcomingEmptyMessage(query)}
                </p>
              ) : (
                <DayGroups groups={upcomingGroups} />
              )}
            </section>
          )}

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
