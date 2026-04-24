import { Figure } from "@/components/editorial/Figure";
import { loadTournament, loadAllTeams } from "@/lib/data/loadSnapshot";
import { ChampionEvolutionChart, type ChampionTeam } from "./Chart";

interface Props {
  snapshotId?: string;
  mode?: "interactive" | "static";
  /** How many top teams to include. Defaults to 8. */
  topN?: number;
}

/**
 * §8.4 — ChampionEvolution.
 * p_champion line for the top N teams across the life of the tournament.
 * Falls back to a bar chart with 95% CI error bars when history is sparse
 * (pre-tournament or first snapshot).
 */
export function ChampionEvolution({
  snapshotId = "latest",
  mode = "interactive",
  topN = 8,
}: Props) {
  const sid = snapshotId === "latest" ? undefined : snapshotId;
  const tournament = loadTournament(sid);
  const allTeams = loadAllTeams(sid);

  const topTeams = [...tournament.teams]
    .sort((a, b) => b.p_champion - a.p_champion)
    .slice(0, topN);

  const teams: ChampionTeam[] = topTeams.map((t) => {
    const full = allTeams.find((a) => a.fifa_code === t.fifa_code);
    return {
      fifaCode: t.fifa_code,
      displayName: t.display_name,
      pChampion: t.p_champion,
      ciLo: t.ci_95_champion[0],
      ciHi: t.ci_95_champion[1],
      history: (full?.history ?? []).map((h) => ({
        snapshotId: h.snapshot_id,
        pChampion: h.p_champion,
      })),
    };
  });

  const hasHistory = teams.some((t) => t.history.length > 1);
  const chartType = hasHistory ? "over time" : "current snapshot";
  const teamNames = teams
    .slice(0, 4)
    .map((t) => t.displayName)
    .join(", ");

  const noscriptRows = teams
    .map(
      (t) =>
        `  ${t.displayName} (${t.fifaCode}): ${(t.pChampion * 100).toFixed(1)}%  CI [${(t.ciLo * 100).toFixed(1)}%, ${(t.ciHi * 100).toFixed(1)}%]`
    )
    .join("\n");

  return (
    <Figure
      caption={`Championship probability (p_champion) for the top ${topN} teams, ${chartType}. Error bars show the 95% Monte Carlo confidence interval. Snapshot ${tournament.snapshot_id}.`}
      cite={{ href: "/vault/the-45-percent", label: "§ The 45% problem" }}
      ariaLabel={`Champion evolution chart for ${teamNames} and others`}
      bleed
    >
      <ChampionEvolutionChart teams={teams} mode={mode} />
      <noscript>
        <pre
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            lineHeight: "18px",
            color: "var(--text-tertiary)",
            padding: "16px",
            border: "1px solid var(--border-subtle)",
            borderRadius: 4,
            background: "var(--bg-panel)",
            whiteSpace: "pre-wrap",
          }}
        >
          {`p_champion — snapshot ${tournament.snapshot_id}\n${noscriptRows}`}
        </pre>
      </noscript>
    </Figure>
  );
}
