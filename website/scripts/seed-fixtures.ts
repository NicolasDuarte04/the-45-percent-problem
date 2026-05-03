/**
 * scripts/seed-fixtures.ts
 *
 * Idempotent seed: populates `venues`, `teams`, `matches` from the canonical
 * draw module (src/lib/data/wc2026-official-draw.ts). Safe to re-run; uses
 * INSERT ... ON CONFLICT DO UPDATE for every row.
 *
 * Usage (local, against the URL in .env.local):
 *   pnpm tsx scripts/seed-fixtures.ts
 *
 * Usage (CI / production):
 *   DATABASE_URL="postgresql://..." pnpm tsx scripts/seed-fixtures.ts
 *
 * Refuses to run unless DATABASE_URL is set. Logs row counts and exits 0
 * on success. Exits non-zero if any sanity-check fails (e.g. team count
 * != 48 after upsert).
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

import {
  TEAMS,
  VENUES,
  GROUP_MATCHES,
  KNOCKOUT_MATCHES,
  COUNTS,
} from "../src/lib/data/wc2026-official-draw";
import * as schema from "../src/lib/db/schema";

// Allow running with .env.local without forcing the user to source it.
try {
  // process.loadEnvFile is Node 20+ stable — drizzle.config.ts uses the same.
  (process as { loadEnvFile?: (p: string) => void }).loadEnvFile?.(
    ".env.local",
  );
} catch {
  /* no .env.local — fall through to ambient env. */
}

function getUrl(): string {
  const url = process.env.DATABASE_URL ?? process.env.DIRECT_URL;
  if (!url) {
    console.error(
      "Refusing to run: set DATABASE_URL (or DIRECT_URL) before seeding.",
    );
    process.exit(1);
  }
  return url;
}

async function main() {
  const url = getUrl();
  const client = postgres(url, { prepare: false, max: 1 });
  const db = drizzle(client, { schema });

  console.log("[seed-fixtures] Connected. Beginning canonical draw seed.");

  // ── Venues ──────────────────────────────────────────────────────────────────
  const venueRows = VENUES.map((v) => ({
    key: v.key,
    stadium: v.stadium,
    city: v.city,
    country: v.country,
  }));
  await db
    .insert(schema.venues)
    .values(venueRows)
    .onConflictDoUpdate({
      target: schema.venues.key,
      set: {
        stadium: sql`excluded.stadium`,
        city: sql`excluded.city`,
        country: sql`excluded.country`,
      },
    });
  console.log(`[seed-fixtures] venues upserted: ${venueRows.length}`);

  // ── Teams ───────────────────────────────────────────────────────────────────
  const teamRows = TEAMS.map((t) => ({
    fifaCode: t.fifa_code,
    displayName: t.display_name,
    confederation: t.confederation,
    group: t.group,
    drawPot: t.draw_pot,
  }));
  await db
    .insert(schema.teams)
    .values(teamRows)
    .onConflictDoUpdate({
      target: schema.teams.fifaCode,
      set: {
        displayName: sql`excluded.display_name`,
        confederation: sql`excluded.confederation`,
        group: sql`excluded.group`,
        drawPot: sql`excluded.draw_pot`,
      },
    });
  console.log(`[seed-fixtures] teams upserted: ${teamRows.length}`);

  // ── Matches (group + knockout) ──────────────────────────────────────────────
  const groupMatchRows = GROUP_MATCHES.map((m) => ({
    matchId: m.match_id,
    round: "GRP" as const,
    matchday: m.matchday,
    group: m.group,
    homeTeam: m.home_code,
    awayTeam: m.away_code,
    homeSlot: null,
    awaySlot: null,
    kickoffUtc: new Date(m.kickoff_utc),
    venueKey: m.venue_key,
  }));
  const koMatchRows = KNOCKOUT_MATCHES.map((m) => ({
    matchId: m.match_id,
    round: m.round,
    matchday: null,
    group: null,
    homeTeam: null,
    awayTeam: null,
    homeSlot: m.home_slot,
    awaySlot: m.away_slot,
    kickoffUtc: new Date(m.kickoff_utc),
    venueKey: m.venue_key,
  }));
  const allMatches = [...groupMatchRows, ...koMatchRows];

  await db
    .insert(schema.matches)
    .values(allMatches)
    .onConflictDoUpdate({
      target: schema.matches.matchId,
      set: {
        round: sql`excluded.round`,
        matchday: sql`excluded.matchday`,
        group: sql`excluded.group`,
        homeTeam: sql`excluded.home_team`,
        awayTeam: sql`excluded.away_team`,
        homeSlot: sql`excluded.home_slot`,
        awaySlot: sql`excluded.away_slot`,
        kickoffUtc: sql`excluded.kickoff_utc`,
        venueKey: sql`excluded.venue_key`,
      },
    });
  console.log(
    `[seed-fixtures] matches upserted: ${allMatches.length} ` +
      `(${groupMatchRows.length} group + ${koMatchRows.length} knockout)`,
  );

  // ── Verify counts ───────────────────────────────────────────────────────────
  const [{ teams: teamCount }] = await db.execute<{ teams: number }>(
    sql`SELECT COUNT(*)::int AS teams FROM teams`,
  );
  const [{ matches: matchCount }] = await db.execute<{ matches: number }>(
    sql`SELECT COUNT(*)::int AS matches FROM matches`,
  );
  const [{ venues: venueCount }] = await db.execute<{ venues: number }>(
    sql`SELECT COUNT(*)::int AS venues FROM venues`,
  );

  console.log(
    `[seed-fixtures] DB row counts: teams=${teamCount} matches=${matchCount} venues=${venueCount}`,
  );

  const errors: string[] = [];
  if (teamCount !== 48) errors.push(`teams should be 48, got ${teamCount}`);
  if (matchCount !== 104) errors.push(`matches should be 104, got ${matchCount}`);
  if (venueCount !== 16) errors.push(`venues should be 16, got ${venueCount}`);
  if (groupMatchRows.length !== COUNTS.group_matches) {
    errors.push(
      `group_matches mismatch: ${groupMatchRows.length} vs ${COUNTS.group_matches}`,
    );
  }
  if (koMatchRows.length !== COUNTS.knockout_matches) {
    errors.push(
      `knockout_matches mismatch: ${koMatchRows.length} vs ${COUNTS.knockout_matches}`,
    );
  }

  await client.end();

  if (errors.length > 0) {
    console.error("[seed-fixtures] sanity checks failed:");
    for (const e of errors) console.error("  -", e);
    process.exit(1);
  }
  console.log("[seed-fixtures] OK — all sanity checks passed.");
}

main().catch((err) => {
  console.error("[seed-fixtures] fatal:", err);
  process.exit(1);
});
