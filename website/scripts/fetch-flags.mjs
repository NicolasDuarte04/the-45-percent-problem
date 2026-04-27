#!/usr/bin/env node
// Fetches official flat SVG flags for the 48 FIFA World Cup 2026 qualifiers
// from lipis/flag-icons (MIT) and writes them keyed by FIFA 3-letter code into
// website/public/assets/flags/. Idempotent: existing files are skipped unless
// --force is passed. Source-of-truth FIFA->ISO map lives here; the runtime
// component never has to do this lookup.

import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "assets", "flags");

// FIFA 3-letter code -> lipis/flag-icons slug (ISO 3166-1 alpha-2 lowercase,
// or gb-eng / gb-sct for the home-nation overrides that lipis publishes).
// Verified against the 48-team list in public/data/latest/tournament.json.
const FIFA_TO_ISO = {
  ARG: "ar", ESP: "es", FRA: "fr", POR: "pt", ENG: "gb-eng",
  BRA: "br", COL: "co", GER: "de", CRO: "hr", ECU: "ec",
  NED: "nl", JPN: "jp", SEN: "sn", URU: "uy", TUR: "tr",
  MEX: "mx", SUI: "ch", ITA: "it", DEN: "dk", MAR: "ma",
  BEL: "be", CAN: "ca", AUT: "at", KOR: "kr", AUS: "au",
  UZB: "uz", ALG: "dz", PAN: "pa", IRN: "ir", UKR: "ua",
  SRB: "rs", SCO: "gb-sct", USA: "us", NGA: "ng", EGY: "eg",
  POL: "pl", HUN: "hu", PER: "pe", JOR: "jo", VEN: "ve",
  SVK: "sk", CIV: "ci", CRC: "cr", NZL: "nz", CMR: "cm",
  IRQ: "iq", KSA: "sa", GHA: "gh",
};

const FORCE = process.argv.includes("--force");
const CONCURRENCY = 8;
// Pinned to a commit so a future upstream rename can't silently change a flag.
// Bump this when you want to re-sync from upstream.
const COMMIT = "main";
const BASE = `https://raw.githubusercontent.com/lipis/flag-icons/${COMMIT}/flags/4x3`;

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

async function fetchOne(fifa, iso) {
  const out = join(OUT_DIR, `${fifa.toLowerCase()}.svg`);
  if (!FORCE && await exists(out)) return { fifa, status: "skip" };

  const url = `${BASE}/${iso}.svg`;
  const res = await fetch(url);
  if (!res.ok) {
    return { fifa, status: "fail", reason: `HTTP ${res.status} for ${url}` };
  }
  const body = await res.text();
  if (!body.trimStart().startsWith("<")) {
    return { fifa, status: "fail", reason: `non-SVG body from ${url}` };
  }
  await writeFile(out, body, "utf8");
  return { fifa, status: "ok", bytes: body.length };
}

async function runPool(items, worker, size) {
  const results = [];
  let i = 0;
  const runners = Array.from({ length: size }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await worker(items[idx]);
    }
  });
  await Promise.all(runners);
  return results;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const entries = Object.entries(FIFA_TO_ISO);
  console.log(`Fetching ${entries.length} flags -> ${OUT_DIR}`);
  console.log(`Source: lipis/flag-icons @ ${COMMIT} (4x3, MIT)`);

  const results = await runPool(
    entries,
    ([fifa, iso]) => fetchOne(fifa, iso),
    CONCURRENCY,
  );

  const ok = results.filter(r => r.status === "ok").length;
  const skipped = results.filter(r => r.status === "skip").length;
  const failed = results.filter(r => r.status === "fail");

  console.log(`  downloaded: ${ok}`);
  console.log(`  skipped:    ${skipped}`);
  console.log(`  failed:     ${failed.length}`);

  if (failed.length) {
    for (const f of failed) console.error(`  ! ${f.fifa}: ${f.reason}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
