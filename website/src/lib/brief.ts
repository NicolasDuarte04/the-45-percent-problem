import { readFile, readFileSync, readdirSync } from "node:fs";
import { promisify } from "node:util";
import path from "node:path";
import {
  getBriefForDate,
  listBriefs,
  type BriefBlobMeta,
} from "./blob";

const readFileAsync = promisify(readFile);

// ─── Types: full daily-brief JSON contract ────────────────────────────────────
//
// Mirrors `JSON contracts > Daily brief JSON` in
// `website/email-system-implementation-prompt.md`. Until Phase 4's pipeline
// fills `top_divergences`, `tournament_movers`, etc. with real model output,
// the same shape is satisfied by `public/sample-brief.json` and by the
// `scripts/seed-briefs-blob.ts` helper.

export interface BriefHeadline {
  summary_line: string;
  movers_line: string;
}

export interface BriefLeadIn {
  tournament_sentence: string;
  match_sentence: string;
  fallback_used: boolean;
}

export type BriefTeaser =
  | {
      has_divergence: true;
      match_label: string;
      side: string;
      model_prob: number;
      market_prob: number;
      edge_bps: number;
      edge_direction: "positive" | "negative";
    }
  | { has_divergence: false };

export interface BriefDivergence {
  match_id: string;
  kickoff_utc: string;
  home: string;
  away: string;
  market: string;
  side: "home" | "draw" | "away";
  model_prob: number;
  market_prob_devigged: number;
  edge_bps: number;
  edge_direction: "positive" | "negative";
  ci_95?: { low: number; high: number };
  volatility_gate: {
    triggered: boolean;
    suppressions: string[];
  };
}

export interface BriefMover {
  team: string;
  metric: string;
  yesterday: number;
  today: number;
  delta: number;
  delta_bps: number;
  driver: string;
}

export interface BriefSuppression {
  match_id: string;
  match_label: string;
  rule: string;
  reason: string;
}

export interface BriefMethodologyLinks {
  model_card: string;
  devig_method: string;
  this_brief_archive: string;
}

export interface BriefFeaturedTeam {
  /** FIFA 3-letter code (e.g. "BRA"). Used as the route slug at /teams/[code]. */
  code: string;
  /** Display name as it appears on the chip (e.g. "BRAZIL"). */
  name: string;
}

// ─── cp-31: the `daily` block ─────────────────────────────────────────────────
//
// Additive, optional. Present on issues produced by the automated cp-31 producer
// (`evaluation/build_daily_brief.py`); absent on the pre-cp-31 archive, which
// renders exactly as before. It carries the deterministic, snapshot-derived
// daily content: today's fixtures (model 1X2 + modal scoreline), yesterday's
// results (with shootout resolutions), tournament state, the R16 checkpoint
// status, and the AGGREGATE divergence-layer status only (never per-match
// edges, per the standing no-tipster prohibition).

export interface BriefTeamRef {
  fifa_code: string;
  display_name: string;
}

export interface BriefFixture {
  match_id: string;
  round: string;
  /** false for knockout ties (live, ungraded); true for the frozen group stage. */
  graded: boolean;
  kickoff_utc: string | null;
  kickoff_local_label: string;
  home: BriefTeamRef;
  away: BriefTeamRef;
  p_home: number | null;
  p_draw: number | null;
  p_away: number | null;
  /** Most likely exact scoreline, "H-A", or null when the grid is unavailable. */
  modal_scoreline: string | null;
}

export interface BriefResult {
  match_id: string;
  round: string;
  graded: boolean;
  home: BriefTeamRef;
  away: BriefTeamRef;
  score: { home: number | null; away: number | null };
  outcome: "H" | "D" | "A" | null;
  /** Present only on penalty-decided knockouts (regulation score is a draw). */
  shootout: { winner_name: string | null; home: number; away: number } | null;
  result_label: string;
}

export interface BriefDailyTournament {
  phase_label: string;
  matches_settled: number;
  matches_remaining: number;
  total_matches: number;
  sentence: string;
}

export interface BriefDailyR16 {
  status: "pending" | "published";
  sentence: string;
}

export interface BriefDailyDivergence {
  status: "live" | "paused";
  fixtures_covered: number;
  sentence: string;
}

export interface BriefDaily {
  generated_at_utc: string;
  tournament: BriefDailyTournament;
  r16_checkpoint: BriefDailyR16;
  divergence: BriefDailyDivergence;
  knockout_disclaimer: string;
  today_fixtures: BriefFixture[];
  yesterday_results: BriefResult[];
  next_fixture_date: string | null;
}

export interface BriefSample {
  brief_date: string;
  issue_number: number;
  model_variant: string;
  code_sha: string;
  data_snapshot_sha: string;
  mc_runs: number;
  next_brief_utc: string;
  latest_archive_url: string;
  lead_in: BriefLeadIn;
  headline: BriefHeadline;
  teaser: BriefTeaser;
  featured_teams: BriefFeaturedTeam[];
  top_divergences: BriefDivergence[];
  tournament_movers: BriefMover[];
  suppressed_today: BriefSuppression[];
  methodology_links: BriefMethodologyLinks;
  /** cp-31 producer output. Absent on the pre-cp-31 archive. */
  daily?: BriefDaily;
}

// ─── Source resolution ────────────────────────────────────────────────────────
//
// cp-31 storage decision. Production now reads committed issues written by the
// regen producer (`evaluation/build_daily_brief.py`) into the snapshot data
// namespace at `public/data/briefs/YYYY-MM-DD.json`. These are the primary
// source: the newest committed issue is "latest". The Vercel Blob path is
// retained ONLY as the backward-compatible archive of pre-cp-31 issues, so those
// old issues stay reachable by date and in the archive index. The bundled
// `public/sample-brief.json` remains the final dev/preview fallback.
//
// Resolution order for every reader:
//   1. committed `public/data/briefs/` (primary)
//   2. Vercel Blob `briefs/` (legacy archive, only when BLOB token is set)
//   3. `public/sample-brief.json` (dev/preview fallback)
//
// Why committed data instead of Blob writes from the pipeline: the regen Actions
// job has no BLOB_READ_WRITE_TOKEN provisioned, but it already
// `git add website/public/data/` and commits. Committing the issue rides that
// existing, authenticated path with zero new secrets. See the cp-31 PR.

const SAMPLE_PATH = path.join(process.cwd(), "public", "sample-brief.json");
const COMMITTED_BRIEFS_DIR = path.join(
  process.cwd(),
  "public",
  "data",
  "briefs",
);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function blobAvailable(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

async function readSampleBrief(): Promise<BriefSample> {
  const raw = await readFileAsync(SAMPLE_PATH, "utf8");
  return JSON.parse(raw) as BriefSample;
}

/** Committed brief dates (YYYY-MM-DD), newest first. Empty when the dir or its
 * contents are missing (e.g. before the first producer run). */
function committedBriefDates(): string[] {
  try {
    return readdirSync(COMMITTED_BRIEFS_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""))
      .filter((d) => DATE_RE.test(d))
      .sort((a, b) => b.localeCompare(a));
  } catch {
    return [];
  }
}

/** Read a single committed brief by date, or null when absent/unreadable. */
async function readCommittedBrief(date: string): Promise<BriefSample | null> {
  if (!DATE_RE.test(date)) return null;
  try {
    const raw = await readFileAsync(
      path.join(COMMITTED_BRIEFS_DIR, `${date}.json`),
      "utf8",
    );
    return JSON.parse(raw) as BriefSample;
  } catch {
    return null;
  }
}

/**
 * Newest published brief. Prefers the committed archive, then the legacy Blob
 * archive, then the bundled sample. Used by `/brief`, `/methodology`, and the
 * API route at `/api/brief/latest`.
 */
export async function loadLatestBrief(): Promise<BriefSample> {
  const committed = committedBriefDates();
  if (committed.length > 0) {
    const found = await readCommittedBrief(committed[0]);
    if (found) return found;
  }

  if (blobAvailable()) {
    try {
      const metas = await listBriefs({ limit: 1 });
      const newest = metas[0];
      if (newest) {
        const found = await getBriefForDate<BriefSample>(newest.date);
        if (found) return found;
      }
    } catch (err) {
      console.warn(
        "[brief] loadLatestBrief: Blob path failed; falling back to sample",
        err instanceof Error ? err.message : err,
      );
    }
  }
  return readSampleBrief();
}

/**
 * Single brief by date. Committed archive first, then the legacy Blob archive,
 * then the bundled sample if it matches. Returns null when nothing matches: the
 * caller (Next.js dynamic route) should call notFound().
 */
export async function loadBriefByDate(
  date: string,
): Promise<BriefSample | null> {
  if (!DATE_RE.test(date)) return null;

  const committed = await readCommittedBrief(date);
  if (committed) return committed;

  if (blobAvailable()) {
    try {
      const found = await getBriefForDate<BriefSample>(date);
      if (found) return found;
    } catch (err) {
      console.warn(
        "[brief] loadBriefByDate: Blob path failed",
        err instanceof Error ? err.message : err,
      );
    }
  }
  // Local-dev convenience: if the requested date matches the bundled
  // sample, return it.
  try {
    const sample = await readSampleBrief();
    if (sample.brief_date === date) return sample;
  } catch {
    /* swallow: return null below */
  }
  return null;
}

/**
 * All published briefs, newest first. Drives the `/briefs` archive index. Unions
 * the committed archive with the legacy Blob archive (committed wins on a date
 * collision), so both pre- and post-cp-31 issues are listed. Each entry is a
 * full BriefSample so the archive can render rich row summaries without a
 * second round-trip.
 */
export async function listAvailableBriefs(): Promise<BriefSample[]> {
  const byDate = new Map<string, BriefSample>();

  // Legacy Blob archive first, so committed issues overwrite on a collision.
  if (blobAvailable()) {
    try {
      const metas = await listBriefs();
      const briefs = await Promise.all(
        metas.map((m: BriefBlobMeta) =>
          getBriefForDate<BriefSample>(m.date).catch(() => null),
        ),
      );
      for (const b of briefs) {
        if (b) byDate.set(b.brief_date, b);
      }
    } catch (err) {
      console.warn(
        "[brief] listAvailableBriefs: Blob path failed",
        err instanceof Error ? err.message : err,
      );
    }
  }

  // Committed archive (primary): overwrites any same-date Blob entry.
  for (const date of committedBriefDates()) {
    const b = await readCommittedBrief(date);
    if (b) byDate.set(b.brief_date, b);
  }

  const all = [...byDate.values()].sort((a, b) =>
    b.brief_date.localeCompare(a.brief_date),
  );
  if (all.length > 0) return all;

  // Dev fallback: a single-issue archive built from the bundled sample.
  try {
    return [await readSampleBrief()];
  } catch {
    return [];
  }
}

/**
 * Synchronous variant retained for build-time / module-init contexts that
 * predate the async refactor. New code should use `loadLatestBrief()`.
 *
 * @deprecated prefer `loadLatestBrief()`
 */
export function loadSampleBrief(): BriefSample {
  const raw = readFileSync(SAMPLE_PATH, "utf8");
  return JSON.parse(raw) as BriefSample;
}
