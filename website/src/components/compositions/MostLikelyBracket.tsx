import Link from "next/link";
import type { TournamentSnapshot, TournamentTeam } from "@/lib/data/schemas";

/**
 * Most Likely Bracket — modal path through the 48-team draw.
 *
 * Data wiring: we derive round-by-round slots from tournament.json by taking
 * the top-k teams sorted by the round-specific p_reach. Pairwise advancement
 * probabilities are approximated as a ratio of next-round reach probabilities
 * (defensible under bracket independence). See _design_handoff/Bracket.jsx
 * for the original design reference.
 */

type TintKey =
  | "peach"
  | "coral"
  | "rose"
  | "plum"
  | "indigo"
  | "cyan"
  | "mint"
  | "sun"
  | "neutral";

const PRISM: Record<TintKey, string> = {
  peach: "var(--prism-peach)",
  coral: "var(--prism-coral)",
  rose: "var(--prism-rose)",
  plum: "var(--prism-plum)",
  indigo: "var(--prism-indigo)",
  cyan: "var(--prism-cyan)",
  mint: "var(--prism-mint)",
  sun: "var(--prism-sun)",
  neutral: "transparent",
};

// Stable tint assigned per favoured team so the lineage reads from group stage
// through the final. Order mirrors the champion leaderboard.
const TINT_SEQUENCE: TintKey[] = [
  "peach",
  "coral",
  "indigo",
  "plum",
  "mint",
  "sun",
  "cyan",
  "rose",
];

type Slot = {
  team: TournamentTeam;
  tint: TintKey;
  p: number; // probability of advancing from *this* round
};

type Match = {
  id: string;
  a: Slot;
  b: Slot;
  label?: string;
};

function tintFor(code: string, favouriteCodes: string[]): TintKey {
  const idx = favouriteCodes.indexOf(code);
  if (idx < 0 || idx >= TINT_SEQUENCE.length) return "neutral";
  return TINT_SEQUENCE[idx];
}

/** Pair-wise advancement probability given each team's p(reach next round). */
function winProb(a: number, b: number): number {
  const s = a + b;
  if (s <= 0) return 0.5;
  return a / s;
}

function buildBracket(tournament: TournamentSnapshot) {
  // Top-k selections per round. These populate slots deterministically and
  // mirror the modal path — not a replacement for a full simulated bracket.
  const byR16 = [...tournament.teams].sort((a, b) => b.p_r16 - a.p_r16);
  const byQF = [...tournament.teams].sort(
    (a, b) => b.p_quarterfinal - a.p_quarterfinal
  );
  const bySF = [...tournament.teams].sort(
    (a, b) => b.p_semifinal - a.p_semifinal
  );
  const byF = [...tournament.teams].sort((a, b) => b.p_final - a.p_final);
  const byC = [...tournament.teams].sort((a, b) => b.p_champion - a.p_champion);

  // Top-8 favourites anchor the tint lineage.
  const favouriteCodes = byC.slice(0, 8).map((t) => t.fifa_code);

  // ── R16 (8 matches) ────────────────────────────────────────────────────
  // Pair each of the top 8 reach-favourites against an underdog. Underdogs
  // are drawn from the next band of p_r16 so both sides are plausible R16
  // participants.
  const r16Favs = byQF.slice(0, 8); // 8 highest p(reach QF)
  const favCodes = new Set(r16Favs.map((t) => t.fifa_code));
  const underdogPool = byR16.filter((t) => !favCodes.has(t.fifa_code)).slice(0, 8);

  const r16: Match[] = r16Favs.map((fav, i) => {
    const und = underdogPool[i] ?? underdogPool[underdogPool.length - 1];
    const pFav = winProb(fav.p_quarterfinal, und.p_quarterfinal);
    return {
      id: `r16-${i + 1}`,
      label: `R16 · Match ${String(i + 1).padStart(2, "0")}`,
      a: {
        team: fav,
        tint: tintFor(fav.fifa_code, favouriteCodes),
        p: pFav,
      },
      b: { team: und, tint: "neutral", p: 1 - pFav },
    };
  });

  // ── QF (4 matches) ─────────────────────────────────────────────────────
  const qfTeams = byQF.slice(0, 8); // expected QF participants
  const qf: Match[] = [];
  const qfLabels = ["Upper A", "Upper B", "Lower A", "Lower B"];
  for (let i = 0; i < 4; i++) {
    const a = qfTeams[i * 2];
    const b = qfTeams[i * 2 + 1];
    const pA = winProb(a.p_semifinal, b.p_semifinal);
    qf.push({
      id: `qf-${i + 1}`,
      label: qfLabels[i],
      a: { team: a, tint: tintFor(a.fifa_code, favouriteCodes), p: pA },
      b: { team: b, tint: tintFor(b.fifa_code, favouriteCodes), p: 1 - pA },
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
      a: { team: a, tint: tintFor(a.fifa_code, favouriteCodes), p: pA },
      b: { team: b, tint: tintFor(b.fifa_code, favouriteCodes), p: 1 - pA },
    });
  }

  // ── Final ──────────────────────────────────────────────────────────────
  const finalTeams = byF.slice(0, 2);
  const pFinA = winProb(finalTeams[0].p_champion, finalTeams[1].p_champion);
  const final: Match = {
    id: "final",
    a: {
      team: finalTeams[0],
      tint: tintFor(finalTeams[0].fifa_code, favouriteCodes),
      p: pFinA,
    },
    b: {
      team: finalTeams[1],
      tint: tintFor(finalTeams[1].fifa_code, favouriteCodes),
      p: 1 - pFinA,
    },
  };

  // Champion slot = highest p_champion.
  const champion = byC[0];
  const champTint = tintFor(champion.fifa_code, favouriteCodes);

  return { r16, qf, sf, final, champion, champTint, favouriteCodes };
}

// ── Presentational pieces ─────────────────────────────────────────────────

function TeamRow({
  slot,
  advancing,
  dim,
}: {
  slot: Slot;
  advancing: boolean;
  dim: boolean;
}) {
  const tint = PRISM[slot.tint];
  const neutral = slot.tint === "neutral";
  return (
    <Link
      href={`/team/${slot.team.fifa_code}`}
      prefetch={false}
      aria-label={`${slot.team.display_name} — team detail`}
      className="bracket-team-row flex items-center gap-2 px-[9px] py-[5px] no-underline transition-colors"
      style={{ opacity: dim ? 0.45 : 1, color: "inherit" }}
    >
      <span
        className="mono inline-flex items-center justify-center shrink-0"
        aria-hidden="true"
        style={{
          width: 28,
          height: 17,
          borderRadius: 2,
          fontSize: 9.5,
          fontWeight: 600,
          letterSpacing: "0.02em",
          color: neutral ? "var(--text-tertiary)" : "var(--text-primary)",
          background: neutral
            ? "transparent"
            : `color-mix(in oklch, ${tint} 45%, transparent)`,
          border: neutral
            ? "1px solid var(--border-subtle)"
            : `1px solid color-mix(in oklch, ${tint} 70%, transparent)`,
        }}
      >
        {slot.team.fifa_code}
      </span>
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

function MatchCard({ match }: { match: Match }) {
  const aWins = match.a.p >= match.b.p;
  const winner = aWins ? match.a : match.b;
  const winnerTint = PRISM[winner.tint];
  return (
    <div
      className="bracket-match-card overflow-hidden"
      style={{
        background: "var(--bg-panel-elev)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius)",
        boxShadow: "0 1px 2px rgb(0 0 0 / 0.03)",
        borderLeft:
          winner.tint === "neutral"
            ? "1px solid var(--border-subtle)"
            : `2px solid color-mix(in oklch, ${winnerTint} 80%, #141414)`,
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
      <TeamRow slot={match.a} advancing={aWins} dim={!aWins} />
      <div
        style={{
          height: 1,
          background: "var(--border-subtle)",
          margin: "0 9px",
        }}
      />
      <TeamRow slot={match.b} advancing={!aWins} dim={aWins} />
    </div>
  );
}

const STAGE_HEADER_H = 52;

function StageHeader({
  kicker,
  label,
  align = "left",
  accentTint,
}: {
  kicker: string;
  label: string;
  align?: "left" | "right" | "center";
  accentTint?: TintKey;
}) {
  const tint = accentTint ? PRISM[accentTint] : null;
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
        {tint ? (
          <span
            style={{
              display: "inline-block",
              width: 18,
              height: 2,
              borderRadius: 1,
              background: `color-mix(in oklch, ${tint} 75%, #141414)`,
              transform: "translateY(-2px)",
            }}
          />
        ) : null}
      </div>
      <div style={{ height: 1, background: "var(--rule)" }} />
    </div>
  );
}

function RoundColumn({
  kicker,
  label,
  align,
  accentTint,
  children,
}: {
  kicker: string;
  label: string;
  align: "left" | "right";
  accentTint?: TintKey;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-w-0">
      <StageHeader
        kicker={kicker}
        label={label}
        align={align}
        accentTint={accentTint}
      />
      <div className="flex flex-col flex-1 justify-around gap-[10px]">
        {children}
      </div>
    </div>
  );
}

function ConnectorColumn({
  pairs,
  mirrored = false,
}: {
  pairs: number;
  mirrored?: boolean;
}) {
  const rows = Array.from({ length: pairs });
  return (
    <div
      aria-hidden="true"
      className="flex flex-col"
      style={{ paddingTop: STAGE_HEADER_H + 14 }}
    >
      {rows.map((_, i) => (
        <div key={i} className="flex-1 relative">
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
      ))}
    </div>
  );
}

// ── Colour legend ──────────────────────────────────────────────────────────

function ColorLegend({
  favourites,
}: {
  favourites: { team: TournamentTeam; tint: TintKey }[];
}) {
  return (
    <section
      className="mt-7"
      style={{
        padding: "20px 2px 4px",
        borderTop: "1px solid var(--rule)",
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--text-quiet)",
          marginBottom: 6,
        }}
      >
        Legend
      </div>
      <h3
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 18,
          fontWeight: 500,
          letterSpacing: "-0.01em",
          margin: "0 0 6px",
        }}
      >
        How to read the colours
      </h3>
      <p
        style={{
          fontSize: 13,
          color: "var(--text-secondary)",
          lineHeight: 1.55,
          margin: "0 0 16px",
          maxWidth: "64ch",
        }}
      >
        Each favoured side is assigned a perceptually-normalised Prism hue
        (equal lightness and chroma, hue varies). Tint appears on the team
        code chip and as a 2px left-accent on the match card, so the lineage
        reads visually from qualifier to final.
      </p>
      <div
        className="grid gap-y-[10px] gap-x-6"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}
      >
        {favourites.map(({ team, tint }) => {
          const neutral = tint === "neutral";
          const prism = PRISM[tint];
          return (
            <div
              key={team.fifa_code}
              className="flex items-start gap-[10px] pb-2"
              style={{ borderBottom: "1px dashed var(--rule)" }}
            >
              <div className="flex items-center gap-[6px] shrink-0">
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: neutral
                      ? "transparent"
                      : `color-mix(in oklch, ${prism} 75%, #141414)`,
                    border: neutral
                      ? "1px dashed var(--border-subtle)"
                      : `1px solid color-mix(in oklch, ${prism} 85%, #141414)`,
                    marginTop: 4,
                  }}
                />
                <span
                  className="mono inline-flex items-center justify-center"
                  style={{
                    width: 28,
                    height: 17,
                    borderRadius: 2,
                    fontSize: 9.5,
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                    color: neutral
                      ? "var(--text-tertiary)"
                      : "var(--text-primary)",
                    background: neutral
                      ? "transparent"
                      : `color-mix(in oklch, ${prism} 45%, transparent)`,
                    border: neutral
                      ? "1px solid var(--border-subtle)"
                      : `1px solid color-mix(in oklch, ${prism} 70%, transparent)`,
                  }}
                >
                  {team.fifa_code}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    letterSpacing: "-0.005em",
                  }}
                >
                  {team.display_name}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "var(--text-tertiary)",
                    lineHeight: 1.45,
                    marginTop: 1,
                  }}
                >
                  P(champion) = {(team.p_champion * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p
        className="mono"
        style={{
          fontSize: 11,
          color: "var(--text-quiet)",
          marginTop: 18,
          lineHeight: 1.6,
          maxWidth: "72ch",
        }}
      >
        Prism hues L = 85 · C = 0.09 · hue varies. Perceptually-normalised so
        no single colour dominates the figure — a structural decision, not a
        decorative one.
      </p>
    </section>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────

interface MostLikelyBracketProps {
  tournament: TournamentSnapshot;
}

export function MostLikelyBracket({ tournament }: MostLikelyBracketProps) {
  const { r16, qf, sf, final, champion, champTint, favouriteCodes } =
    buildBracket(tournament);

  const r16Left = r16.slice(0, 4);
  const r16Right = r16.slice(4, 8);
  const qfLeft = qf.slice(0, 2);
  const qfRight = qf.slice(2, 4);
  const sfLeft = sf[0];
  const sfRight = sf[1];

  // Legend: top 8 favourites + neutral row
  const legendFavourites = favouriteCodes
    .map((code, i) => {
      const team = tournament.teams.find((t) => t.fifa_code === code);
      if (!team) return null;
      return { team, tint: TINT_SEQUENCE[i] };
    })
    .filter((x): x is { team: TournamentTeam; tint: TintKey } => x !== null);

  return (
    <section
      aria-labelledby="most-likely-bracket-heading"
      style={{
        background: "var(--bg-root)",
        color: "var(--text-primary)",
        padding: "28px 0 8px",
      }}
    >
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
        advances. Click a team to open its progression page. The chain — R16
        through final — is the sequence of modal outcomes; its joint
        likelihood is much lower than any leg alone.
      </p>

      <div>
        <div
          className="grid items-stretch mx-auto"
          style={{
            gridTemplateColumns:
              "minmax(120px,1.2fr) 14px minmax(110px,1fr) 14px minmax(110px,1fr) 16px minmax(150px,1.25fr) 16px minmax(110px,1fr) 14px minmax(110px,1fr) 14px minmax(120px,1.2fr)",
            gap: 0,
            width: "100%",
          }}
        >
          <RoundColumn
            kicker="Stage 1 · 14 – 18 Jun"
            label="Round of 16"
            align="left"
            accentTint="peach"
          >
            {r16Left.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </RoundColumn>
          <ConnectorColumn pairs={4} />
          <RoundColumn
            kicker="Stage 2 · 28 – 29 Jun"
            label="Quarterfinals"
            align="left"
            accentTint="plum"
          >
            {qfLeft.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </RoundColumn>
          <ConnectorColumn pairs={2} />
          <RoundColumn
            kicker="Stage 3 · 02 Jul"
            label="Semifinal"
            align="left"
            accentTint="indigo"
          >
            <MatchCard match={sfLeft} />
          </RoundColumn>
          <ConnectorColumn pairs={1} />

          {/* Final column */}
          <div className="flex flex-col">
            <StageHeader
              kicker="Stage 4 · 19 Jul · MetLife"
              label="Final"
              align="center"
              accentTint={champTint}
            />
            <div className="flex-1 flex flex-col justify-center">
              <div
                className="bracket-match-card overflow-hidden"
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
                  />
                </div>
              </div>
            </div>
          </div>

          <ConnectorColumn pairs={1} mirrored />
          <RoundColumn
            kicker="Stage 3 · 02 Jul"
            label="Semifinal"
            align="right"
            accentTint="mint"
          >
            <MatchCard match={sfRight} />
          </RoundColumn>
          <ConnectorColumn pairs={2} mirrored />
          <RoundColumn
            kicker="Stage 2 · 28 – 29 Jun"
            label="Quarterfinals"
            align="right"
            accentTint="cyan"
          >
            {qfRight.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </RoundColumn>
          <ConnectorColumn pairs={4} mirrored />
          <RoundColumn
            kicker="Stage 1 · 14 – 18 Jun"
            label="Round of 16"
            align="right"
            accentTint="rose"
          >
            {r16Right.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </RoundColumn>
        </div>
      </div>

      <ColorLegend favourites={legendFavourites} />
    </section>
  );
}
