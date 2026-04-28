#!/usr/bin/env node
/**
 * Trophy point-cloud favicon generator.
 *
 * Ports the JS in /Users/nicolasduarte/Desktop/favicon.html to Node so the
 * favicon stays deterministic and reproducible from source. Same xorshift32
 * seed (0x2A2A2A2A), same parametric manifold (two intertwined helical
 * ribbons + globe + stem + base), same 10° ortho tilt, same Bernoulli draw
 * for the oxblood outliers (p ≈ 0.06).
 *
 * Output: a single 1000×1000 SVG with ~10k circles. Pipe through sharp to
 * rasterise into the actual favicon files.
 *
 * Usage:
 *   node scripts/generate-favicon.mjs /tmp/favicon.svg
 *   npx sharp-cli --input /tmp/favicon.svg --output src/app/icon.png resize 512 512
 *   npx sharp-cli --input /tmp/favicon.svg --output src/app/apple-icon.png resize 180 180
 */

import { writeFileSync } from "node:fs";

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
const VB = 1000;
const PAD = 30;
const N = 10000;
const P_OXBLOOD = 0.06;
const DOT_R = 1.4;
const DOT_R_OUT = 1.7;

const X_MIN = -0.42;
const X_MAX = 0.42;
const Y_MIN = -0.95;
const Y_MAX = 0.95;
const Y_VIS_MIN = Y_MIN * cosT - 0.32 * sinT - 0.04;
const Y_VIS_MAX = Y_MAX * cosT + 0.32 * sinT + 0.04;

const sx = (VB - 2 * PAD) / (X_MAX - X_MIN);
const sy = (VB - 2 * PAD) / (Y_VIS_MAX - Y_VIS_MIN);
const scale = Math.min(sx, sy);
const ox = VB / 2;

// OKLCH design tokens from the source HTML, materialised to sRGB hex so
// libvips/sharp and older browsers all render identically. Keep these in
// lockstep with the :root definitions in /Users/nicolasduarte/Desktop/favicon.html.
//   --canvas:  oklch(10% 0 0)        → near-black
//   --bone:    oklch(95% 0.01 80)    → warm white
//   --oxblood: oklch(35% 0.08 20)    → deep brick red
const CANVAS = "#0F0F10";
const BONE = "#F4EFE5";
const OXBLOOD = "#6E3F35";

const pts = [];
for (let i = 0; i < N; i++) {
  const p = samplePoint();
  const q = project(p);
  const jx = randn() * 0.004;
  const jy = randn() * 0.004;
  const px = q[0] + jx;
  const py = q[1] + jy;
  const isOut = rand() < P_OXBLOOD;
  pts.push([px, py, q[2], isOut]);
}

// Outliers drawn last so the rare oxblood reads through the bone field.
pts.sort((a, b) => (a[3] === b[3] ? a[2] - b[2] : a[3] ? 1 : -1));

let body = "";
let oxCount = 0;
for (const [px, py, , isOut] of pts) {
  const cx = ox + px * scale;
  const cy = VB / 2 - py * scale;
  const r = isOut ? DOT_R_OUT : DOT_R;
  body += `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${r.toFixed(2)}" fill="${isOut ? OXBLOOD : BONE}"/>`;
  if (isOut) oxCount++;
}

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB} ${VB}" width="${VB}" height="${VB}" role="img" aria-label="The 45% Problem trophy favicon">` +
  `<rect width="${VB}" height="${VB}" fill="${CANVAS}"/>` +
  `<g>${body}</g>` +
  `</svg>`;

const out = process.argv[2] ?? "favicon.svg";
writeFileSync(out, svg);
console.log(
  `wrote ${out} · ${pts.length} points · ${oxCount} oxblood (${(oxCount / N).toFixed(3)})`,
);
