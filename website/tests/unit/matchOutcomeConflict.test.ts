import { describe, expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { MATCH_OUTCOME_CONFLICT_SET } from "@/lib/db/matchOutcomeConflict";

// Render a drizzle SQL fragment to its literal Postgres text (no params here).
const dialect = new PgDialect();
const render = (frag: SQL) => dialect.sqlToQuery(frag).sql;

describe("MATCH_OUTCOME_CONFLICT_SET", () => {
  it("stamps settled_at write-once via coalesce(existing, excluded)", () => {
    // The existing row's settled_at is preserved; the excluded (incoming) value
    // is only used on the first insert (when the column is still NULL). This is
    // what stops the hourly ingest's re-POSTs from re-stamping the timestamp.
    expect(render(MATCH_OUTCOME_CONFLICT_SET.settledAt as SQL)).toBe(
      'coalesce("match_outcomes"."settled_at", excluded.settled_at)',
    );
    // Guard against a regression back to the naive overwrite.
    expect(render(MATCH_OUTCOME_CONFLICT_SET.settledAt as SQL)).not.toBe(
      "excluded.settled_at",
    );
  });

  it("keeps every graded field taking the latest (excluded) value", () => {
    // Scores / shootout / meta still update so a genuine correction lands; only
    // the timestamp is write-once. Re-POSTing identical data therefore leaves
    // the whole row byte-identical.
    const excludedFields: Array<[keyof typeof MATCH_OUTCOME_CONFLICT_SET, string]> = [
      ["competition", "excluded.competition"],
      ["stage", "excluded.stage"],
      ["homeTeam", "excluded.home_team"],
      ["awayTeam", "excluded.away_team"],
      ["homeGoals", "excluded.home_goals"],
      ["awayGoals", "excluded.away_goals"],
      ["shootoutWinner", "excluded.shootout_winner"],
      ["meta", "excluded.meta"],
    ];
    for (const [key, expected] of excludedFields) {
      expect(render(MATCH_OUTCOME_CONFLICT_SET[key] as SQL)).toBe(expected);
    }
  });

  // A second ingest pass over an already-settled match is a no-op on the stored
  // row. We derive the ON CONFLICT DO UPDATE merge directly from the real
  // conflict-set object (never a hand-copied duplicate) so this proves the
  // shipped behaviour: `excluded.<col>` -> take the incoming value;
  // `coalesce("match_outcomes".<col>, excluded.<col>)` -> keep the existing
  // value when it is already set.
  function applyConflictMerge<
    T extends Record<string, unknown>,
  >(existing: T, incoming: T): T {
    const merged = { ...existing };
    for (const key of Object.keys(MATCH_OUTCOME_CONFLICT_SET) as Array<
      keyof typeof MATCH_OUTCOME_CONFLICT_SET
    >) {
      const text = render(MATCH_OUTCOME_CONFLICT_SET[key] as SQL);
      const excludedMatch = /^excluded\.\w+$/.test(text);
      const coalesceMatch = /^coalesce\("match_outcomes"\."\w+", excluded\.\w+\)$/.test(
        text,
      );
      if (coalesceMatch) {
        const cur = existing[key as keyof T];
        merged[key as keyof T] =
          cur === null || cur === undefined ? incoming[key as keyof T] : cur;
      } else if (excludedMatch) {
        merged[key as keyof T] = incoming[key as keyof T];
      } else {
        throw new Error(`unrecognised conflict-set SQL for ${String(key)}: ${text}`);
      }
    }
    return merged;
  }

  it("re-ingesting the same settled match does not re-stamp settled_at", () => {
    const firstSettled = new Date("2026-06-25T20:00:00.000Z");
    const stored = {
      matchId: "FD12345",
      competition: "WC2026",
      stage: "group",
      homeTeam: "ARG",
      awayTeam: "MEX",
      homeGoals: 2,
      awayGoals: 1,
      shootoutWinner: null,
      settledAt: firstSettled,
      meta: {},
    };
    // The hourly cron re-sends the identical outcome an hour later; only the
    // source-side timestamp has advanced.
    const incoming = {
      ...stored,
      settledAt: new Date("2026-06-25T21:00:00.000Z"),
    };

    const merged = applyConflictMerge(stored, incoming);

    // settled_at keeps the first value (not re-stamped)...
    expect(merged.settledAt).toBe(firstSettled);
    // ...and the whole row is byte-identical to what was already stored, so the
    // graded fields are unaffected.
    expect(merged).toEqual(stored);
  });

  it("stamps settled_at from the incoming row on the first insert", () => {
    // On first insert the column is still NULL, so coalesce falls through to the
    // incoming (excluded) value. Modelled here by an existing row with a null
    // timestamp.
    const incomingSettled = new Date("2026-06-25T20:00:00.000Z");
    const freshInsert = {
      matchId: "FD99999",
      settledAt: null as Date | null,
    };
    const incoming = {
      matchId: "FD99999",
      settledAt: incomingSettled,
    };
    const merged = applyConflictMerge(freshInsert, incoming);
    expect(merged.settledAt).toBe(incomingSettled);
  });
});
