import { readFile, readFileSync } from "node:fs";
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
}

// ─── Source resolution ────────────────────────────────────────────────────────
//
// Production: read from Vercel Blob (`briefs/YYYY-MM-DD.json`), populated by
// the Phase 4 cron from the Python pipeline.
// Local dev / preview when no Blob token is set or the bucket is empty:
// fall back to `public/sample-brief.json`. The sample is a complete brief
// matching the contract above, so every consumer (the Daily Brief page, the
// react-email template, the archive index) renders identically against either
// source.

const SAMPLE_PATH = path.join(process.cwd(), "public", "sample-brief.json");

function blobAvailable(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

async function readSampleBrief(): Promise<BriefSample> {
  const raw = await readFileAsync(SAMPLE_PATH, "utf8");
  return JSON.parse(raw) as BriefSample;
}

/**
 * Newest published brief. Prefers Blob; falls back to the bundled sample
 * when Blob is unavailable or empty. Used by `/brief`, `/methodology`, and
 * the API route at `/api/brief/latest`.
 */
export async function loadLatestBrief(): Promise<BriefSample> {
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
 * Single brief by date. Returns null when neither Blob nor the sample
 * matches — the caller (Next.js dynamic route) should call notFound().
 */
export async function loadBriefByDate(
  date: string,
): Promise<BriefSample | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

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
    /* swallow — return null below */
  }
  return null;
}

/**
 * All published briefs, newest first. Drives the `/briefs` archive index.
 * Each entry is a full BriefSample so the archive can render rich row
 * summaries (issue number, headline, divergence count) without a second
 * round-trip.
 */
export async function listAvailableBriefs(): Promise<BriefSample[]> {
  if (blobAvailable()) {
    try {
      const metas = await listBriefs();
      const briefs = await Promise.all(
        metas.map((m: BriefBlobMeta) =>
          getBriefForDate<BriefSample>(m.date).catch(() => null),
        ),
      );
      const filled = briefs.filter((b): b is BriefSample => b !== null);
      if (filled.length > 0) return filled;
    } catch (err) {
      console.warn(
        "[brief] listAvailableBriefs: Blob path failed",
        err instanceof Error ? err.message : err,
      );
    }
  }
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
