/**
 * Typed access to /public/data/latest.
 * All reads happen at build time (no runtime fetch).
 * Fails build on schema mismatch (§9.3).
 */
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
  type SnapshotMeta,
  type TournamentSnapshot,
  type DivergenceSnapshot,
  type MatchDetail,
  type TeamProgression,
  type LedgerRecord,
  type EvaluationMetrics,
  type Freshness,
  type BracketSnapshot,
  type Manifest,
} from "./schemas";

const DATA_ROOT = path.join(process.cwd(), "public", "data");
const LATEST_DIR = path.join(DATA_ROOT, "latest");

function readJson(filePath: string): unknown {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

type SafeParseSchema<T> = {
  safeParse: (v: unknown) =>
    | { success: true; data: T }
    | { success: false; error: { issues: Array<{ path: PropertyKey[]; message: string }> } };
};

function validate<T>(schema: SafeParseSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  [${i.path.map(String).join(".")}] ${i.message}`)
      .join("\n");
    throw new Error(`Schema mismatch in ${label}:\n${issues}`);
  }
  return result.data;
}

export function loadSnapshotMeta(): SnapshotMeta {
  const data = readJson(path.join(LATEST_DIR, "snapshot_meta.json"));
  return validate(SnapshotMetaSchema, data, "snapshot_meta.json");
}

export function loadTournament(): TournamentSnapshot {
  const data = readJson(path.join(LATEST_DIR, "tournament.json"));
  return validate(TournamentSnapshotSchema, data, "tournament.json");
}

export function loadDivergence(): DivergenceSnapshot {
  const data = readJson(path.join(LATEST_DIR, "divergence.json"));
  return validate(DivergenceSnapshotSchema, data, "divergence.json");
}

export function loadMatch(matchId: string): MatchDetail {
  const p = path.join(LATEST_DIR, "matches", `${matchId}.json`);
  const data = readJson(p);
  return validate(MatchDetailSchema, data, `matches/${matchId}.json`);
}

export function loadAllMatches(): MatchDetail[] {
  const matchesDir = path.join(LATEST_DIR, "matches");
  if (!fs.existsSync(matchesDir)) return [];
  return fs
    .readdirSync(matchesDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const data = readJson(path.join(matchesDir, f));
      return validate(MatchDetailSchema, data, `matches/${f}`);
    });
}

export function loadTeam(fifaCode: string): TeamProgression {
  const p = path.join(LATEST_DIR, "teams", `${fifaCode}.json`);
  const data = readJson(p);
  return validate(TeamProgressionSchema, data, `teams/${fifaCode}.json`);
}

export function loadAllTeams(): TeamProgression[] {
  const teamsDir = path.join(LATEST_DIR, "teams");
  if (!fs.existsSync(teamsDir)) return [];
  return fs
    .readdirSync(teamsDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const data = readJson(path.join(teamsDir, f));
      return validate(TeamProgressionSchema, data, `teams/${f}`);
    });
}

export function loadLedger(): LedgerRecord[] {
  const p = path.join(LATEST_DIR, "ledger.jsonl");
  if (!fs.existsSync(p)) return [];
  const lines = fs.readFileSync(p, "utf-8").split("\n").filter(Boolean);
  return lines.map((line, i) => {
    const data = JSON.parse(line);
    return validate(LedgerRecordSchema, data, `ledger.jsonl line ${i + 1}`);
  });
}

export function loadEvaluationMetrics(): EvaluationMetrics {
  const data = readJson(path.join(LATEST_DIR, "evaluation_metrics.json"));
  return validate(EvaluationMetricsSchema, data, "evaluation_metrics.json");
}

export function loadFreshness(): Freshness {
  const data = readJson(path.join(LATEST_DIR, "freshness.json"));
  return validate(FreshnessSchema, data, "freshness.json");
}

export function loadBracket(): BracketSnapshot {
  const data = readJson(path.join(LATEST_DIR, "bracket.json"));
  return validate(BracketSnapshotSchema, data, "bracket.json");
}

export function loadManifest(): Manifest {
  const p = path.join(DATA_ROOT, "manifest.json");
  const data = readJson(p);
  return validate(ManifestSchema, data, "manifest.json");
}

export function loadSnapshot() {
  return {
    meta: loadSnapshotMeta(),
    tournament: loadTournament(),
    divergence: loadDivergence(),
    evaluation: loadEvaluationMetrics(),
    freshness: loadFreshness(),
    bracket: loadBracket(),
  };
}
