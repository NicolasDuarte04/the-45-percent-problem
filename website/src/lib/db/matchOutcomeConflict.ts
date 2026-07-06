import { sql } from "drizzle-orm";
import { matchOutcomes } from "@/lib/db/schema";

/**
 * On-conflict SET for match_outcomes upserts from the live ingest route.
 *
 * settled_at is WRITE-ONCE. The hourly ingest cron re-sends every FINISHED
 * match on every run: its local dedup log (data/snapshots/
 * ingested_match_outcomes.jsonl) is git-ignored and lives on an ephemeral CI
 * runner, so it never survives to the next run and every already-settled match
 * is re-POSTed. With a plain `excluded.settled_at` the upsert re-stamped
 * settled_at on each of those re-POSTs, so a settled group row's timestamp
 * drifted forward hour after hour. The durable dedup state is the stored row
 * itself: coalesce(existing, excluded) keeps the FIRST settled timestamp
 * (settled_at is NOT NULL, so an existing row always wins the coalesce) and
 * only the initial insert stamps it. This is robust to the ephemeral log, to
 * --force re-POSTs, and to manual admin re-entries.
 *
 * The graded fields (scores, shootout, meta) still take the latest value so a
 * genuine correction to a result still lands; re-POSTing identical data leaves
 * the whole row byte-identical, which makes a repeat ingest a no-op on the
 * stored row (grades unaffected).
 */
export const MATCH_OUTCOME_CONFLICT_SET = {
  competition: sql`excluded.competition`,
  stage: sql`excluded.stage`,
  homeTeam: sql`excluded.home_team`,
  awayTeam: sql`excluded.away_team`,
  homeGoals: sql`excluded.home_goals`,
  awayGoals: sql`excluded.away_goals`,
  shootoutWinner: sql`excluded.shootout_winner`,
  settledAt: sql`coalesce(${matchOutcomes.settledAt}, excluded.settled_at)`,
  meta: sql`excluded.meta`,
} as const;
