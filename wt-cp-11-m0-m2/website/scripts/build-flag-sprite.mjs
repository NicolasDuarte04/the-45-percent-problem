#!/usr/bin/env node
/**
 * Build a single combined SVG sprite from the 48 per-team flag SVGs in
 * public/assets/flags/. The sprite is one HTTP request shared by every
 * <Flag> instance across every page, replacing ~48 individual flag-SVG
 * requests on the team-picker grid alone.
 *
 * Output: public/assets/flags.svg.
 *
 * Strategy: each input flag (FIFA-coded filename like arg.svg) has a
 * uniform viewBox of "0 0 640 480". We strip the outer <svg> element
 * and wrap the inner content in <symbol id="ARG" viewBox="0 0 640 480">
 * so the consumer can do <svg><use href="/assets/flags.svg#ARG"/></svg>
 * and inherit the source artwork at any size with the correct aspect.
 *
 * Verified before relying on the no-collision property:
 *   - All 48 source SVGs use viewBox="0 0 640 480" (uniform)
 *   - Inner <path id=...> attributes are already prefixed per-flag
 *     (e.g. "ar-c", "ar-a" for Argentina); no cross-flag collisions
 *
 * Run: pnpm exec node scripts/build-flag-sprite.mjs
 * Idempotent: safe to re-run any time the source SVGs change.
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SRC_DIR = join(ROOT, "public", "assets", "flags");
const OUT_FILE = join(ROOT, "public", "assets", "flags.svg");

const EXPECTED_VIEWBOX = "0 0 640 480";

async function main() {
  const entries = await readdir(SRC_DIR);
  const svgs = entries
    .filter((f) => f.endsWith(".svg"))
    .filter((f) => f !== "flags.svg")
    .sort();

  if (svgs.length === 0) {
    throw new Error(`No source SVGs found in ${SRC_DIR}`);
  }

  const symbols = [];
  for (const filename of svgs) {
    const code = filename.replace(/\.svg$/, "").toUpperCase();
    const raw = await readFile(join(SRC_DIR, filename), "utf8");

    // Capture the outer <svg ...> opening tag and the inner content.
    const match = raw.match(/<svg\b([^>]*)>([\s\S]*?)<\/svg>\s*$/);
    if (!match) {
      throw new Error(`Could not parse SVG: ${filename}`);
    }
    const attrs = match[1];
    const inner = match[2].trim();

    const viewBoxMatch = attrs.match(/viewBox="([^"]+)"/);
    if (!viewBoxMatch || viewBoxMatch[1] !== EXPECTED_VIEWBOX) {
      throw new Error(
        `Flag ${filename} has unexpected viewBox: ${viewBoxMatch?.[1]} ` +
          `(expected "${EXPECTED_VIEWBOX}")`,
      );
    }

    symbols.push(
      `  <symbol id="${code}" viewBox="${EXPECTED_VIEWBOX}">${inner}</symbol>`,
    );
  }

  const sprite =
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="display:none" aria-hidden="true">\n` +
    symbols.join("\n") +
    `\n</svg>\n`;

  await writeFile(OUT_FILE, sprite, "utf8");
  console.log(
    `[build-flag-sprite] wrote ${svgs.length} symbols → ${OUT_FILE} (${Buffer.byteLength(sprite, "utf8")} bytes)`,
  );
}

main().catch((err) => {
  console.error("[build-flag-sprite] failed:", err);
  process.exit(1);
});
