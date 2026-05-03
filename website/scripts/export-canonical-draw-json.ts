/**
 * scripts/export-canonical-draw-json.ts
 *
 * Exports the canonical TS draw (src/lib/data/wc2026-official-draw.ts) to a
 * language-neutral JSON sidecar consumed by the Python ingestion pipeline.
 *
 * The sidecar lives in the SISTER project so the Python `ingestion/` scripts
 * can read it without crossing into the Next.js build:
 *
 *   ../data/raw/wc2026_official_draw.json
 *
 * Run:
 *   pnpm tsx scripts/export-canonical-draw-json.ts
 *
 * Run this whenever you edit the TS draw module. Idempotent.
 */

import fs from "fs";
import path from "path";

import {
  TEAMS,
  VENUES,
  GROUP_MATCHES,
  KNOCKOUT_MATCHES,
  COUNTS,
} from "../src/lib/data/wc2026-official-draw";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const WEBSITE_ROOT = path.resolve(HERE, "..");

/**
 * Locate the project root by walking up from website/ until we find a sibling
 * `ingestion/` directory (the Python pipeline) and a `data/` directory. This
 * works both when the website lives inside the project (the user's macOS
 * layout) and when it's mounted alongside it (the Cowork bash sandbox layout).
 */
function findProjectRoot(start: string): string {
  let dir = start;
  while (dir !== path.dirname(dir)) {
    const candidate = path.resolve(dir, "..");
    const hasIngestion = fs.existsSync(path.join(candidate, "ingestion"));
    const hasData = fs.existsSync(path.join(candidate, "data"));
    if (hasIngestion && hasData) return candidate;
    // Also check siblings (Cowork flat mount layout)
    const parent = path.dirname(dir);
    const siblings = fs.readdirSync(parent, { withFileTypes: true });
    for (const s of siblings) {
      if (!s.isDirectory()) continue;
      const sib = path.join(parent, s.name);
      if (
        fs.existsSync(path.join(sib, "ingestion")) &&
        fs.existsSync(path.join(sib, "data"))
      ) {
        return sib;
      }
    }
    dir = candidate;
  }
  throw new Error(
    `Could not locate project root (looking for sibling with ingestion/ + data/) starting from ${start}`,
  );
}

const PROJECT_ROOT = process.env.PROJECT_ROOT ?? findProjectRoot(WEBSITE_ROOT);
const OUT_PATH = path.join(
  PROJECT_ROOT,
  "data",
  "raw",
  "wc2026_official_draw.json",
);

const payload = {
  schema_version: "1.0",
  source: "Official FIFA Final Draw, 5 Dec 2025; matchday-1 kickoffs verified against fifa.com 2 May 2026",
  generated_by: "website/scripts/export-canonical-draw-json.ts",
  generated_at_utc: new Date().toISOString(),
  counts: COUNTS,
  venues: VENUES,
  teams: TEAMS,
  group_matches: GROUP_MATCHES,
  knockout_matches: KNOCKOUT_MATCHES,
};

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2) + "\n", "utf-8");

console.log(`[export-canonical-draw-json] wrote ${OUT_PATH}`);
console.log(
  `  teams=${COUNTS.teams} group_matches=${COUNTS.group_matches} ` +
    `knockout_matches=${COUNTS.knockout_matches} total=${COUNTS.total_matches}`,
);
