/**
 * Freshness check for the flag sprite (Checkpoint 16).
 *
 * scripts/build-flag-sprite.mjs combines public/assets/flags/<code>.svg
 * into a single public/assets/flags.svg with 48 <symbol id="<CODE>">
 * entries. The Flag primitive renders <use href="/assets/flags.svg#CODE">.
 *
 * This test guarantees the sprite stays in lockstep with the source
 * flags so a missed re-run does not silently ship a stale sprite.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "..", "..");
const FLAGS_DIR = join(ROOT, "public", "assets", "flags");
const SPRITE = join(ROOT, "public", "assets", "flags.svg");

describe("flag sprite", () => {
  it("contains one <symbol> per source flag SVG, keyed by uppercase FIFA code", () => {
    const sources = readdirSync(FLAGS_DIR)
      .filter((f) => f.endsWith(".svg"))
      .filter((f) => f !== "flags.svg")
      .map((f) => f.replace(/\.svg$/, "").toUpperCase())
      .sort();

    const sprite = readFileSync(SPRITE, "utf8");
    const symbolIds = Array.from(sprite.matchAll(/<symbol\s+id="([^"]+)"/g))
      .map((m) => m[1])
      .sort();

    expect(symbolIds).toEqual(sources);
  });

  it("uses the uniform 640x480 viewBox on every symbol", () => {
    const sprite = readFileSync(SPRITE, "utf8");
    const viewBoxes = Array.from(
      sprite.matchAll(/<symbol\s+id="[^"]+"\s+viewBox="([^"]+)"/g),
    ).map((m) => m[1]);
    expect(viewBoxes.length).toBeGreaterThan(0);
    for (const vb of viewBoxes) {
      expect(vb).toBe("0 0 640 480");
    }
  });
});
