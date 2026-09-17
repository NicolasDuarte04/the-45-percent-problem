// One-shot script for Checkpoint 17 (B2): rasterize the hero trophy
// SVG (Monte Carlo point cloud, ~410 KB) into WebP and PNG at 2x of
// the display size so the home page hero stops shipping the heavy
// vector to every visitor.
//
// Run once with `node scripts/convert-trophy.mjs`. The script is kept
// for reproducibility; sharp is not pinned in package.json (install
// transient via `pnpm add --save-dev sharp` if regeneration is
// needed).

import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

const SRC = path.join(ROOT, "public", "assets", "trophy_point_cloud.svg");
const OUT_WEBP = path.join(ROOT, "public", "assets", "trophy_point_cloud.webp");
const OUT_PNG = path.join(ROOT, "public", "assets", "trophy_point_cloud.png");

// HeroGraphic renders at 260x384. WebP at 2x retina is 520x768. The
// SVG's intrinsic viewBox is 380x560; sharp's density flag controls
// the rasterization DPI, which combined with .resize(...) gives clean
// retina output.
const WIDTH = 520;
const HEIGHT = 768;

const base = sharp(SRC, { density: 600 }).resize(WIDTH, HEIGHT, {
  fit: "contain",
  background: { r: 247, g: 244, b: 236, alpha: 1 }, // var(--bg-root)
});

await base
  .clone()
  .webp({ quality: 82, effort: 6 })
  .toFile(OUT_WEBP);

await base
  .clone()
  .png({ compressionLevel: 9, palette: true })
  .toFile(OUT_PNG);

const webpStat = await import("node:fs/promises").then((m) => m.stat(OUT_WEBP));
const pngStat = await import("node:fs/promises").then((m) => m.stat(OUT_PNG));
process.stdout.write(
  `wrote ${OUT_WEBP} (${webpStat.size} bytes)\nwrote ${OUT_PNG} (${pngStat.size} bytes)\n`,
);
