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
  LiveBracketSnapshotSchema,
  LiveTournamentSnapshotSchema,
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
  type LiveBracketSnapshot,
  type LiveTournamentSnapshot,
  type LiveProvenance,
} from "./schemas";

const DATA_ROOT = path.join(process.cwd(), "public", "data");
const LATEST_DIR = path.join(DATA_ROOT, "latest");

/** Returns the directory for a given snapshotId, defaulting to `latest`. */
export function getSnapshotDir(snapshotId: string = "latest"): string {
  if (snapshotId === "latest") return LATEST_DIR;
  return path.join(DATA_ROOT, "snapshots", snapshotId);
}

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

export function loadSnapshotMeta(snapshotId?: string): SnapshotMeta {
  const dir = getSnapshotDir(snapshotId);
  const data = readJson(path.join(dir, "snapshot_meta.json"));
  return validate(SnapshotMetaSchema, data, "snapshot_meta.json");
}

export function loadTournament(snapshotId?: string): TournamentSnapshot {
  const dir = getSnapshotDir(snapshotId);
  const data = readJson(path.join(dir, "tournament.json"));
  return validate(TournamentSnapshotSchema, data, "tournament.json");
}

export function loadDivergence(snapshotId?: string): DivergenceSnapshot {
  const dir = getSnapshotDir(snapshotId);
  const data = readJson(path.join(dir, "divergence.json"));
  return validate(DivergenceSnapshotSchema, data, "divergence.json");
}

export function loadMatch(matchId: string, snapshotId?: string): MatchDetail {
  const dir = getSnapshotDir(snapshotId);
  const p = path.join(dir, "matches", `${matchId}.json`);
  const data = readJson(p);
  return validate(MatchDetailSchema, data, `matches/${matchId}.json`);
}

/**
 * Like loadMatch but returns null instead of throwing when the per-match JSON
 * file does not exist. Use this for knockout fixtures that haven't been priced
 * yet: the structural scaffold exists in Drizzle but the snapshot pipeline
 * hasn't emitted a detail file for them.
 */
export function loadMatchIfPresent(
  matchId: string,
  snapshotId?: string,
): MatchDetail | null {
  const dir = getSnapshotDir(snapshotId);
  const p = path.join(dir, "matches", `${matchId}.json`);
  if (!fs.existsSync(p)) return null;
  return loadMatch(matchId, snapshotId);
}

export function loadAllMatches(snapshotId?: string): MatchDetail[] {
  const dir = getSnapshotDir(snapshotId);
  const matchesDir = path.join(dir, "matches");
  if (!fs.existsSync(matchesDir)) return [];
  return fs
    .readdirSync(matchesDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const data = readJson(path.join(matchesDir, f));
      return validate(MatchDetailSchema, data, `matches/${f}`);
    });
}

export function loadTeam(fifaCode: string, snapshotId?: string): TeamProgression {
  const dir = getSnapshotDir(snapshotId);
  const p = path.join(dir, "teams", `${fifaCode}.json`);
  const data = readJson(p);
  return validate(TeamProgressionSchema, data, `teams/${fifaCode}.json`);
}

export function loadAllTeams(snapshotId?: string): TeamProgression[] {
  const dir = getSnapshotDir(snapshotId);
  const teamsDir = path.join(dir, "teams");
  if (!fs.existsSync(teamsDir)) return [];
  return fs
    .readdirSync(teamsDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const data = readJson(path.join(teamsDir, f));
      return validate(TeamProgressionSchema, data, `teams/${f}`);
    });
}

export function loadLedger(snapshotId?: string): LedgerRecord[] {
  const dir = getSnapshotDir(snapshotId);
  const p = path.join(dir, "ledger.jsonl");
  if (!fs.existsSync(p)) return [];
  const lines = fs.readFileSync(p, "utf-8").split("\n").filter(Boolean);
  return lines.map((line, i) => {
    const data = JSON.parse(line);
    return validate(LedgerRecordSchema, data, `ledger.jsonl line ${i + 1}`);
  });
}

export function loadEvaluationMetrics(snapshotId?: string): EvaluationMetrics {
  const dir = getSnapshotDir(snapshotId);
  const data = readJson(path.join(dir, "evaluation_metrics.json"));
  return validate(EvaluationMetricsSchema, data, "evaluation_metrics.json");
}

export function loadFreshness(snapshotId?: string): Freshness {
  const dir = getSnapshotDir(snapshotId);
  const data = readJson(path.join(dir, "freshness.json"));
  return validate(FreshnessSchema, data, "freshness.json");
}

export function loadBracket(snapshotId?: string): BracketSnapshot {
  const dir = getSnapshotDir(snapshotId);
  const data = readJson(path.join(dir, "bracket.json"));
  return validate(BracketSnapshotSchema, data, "bracket.json");
}

/**
 * cp-16b live conditional bracket (separate, explicitly UNGRADED surface).
 *
 * Reads the disjoint live files (`tournament_live.json` + `bracket_live.json`)
 * emitted by the regen from the ACTIVE re-sim batch. This is a NULL loader: it
 * returns null when either file is absent, so the bracket page falls back to
 * frozen-only with no error (and so production stays frozen-only whenever the
 * live emission was skipped). The live-provenance block must validate and the
 * two files must agree on it, otherwise the build fails loudly.
 *
 * No graded surface calls this. loadLedger / loadEvaluationMetrics /
 * loadTournament / loadBracket read fixed frozen filenames and never touch
 * these files; that filename + loader separation is the wall.
 */
export function loadLiveBracket(snapshotId?: string):
  | { bracket: LiveBracketSnapshot; tournament: LiveTournamentSnapshot; provenance: LiveProvenance }
  | null {
  const dir = getSnapshotDir(snapshotId);
  const bracketPath = path.join(dir, "bracket_live.json");
  const tournamentPath = path.join(dir, "tournament_live.json");
  if (!fs.existsSync(bracketPath) || !fs.existsSync(tournamentPath)) return null;

  const bracket = validate(
    LiveBracketSnapshotSchema,
    readJson(bracketPath),
    "bracket_live.json",
  );
  const tournament = validate(
    LiveTournamentSnapshotSchema,
    readJson(tournamentPath),
    "tournament_live.json",
  );
  return { bracket, tournament, provenance: tournament.live_provenance };
}

export function loadManifest(): Manifest {
  const p = path.join(DATA_ROOT, "manifest.json");
  const data = readJson(p);
  return validate(ManifestSchema, data, "manifest.json");
}

export function loadSnapshot(snapshotId?: string) {
  return {
    meta: loadSnapshotMeta(snapshotId),
    tournament: loadTournament(snapshotId),
    divergence: loadDivergence(snapshotId),
    evaluation: loadEvaluationMetrics(snapshotId),
    freshness: loadFreshness(snapshotId),
    bracket: loadBracket(snapshotId),
  };
}
