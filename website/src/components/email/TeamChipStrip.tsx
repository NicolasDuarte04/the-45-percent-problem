import Link from "next/link";
import { loadLatestBrief, type BriefSample } from "@/lib/brief";
import styles from "./TeamChipStrip.module.css";

export interface TeamChipStripProps {
  data?: BriefSample;
}

export async function TeamChipStrip({ data }: TeamChipStripProps = {}) {
  const brief = data ?? (await loadLatestBrief());
  const teams = brief.featured_teams.slice(0, 5);

  return (
    <div
      className={styles.strip}
      aria-label="Featured teams in the latest brief"
    >
      <span className={styles.prompt}>Following a specific team?</span>
      {teams.map((team) => (
        <Link
          key={team.code}
          href={`/team/${team.code}`}
          className={styles.chip}
        >
          {team.name}
        </Link>
      ))}
      <Link href="/teams" className={styles.chip}>
        SHOW ALL →
      </Link>
    </div>
  );
}
