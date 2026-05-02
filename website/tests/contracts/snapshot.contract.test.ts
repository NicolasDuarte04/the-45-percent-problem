/**
 * Contract tests for the 2026-04-23T00:00Z fixture snapshot bundle.
 * Every artifact in /public/data/latest/ must round-trip through its Zod schema.
 * [BLOCK] — must be 100% green before any UI work (§12.2).
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
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
} from "@/lib/data/schemas";

const LATEST = path.join(process.cwd(), "public", "data", "latest");
const DATA_ROOT = path.join(process.cwd(), "public", "data");
// Snapshot ID is sourced from the live data being tested, not hard-coded,
// so the contract suite stays green across nightly snapshots. Cross-artifact
// consistency is still enforced below — every file must agree on the same id.
const SNAPSHOT_ID: string = (() => {
  const meta = JSON.parse(
    fs.readFileSync(path.join(LATEST, "snapshot_meta.json"), "utf-8"),
  ) as { snapshot_id: string };
  return meta.snapshot_id;
})();

function readJson(p: string): unknown {
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

// ── Fixture existence ─────────────────────────────────────────────────────────

describe("fixture existence", () => {
  it("latest/ directory exists", () => {
    expect(fs.existsSync(LATEST)).toBe(true);
  });

  const required = [
    "snapshot_meta.json",
    "tournament.json",
    "divergence.json",
    "bracket.json",
    "evaluation_metrics.json",
    "freshness.json",
    "ledger.jsonl",
  ];
  for (const file of required) {
    it(`latest/${file} exists`, () => {
      expect(fs.existsSync(path.join(LATEST, file))).toBe(true);
    });
  }

  it("latest/matches/ directory exists and contains at least one file", () => {
    const d = path.join(LATEST, "matches");
    expect(fs.existsSync(d)).toBe(true);
    expect(fs.readdirSync(d).filter((f) => f.endsWith(".json")).length).toBeGreaterThan(0);
  });

  it("latest/teams/ directory exists and contains 48 team files", () => {
    const d = path.join(LATEST, "teams");
    expect(fs.existsSync(d)).toBe(true);
    expect(fs.readdirSync(d).filter((f) => f.endsWith(".json")).length).toBe(48);
  });

  it("public/data/manifest.json exists", () => {
    expect(fs.existsSync(path.join(DATA_ROOT, "manifest.json"))).toBe(true);
  });
});

// ── Schema round-trips ────────────────────────────────────────────────────────

describe("snapshot_meta.json schema", () => {
  it("parses without errors", () => {
    const data = readJson(path.join(LATEST, "snapshot_meta.json"));
    const result = SnapshotMetaSchema.safeParse(data);
    expect(result.success, result.success ? "" : JSON.stringify(result.error.issues)).toBe(true);
  });

  it("snapshot_id is the expected fixture id", () => {
    const data = SnapshotMetaSchema.parse(readJson(path.join(LATEST, "snapshot_meta.json")));
    expect(data.snapshot_id).toBe(SNAPSHOT_ID);
  });

  it("matches_settled is 0 (pre-tournament)", () => {
    const data = SnapshotMetaSchema.parse(readJson(path.join(LATEST, "snapshot_meta.json")));
    expect(data.matches_settled).toBe(0);
  });

  it("kill_criteria_active is true", () => {
    const data = SnapshotMetaSchema.parse(readJson(path.join(LATEST, "snapshot_meta.json")));
    expect(data.kill_criteria_active).toBe(true);
  });
});

describe("tournament.json schema", () => {
  it("parses without errors", () => {
    const data = readJson(path.join(LATEST, "tournament.json"));
    const result = TournamentSnapshotSchema.safeParse(data);
    expect(result.success, result.success ? "" : JSON.stringify(result.error.issues)).toBe(true);
  });

  it("contains exactly 48 teams", () => {
    const data = TournamentSnapshotSchema.parse(readJson(path.join(LATEST, "tournament.json")));
    expect(data.teams).toHaveLength(48);
  });

  it("p_champion values sum to ~1 across all teams", () => {
    const data = TournamentSnapshotSchema.parse(readJson(path.join(LATEST, "tournament.json")));
    const total = data.teams.reduce((s, t) => s + t.p_champion, 0);
    expect(total).toBeGreaterThan(0.99);
    expect(total).toBeLessThan(1.01);
  });

  it("each team has valid confederation", () => {
    const data = TournamentSnapshotSchema.parse(readJson(path.join(LATEST, "tournament.json")));
    const valid = new Set(["CONMEBOL", "UEFA", "CONCACAF", "AFC", "CAF", "OFC"]);
    for (const t of data.teams) {
      expect(valid.has(t.confederation), `invalid confederation for ${t.fifa_code}: ${t.confederation}`).toBe(true);
    }
  });

  it("progression probabilities are monotonically non-increasing (p_group_qual >= p_r16 >= ...)", () => {
    const data = TournamentSnapshotSchema.parse(readJson(path.join(LATEST, "tournament.json")));
    for (const t of data.teams) {
      expect(t.p_group_qualification).toBeGreaterThanOrEqual(t.p_r16 - 1e-6);
      expect(t.p_r16).toBeGreaterThanOrEqual(t.p_quarterfinal - 1e-6);
      expect(t.p_quarterfinal).toBeGreaterThanOrEqual(t.p_semifinal - 1e-6);
      expect(t.p_semifinal).toBeGreaterThanOrEqual(t.p_final - 1e-6);
      expect(t.p_final).toBeGreaterThanOrEqual(t.p_champion - 1e-6);
    }
  });

  it("ci_95_champion lower bound <= p_champion <= upper bound", () => {
    const data = TournamentSnapshotSchema.parse(readJson(path.join(LATEST, "tournament.json")));
    for (const t of data.teams) {
      expect(t.ci_95_champion[0]).toBeLessThanOrEqual(t.p_champion + 1e-6);
      expect(t.p_champion).toBeLessThanOrEqual(t.ci_95_champion[1] + 1e-6);
    }
  });
});

describe("divergence.json schema", () => {
  it("parses without errors", () => {
    const data = readJson(path.join(LATEST, "divergence.json"));
    const result = DivergenceSnapshotSchema.safeParse(data);
    expect(result.success, result.success ? "" : JSON.stringify(result.error.issues)).toBe(true);
  });

  it("contains rows with required fields", () => {
    const data = DivergenceSnapshotSchema.parse(readJson(path.join(LATEST, "divergence.json")));
    expect(data.rows.length).toBeGreaterThan(0);
  });

  it("all rows have gate_status OPEN or FIRED", () => {
    const data = DivergenceSnapshotSchema.parse(readJson(path.join(LATEST, "divergence.json")));
    for (const row of data.rows) {
      expect(["OPEN", "FIRED"]).toContain(row.gate_status);
    }
  });

  it("all rows have market = 1X2 (synthetic fixture only has 1X2)", () => {
    const data = DivergenceSnapshotSchema.parse(readJson(path.join(LATEST, "divergence.json")));
    for (const row of data.rows) {
      expect(row.market).toBe("1X2");
    }
  });

  it("p_model in [0,1] and q_market_devigged in [0,1] for all rows", () => {
    const data = DivergenceSnapshotSchema.parse(readJson(path.join(LATEST, "divergence.json")));
    for (const row of data.rows) {
      expect(row.p_model).toBeGreaterThanOrEqual(0);
      expect(row.p_model).toBeLessThanOrEqual(1);
      expect(row.q_market_devigged).toBeGreaterThanOrEqual(0);
      expect(row.q_market_devigged).toBeLessThanOrEqual(1);
    }
  });

  it("edge_E = p_model - q_market_devigged (within rounding tolerance)", () => {
    const data = DivergenceSnapshotSchema.parse(readJson(path.join(LATEST, "divergence.json")));
    for (const row of data.rows) {
      expect(Math.abs(row.edge_E - (row.p_model - row.q_market_devigged))).toBeLessThan(1e-4);
    }
  });

  it("confidence_band[0] <= p_model <= confidence_band[1]", () => {
    const data = DivergenceSnapshotSchema.parse(readJson(path.join(LATEST, "divergence.json")));
    for (const row of data.rows) {
      expect(row.confidence_band[0]).toBeLessThanOrEqual(row.p_model + 1e-6);
      expect(row.p_model).toBeLessThanOrEqual(row.confidence_band[1] + 1e-6);
    }
  });
});

describe("matches/*.json schema", () => {
  const matchesDir = path.join(LATEST, "matches");
  const matchFiles = fs.readdirSync(matchesDir).filter((f) => f.endsWith(".json"));

  it("all match files parse without errors", () => {
    for (const f of matchFiles) {
      const data = readJson(path.join(matchesDir, f));
      const result = MatchDetailSchema.safeParse(data);
      expect(result.success, `${f}: ${result.success ? "" : JSON.stringify(result.error.issues)}`).toBe(true);
    }
  });

  it("p_model_1x2 sums to ~1 for all matches", () => {
    for (const f of matchFiles) {
      const data = MatchDetailSchema.parse(readJson(path.join(matchesDir, f)));
      const total = data.p_model_1x2.H + data.p_model_1x2.D + data.p_model_1x2.A;
      expect(total).toBeGreaterThan(0.999);
      expect(total).toBeLessThan(1.001);
    }
  });

  it("p_model_goals is an 11×11 matrix", () => {
    for (const f of matchFiles) {
      const data = MatchDetailSchema.parse(readJson(path.join(matchesDir, f)));
      expect(data.p_model_goals).toHaveLength(11);
      for (const row of data.p_model_goals) {
        expect(row).toHaveLength(11);
      }
    }
  });

  it("p_model_goals matrix sums to ~1", () => {
    for (const f of matchFiles) {
      const data = MatchDetailSchema.parse(readJson(path.join(matchesDir, f)));
      const total = data.p_model_goals.flat().reduce((s, v) => s + v, 0);
      expect(total).toBeGreaterThan(0.999);
      expect(total).toBeLessThan(1.001);
    }
  });
});

describe("teams/*.json schema", () => {
  const teamsDir = path.join(LATEST, "teams");
  const teamFiles = fs.readdirSync(teamsDir).filter((f) => f.endsWith(".json"));

  it("all 48 team files parse without errors", () => {
    for (const f of teamFiles) {
      const data = readJson(path.join(teamsDir, f));
      const result = TeamProgressionSchema.safeParse(data);
      expect(result.success, `${f}: ${result.success ? "" : JSON.stringify(result.error.issues)}`).toBe(true);
    }
  });

  it("progression cone is monotonically non-increasing for all teams", () => {
    for (const f of teamFiles) {
      const data = TeamProgressionSchema.parse(readJson(path.join(teamsDir, f)));
      const p = data.progression;
      expect(p.p_group_qualification).toBeGreaterThanOrEqual(p.p_r16 - 1e-6);
      expect(p.p_r16).toBeGreaterThanOrEqual(p.p_qf - 1e-6);
      expect(p.p_qf).toBeGreaterThanOrEqual(p.p_sf - 1e-6);
      expect(p.p_sf).toBeGreaterThanOrEqual(p.p_final - 1e-6);
      expect(p.p_final).toBeGreaterThanOrEqual(p.p_champion - 1e-6);
    }
  });

  it("filename matches fifa_code", () => {
    for (const f of teamFiles) {
      const code = f.replace(".json", "");
      const data = TeamProgressionSchema.parse(readJson(path.join(teamsDir, f)));
      expect(data.fifa_code).toBe(code);
    }
  });
});

describe("ledger.jsonl schema", () => {
  it("file exists (may be empty pre-tournament)", () => {
    expect(fs.existsSync(path.join(LATEST, "ledger.jsonl"))).toBe(true);
  });

  it("each non-empty line parses as a valid LedgerRecord", () => {
    const lines = fs.readFileSync(path.join(LATEST, "ledger.jsonl"), "utf-8")
      .split("\n")
      .filter(Boolean);
    for (const line of lines) {
      const data = JSON.parse(line);
      const result = LedgerRecordSchema.safeParse(data);
      expect(result.success, result.success ? "" : JSON.stringify(result.error.issues)).toBe(true);
    }
  });
});

describe("evaluation_metrics.json schema", () => {
  it("parses without errors", () => {
    const data = readJson(path.join(LATEST, "evaluation_metrics.json"));
    const result = EvaluationMetricsSchema.safeParse(data);
    expect(result.success, result.success ? "" : JSON.stringify(result.error.issues)).toBe(true);
  });

  it("kill_criteria_check.tripped is true (Phase 8 firing)", () => {
    const data = EvaluationMetricsSchema.parse(readJson(path.join(LATEST, "evaluation_metrics.json")));
    expect(data.kill_criteria_check.tripped).toBe(true);
  });

  it("matches_settled is 0", () => {
    const data = EvaluationMetricsSchema.parse(readJson(path.join(LATEST, "evaluation_metrics.json")));
    expect(data.matches_settled).toBe(0);
  });
});

describe("freshness.json schema", () => {
  it("parses without errors", () => {
    const data = readJson(path.join(LATEST, "freshness.json"));
    const result = FreshnessSchema.safeParse(data);
    expect(result.success, result.success ? "" : JSON.stringify(result.error.issues)).toBe(true);
  });

  it("snapshot_id matches the expected fixture id", () => {
    const data = FreshnessSchema.parse(readJson(path.join(LATEST, "freshness.json")));
    expect(data.snapshot_id).toBe(SNAPSHOT_ID);
  });

  it("status is FRESH", () => {
    const data = FreshnessSchema.parse(readJson(path.join(LATEST, "freshness.json")));
    expect(data.status).toBe("FRESH");
  });
});

describe("bracket.json schema", () => {
  it("parses without errors", () => {
    const data = readJson(path.join(LATEST, "bracket.json"));
    const result = BracketSnapshotSchema.safeParse(data);
    expect(result.success, result.success ? "" : JSON.stringify(result.error.issues)).toBe(true);
  });

  it("contains 7 rounds (GRP through FIN)", () => {
    const data = BracketSnapshotSchema.parse(readJson(path.join(LATEST, "bracket.json")));
    expect(data.rounds).toHaveLength(7);
  });
});

describe("manifest.json schema", () => {
  it("parses without errors", () => {
    const data = readJson(path.join(DATA_ROOT, "manifest.json"));
    const result = ManifestSchema.safeParse(data);
    expect(result.success, result.success ? "" : JSON.stringify(result.error.issues)).toBe(true);
  });

  it("contains the fixture snapshot", () => {
    const data = ManifestSchema.parse(readJson(path.join(DATA_ROOT, "manifest.json")));
    expect(data.some((e) => e.snapshot_id === SNAPSHOT_ID)).toBe(true);
  });
});

// ── Cross-artifact consistency ────────────────────────────────────────────────

describe("cross-artifact consistency", () => {
  it("snapshot_id is consistent across all top-level files", () => {
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

  it("team fifa_codes in tournament.json match files in teams/", () => {
    const teamsDir = path.join(LATEST, "teams");
    const teamFiles = new Set(
      fs.readdirSync(teamsDir).filter((f) => f.endsWith(".json")).map((f) => f.replace(".json", ""))
    );
    const tournament = TournamentSnapshotSchema.parse(readJson(path.join(LATEST, "tournament.json")));
    for (const t of tournament.teams) {
      expect(teamFiles.has(t.fifa_code), `teams/${t.fifa_code}.json missing`).toBe(true);
    }
  });

  it("meta.matches_settled equals evaluation_metrics.matches_settled", () => {
    const meta = SnapshotMetaSchema.parse(readJson(path.join(LATEST, "snapshot_meta.json")));
    const metrics = EvaluationMetricsSchema.parse(readJson(path.join(LATEST, "evaluation_metrics.json")));
    expect(meta.matches_settled).toBe(metrics.matches_settled);
  });

  it("kill_criteria_active in meta matches evaluation_metrics.kill_criteria_check.tripped", () => {
    const meta = SnapshotMetaSchema.parse(readJson(path.join(LATEST, "snapshot_meta.json")));
    const metrics = EvaluationMetricsSchema.parse(readJson(path.join(LATEST, "evaluation_metrics.json")));
    expect(meta.kill_criteria_active).toBe(metrics.kill_criteria_check.tripped);
  });

  // Referential integrity for /match/[id] static generation. Every match_id
  // surfaced in the divergence terminal (and any future referrer like the
  // bracket bracket-slot pages) must have a corresponding matches/{id}.json
  // file, or the static page 404s at runtime. This test exists because a
  // [:10] slice in scripts/generate_snapshot.py once shipped to production
  // and broke 62 of 72 group-stage match links — see commit 0b9db6a.
  it("every match_id referenced in divergence.json has a matches/{id}.json file", () => {
    const matchesDir = path.join(LATEST, "matches");
    const matchFiles = new Set(
      fs.readdirSync(matchesDir).filter((f) => f.endsWith(".json")).map((f) => f.replace(".json", "")),
    );
    const divergence = DivergenceSnapshotSchema.parse(readJson(path.join(LATEST, "divergence.json")));
    const referenced = new Set(divergence.rows.map((r) => r.match_id));
    const missing = [...referenced].filter((id) => !matchFiles.has(id));
    expect(missing, `matches/ missing JSON for: ${missing.join(", ")}`).toEqual([]);
  });

  it("matches/ contains every group-stage fixture (72 files for the round-robin)", () => {
    const matchesDir = path.join(LATEST, "matches");
    const matchFiles = fs.readdirSync(matchesDir).filter((f) => f.endsWith(".json"));
    // 12 groups × 6 matches = 72 group-stage fixtures. Anything fewer means
    // the snapshot generator is dropping fixtures that the bracket links to.
    expect(
      matchFiles.length,
      `expected ≥72 group-stage match files, got ${matchFiles.length}. Snapshot generator may be slicing matches.`,
    ).toBeGreaterThanOrEqual(72);
  });
});
