"use client";
// rev: bracket-path-trace-v1

import { useMemo, useState } from "react";
import Link from "next/link";
import type { TournamentSnapshot, TournamentTeam } from "@/lib/data/schemas";
import { Flag } from "@/components/primitives/Flag";

/**
 * Most Likely Bracket: modal path through the 48-team draw.
 *
 * Data wiring: round-by-round slots are derived from tournament.json by taking
 * the top-k teams sorted by the round-specific p_reach. Pairwise advancement
 * probabilities are approximated as a ratio of next-round reach probabilities
 * (defensible under bracket independence). See _design_handoff/Bracket.jsx
 * for the original design reference.
 *
 * Visual style is uniform-neutral: every team chip is graphite-ink on cream,
 * every match card has a 1px subtle border on all sides. Lineage colour and
 * the colour legend were retired in favour of the Terminal Dashboard.
 */

type Slot = {
  team: TournamentTeam;
  p: number; // probability of advancing from *this* round
};

type Match = {
  id: string;
  a: Slot;
  b: Slot;
  label?: string;
};

/** Pair-wise advancement probability given each team's p(reach next round). */
function winProb(a: number, b: number): number {
  const s = a + b;
  if (s <= 0) return 0.5;
  return a / s;
}

function buildBracket(tournament: TournamentSnapshot) {
  // Top-k selections per round. These populate slots deterministically and
  // mirror the modal path: not a replacement for a full simulated bracket.
  const byR16 = [...tournament.teams].sort((a, b) => b.p_r16 - a.p_r16);
  const byQF = [...tournament.teams].sort(
    (a, b) => b.p_quarterfinal - a.p_quarterfinal
  );
  const bySF = [...tournament.teams].sort(
    (a, b) => b.p_semifinal - a.p_semifinal
  );
  const byF = [...tournament.teams].sort((a, b) => b.p_final - a.p_final);
  const byC = [...tournament.teams].sort((a, b) => b.p_champion - a.p_champion);

  // ── R16 (8 matches) ────────────────────────────────────────────────────
  // Pair each of the top 8 reach-favourites against an underdog. Underdogs
  // are drawn from the next band of p_r16 so both sides are plausible R16
  // participants.
  const r16Favs = byQF.slice(0, 8);
  const favCodes = new Set(r16Favs.map((t) => t.fifa_code));
  const underdogPool = byR16.filter((t) => !favCodes.has(t.fifa_code)).slice(0, 8);

  const r16: Match[] = r16Favs.map((fav, i) => {
    const und = underdogPool[i] ?? underdogPool[underdogPool.length - 1];
    const pFav = winProb(fav.p_quarterfinal, und.p_quarterfinal);
    return {
      id: `r16-${i + 1}`,
      label: `R16 · Match ${String(i + 1).padStart(2, "0")}`,
      a: { team: fav, p: pFav },
      b: { team: und, p: 1 - pFav },
    };
  });

  // ── QF (4 matches) ─────────────────────────────────────────────────────
  const qfTeams = byQF.slice(0, 8);
  const qf: Match[] = [];
  const qfLabels = ["Upper A", "Upper B", "Lower A", "Lower B"];
  for (let i = 0; i < 4; i++) {
    const a = qfTeams[i * 2];
    const b = qfTeams[i * 2 + 1];
    const pA = winProb(a.p_semifinal, b.p_semifinal);
    qf.push({
      id: `qf-${i + 1}`,
      label: qfLabels[i],
      a: { team: a, p: pA },
      b: { team: b, p: 1 - pA },
    });
  }

  // ── SF (2 matches) ─────────────────────────────────────────────────────
  const sfTeams = bySF.slice(0, 4);
  const sf: Match[] = [];
  const sfLabels = ["Upper half", "Lower half"];
  for (let i = 0; i < 2; i++) {
    const a = sfTeams[i * 2];
    const b = sfTeams[i * 2 + 1];
    const pA = winProb(a.p_final, b.p_final);
    sf.push({
      id: `sf-${i + 1}`,
      label: sfLabels[i],
      a: { team: a, p: pA },
      b: { team: b, p: 1 - pA },
    });
  }

  // ── Final ──────────────────────────────────────────────────────────────
  const finalTeams = byF.slice(0, 2);
  const pFinA = winProb(finalTeams[0].p_champion, finalTeams[1].p_champion);
  const final: Match = {
    id: "final",
    a: { team: finalTeams[0], p: pFinA },
    b: { team: finalTeams[1], p: 1 - pFinA },
  };

  const champion = byC[0];

  return { r16, qf, sf, final, champion };
}

// ── Presentational pieces ─────────────────────────────────────────────────

function TeamRow({
  slot,
  advancing,
  dim,
  onTeamHover,
}: {
  slot: Slot;
  advancing: boolean;
  dim: boolean;
  onTeamHover?: (code: string | null) => void;
}) {
  return (
    <Link
      href={`/team/${slot.team.fifa_code}`}
      prefetch={false}
      aria-label={`${slot.team.display_name}; team detail`}
      className="bracket-team-row flex items-center gap-2 px-[9px] py-[5px] no-underline transition-colors"
      style={{ opacity: dim ? 0.45 : 1, color: "inherit" }}
      onMouseEnter={
        onTeamHover ? () => onTeamHover(slot.team.fifa_code) : undefined
      }
      onFocus={
        onTeamHover ? () => onTeamHover(slot.team.fifa_code) : undefined
      }
    >
      <Flag code={slot.team.fifa_code} size={14} />
      <span
        className="flex-1 truncate"
        style={{
          fontSize: 12.5,
          fontWeight: advancing ? 500 : 400,
          color: advancing ? "var(--text-primary)" : "var(--text-secondary)",
          letterSpacing: "-0.005em",
        }}
      >
        {slot.team.display_name}
      </span>
      <span
        className="mono"
        style={{
          fontSize: 11,
          color: advancing ? "var(--text-primary)" : "var(--text-tertiary)",
          fontWeight: advancing ? 500 : 400,
        }}
      >
        {(slot.p * 100).toFixed(0)}
        <span
          style={{ fontSize: 9.5, color: "var(--text-quiet)", marginLeft: 1 }}
        >
          %
        </span>
      </span>
    </Link>
  );
}

function MatchCard({
  match,
  inPath,
  onTeamHover,
}: {
  match: Match;
  inPath: boolean | null;
  onTeamHover?: (code: string | null) => void;
}) {
  const aWins = match.a.p >= match.b.p;
  return (
    <div
      className="bracket-match-card bracket-fade overflow-hidden"
      data-on-path={inPath === true ? "" : undefined}
      data-off-path={inPath === false ? "" : undefined}
      style={{
        background: "var(--bg-panel-elev)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius)",
        boxShadow: "0 1px 2px rgb(0 0 0 / 0.03)",
      }}
    >
      {match.label ? (
        <div
          className="mono"
          style={{
            fontSize: 9,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-quiet)",
            padding: "4px 9px 0 9px",
          }}
        >
          {match.label}
        </div>
      ) : null}
      <TeamRow
        slot={match.a}
        advancing={aWins}
        dim={!aWins}
        onTeamHover={onTeamHover}
      />
      <div
        style={{
          height: 1,
          background: "var(--border-subtle)",
          margin: "0 9px",
        }}
      />
      <TeamRow
        slot={match.b}
        advancing={!aWins}
        dim={aWins}
        onTeamHover={onTeamHover}
      />
    </div>
  );
}

const STAGE_HEADER_H = 52;

function StageHeader({
  kicker,
  label,
  align = "left",
}: {
  kicker: string;
  label: string;
  align?: "left" | "right" | "center";
}) {
  return (
    <div
      style={{
        height: STAGE_HEADER_H,
        textAlign: align,
        marginBottom: 14,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 9.5,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--text-quiet)",
          marginBottom: 3,
        }}
      >
        {kicker}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          justifyContent:
            align === "right"
              ? "flex-end"
              : align === "center"
                ? "center"
                : "flex-start",
          paddingBottom: 6,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 15,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            color: "var(--text-primary)",
          }}
        >
          {label}
        </span>
      </div>
      <div style={{ height: 1, background: "var(--rule)" }} />
    </div>
  );
}

function RoundColumn({
  kicker,
  label,
  align,
  children,
}: {
  kicker: string;
  label: string;
  align: "left" | "right";
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-w-0">
      <StageHeader kicker={kicker} label={label} align={align} />
      <div className="flex flex-col flex-1 justify-around gap-[10px]">
        {children}
      </div>
    </div>
  );
}

function ConnectorColumn({
  pairs,
  mirrored = false,
  pathPair,
  hasActiveTeam,
}: {
  pairs: number;
  mirrored?: boolean;
  pathPair?: number;
  hasActiveTeam?: boolean;
}) {
  const rows = Array.from({ length: pairs });
  return (
    <div
      aria-hidden="true"
      className="flex flex-col"
      style={{ paddingTop: STAGE_HEADER_H + 14 }}
    >
      {rows.map((_, i) => {
        const offPath = hasActiveTeam === true && pathPair !== i;
        return (
        <div
          key={i}
          className="flex-1 relative bracket-fade"
          data-off-path={offPath ? "" : undefined}
        >
          {/* top hook */}
          <div
            style={{
              position: "absolute",
              top: "25%",
              height: 1,
              left: mirrored ? "50%" : 0,
              right: mirrored ? 0 : "50%",
              background: "var(--rule)",
            }}
          />
          {/* bottom hook */}
          <div
            style={{
              position: "absolute",
              top: "75%",
              height: 1,
              left: mirrored ? "50%" : 0,
              right: mirrored ? 0 : "50%",
              background: "var(--rule)",
            }}
          />
          {/* vertical join */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "25%",
              height: "50%",
              width: 1,
              background: "var(--rule)",
            }}
          />
          {/* outbound stub */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              height: 1,
              left: mirrored ? 0 : "50%",
              right: mirrored ? "50%" : 0,
              background: "var(--rule)",
            }}
          />
        </div>
        );
      })}
    </div>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────

interface MostLikelyBracketProps {
  tournament: TournamentSnapshot;
}

export function MostLikelyBracket({ tournament }: MostLikelyBracketProps) {
  const { r16, qf, sf, final, champion } = useMemo(
    () => buildBracket(tournament),
    [tournament],
  );

  const r16Left = r16.slice(0, 4);
  const r16Right = r16.slice(4, 8);
  const qfLeft = qf.slice(0, 2);
  const qfRight = qf.slice(2, 4);
  const sfLeft = sf[0];
  const sfRight = sf[1];

  // ── Path tracing ──────────────────────────────────────────────────────────
  // Hover any team chip to highlight the match cards (and feeder connectors)
  // where that team appears in the modal bracket. Off-path nodes dim to 0.35.
  // Hover-clear is at the section level so moving the cursor between cards
  // (over whitespace within the bracket) does not flicker the highlight.
  const [activeTeam, setActiveTeam] = useState<string | null>(null);
  const teamInMatch = (m: Match): boolean =>
    activeTeam !== null &&
    (m.a.team.fifa_code === activeTeam || m.b.team.fifa_code === activeTeam);
  const inPath = (m: Match): boolean | null =>
    activeTeam === null ? null : teamInMatch(m);

  const r16Idx = activeTeam === null ? -1 : r16.findIndex(teamInMatch);
  const qfIdx = activeTeam === null ? -1 : qf.findIndex(teamInMatch);
  const sfIdx = activeTeam === null ? -1 : sf.findIndex(teamInMatch);
  const finalInPath = activeTeam !== null && teamInMatch(final);

  // R16→QF connector pair indices (left side has indices 0..3, right side 4..7)
  const r16LeftPair = r16Idx >= 0 && r16Idx < 4 ? Math.floor(r16Idx / 2) : -1;
  const r16RightPair =
    r16Idx >= 4 && r16Idx < 8 ? Math.floor((r16Idx - 4) / 2) : -1;
  // QF→SF connector pair indices
  const qfLeftPair = qfIdx >= 0 && qfIdx < 2 ? Math.floor(qfIdx / 2) : -1;
  const qfRightPair =
    qfIdx >= 2 && qfIdx < 4 ? Math.floor((qfIdx - 2) / 2) : -1;
  // SF→Final connector pair: each side has 1 pair, only one side is active
  const sfLeftPair = sfIdx === 0 ? 0 : -1;
  const sfRightPair = sfIdx === 1 ? 0 : -1;

  const hasActive = activeTeam !== null;
  const finalCardOnPath: boolean | null = activeTeam === null
    ? null
    : finalInPath;

  return (
    <section
      aria-labelledby="most-likely-bracket-heading"
      onMouseLeave={() => setActiveTeam(null)}
      style={{
        background: "var(--bg-root)",
        color: "var(--text-primary)",
        padding: "28px 0 8px",
      }}
    >
      <style>{bracketStyles}</style>
      <p
        id="most-likely-bracket-heading"
        style={{
          fontSize: 13,
          lineHeight: 1.55,
          margin: "0 0 22px",
          color: "var(--text-secondary)",
          maxWidth: 720,
        }}
      >
        Each match shows the posterior probability that the favoured side
        advances. Click a team to open its progression page. The chain · R16
        through final: is the sequence of modal outcomes; its joint
        likelihood is much lower than any leg alone.
      </p>

      <div className="overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
        <div
          className="grid items-stretch mx-auto"
          style={{
            gridTemplateColumns:
              "minmax(120px,1.2fr) 14px minmax(110px,1fr) 14px minmax(110px,1fr) 16px minmax(150px,1.25fr) 16px minmax(110px,1fr) 14px minmax(110px,1fr) 14px minmax(120px,1.2fr)",
            gap: 0,
            width: "100%",
            minWidth: 1100,
          }}
        >
          <RoundColumn
            kicker="Stage 1 · 14 · 18 Jun"
            label="Round of 16"
            align="left"
          >
            {r16Left.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                inPath={inPath(m)}
                onTeamHover={setActiveTeam}
              />
            ))}
          </RoundColumn>
          <ConnectorColumn
            pairs={4}
            pathPair={r16LeftPair}
            hasActiveTeam={hasActive}
          />
          <RoundColumn
            kicker="Stage 2 · 28 · 29 Jun"
            label="Quarterfinals"
            align="left"
          >
            {qfLeft.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                inPath={inPath(m)}
                onTeamHover={setActiveTeam}
              />
            ))}
          </RoundColumn>
          <ConnectorColumn
            pairs={2}
            pathPair={qfLeftPair}
            hasActiveTeam={hasActive}
          />
          <RoundColumn
            kicker="Stage 3 · 02 Jul"
            label="Semifinal"
            align="left"
          >
            <MatchCard
              match={sfLeft}
              inPath={inPath(sfLeft)}
              onTeamHover={setActiveTeam}
            />
          </RoundColumn>
          <ConnectorColumn
            pairs={1}
            pathPair={sfLeftPair}
            hasActiveTeam={hasActive}
          />

          {/* Final column */}
          <div className="flex flex-col">
            <StageHeader
              kicker="Stage 4 · 19 Jul · MetLife"
              label="Final"
              align="center"
            />
            <div className="flex-1 flex flex-col justify-center">
              <div
                className="bracket-match-card bracket-fade overflow-hidden"
                data-on-path={finalCardOnPath === true ? "" : undefined}
                data-off-path={finalCardOnPath === false ? "" : undefined}
                style={{
                  background: "var(--bg-panel-elev)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 10,
                  boxShadow:
                    "0 1px 3px rgb(0 0 0 / 0.04), 0 6px 24px rgb(0 0 0 / 0.05)",
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                    padding: "12px 14px 10px",
                    borderBottom: "1px dashed var(--rule)",
                  }}
                >
                  <div
                    className="mono"
                    style={{
                      fontSize: 9.5,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "var(--text-quiet)",
                      marginBottom: 5,
                    }}
                  >
                    M★ champion
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span
                      className="mono"
                      style={{ fontSize: 12, color: "var(--text-tertiary)" }}
                    >
                      ◆
                    </span>
                    <Flag code={champion.fifa_code} size={18} />
                    <Link
                      href={`/team/${champion.fifa_code}`}
                      prefetch={false}
                      className="bracket-champion-link no-underline transition-colors"
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: 20,
                        fontWeight: 500,
                        letterSpacing: "-0.02em",
                        color: "var(--text-primary)",
                      }}
                    >
                      {champion.display_name}
                    </Link>
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: 10.5,
                      color: "var(--text-tertiary)",
                      marginTop: 3,
                    }}
                  >
                    P(champion) = {(champion.p_champion * 100).toFixed(1)}%
                  </div>
                </div>
                <div style={{ padding: "3px 0" }}>
                  <TeamRow
                    slot={final.a}
                    advancing={final.a.p >= final.b.p}
                    dim={final.a.p < final.b.p}
                    onTeamHover={setActiveTeam}
                  />
                  <div
                    style={{
                      height: 1,
                      background: "var(--border-subtle)",
                      margin: "0 9px",
                    }}
                  />
                  <TeamRow
                    slot={final.b}
                    advancing={final.b.p > final.a.p}
                    dim={final.b.p <= final.a.p}
                    onTeamHover={setActiveTeam}
                  />
                </div>
              </div>
            </div>
          </div>

          <ConnectorColumn
            pairs={1}
            mirrored
            pathPair={sfRightPair}
            hasActiveTeam={hasActive}
          />
          <RoundColumn
            kicker="Stage 3 · 02 Jul"
            label="Semifinal"
            align="right"
          >
            <MatchCard
              match={sfRight}
              inPath={inPath(sfRight)}
              onTeamHover={setActiveTeam}
            />
          </RoundColumn>
          <ConnectorColumn
            pairs={2}
            mirrored
            pathPair={qfRightPair}
            hasActiveTeam={hasActive}
          />
          <RoundColumn
            kicker="Stage 2 · 28 · 29 Jun"
            label="Quarterfinals"
            align="right"
          >
            {qfRight.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                inPath={inPath(m)}
                onTeamHover={setActiveTeam}
              />
            ))}
          </RoundColumn>
          <ConnectorColumn
            pairs={4}
            mirrored
            pathPair={r16RightPair}
            hasActiveTeam={hasActive}
          />
          <RoundColumn
            kicker="Stage 1 · 14 · 18 Jun"
            label="Round of 16"
            align="right"
          >
            {r16Right.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                inPath={inPath(m)}
                onTeamHover={setActiveTeam}
              />
            ))}
          </RoundColumn>
        </div>
      </div>
    </section>
  );
}

const bracketStyles = `
.bracket-fade {
  transition: opacity 150ms ease;
}
.bracket-fade[data-off-path] {
  opacity: 0.35;
}
`;
