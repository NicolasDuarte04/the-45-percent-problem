/**
 * Forbidden-vocab boundary check · Phase E §9 (E.3).
 *
 * Phase D §6.5 already asserts the post-submit rarity vocabulary
 * (Common, Plausible, Uncommon, Rare, Vanishingly rare) does NOT
 * leak into the LiveAgreementGauge. Phase E adds the symmetric
 * assertion: the live-gauge viral hooks (REALISTIC, BOLD CALL,
 * LONG SHOT) must NOT appear in any RealityScorePanel-side surface.
 *
 * The check is a source grep across:
 *   - RealityScorePanel.tsx
 *   - reality/RealityScoreReveal.tsx
 *   - reality/OneInNCountUp.tsx
 *   - getRarityBand.ts and getOneInN.ts (data feeders the panel uses)
 *
 * Each file's full contents are scanned; matches outside JSX text
 * (e.g. inside a comment that *names* the forbidden word) would also
 * fail, which is the conservative behavior we want.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const REPO_ROOT = join(__dirname, "..", "..");

const POST_SUBMIT_FILES = [
  "src/components/simulator/RealityScorePanel.tsx",
  "src/components/simulator/reality/RealityScoreReveal.tsx",
  "src/components/simulator/reality/OneInNCountUp.tsx",
  "src/lib/sim/getRarityBand.ts",
  "src/lib/sim/getOneInN.ts",
];

const VIRAL_HOOKS = ["REALISTIC", "BOLD CALL", "LONG SHOT"] as const;

describe("Phase E §9 (E.3): viral hooks must not appear in post-submit surfaces", () => {
  for (const rel of POST_SUBMIT_FILES) {
    it(`${rel} contains no live-gauge viral hooks`, () => {
      const text = readFileSync(join(REPO_ROOT, rel), "utf-8");
      const offenders: string[] = [];
      for (const hook of VIRAL_HOOKS) {
        // Case-SENSITIVE word-boundary match. The live-gauge surface
        // emits these tokens in ALL CAPS as their viral form ("BOLD
        // CALL", not "bold call"). The post-submit RealityScorePanel
        // surface legitimately uses some of these as lowercase
        // idiomatic prose (e.g. "A bold call." in getRarityBand's
        // Uncommon caption): that's the rarity-band voice, not the
        // viral-hook leak this guard is for.
        const re = new RegExp(`\\b${hook.replace(" ", "\\s+")}\\b`);
        if (re.test(text)) offenders.push(hook);
      }
      expect(offenders).toEqual([]);
    });
  }
});
