/**
 * Reverse rarity lookup (Checkpoint 11, P2.2).
 *
 * Given a target rarity band, generate a stratified sample of 5 Final Four
 * scenarios at that band. The /scenario/explore page consumes this to let
 * cold visitors browse the rarity space without committing four picks of
 * their own.
 *
 * Algorithm: full enumeration of 48 choose 4 (194,580 combinations). Each
 * combination is scored with the same independence approximation and
 * FNV-1a jitter that scoreFinalFour uses in computeRealityScore.ts, then
 * partitioned by rarity band. Within each band the matches are sorted by
 * count ascending and the page samples 5 evenly-spaced positions so the
 * user sees a spread across the band (not just the highest 5 or lowest 5).
 *
 * Why full enumeration over random sampling: at 195K iterations, scoring
 * runs in roughly 50 ms on a development machine (single FNV-1a hash per
 * combination, no I/O). The output is deterministic per snapshot and
 * exhaustive within each band, which avoids the "did random sampling
 * miss the interesting combinations" failure mode that would haunt a
 * Monte Carlo approach.
 *
 * Caching: the enumeration runs once per process and the per-band picks
 * are memoised in a module-level variable. The snapshotProbs table is a
 * compile-time constant; if the table changes the file rebuilds and the
 * cache is fresh by construction.
 */

import { TEAM_PROBS } from "./snapshotProbs";
import { fnv1a32 } from "./computeRealityScoreMock";
import { getRarityBand } from "./getRarityBand";
import { getOneInN } from "./getOneInN";
import { renderStoryLine } from "./renderStoryLine";
import type { RarityBand, TeamCode } from "./types";

const MC_RUNS = 10_000;

export interface ExploreScenario {
  /** Four FIFA codes, sorted alphabetically. */
  semifinalists: TeamCode[];
  /** Reality Score count (clamped to >= 1). */
  count: number;
  /** Reality Score denominator (10,000). */
  total: number;
  /** Pre-rendered "1 in N" string for display. */
  oneInN: string;
  /** Descriptive sentence: "X, Y, Z, and W in the semifinals." */
  storyLine: string;
}

export const ALL_BANDS: readonly RarityBand[] = [
  "Common",
  "Plausible",
  "Uncommon",
  "Rare",
  "Vanishingly rare",
] as const;

interface Match {
  codes: TeamCode[];
  count: number;
}

interface ExplorerCache {
  scenarios: Record<RarityBand, ExploreScenario[]>;
  counts: Record<RarityBand, number>;
  totalEnumerated: number;
}

let _cache: ExplorerCache | null = null;

function enumerateAndPartition(): ExplorerCache {
  const teams = Object.keys(TEAM_PROBS).sort();
  const N = teams.length;

  const byBand: Record<RarityBand, Match[]> = {
    Common: [],
    Plausible: [],
    Uncommon: [],
    Rare: [],
    "Vanishingly rare": [],
  };

  let totalEnumerated = 0;

  for (let a = 0; a < N - 3; a++) {
    const ta = teams[a];
    const pa = TEAM_PROBS[ta].pS;
    for (let b = a + 1; b < N - 2; b++) {
      const tb = teams[b];
      const pb = TEAM_PROBS[tb].pS;
      for (let c = b + 1; c < N - 1; c++) {
        const tc = teams[c];
        const pc = TEAM_PROBS[tc].pS;
        for (let d = c + 1; d < N; d++) {
          const td = teams[d];
          const pd = TEAM_PROBS[td].pS;
          const jointP = pa * pb * pc * pd;
          // Canonical string matches canonicalizeFinalFour's output. The
          // nested loop guarantees ta < tb < tc < td lexicographically,
          // so the manual JSON is identical to JSON.stringify({m:"f4", s:[..]})
          // with sort(). Inlining avoids 195K JSON.stringify calls.
          const canonical = `{"m":"f4","s":["${ta}","${tb}","${tc}","${td}"]}`;
          const jitter = ((fnv1a32(canonical) % 200) - 100) / MC_RUNS;
          const count = Math.max(1, Math.round(MC_RUNS * (jointP + jitter)));
          const { band } = getRarityBand(count, MC_RUNS);
          byBand[band].push({ codes: [ta, tb, tc, td], count });
          totalEnumerated += 1;
        }
      }
    }
  }

  const scenarios: Record<RarityBand, ExploreScenario[]> = {
    Common: [],
    Plausible: [],
    Uncommon: [],
    Rare: [],
    "Vanishingly rare": [],
  };
  const counts: Record<RarityBand, number> = {
    Common: 0,
    Plausible: 0,
    Uncommon: 0,
    Rare: 0,
    "Vanishingly rare": 0,
  };

  for (const band of ALL_BANDS) {
    const matches = byBand[band];
    counts[band] = matches.length;
    if (matches.length === 0) continue;
    matches.sort((x, y) => x.count - y.count);
    scenarios[band] = stratifiedPick(matches, 5).map(toScenario);
  }

  return { scenarios, counts, totalEnumerated };
}

function stratifiedPick(matches: Match[], k: number): Match[] {
  const n = matches.length;
  if (n <= k) return matches;
  const out: Match[] = [];
  for (let i = 0; i < k; i++) {
    const idx = Math.round((i * (n - 1)) / (k - 1));
    out.push(matches[idx]);
  }
  return out;
}

function toScenario(m: Match): ExploreScenario {
  const scenario = { semifinalists: m.codes };
  return {
    semifinalists: m.codes,
    count: m.count,
    total: MC_RUNS,
    oneInN: getOneInN(m.count, MC_RUNS),
    storyLine: renderStoryLine("final_four", scenario),
  };
}

/**
 * Return the stratified sample of 5 scenarios for the requested band.
 * Empty band (no combinations matched) returns an empty array; the page
 * renders an empty-state, not an error.
 */
export function generateExploreScenarios(band: RarityBand): ExploreScenario[] {
  if (!_cache) _cache = enumerateAndPartition();
  return _cache.scenarios[band] ?? [];
}

/** Counts of matching combinations per band. Used by the report. */
export function getExploreBandCounts(): {
  counts: Record<RarityBand, number>;
  totalEnumerated: number;
} {
  if (!_cache) _cache = enumerateAndPartition();
  return { counts: _cache.counts, totalEnumerated: _cache.totalEnumerated };
}
