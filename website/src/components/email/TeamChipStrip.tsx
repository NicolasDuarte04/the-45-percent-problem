import { loadSampleBrief, type BriefSample } from "@/lib/brief";
import styles from "./TeamChipStrip.module.css";

export interface TeamChipStripProps {
  data?: BriefSample;
}

export function TeamChipStrip({ data }: TeamChipStripProps = {}) {
  const brief = data ?? loadSampleBrief();
  const teams = brief.featured_teams.slice(0, 5);

  return (
    <div
      className={styles.strip}
      aria-label="Featured teams in the latest brief"
    >
      <span className={styles.prompt}>Following a specific team?</span>
      {teams.map((team) => (
        <a
          key={team}
          href={`/teams/${team.toLowerCase()}`}
          className={styles.chip}
        >
          {team}
        </a>
      ))}
      <a href="/teams" className={styles.chip}>
        SHOW ALL →
      </a>
    </div>
  );
}
