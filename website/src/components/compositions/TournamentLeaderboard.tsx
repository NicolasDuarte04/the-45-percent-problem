import Link from "next/link";
import type { TournamentSnapshot } from "@/lib/data/schemas";
import { NumericCell } from "@/components/primitives/NumericCell";
import { ProgressionSparkline } from "@/components/primitives/ProgressionSparkline";
import { formatCI } from "@/lib/formatters";

interface TournamentLeaderboardProps {
  tournament: TournamentSnapshot;
}

// Prism rainbow (§2.4) rotated across the leaderboard. Color encodes ordinal
// position — no lineage meaning.
const PRISM_CYCLE = [
  "var(--prism-peach)",
  "var(--prism-coral)",
  "var(--prism-rose)",
  "var(--prism-plum)",
  "var(--prism-indigo)",
  "var(--prism-cyan)",
  "var(--prism-mint)",
  "var(--prism-sun)",
];

export function TournamentLeaderboard({
  tournament,
}: TournamentLeaderboardProps) {
  const rows = [...tournament.teams]
    .sort((a, b) => b.p_champion - a.p_champion)
    .slice(0, 8);

  const max = Math.max(...rows.map((r) => r.p_champion));

  return (
    <section aria-labelledby="leaderboard-heading">
      <div
        className="rounded-2xl border"
        style={{
          backgroundColor: "var(--bg-panel-elev)",
          borderColor: "var(--rule)",
          padding: "22px 24px",
          boxShadow: "0 1px 3px rgb(0 0 0 / 0.04), 0 6px 24px rgb(0 0 0 / 0.05)",
        }}
      >
        <table
          className="w-full border-collapse"
          style={{ fontSize: 13 }}
          aria-labelledby="leaderboard-heading"
        >
          <thead>
            <tr>
              <HeadCell align="left">#</HeadCell>
              <HeadCell align="left">Team</HeadCell>
              <HeadCell align="left" width="34%">
                Championship probability
              </HeadCell>
              <HeadCell align="right">Conf.</HeadCell>
              <HeadCell align="right">Champion</HeadCell>
              <HeadCell align="right">Final</HeadCell>
              <HeadCell align="right">Semi</HeadCell>
              <HeadCell align="right">95% CI</HeadCell>
            </tr>
          </thead>
          <tbody>
            {rows.map((team, i) => {
              const color = PRISM_CYCLE[i % PRISM_CYCLE.length];

              return (
                <tr
                  key={team.fifa_code}
                  style={{ borderTop: "1px solid var(--rule)" }}
                >
                  <td
                    className="mono"
                    style={{
                      padding: "10px 0",
                      color: "var(--text-tertiary)",
                      fontSize: 12,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </td>
                  <td
                    style={{
                      padding: "10px 16px 10px 0",
                      fontFamily: "var(--font-sans)",
                      fontSize: 14,
                    }}
                  >
                    <Link
                      href={`/team/${team.fifa_code}`}
                      className="no-underline"
                      style={{ color: "var(--text-primary)" }}
                    >
                      <span
                        className="mono"
                        style={{
                          color: "var(--text-tertiary)",
                          fontSize: 11,
                          marginRight: 8,
                        }}
                      >
                        {team.fifa_code}
                      </span>
                      {team.display_name}
                    </Link>
                  </td>
                  <td style={{ padding: "10px 24px 10px 0" }}>
                    {/* Twin signals: the Prism bar reports the single
                        champion-probability magnitude, the sparkline above
                        it reports the GRP → CHA shape so each row carries
                        a distinctive trajectory fingerprint. */}
                    <div
                      className="flex flex-col"
                      style={{ gap: 6 }}
                    >
                      <ProgressionSparkline
                        values={[
                          team.p_group_qualification,
                          team.p_r16,
                          team.p_quarterfinal,
                          team.p_semifinal,
                          team.p_final,
                          team.p_champion,
                        ]}
                        stroke={color}
                        width={180}
                        height={20}
                        ariaLabel={`${team.display_name} progression: group ${(team.p_group_qualification * 100).toFixed(0)}%, R16 ${(team.p_r16 * 100).toFixed(0)}%, QF ${(team.p_quarterfinal * 100).toFixed(0)}%, SF ${(team.p_semifinal * 100).toFixed(0)}%, final ${(team.p_final * 100).toFixed(0)}%, champion ${(team.p_champion * 100).toFixed(0)}%`}
                      />
                      <div
                        role="img"
                        aria-label={`${team.display_name} championship probability ${(team.p_champion * 100).toFixed(1)} percent, bar`}
                        style={{
                          height: 6,
                          background: "var(--bg-panel)",
                          borderRadius: 3,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${(team.p_champion / max) * 100}%`,
                            height: "100%",
                            background: color,
                            borderRadius: 3,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td
                    className="mono"
                    style={{
                      padding: "10px 0",
                      textAlign: "right",
                      color: "var(--text-tertiary)",
                      fontSize: 11,
                    }}
                  >
                    {team.confederation}
                  </td>
                  <td
                    className="mono"
                    style={{
                      padding: "10px 0",
                      textAlign: "right",
                      color: "var(--text-primary)",
                    }}
                  >
                    {(team.p_champion * 100).toFixed(1)}%
                  </td>
                  <td
                    className="mono"
                    style={{
                      padding: "10px 0",
                      textAlign: "right",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {(team.p_final * 100).toFixed(1)}%
                  </td>
                  <td
                    className="mono"
                    style={{
                      padding: "10px 0",
                      textAlign: "right",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {(team.p_semifinal * 100).toFixed(1)}%
                  </td>
                  <td
                    style={{
                      padding: "10px 0",
                      textAlign: "right",
                    }}
                  >
                    <NumericCell<[number, number]>
                      value={team.ci_95_champion}
                      formatter={([l, h]) => formatCI(l, h, 3)}
                      ariaLabel={`95 percent confidence interval, ${(team.ci_95_champion[0] * 100).toFixed(1)} to ${(team.ci_95_champion[1] * 100).toFixed(1)} percent`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function HeadCell({
  children,
  align,
  width,
}: {
  children: React.ReactNode;
  align: "left" | "right";
  width?: string;
}) {
  return (
    <th
      scope="col"
      style={{
        textAlign: align,
        fontWeight: 400,
        color: "var(--text-tertiary)",
        fontSize: 11,
        padding: "0 0 10px",
        width,
      }}
    >
      {children}
    </th>
  );
}
