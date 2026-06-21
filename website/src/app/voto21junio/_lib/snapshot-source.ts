import "server-only";

/**
 * El Voto del 21 de Junio — server-side snapshot reader (Session 08).
 *
 * ── Mechanism: build-time fs read (NOT runtime fetch) ────────────────────────
 * This reads the three committed 21J snapshots from disk and hands the parsed
 * JSON to the pure normalizers in `voto-data.ts`. It runs in a React Server
 * Component with no dynamic APIs, so Next statically renders the voto routes and
 * the read happens once at `next build` time — the values are baked into the
 * output. This mirrors the WC app's own convention (see
 * `src/lib/data/loadSnapshot.ts`: "All reads happen at build time, no runtime
 * fetch"). A fresh deploy re-reads whatever `latest.json` is on main.
 *
 * Why build-time and not request-time: the snapshots live OUTSIDE `website/`
 * (one directory up, under `the-21j-problem/data/`). On Vercel the project root
 * is `website/`, so `../the-21j-problem` is present during the build (the whole
 * repo is checked out) but is NOT bundled into the serverless function. A
 * request-time `fs` read would therefore fail in production. Build-time is the
 * only correct seam without a copy-into-website step — and a copy step would
 * mean touching `package.json` (a shared file), which this session must not do.
 *
 * ── Path resolution: robust, anchored, not cwd-fragile ───────────────────────
 * We try a short list of candidate repo-root anchors and pick the first that
 * actually contains the snapshot tree. If none resolve (or any file is missing
 * / unparseable), every surface falls back to LABELLED demo data — a broken
 * read can never silently render a stale or fake "live" number.
 */

import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import {
  buildVotoData,
  demoMapa,
  demoModel,
  demoPulso,
  normalizeMapa,
  normalizeModel,
  normalizeMarket,
  normalizePulso,
  normalizeResult,
  normalizeTimeline,
  unavailableMarket,
  type MapaData,
  type MarketData,
  type ModelData,
  type PulsoData,
  type ResultData,
  type TimelinePoint,
  type VotoData,
} from "./voto-data";

/** Snapshot paths relative to the 21J project root. */
const REL = {
  model: "the-21j-problem/data/snapshots/21j/latest.json",
  pulso: "the-21j-problem/data/snapshots/pulso/latest.json",
  mapa: "the-21j-problem/data/processed/mapa_municipios.json",
  // Session 18 (post-election transition).
  market: "the-21j-problem/data/snapshots/21j/model_vs_market.json",
  // Stage B / PR-B only: absent in PR-A, so the result reads as pending.
  result: "the-21j-problem/data/snapshots/21j/result_official.json",
} as const;

/** Directory of archived daily model snapshots (for the campaign timeline). */
const SNAPSHOT_21J_DIR = "the-21j-problem/data/snapshots/21j";

/**
 * Candidate repo roots, most-specific first. `process.cwd()` is `website/` under
 * `next build`; the repo root is one up. We also try cwd itself (in case a
 * future build runs from the repo root) and two/three levels up for safety.
 */
function repoRootCandidates(): string[] {
  // turbopackIgnore: this is a build-time read of files OUTSIDE the app root
  // (../the-21j-problem). The pages are statically prerendered, so the bundle
  // never needs these at runtime; the ignore comment stops Next's file tracer
  // from over-tracing the whole project. See node_modules/next docs on NFT.
  const cwd = /* turbopackIgnore: true */ process.cwd();
  return [
    path.resolve(cwd, ".."), // website/ -> repo root (the normal case)
    cwd, // build already at repo root
    path.resolve(cwd, "..", ".."),
    path.resolve(cwd, "..", "..", ".."),
  ];
}

/** Resolve the repo root that actually holds the model snapshot, or null. */
function resolveRepoRoot(): string | null {
  for (const root of repoRootCandidates()) {
    try {
      if (fs.existsSync(path.join(/* turbopackIgnore: true */ root, REL.model))) return root;
    } catch {
      /* keep trying */
    }
  }
  return null;
}

function readJson(absPath: string): Record<string, unknown> {
  const raw = fs.readFileSync(/* turbopackIgnore: true */ absPath, "utf-8");
  return JSON.parse(raw) as Record<string, unknown>;
}

/**
 * Read all three snapshots and assemble the bundle. Each source is read and
 * normalised independently so one bad file degrades only its own surface to
 * labelled demo, not the whole page.
 *
 * Wrapped in React `cache()` so the whole tree (layout + every server component)
 * shares a single read per render pass.
 */
export const getVotoData = cache((): VotoData => {
  const root = resolveRepoRoot();

  const model = readOne<ModelData>(root, REL.model, normalizeModel, demoModel, "model");
  const pulso = readOne<PulsoData>(root, REL.pulso, normalizePulso, demoPulso, "pulso");
  const mapa = readOne<MapaData>(root, REL.mapa, normalizeMapa, demoMapa, "mapa");

  // ── Session 18 extras ───────────────────────────────────────────────────────
  // Sourced market figure: unavailable (never guessed) if the file is missing.
  const market = readOne<MarketData>(
    root,
    REL.market,
    normalizeMarket,
    unavailableMarket,
    "market",
  );
  // Campaign trajectory from every archived daily snapshot.
  const timeline = readTimeline(root);
  // Certified result: null until PR-B writes a real, certified result file.
  const result = readResult(root);

  // Closed mode: the preview env flag OR the cron-stamped event_closed notice.
  const envClosed = process.env.VOTO_EVENT_CLOSED === "true";
  const eventClosed = envClosed || model.noticeStatus === "event_closed";

  return buildVotoData(model, pulso, mapa, { market, timeline, result, eventClosed });
});

/**
 * Read every archived daily model snapshot (snapshot_YYYYMMDD.json) and build
 * the campaign timeline. latest.json is excluded (it duplicates the newest
 * dated file). A missing directory yields an empty timeline, never a throw.
 */
function readTimeline(root: string | null): TimelinePoint[] {
  if (!root) return [];
  try {
    const dir = path.join(/* turbopackIgnore: true */ root, SNAPSHOT_21J_DIR);
    const files = fs
      .readdirSync(/* turbopackIgnore: true */ dir)
      .filter((f) => /^snapshot_\d{8}\.json$/.test(f));
    const docs = files
      .map((f) => {
        try {
          return readJson(path.join(dir, f));
        } catch {
          return null;
        }
      })
      .filter((d): d is Record<string, unknown> => d !== null);
    return normalizeTimeline(docs);
  } catch (err) {
    warn(`timeline: snapshots unreadable (${String(err)}); empty timeline`);
    return [];
  }
}

/**
 * Read the certified official result if present (Stage B / PR-B). Returns null
 * when the file is absent (PR-A) or carries no real numbers, so the surface
 * shows the result as pending rather than inventing one.
 */
function readResult(root: string | null): ResultData | null {
  if (!root) return null;
  const abs = path.join(/* turbopackIgnore: true */ root, REL.result);
  try {
    if (!fs.existsSync(abs)) return null;
    const result = normalizeResult(readJson(abs));
    return result.available ? result : null;
  } catch (err) {
    warn(`result: file unreadable (${String(err)}); treating as pending`);
    return null;
  }
}

function readOne<T>(
  root: string | null,
  rel: string,
  normalize: (raw: Record<string, unknown>) => T,
  fallback: () => T,
  label: string,
): T {
  if (!root) {
    warn(`${label}: no repo root resolved; using labelled demo data`);
    return fallback();
  }
  try {
    return normalize(readJson(path.join(root, rel)));
  } catch (err) {
    warn(`${label}: snapshot unreadable (${String(err)}); using labelled demo data`);
    return fallback();
  }
}

function warn(msg: string): void {
  // Surfaces in the build log; intentionally not thrown — a missing snapshot is
  // a degraded-but-honest state, not a build failure.
  // eslint-disable-next-line no-console
  console.warn(`[voto snapshot-source] ${msg}`);
}
