import { loadSampleBrief, type BriefSample } from "@/lib/brief";
import styles from "./TeamChipStrip.module.css";

export interface TeamChipStripProps {
  data?: BriefSample;
}

export function TeamChipStrip({ data }: TeamChipStripProps = {}) {
  const brief = data ?? loadSampleBrief();
  const teams = brief.featured_teams.slice(0, 5);

  // Phase 2: chips render disabled because /teams/[country] and /teams index
  // are Phase 3 wiring. Phase 3 swaps the <span> back to <Link> and drops the
  // chipDisabled class.
  const disabledClass = `${styles.chip} ${styles.chipDisabled}`;
  const tooltip = "Coming soon";

  return (
    <div
      className={styles.strip}
      aria-label="Featured teams in the latest brief"
    >
      <span className={styles.prompt}>Following a specific team?</span>
      {teams.map((team) => (
        <span
          key={team}
          className={disabledClass}
          aria-disabled="true"
          title={tooltip}
        >
          {team}
        </span>
      ))}
      <span
        className={disabledClass}
        aria-disabled="true"
        title={tooltip}
      >
        SHOW ALL →
      </span>
    </div>
  );
}
