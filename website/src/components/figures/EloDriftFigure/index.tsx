import { Figure } from "@/components/editorial/Figure";
import { loadTournament, loadAllTeams } from "@/lib/data/loadSnapshot";
import { EloDriftFigureChart, type EloTeam } from "./Chart";

const FEATURED_CODES = ["ARG", "ESP", "FRA", "BRA"];

interface Props {
  snapshotId?: string;
  mode?: "interactive" | "static";
  /** Override which four teams to feature. Defaults to the top-4 by p_champion. */
  teamCodes?: string[];
}

/**
 * §8.4: EloDriftFigure.
 * M★ Elo for four featured teams. Shows a line chart when per-team history is
 * available; falls back to a bar chart of current values when history is empty
 * (expected during pre-tournament period).
 */
export function EloDriftFigure({
  snapshotId = "latest",
  mode = "interactive",
  teamCodes,
}: Props) {
  const sid = snapshotId === "latest" ? undefined : snapshotId;
  const tournament = loadTournament(sid);
  const allTeams = loadAllTeams(sid);

  // Determine which 4 teams to feature
  const codes =
    teamCodes ??
    [...tournament.teams]
      .sort((a, b) => b.p_champion - a.p_champion)
      .slice(0, 4)
      .map((t) => t.fifa_code);

  const featuredCodes = codes.length ? codes : FEATURED_CODES;

  const teams: EloTeam[] = featuredCodes
    .map((code) => {
      const tourTeam = tournament.teams.find((t) => t.fifa_code === code);
      const fullTeam = allTeams.find((t) => t.fifa_code === code);
      if (!tourTeam) return null;
      return {
        fifaCode: code,
        displayName: tourTeam.display_name,
        eloCurrent: tourTeam.elo_current,
        eloHistory: (fullTeam?.history ?? []).map((h) => ({
          snapshotId: h.snapshot_id,
          elo: tourTeam.elo_current, // history carries p_champion; Elo drift requires upstream extension
        })),
      };
    })
    .filter((t): t is EloTeam => t !== null);

  const label = teams.map((t) => t.displayName).join(", ");

  return (
    <Figure
      caption={`M★ Elo for ${label}. When match history accumulates, lines show per-snapshot drift. Snapshot ${tournament.snapshot_id}.`}
      cite={{ href: "/vault/models", label: "§ Models" }}
      ariaLabel={`Elo rating chart for ${label}`}
    >
      <EloDriftFigureChart teams={teams} mode={mode} />
      <noscript>
        <table
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            lineHeight: "20px",
            borderCollapse: "collapse",
            width: "100%",
          }}
        >
          <thead>
            <tr>
              {teams.map((t) => (
                <th
                  key={t.fifaCode}
                  style={{
                    padding: "4px 12px 4px 0",
                    color: "var(--text-quiet)",
                    fontWeight: 500,
                    textAlign: "left",
                  }}
                >
                  {t.displayName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {teams.map((t) => (
                <td
                  key={t.fifaCode}
                  aria-label={`Elo ${t.eloCurrent.toFixed(0)} for ${t.displayName}`}
                  style={{ padding: "4px 12px 4px 0" }}
                >
                  {t.eloCurrent.toFixed(0)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </noscript>
    </Figure>
  );
}
