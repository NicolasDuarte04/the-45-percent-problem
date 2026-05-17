/**
 * Seed Vercel Blob with 3 test briefs so /briefs index and /briefs/[date]
 * have something to render in dev / preview before Phase 4's cron is live.
 *
 * Inputs:
 * - public/sample-brief.json; the canonical "today" brief
 *
 * Outputs (all under the briefs/ prefix in Vercel Blob):
 * - briefs/<today>.json; full divergences, full movers, one suppression
 * - briefs/<yesterday>.json; different lead, no suppressions
 * - briefs/<day-before>.json; quiet day, empty top_divergences
 *
 * Usage (from `website/` with BLOB_READ_WRITE_TOKEN populated in .env.local):
 *   pnpm tsx scripts/seed-briefs-blob.ts
 *
 * Add a `--clean` flag to wipe any existing briefs first (no-op when the
 * Blob bucket is already empty):
 *   pnpm tsx scripts/seed-briefs-blob.ts --clean
 *
 * Phase 4's Python pipeline replaces this seed entirely. The script lives
 * in scripts/ rather than src/ because (a) it is dev-only and (b) the §6.6
 * forbidden-words check skips scripts/: keeps the seed copy free to use
 * realistic team names without contortion.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  deleteBriefForDate,
  listBriefs,
  putBriefForDate,
} from "../src/lib/blob";
import type { BriefSample } from "../src/lib/brief";

// Tiny .env.local loader; the project doesn't depend on `dotenv`, and
// adding it just for one dev script would be unscoped infra creep. This
// parser handles KEY=value, KEY="value", and KEY='value' lines plus
// blanks and `#` comments. Existing process.env entries take priority.
function loadEnvLocal(envPath: string): void {
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal(path.join(process.cwd(), ".env.local"));

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error(
    "[seed-briefs] BLOB_READ_WRITE_TOKEN is not set. Populate website/.env.local before running.",
  );
  process.exit(1);
}

const SAMPLE_PATH = path.join(process.cwd(), "public", "sample-brief.json");
const SAMPLE: BriefSample = JSON.parse(readFileSync(SAMPLE_PATH, "utf8"));

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function nextBriefIso(date: string): string {
  return `${shiftDate(date, 1)}T12:00:00Z`;
}

// ─── Brief generators ──────────────────────────────────────────────────────

function todayBrief(): BriefSample {
  // The bundled sample is "today" already.
  return SAMPLE;
}

function yesterdayBrief(): BriefSample {
  const date = shiftDate(SAMPLE.brief_date, -1);
  return {
    ...SAMPLE,
    brief_date: date,
    issue_number: SAMPLE.issue_number - 1,
    code_sha: "5d8c09a",
    data_snapshot_sha: "44fa1c1",
    next_brief_utc: nextBriefIso(date),
    latest_archive_url: `/briefs/${date}`,
    lead_in: {
      tournament_sentence:
        "Argentina's title chances climbed 150 bps overnight after a clean group win.",
      match_sentence:
        "France vs Denmark is the closest match of the day, with the model and the market within 80 bps.",
      fallback_used: false,
    },
    headline: {
      summary_line:
        "Largest divergence today: ARG vs PER home side, model 56.1%, market 51.2%, edge +490 bps.",
      movers_line: "Two teams shifted >1.5% in title probability overnight.",
    },
    teaser: {
      has_divergence: true,
      match_label: "Argentina vs Peru",
      side: "HOME",
      model_prob: 0.561,
      market_prob: 0.512,
      edge_bps: 490,
      edge_direction: "positive",
    },
    top_divergences: [
      {
        match_id: `${date}_ARG_PER`,
        kickoff_utc: `${date}T19:00:00Z`,
        home: "Argentina",
        away: "Peru",
        market: "1X2",
        side: "home",
        model_prob: 0.561,
        market_prob_devigged: 0.512,
        edge_bps: 490,
        edge_direction: "positive",
        ci_95: { low: 0.53, high: 0.59 },
        volatility_gate: { triggered: false, suppressions: [] },
      },
      {
        match_id: `${date}_FRA_DEN`,
        kickoff_utc: `${date}T16:00:00Z`,
        home: "France",
        away: "Denmark",
        market: "1X2",
        side: "home",
        model_prob: 0.488,
        market_prob_devigged: 0.476,
        edge_bps: 120,
        edge_direction: "positive",
        volatility_gate: { triggered: false, suppressions: [] },
      },
    ],
    tournament_movers: [
      {
        team: "Argentina",
        metric: "title_probability",
        yesterday: 0.106,
        today: 0.121,
        delta: 0.015,
        delta_bps: 150,
        driver: "Group win + favorable round-of-16 draw resolution.",
      },
      {
        team: "Spain",
        metric: "title_probability",
        yesterday: 0.094,
        today: 0.082,
        delta: -0.012,
        delta_bps: -120,
        driver: "Draw against Australia softens forward path strength.",
      },
    ],
    suppressed_today: [],
    methodology_links: {
      ...SAMPLE.methodology_links,
      this_brief_archive: `/briefs/${date}`,
    },
  };
}

function dayBeforeBrief(): BriefSample {
  // Quiet day: no divergences exceeded threshold. Used to test the empty
  // state in the email template and the archive row.
  const date = shiftDate(SAMPLE.brief_date, -2);
  return {
    ...SAMPLE,
    brief_date: date,
    issue_number: SAMPLE.issue_number - 2,
    code_sha: "1f2e7b0",
    data_snapshot_sha: "0fa3d11",
    next_brief_utc: nextBriefIso(date),
    latest_archive_url: `/briefs/${date}`,
    lead_in: {
      tournament_sentence:
        "No team's title chances changed by more than 1% overnight.",
      match_sentence:
        "No matches today have model probabilities outside the market's ±3% mainline range.",
      fallback_used: true,
    },
    headline: {
      summary_line: "No divergences exceeded threshold today.",
      movers_line: "All title-probability deltas were within 100 bps.",
    },
    teaser: { has_divergence: false },
    featured_teams: SAMPLE.featured_teams,
    top_divergences: [],
    tournament_movers: [],
    suppressed_today: [],
    methodology_links: {
      ...SAMPLE.methodology_links,
      this_brief_archive: `/briefs/${date}`,
    },
  };
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const args = new Set(process.argv.slice(2));
  const clean = args.has("--clean");

  if (clean) {
    console.log("[seed-briefs] --clean: deleting existing briefs/*");
    const existing = await listBriefs();
    if (existing.length === 0) {
      console.log("[seed-briefs] (bucket already empty)");
    }
    for (const meta of existing) {
      try {
        await deleteBriefForDate(meta.date);
        console.log(`[seed-briefs] deleted briefs/${meta.date}.json`);
      } catch (err) {
        console.warn(`[seed-briefs] delete failed for ${meta.date}:`, err);
      }
    }
  }

  const briefs: BriefSample[] = [
    dayBeforeBrief(),
    yesterdayBrief(),
    todayBrief(),
  ];

  for (const brief of briefs) {
    try {
      const meta = await putBriefForDate(brief.brief_date, brief);
      console.log(
        `[seed-briefs] uploaded briefs/${brief.brief_date}.json  (${meta.size} bytes, issue ${brief.issue_number})`,
      );
    } catch (err) {
      console.error(
        `[seed-briefs] upload failed for ${brief.brief_date}:`,
        err,
      );
      process.exit(1);
    }
  }

  console.log("[seed-briefs] done. 3 issues seeded.");
}

main().catch((err) => {
  console.error("[seed-briefs] unexpected error:", err);
  process.exit(1);
});
