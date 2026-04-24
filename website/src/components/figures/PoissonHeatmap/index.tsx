import { Figure } from "@/components/editorial/Figure";
import { loadAllMatches } from "@/lib/data/loadSnapshot";
import { PoissonHeatmapChart, type GoalMatrix } from "./Chart";

interface Props {
  snapshotId?: string;
  mode?: "interactive" | "static";
  /** Specific match to feature. Defaults to the match with highest |λ_home − λ_away|. */
  matchId?: string;
}

/**
 * §8.4 — PoissonHeatmap.
 * Goal-score probability matrix for a featured match, derived from the bivariate
 * Poisson parameters (λ_home, λ_away) in the 10k Monte Carlo draw.
 */
export function PoissonHeatmap({
  snapshotId = "latest",
  mode = "interactive",
  matchId,
}: Props) {
  const sid = snapshotId === "latest" ? undefined : snapshotId;
  const matches = loadAllMatches(sid);

  if (!matches.length) {
    return (
      <Figure caption="Goal probability matrix — no match data in this snapshot.">
        <div
          style={{
            height: 240,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px dashed var(--border-subtle)",
            borderRadius: 4,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--text-quiet)",
          }}
        >
          No match data available.
        </div>
      </Figure>
    );
  }

  // Pick featured match: specified id or highest λ asymmetry
  const featured = matchId
    ? (matches.find((m) => m.match_id === matchId) ?? matches[0])
    : matches.reduce((best, m) =>
        Math.abs(m.lambda.home - m.lambda.away) >
        Math.abs(best.lambda.home - best.lambda.away)
          ? m
          : best
      );

  const goalMatrix: GoalMatrix = {
    matrix: featured.p_model_goals,
    homeTeam: featured.home.display_name,
    awayTeam: featured.away.display_name,
    lambdaHome: featured.lambda.home,
    lambdaAway: featured.lambda.away,
  };

  const caption = `Bivariate Poisson goal-score matrix for ${featured.home.display_name} vs ${featured.away.display_name}. Each cell is the joint probability of that exact scoreline. Showing goals 0–5; rows = home, columns = away.`;

  const noscriptRows = featured.p_model_goals
    .slice(0, 5)
    .map((row, h) =>
      `  Home ${h}: ` +
      row
        .slice(0, 5)
        .map((v, a) => `Away ${a}: ${(v * 100).toFixed(2)}%`)
        .join("  ")
    )
    .join("\n");

  return (
    <Figure
      caption={caption}
      cite={{ href: "/vault/simulation", label: "§ Simulation" }}
      ariaLabel={`Goal score probability matrix for ${featured.home.display_name} vs ${featured.away.display_name}`}
      bleed={false}
    >
      <PoissonHeatmapChart goalMatrix={goalMatrix} mode={mode} />
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
          {`Goal matrix — ${featured.home.display_name} vs ${featured.away.display_name}\n${noscriptRows}`}
        </pre>
      </noscript>
    </Figure>
  );
}
