#!/usr/bin/env node
/**
 * Trophy point-cloud generator — single source of truth for both the
 * favicon (black canvas, oxblood outliers) and the editorial hero accent
 * (cream canvas, monochromatic deep technical ink).
 *
 * Geometry, sampler, projection, RNG seed are identical across variants.
 * What differs per variant: viewBox aspect, canvas / ink colours, dot
 * radius, fill opacity, whether outliers are sampled, and the depth
 * sort policy.
 *
 * Source designs:
 *   - ~/Desktop/favicon.html        (black canvas, oxblood outliers)
 *   - ~/Desktop/NEW CUp design.html (cream canvas, single ink)
 *
 * Usage:
 *   node scripts/generate-trophy.mjs <variant> [output-path]
 *   variant ∈ {favicon, hero}
 *
 * Examples:
 *   node scripts/generate-trophy.mjs favicon /tmp/trophy-favicon.svg
 *   npx sharp-cli --input /tmp/trophy-favicon.svg --output src/app/icon.png       resize 512 512
 *   npx sharp-cli --input /tmp/trophy-favicon.svg --output src/app/apple-icon.png resize 180 180
 *
 *   node scripts/generate-trophy.mjs hero public/assets/trophy_point_cloud.svg
 */

import { writeFileSync } from "node:fs";

// ── Variant registry ─────────────────────────────────────────────────────
// All OKLCH design tokens are materialised to sRGB hex so libvips/sharp
// (used for the favicon raster path) renders identically to the browser.
const VARIANTS = {
  favicon: {
    vbW: 1000,
    vbH: 1000,
    pad: 30,
    canvas: "#0F0F10", // oklch(10% 0 0)         — near-black
    ink: "#F4EFE5", //   oklch(95% 0.01 80)      — warm bone white
    outlier: "#6E3F35", // oklch(35% 0.08 20)    — deep brick / oxblood
    pOutlier: 0.06,
    dotR: 1.4,
    dotROut: 1.7,
    fillOpacity: 1,
    /* Depth sort places outliers last so the rare oxblood reads through
       the bone field. */
    sort: "outliers-on-top",
    label: "The 45% Problem trophy favicon",
  },
  hero: {
    vbW: 380,
    vbH: 560,
    pad: 18,
    canvas: "#F7F4EC", // editorial cream
    ink: "#161B20", //   oklch(22% 0.012 250)    — deep technical ink (cool slate)
    outlier: null, //    monochromatic — no outliers
    pOutlier: 0,
    dotR: 0.78,
    dotROut: 0.78,
    fillOpacity: 0.78,
    /* Pure depth sort — closer points sit on top, reinforcing the 3D core
       density that the cream-canvas alpha-blend already encourages. */
    sort: "depth",
    label:
      "Quantitative World Cup trophy — 10,000 Monte Carlo samples from the M★ posterior",
  },
};

const variantArg = process.argv[2];
const outArg = process.argv[3];
if (!variantArg || !VARIANTS[variantArg]) {
  console.error(
    `usage: generate-trophy.mjs <variant> [output]   (variant ∈ ${Object.keys(VARIANTS).join(", ")})`,
  );
  process.exit(1);
}
const spec = VARIANTS[variantArg];
const out = outArg ?? `${variantArg}-trophy.svg`;

// ── Deterministic RNG ────────────────────────────────────────────────────
let _s = 0x2a2a2a2a;
function rand() {
  let x = _s | 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  _s = x;
  return (x >>> 0) / 4294967296;
}
function randn() {
  // Box-Muller
  const u1 = Math.max(rand(), 1e-9);
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ── Geometry ─────────────────────────────────────────────────────────────
const GLOBE = { cx: 0, cy: 0.62, cz: 0, r: 0.3 };
const RIBBON = { yStart: -0.78, yEnd: 0.32, turns: 1.05 };

function ribbonRadius(u) {
  const belly = 0.32 * Math.exp(-(((u - 0.3) / 0.22) ** 2));
  const foot = 0.1 * Math.exp(-(((u - 0.0) / 0.1) ** 2));
  const neck = -0.05 * Math.exp(-(((u - 0.78) / 0.1) ** 2));
  const base = 0.1;
  return Math.max(0.02, base + belly + foot + neck);
}

function sampleRibbon(idx, t, s) {
  const y = RIBBON.yStart + (RIBBON.yEnd - RIBBON.yStart) * t;
  const phase0 = idx === 0 ? 0 : Math.PI;
  const theta = phase0 + 2 * Math.PI * RIBBON.turns * t;
  const R = ribbonRadius(t);
  const cx0 = R * Math.cos(theta);
  const cz0 = R * Math.sin(theta);
  const tubeR =
    0.045 +
    0.035 * Math.exp(-(((t - 0.3) / 0.3) ** 2)) -
    0.02 * Math.exp(-(((t - 0.78) / 0.08) ** 2));
  const phi = 2 * Math.PI * s;
  const radX = Math.cos(theta);
  const radZ = Math.sin(theta);
  return [
    cx0 + tubeR * Math.cos(phi) * radX,
    y + tubeR * Math.sin(phi),
    cz0 + tubeR * Math.cos(phi) * radZ,
  ];
}

function sampleGlobe() {
  const u = rand();
  const v = rand();
  const phi = 2 * Math.PI * u;
  const cosTheta = 2 * v - 1;
  const sinTheta = Math.sqrt(Math.max(0, 1 - cosTheta * cosTheta));
  const r = GLOBE.r * (1 - 0.1 * rand() * rand());
  return [
    GLOBE.cx + r * sinTheta * Math.cos(phi),
    GLOBE.cy + r * cosTheta,
    GLOBE.cz + r * sinTheta * Math.sin(phi),
  ];
}

function sampleBase() {
  const a = 2 * Math.PI * rand();
  const r = 0.3 * Math.sqrt(rand());
  const y = -0.85 - 0.05 * rand();
  return [r * Math.cos(a), y, r * Math.sin(a)];
}

function sampleStem() {
  const a = 2 * Math.PI * rand();
  const r = 0.06 + 0.02 * rand();
  const y = -0.85 + 0.1 * rand();
  return [r * Math.cos(a), y, r * Math.sin(a)];
}

function samplePoint() {
  const k = rand();
  if (k < 0.62) {
    const idx = rand() < 0.5 ? 0 : 1;
    const t = Math.pow(rand(), 0.85) * 0.95 + 0.025;
    const s = rand();
    return sampleRibbon(idx, t, s);
  } else if (k < 0.86) {
    return sampleGlobe();
  } else if (k < 0.95) {
    return sampleStem();
  } else {
    return sampleBase();
  }
}

// ── Projection (10° ortho tilt around X) ─────────────────────────────────
const TILT = (10 * Math.PI) / 180;
const cosT = Math.cos(TILT);
const sinT = Math.sin(TILT);

function project(p) {
  const [x, y, z] = p;
  const y2 = y * cosT - z * sinT;
  const z2 = y * sinT + z * cosT;
  return [x, y2, z2];
}

// ── Render ───────────────────────────────────────────────────────────────
const N = 10000;

const X_MIN = -0.42;
const X_MAX = 0.42;
const Y_MIN = -0.95;
const Y_MAX = 0.95;
const Y_VIS_MIN = Y_MIN * cosT - 0.32 * sinT - 0.04;
const Y_VIS_MAX = Y_MAX * cosT + 0.32 * sinT + 0.04;

const sx = (spec.vbW - 2 * spec.pad) / (X_MAX - X_MIN);
const sy = (spec.vbH - 2 * spec.pad) / (Y_VIS_MAX - Y_VIS_MIN);
const scale = Math.min(sx, sy);
const ox = spec.vbW / 2;
const oy = spec.vbH / 2;

const pts = [];
for (let i = 0; i < N; i++) {
  const p = samplePoint();
  const q = project(p);
  const jx = randn() * 0.004;
  const jy = randn() * 0.004;
  const px = q[0] + jx;
  const py = q[1] + jy;
  const isOut = spec.pOutlier > 0 && rand() < spec.pOutlier;
  pts.push([px, py, q[2], isOut]);
}

if (spec.sort === "outliers-on-top") {
  pts.sort((a, b) => (a[3] === b[3] ? a[2] - b[2] : a[3] ? 1 : -1));
} else {
  pts.sort((a, b) => a[2] - b[2]);
}

let body = "";
let oxCount = 0;
const wantsPerCircleFill = spec.outlier !== null;
for (const [px, py, , isOut] of pts) {
  const cx = ox + px * scale;
  const cy = oy - py * scale;
  const r = isOut ? spec.dotROut : spec.dotR;
  if (wantsPerCircleFill) {
    body += `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${r.toFixed(2)}" fill="${isOut ? spec.outlier : spec.ink}"/>`;
  } else {
    body += `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${r.toFixed(2)}"/>`;
  }
  if (isOut) oxCount++;
}

// When the variant is monochromatic we set fill at the group level (smaller
// SVG, identical render). For variants with outliers, fill is per-circle.
const groupAttrs = wantsPerCircleFill
  ? `fill-opacity="${spec.fillOpacity}"`
  : `fill="${spec.ink}" fill-opacity="${spec.fillOpacity}"`;

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${spec.vbW} ${spec.vbH}" width="${spec.vbW}" height="${spec.vbH}" role="img" aria-label="${spec.label}">` +
  `<rect width="${spec.vbW}" height="${spec.vbH}" fill="${spec.canvas}"/>` +
  `<g ${groupAttrs}>${body}</g>` +
  `</svg>`;

writeFileSync(out, svg);
const oxNote =
  spec.pOutlier > 0
    ? ` · ${oxCount} outliers (${(oxCount / N).toFixed(3)})`
    : "";
console.log(`wrote ${out} · variant=${variantArg} · ${pts.length} points${oxNote}`);
