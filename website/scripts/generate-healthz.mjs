/**
 * generate-healthz.mjs
 *
 * Reads public/data/latest/snapshot_meta.json and writes public/healthz —
 * a plain-text file consumed by external uptime monitors (Cronitor, Better
 * Stack, etc.) to verify that the deployed site reflects a fresh snapshot.
 *
 * §9.5: "A /healthz static text file regenerated at each build, consumed by
 * an external cron that alerts if the page's embedded snapshot_id is more
 * than 30 hours old."
 *
 * Usage: node scripts/generate-healthz.mjs
 * Invoked automatically in CI before `next build`.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const metaPath = path.join(ROOT, "public", "data", "latest", "snapshot_meta.json");
const outPath = path.join(ROOT, "public", "healthz");

if (!fs.existsSync(metaPath)) {
  console.error(`[healthz] ERROR: snapshot_meta.json not found at ${metaPath}`);
  process.exit(1);
}

const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));

if (!meta.snapshot_id || !meta.generated_at_utc) {
  console.error("[healthz] ERROR: snapshot_meta.json is missing required fields.");
  process.exit(1);
}

const content = [
  `snapshot_id: ${meta.snapshot_id}`,
  `generated_at_utc: ${meta.generated_at_utc}`,
  `schema_version: ${meta.schema_version ?? "unknown"}`,
  `tournament_phase: ${meta.tournament_phase ?? "unknown"}`,
  `built_at_utc: ${new Date().toISOString()}`,
  "",
].join("\n");

fs.writeFileSync(outPath, content, "utf-8");
console.log(`[healthz] Written → public/healthz (snapshot: ${meta.snapshot_id})`);
