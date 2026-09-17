#!/usr/bin/env node
// Fetches official flat SVG flags for the 48 FIFA World Cup 2026 qualifiers
// from lipis/flag-icons (MIT) and writes them keyed by FIFA 3-letter code into
// website/public/assets/flags/. Idempotent: existing files are skipped unless
// --force is passed. Source-of-truth FIFA->ISO map lives here; the runtime
// component never has to do this lookup.
//
// Asserts the FIFA-code keys match src/lib/data/wc2026-official-draw.ts before
// fetching, so a draw change can't silently leave the dictionary out of sync.

import { mkdir, writeFile, access, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "assets", "flags");
const CANONICAL_DRAW = join(ROOT, "src", "lib", "data", "wc2026-official-draw.ts");

// FIFA 3-letter code -> lipis/flag-icons slug (ISO 3166-1 alpha-2 lowercase,
// or gb-eng / gb-sct for the home-nation overrides that lipis publishes).
// Verified against the 48-team list in src/lib/data/wc2026-official-draw.ts.
const FIFA_TO_ISO = {
  // Group A
  MEX: "mx", RSA: "za", KOR: "kr", CZE: "cz",
  // Group B
  CAN: "ca", BIH: "ba", QAT: "qa", SUI: "ch",
  // Group C
  BRA: "br", MAR: "ma", HAI: "ht", SCO: "gb-sct",
  // Group D
  USA: "us", PAR: "py", AUS: "au", TUR: "tr",
  // Group E
  GER: "de", CUW: "cw", CIV: "ci", ECU: "ec",
  // Group F
  NED: "nl", JPN: "jp", SWE: "se", TUN: "tn",
  // Group G
  BEL: "be", EGY: "eg", IRN: "ir", NZL: "nz",
  // Group H
  ESP: "es", CPV: "cv", KSA: "sa", URU: "uy",
  // Group I
  FRA: "fr", SEN: "sn", IRQ: "iq", NOR: "no",
  // Group J
  ARG: "ar", ALG: "dz", AUT: "at", JOR: "jo",
  // Group K
  POR: "pt", UZB: "uz", COL: "co", COD: "cd",
  // Group L
  ENG: "gb-eng", CRO: "hr", GHA: "gh", PAN: "pa",
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

// Parse fifa_code values out of the canonical draw module without compiling
// TypeScript. The TEAMS array entries follow the literal pattern
//   { fifa_code: "ABC", display_name: "...", ...}
// and that pattern is the only place fifa_code appears as an object key, so a
// simple regex is enough.
async function readCanonicalCodes() {
  const src = await readFile(CANONICAL_DRAW, "utf8");
  const codes = new Set();
  const re = /fifa_code:\s*"([A-Z]{3})"/g;
  let m;
  while ((m = re.exec(src)) !== null) codes.add(m[1]);
  return codes;
}

function diff(setA, setB) {
  return [...setA].filter((x) => !setB.has(x)).sort();
}

async function assertCodesMatchCanonical() {
  const canonical = await readCanonicalCodes();
  const dict = new Set(Object.keys(FIFA_TO_ISO));
  const missing = diff(canonical, dict);   // in canonical, not in dict
  const extra = diff(dict, canonical);     // in dict, not in canonical
  if (missing.length === 0 && extra.length === 0) return;
  console.error("FIFA_TO_ISO is out of sync with src/lib/data/wc2026-official-draw.ts:");
  if (missing.length) console.error(`  missing from FIFA_TO_ISO: ${missing.join(", ")}`);
  if (extra.length) console.error(`  extra in FIFA_TO_ISO:       ${extra.join(", ")}`);
  console.error("Update FIFA_TO_ISO and src/lib/flags/countries.ts in lockstep with the draw module.");
  process.exit(1);
}

async function main() {
  await assertCodesMatchCanonical();
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
