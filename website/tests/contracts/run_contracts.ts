/**
 * Contract test runner: works around the vitest % URI issue.
 * Runs all contract tests by directly importing and executing them.
 *
 * Usage: pnpm exec tsx tests/contracts/run_contracts.ts
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Simple test harness
let passed = 0;
let failed = 0;
const failures: string[] = [];

type TestFn = () => void | Promise<void>;

const tests: Array<{ suite: string; name: string; fn: TestFn }> = [];
let currentSuite = "";

function describe(suite: string, fn: () => void) {
  currentSuite = suite;
  fn();
}

function it(name: string, fn: TestFn) {
  tests.push({ suite: currentSuite, name, fn });
}

function expect(actual: unknown) {
  return {
    toBe(expected: unknown) {
      if (actual !== expected)
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    },
    toHaveLength(n: number) {
      if (!Array.isArray(actual))
        throw new Error(`Expected array, got ${typeof actual}`);
      if (actual.length !== n)
        throw new Error(`Expected length ${n}, got ${actual.length}`);
    },
    toBeGreaterThan(n: number) {
      if (typeof actual !== "number" || actual <= n)
        throw new Error(`Expected > ${n}, got ${actual}`);
    },
    toBeGreaterThanOrEqual(n: number) {
      if (typeof actual !== "number" || actual < n)
        throw new Error(`Expected >= ${n}, got ${actual}`);
    },
    toBeLessThan(n: number) {
      if (typeof actual !== "number" || actual >= n)
        throw new Error(`Expected < ${n}, got ${actual}`);
    },
    toBeLessThanOrEqual(n: number) {
      if (typeof actual !== "number" || actual > n)
        throw new Error(`Expected <= ${n}, got ${actual}`);
    },
    toContain(item: unknown) {
      if (!Array.isArray(actual) || !actual.includes(item))
        throw new Error(`Expected array to contain ${JSON.stringify(item)}`);
    },
    toBeTrue() {
      if (actual !== true) throw new Error(`Expected true, got ${actual}`);
    },
  };
}

// ── Import schemas ────────────────────────────────────────────────────────────

import {
  SnapshotMetaSchema,
  TournamentSnapshotSchema,
  DivergenceSnapshotSchema,
  MatchDetailSchema,
  TeamProgressionSchema,
  LedgerRecordSchema,
  EvaluationMetricsSchema,
  FreshnessSchema,
  BracketSnapshotSchema,
  ManifestSchema,
} from "../../src/lib/data/schemas.js";

const LATEST = path.join(__dirname, "../../public/data/latest");
const DATA_ROOT = path.join(__dirname, "../../public/data");
// Source the snapshot id from the live data so nightly snapshots stay green;
// cross-artifact consistency below still ensures every file agrees on it.
const SNAPSHOT_ID: string = (() => {
  const meta = JSON.parse(
    fs.readFileSync(path.join(LATEST, "snapshot_meta.json"), "utf-8"),
  ) as { snapshot_id: string };
  return meta.snapshot_id;
})();

function readJson(p: string): unknown {
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("fixture existence", () => {
  it("latest/ directory exists", () => expect(fs.existsSync(LATEST)).toBe(true));

  const required = [
    "snapshot_meta.json", "tournament.json", "divergence.json",
    "bracket.json", "evaluation_metrics.json", "freshness.json", "ledger.jsonl",
  ];
  for (const file of required) {
    it(`latest/${file} exists`, () => expect(fs.existsSync(path.join(LATEST, file))).toBe(true));
  }

  it("latest/matches/ has at least one file", () => {
    const d = path.join(LATEST, "matches");
    expect(fs.readdirSync(d).filter(f => f.endsWith(".json")).length).toBeGreaterThan(0);
  });

  it("latest/teams/ has 48 files", () => {
    const d = path.join(LATEST, "teams");
    expect(fs.readdirSync(d).filter(f => f.endsWith(".json")).length).toBe(48);
  });

  it("manifest.json exists", () => expect(fs.existsSync(path.join(DATA_ROOT, "manifest.json"))).toBe(true));
});

describe("snapshot_meta.json", () => {
  it("parses without errors", () => {
    const r = SnapshotMetaSchema.safeParse(readJson(path.join(LATEST, "snapshot_meta.json")));
    if (!r.success) throw new Error(JSON.stringify(r.error.issues));
  });
  it("snapshot_id is correct", () => {
    const d = SnapshotMetaSchema.parse(readJson(path.join(LATEST, "snapshot_meta.json")));
    expect(d.snapshot_id).toBe(SNAPSHOT_ID);
  });
  it("matches_settled is a non-negative integer", () => {
    // Relaxed from a hard `=== 0` pin: the tournament is live, so matches
    // settle as it progresses. The binding invariant is cross-artifact
    // consistency with evaluation_metrics (asserted below), not a fixed value.
    const d = SnapshotMetaSchema.parse(readJson(path.join(LATEST, "snapshot_meta.json")));
    expect(Number.isInteger(d.matches_settled)).toBeTrue();
    expect(d.matches_settled).toBeGreaterThanOrEqual(0);
  });
});

describe("tournament.json", () => {
  it("parses without errors", () => {
    const r = TournamentSnapshotSchema.safeParse(readJson(path.join(LATEST, "tournament.json")));
    if (!r.success) throw new Error(JSON.stringify(r.error.issues));
  });
  it("has 48 teams", () => {
    const d = TournamentSnapshotSchema.parse(readJson(path.join(LATEST, "tournament.json")));
    expect(d.teams.length).toBe(48);
  });
  it("p_champion sums to ~1", () => {
    const d = TournamentSnapshotSchema.parse(readJson(path.join(LATEST, "tournament.json")));
    const total = d.teams.reduce((s, t) => s + t.p_champion, 0);
    expect(total).toBeGreaterThan(0.99);
    expect(total).toBeLessThan(1.01);
  });
  it("progression probabilities are monotonically non-increasing", () => {
    const d = TournamentSnapshotSchema.parse(readJson(path.join(LATEST, "tournament.json")));
    for (const t of d.teams) {
      expect(t.p_group_qualification).toBeGreaterThanOrEqual(t.p_r16 - 1e-6);
      expect(t.p_r16).toBeGreaterThanOrEqual(t.p_quarterfinal - 1e-6);
      expect(t.p_quarterfinal).toBeGreaterThanOrEqual(t.p_semifinal - 1e-6);
      expect(t.p_semifinal).toBeGreaterThanOrEqual(t.p_final - 1e-6);
      expect(t.p_final).toBeGreaterThanOrEqual(t.p_champion - 1e-6);
    }
  });
  it("ci_95_champion brackets p_champion", () => {
    const d = TournamentSnapshotSchema.parse(readJson(path.join(LATEST, "tournament.json")));
    for (const t of d.teams) {
      expect(t.ci_95_champion[0]).toBeLessThanOrEqual(t.p_champion + 1e-6);
      expect(t.p_champion).toBeLessThanOrEqual(t.ci_95_champion[1] + 1e-6);
    }
  });
  it("all teams have valid confederation", () => {
    const d = TournamentSnapshotSchema.parse(readJson(path.join(LATEST, "tournament.json")));
    const valid = new Set(["CONMEBOL", "UEFA", "CONCACAF", "AFC", "CAF", "OFC"]);
    for (const t of d.teams) {
      if (!valid.has(t.confederation))
        throw new Error(`Invalid confederation for ${t.fifa_code}: ${t.confederation}`);
    }
  });
});

describe("divergence.json", () => {
  it("parses without errors", () => {
    const r = DivergenceSnapshotSchema.safeParse(readJson(path.join(LATEST, "divergence.json")));
    if (!r.success) throw new Error(JSON.stringify(r.error.issues));
  });
  it("has priced rows, unless in the pending or stale (no-live-odds) state", () => {
    const d = DivergenceSnapshotSchema.parse(readJson(path.join(LATEST, "divergence.json")));
    if (d.status === "pending" || d.status === "stale") {
      // cp-14 Decision B: "pending" means no real odds are ingested yet.
      // cp-30: "stale" means real odds landed once but the snapshot is older
      // than the freshness threshold. Both publish zero rows and no source_book;
      // rows populate once fresh Pinnacle lines land.
      expect(d.rows.length).toBe(0);
    } else {
      // A live divergence snapshot must carry de-vigged rows.
      expect(d.rows.length).toBeGreaterThan(0);
    }
  });
  it("edge_E = p_model - q_market_devigged (within tolerance)", () => {
    const d = DivergenceSnapshotSchema.parse(readJson(path.join(LATEST, "divergence.json")));
    for (const row of d.rows) {
      if (Math.abs(row.edge_E - (row.p_model - row.q_market_devigged)) >= 1e-4)
        throw new Error(`edge_E mismatch for ${row.row_id}`);
    }
  });
  it("confidence_band brackets p_model", () => {
    const d = DivergenceSnapshotSchema.parse(readJson(path.join(LATEST, "divergence.json")));
    for (const row of d.rows) {
      expect(row.confidence_band[0]).toBeLessThanOrEqual(row.p_model + 1e-6);
      expect(row.p_model).toBeLessThanOrEqual(row.confidence_band[1] + 1e-6);
    }
  });
  it("snapshot_id is correct", () => {
    const d = DivergenceSnapshotSchema.parse(readJson(path.join(LATEST, "divergence.json")));
    expect(d.snapshot_id).toBe(SNAPSHOT_ID);
  });
});

describe("matches/*.json", () => {
  const matchesDir = path.join(LATEST, "matches");
  const matchFiles = fs.readdirSync(matchesDir).filter(f => f.endsWith(".json"));

  it("all match files parse without errors", () => {
    for (const f of matchFiles) {
      const r = MatchDetailSchema.safeParse(readJson(path.join(matchesDir, f)));
      if (!r.success) throw new Error(`${f}: ${JSON.stringify(r.error.issues)}`);
    }
  });
  it("p_model_1x2 sums to ~1", () => {
    for (const f of matchFiles) {
      const d = MatchDetailSchema.parse(readJson(path.join(matchesDir, f)));
      const total = d.p_model_1x2.H + d.p_model_1x2.D + d.p_model_1x2.A;
      if (total < 0.999 || total > 1.001)
        throw new Error(`p_model_1x2 sum = ${total} in ${f}`);
    }
  });
  it("p_model_goals is 11×11 matrix summing to ~1", () => {
    for (const f of matchFiles) {
      const d = MatchDetailSchema.parse(readJson(path.join(matchesDir, f)));
      if (d.p_model_goals.length !== 11)
        throw new Error(`${f}: expected 11 rows, got ${d.p_model_goals.length}`);
      for (const row of d.p_model_goals) {
        if (row.length !== 11)
          throw new Error(`${f}: expected 11 cols, got ${row.length}`);
      }
      const total = d.p_model_goals.flat().reduce((s, v) => s + v, 0);
      if (total < 0.999 || total > 1.001)
        throw new Error(`${f}: goal matrix sum = ${total}`);
    }
  });
});

describe("teams/*.json", () => {
  const teamsDir = path.join(LATEST, "teams");
  const teamFiles = fs.readdirSync(teamsDir).filter(f => f.endsWith(".json"));

  it("all 48 files parse without errors", () => {
    for (const f of teamFiles) {
      const r = TeamProgressionSchema.safeParse(readJson(path.join(teamsDir, f)));
      if (!r.success) throw new Error(`${f}: ${JSON.stringify(r.error.issues)}`);
    }
  });
  it("filename matches fifa_code", () => {
    for (const f of teamFiles) {
      const code = f.replace(".json", "");
      const d = TeamProgressionSchema.parse(readJson(path.join(teamsDir, f)));
      expect(d.fifa_code).toBe(code);
    }
  });
  it("progression cone is monotonically non-increasing", () => {
    for (const f of teamFiles) {
      const d = TeamProgressionSchema.parse(readJson(path.join(teamsDir, f)));
      const p = d.progression;
      expect(p.p_group_qualification).toBeGreaterThanOrEqual(p.p_r16 - 1e-6);
      expect(p.p_r16).toBeGreaterThanOrEqual(p.p_qf - 1e-6);
      expect(p.p_qf).toBeGreaterThanOrEqual(p.p_sf - 1e-6);
      expect(p.p_sf).toBeGreaterThanOrEqual(p.p_final - 1e-6);
      expect(p.p_final).toBeGreaterThanOrEqual(p.p_champion - 1e-6);
    }
  });
});

describe("ledger.jsonl", () => {
  it("file exists", () => expect(fs.existsSync(path.join(LATEST, "ledger.jsonl"))).toBe(true));
  it("each non-empty line parses as LedgerRecord", () => {
    const lines = fs.readFileSync(path.join(LATEST, "ledger.jsonl"), "utf-8").split("\n").filter(Boolean);
    for (const line of lines) {
      const r = LedgerRecordSchema.safeParse(JSON.parse(line));
      if (!r.success) throw new Error(JSON.stringify(r.error.issues));
    }
  });
});

describe("evaluation_metrics.json", () => {
  it("parses without errors", () => {
    const r = EvaluationMetricsSchema.safeParse(readJson(path.join(LATEST, "evaluation_metrics.json")));
    if (!r.success) throw new Error(JSON.stringify(r.error.issues));
  });
  it("matches_settled is a non-negative integer", () => {
    // Relaxed from `=== 0`: evaluation_metrics.matches_settled is now sourced
    // from the live match_outcomes count (same as snapshot_meta), so it tracks
    // the tournament. Cross-artifact consistency is the real invariant (below).
    const d = EvaluationMetricsSchema.parse(readJson(path.join(LATEST, "evaluation_metrics.json")));
    expect(Number.isInteger(d.matches_settled)).toBeTrue();
    expect(d.matches_settled).toBeGreaterThanOrEqual(0);
  });
});

describe("freshness.json", () => {
  it("parses without errors", () => {
    const r = FreshnessSchema.safeParse(readJson(path.join(LATEST, "freshness.json")));
    if (!r.success) throw new Error(JSON.stringify(r.error.issues));
  });
  it("snapshot_id is correct", () => {
    const d = FreshnessSchema.parse(readJson(path.join(LATEST, "freshness.json")));
    expect(d.snapshot_id).toBe(SNAPSHOT_ID);
  });
  it("status is FRESH", () => {
    const d = FreshnessSchema.parse(readJson(path.join(LATEST, "freshness.json")));
    expect(d.status).toBe("FRESH");
  });
});

describe("bracket.json", () => {
  it("parses without errors", () => {
    const r = BracketSnapshotSchema.safeParse(readJson(path.join(LATEST, "bracket.json")));
    if (!r.success) throw new Error(JSON.stringify(r.error.issues));
  });
  it("has 7 rounds", () => {
    const d = BracketSnapshotSchema.parse(readJson(path.join(LATEST, "bracket.json")));
    expect(d.rounds.length).toBe(7);
  });
});

describe("manifest.json", () => {
  it("parses without errors", () => {
    const r = ManifestSchema.safeParse(readJson(path.join(DATA_ROOT, "manifest.json")));
    if (!r.success) throw new Error(JSON.stringify(r.error.issues));
  });
  it("contains the fixture snapshot", () => {
    const d = ManifestSchema.parse(readJson(path.join(DATA_ROOT, "manifest.json")));
    if (!d.some(e => e.snapshot_id === SNAPSHOT_ID))
      throw new Error(`manifest missing snapshot_id ${SNAPSHOT_ID}`);
  });
});

describe("cross-artifact consistency", () => {
  it("snapshot_id consistent across all files", () => {
    const meta = SnapshotMetaSchema.parse(readJson(path.join(LATEST, "snapshot_meta.json")));
    const tournament = TournamentSnapshotSchema.parse(readJson(path.join(LATEST, "tournament.json")));
    const divergence = DivergenceSnapshotSchema.parse(readJson(path.join(LATEST, "divergence.json")));
    const freshness = FreshnessSchema.parse(readJson(path.join(LATEST, "freshness.json")));
    const metrics = EvaluationMetricsSchema.parse(readJson(path.join(LATEST, "evaluation_metrics.json")));
    expect(tournament.snapshot_id).toBe(meta.snapshot_id);
    expect(divergence.snapshot_id).toBe(meta.snapshot_id);
    expect(freshness.snapshot_id).toBe(meta.snapshot_id);
    expect(metrics.snapshot_id).toBe(meta.snapshot_id);
  });

  it("tournament.json team codes exactly match teams/ files (bidirectional, no dupes)", () => {
    // cp-12: tightened from a one-directional subset check (tournament
    // codes ⊆ teams/ files) to a bidirectional set-equality + no-duplicate
    // check. The old check passed the live corruption that shipped
    // 2026-05-12 — Congo DR (COD) was listed twice and Tunisia (TUN)
    // dropped — because every tournament code (incl. both CODs) still had a
    // teams/ file, and TUN being present-but-unreferenced was never tested.
    const teamsDir = path.join(LATEST, "teams");
    const teamFiles = new Set(
      fs.readdirSync(teamsDir).filter(f => f.endsWith(".json")).map(f => f.replace(".json", ""))
    );
    const d = TournamentSnapshotSchema.parse(readJson(path.join(LATEST, "tournament.json")));
    const codes = d.teams.map(t => t.fifa_code);
    const codeSet = new Set(codes);
    // (a) no duplicate fifa_codes (catches the COD-twice corruption).
    const dupes = [...new Set(codes.filter((c, i) => codes.indexOf(c) !== i))];
    if (dupes.length)
      throw new Error(`duplicate fifa_codes in tournament.json: ${dupes.join(", ")}`);
    // (b) every tournament code has a teams/ file ...
    const missingFiles = codes.filter(c => !teamFiles.has(c));
    if (missingFiles.length)
      throw new Error(`teams/ file missing for: ${missingFiles.join(", ")}`);
    // ... and every teams/ file appears in tournament.json (catches the
    //     dropped-Tunisia case the old subset check missed).
    const missingFromTournament = [...teamFiles].filter(c => !codeSet.has(c));
    if (missingFromTournament.length)
      throw new Error(`tournament.json missing teams present in teams/: ${missingFromTournament.join(", ")}`);
  });

  it("meta.matches_settled equals evaluation_metrics.matches_settled", () => {
    const meta = SnapshotMetaSchema.parse(readJson(path.join(LATEST, "snapshot_meta.json")));
    const metrics = EvaluationMetricsSchema.parse(readJson(path.join(LATEST, "evaluation_metrics.json")));
    expect(meta.matches_settled).toBe(metrics.matches_settled);
  });

  it("kill_criteria_active in meta matches evaluation_metrics.tripped", () => {
    const meta = SnapshotMetaSchema.parse(readJson(path.join(LATEST, "snapshot_meta.json")));
    const metrics = EvaluationMetricsSchema.parse(readJson(path.join(LATEST, "evaluation_metrics.json")));
    expect(meta.kill_criteria_active).toBe(metrics.kill_criteria_check.tripped);
  });

  // Referential integrity for /match/[id] static generation. The match detail
  // route is force-static + generateStaticParams from this matches/ folder,
  // so every match_id surfaced anywhere in the snapshot must have a JSON
  // file or the link 404s in production. Catches the [:10] slice regression
  // (commit 0b9db6a) and any future omissions.
  it("every divergence.json match_id has a backing detail file", () => {
    // Group rows (GRP, M{NN}) back onto matches/{id}.json (the graded route).
    // cp-30: knockout rows (KO-FD) back onto matches_live/{id}.json (the sibling
    // ungraded /match/live/[id] route). A row pointing at the wrong file 404s.
    const matchFiles = new Set(
      fs.readdirSync(path.join(LATEST, "matches")).filter(f => f.endsWith(".json")).map(f => f.replace(".json", "")),
    );
    const liveDir = path.join(LATEST, "matches_live");
    const liveFiles = new Set(
      fs.existsSync(liveDir)
        ? fs.readdirSync(liveDir).filter(f => f.endsWith(".json")).map(f => f.replace(".json", ""))
        : [],
    );
    const d = DivergenceSnapshotSchema.parse(readJson(path.join(LATEST, "divergence.json")));
    const missing = d.rows
      .filter(r => {
        const isKnockout = r.round !== "GRP" || r.match_id.startsWith("KO-");
        return isKnockout ? !liveFiles.has(r.match_id) : !matchFiles.has(r.match_id);
      })
      .map(r => r.match_id);
    if (missing.length > 0)
      throw new Error(`divergence rows missing a backing detail file: ${[...new Set(missing)].join(", ")}`);
  });

  it("matches/ contains every group-stage fixture (≥72 files)", () => {
    const matchesDir = path.join(LATEST, "matches");
    const count = fs.readdirSync(matchesDir).filter(f => f.endsWith(".json")).length;
    if (count < 72)
      throw new Error(`expected ≥72 group-stage match files, got ${count}. Snapshot generator may be slicing matches.`);
  });
});

// ── Runner ────────────────────────────────────────────────────────────────────

async function runAll() {
  console.log(`\nContract test suite. ${tests.length} tests\n${"─".repeat(60)}`);
  for (const { suite, name, fn } of tests) {
    try {
      await fn();
      console.log(`  ✓  [${suite}] ${name}`);
      passed++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ✗  [${suite}] ${name}\n       ${msg}`);
      failures.push(`[${suite}] ${name}: ${msg}`);
      failed++;
    }
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(`Passed: ${passed}  Failed: ${failed}  Total: ${passed + failed}`);

  if (failed > 0) {
    console.log("\nFailures:");
    for (const f of failures) console.log(`  ✗ ${f}`);
    process.exit(1);
  } else {
    console.log("\n✓ All contract tests green.\n");
  }
}

runAll();
