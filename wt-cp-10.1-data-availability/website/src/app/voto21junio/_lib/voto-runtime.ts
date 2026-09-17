/**
 * El Voto del 21 de Junio — typed runtime helpers (Session 01).
 *
 * Ports the pure logic from the design prototype's voto-shared.js into typed,
 * side-effect-free functions. Everything here is deterministic given its
 * inputs (the dot-field and signature use a seeded PRNG), so it runs safely in
 * a React Server Component and produces identical markup on server and client
 * — no hydration mismatch.
 *
 * The ticker engine, count-up animation, and localStorage tweak relay are
 * interactive and live in client components, not here.
 */

import {
  GROUP_SIZE,
  MUNICIPIOS,
  P_CEPEDA,
  PULSO,
  PULSO_REFERENCE,
  RUNOFF_ISO,
  type Municipio,
} from "./demo-data";

// ── Number formatting (es-CO: "." thousands, "," decimals) ──────────────────
export const fmt = (n: number): string => n.toLocaleString("es-CO");
export const pct = (n: number, d = 0): string => `${n.toFixed(d)}%`;

// ── Derived day-of figures ──────────────────────────────────────────────────
export interface Derived {
  /** P(Cepeda) percent. */
  readonly pC: number;
  /** P(Espriella) percent (complement). */
  readonly pE: number;
  /** Pulso Patrio composite index. */
  readonly pulso: number;
  /** Pulso change since last night. */
  readonly pulsoDelta: number;
}

export function derived(pCepeda: number = P_CEPEDA, pulso: number = PULSO): Derived {
  return {
    pC: pCepeda,
    pE: 100 - pCepeda,
    pulso,
    pulsoDelta: pulso - PULSO_REFERENCE,
  };
}

/** Whole days remaining until the runoff (never negative). */
export function daysUntil(now: Date = new Date()): number {
  const runoff = new Date(RUNOFF_ISO);
  const ms = runoff.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

// ── Municipio resolver: known fixtures + deterministic fallback ─────────────
// Mirrors the prototype's getMuni so any name yields a stable demo result.
function hash(str: string): number {
  let h = 2_166_136_261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16_777_619);
  }
  return h >>> 0;
}

export function getMuni(name: string): Municipio {
  const known = MUNICIPIOS[name];
  if (known) return known;
  const h = hash(name);
  const a = 28 + (h % 22);
  const b = 26 + ((h >> 5) % 22);
  const o = Math.max(8, 100 - a - b);
  const abst = 18_000 + (h % 240) * 1_100;
  const flip = Math.round(abst * (0.018 + (h % 30) / 1_000));
  const share = Number((0.2 + (h % 70) / 10).toFixed(1));
  return { name, dept: "Colombia", r1: [a, b, o], abst, flip, share };
}

/** Conversation groups of GROUP_SIZE that, half-acting, close the gap. */
export function groupsFor(muni: Municipio): number {
  return Math.round(muni.flip / GROUP_SIZE);
}

// ── Campo de votos (dot-field motif) ────────────────────────────────────────
// A field of voters; a `live` fraction lit in the accent = mobilizable
// non-voters. Seeded layout => deterministic, stable across renders.
export interface CampoOptions {
  cols?: number;
  rows?: number;
  live?: number;
  gap?: number;
  r?: number;
  seed?: number;
}

export function campoSvg({
  cols = 26,
  rows = 12,
  live = 0.18,
  gap = 13,
  r = 2.4,
  seed = 7,
}: CampoOptions = {}): string {
  let s = seed;
  const rnd = () => {
    s = (s * 1_103_515_245 + 12_345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const w = (cols - 1) * gap;
  const h = (rows - 1) * gap;
  const total = cols * rows;
  const liveSet = new Set<number>();
  while (liveSet.size < Math.floor(total * live)) liveSet.add(Math.floor(rnd() * total));

  let base = "";
  let lit = "";
  let i = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cx = (x * gap).toFixed(1);
      const cy = (y * gap).toFixed(1);
      const jitter = (rnd() - 0.5) * 1.2;
      const rad = (r + jitter * 0.3).toFixed(2);
      if (liveSet.has(i)) lit += `<circle class="v-live" cx="${cx}" cy="${cy}" r="${rad}"/>`;
      else base += `<circle class="v-base" cx="${cx}" cy="${cy}" r="${rad}"/>`;
      i++;
    }
  }
  const dur = 40 + (seed % 5) * 4;
  const delay = (seed % 7) * 5;
  return (
    `<svg class="campo" viewBox="-${r + 2} -${r + 2} ${w + (r + 2) * 2} ${h + (r + 2) * 2}" ` +
    `preserveAspectRatio="xMidYMid meet" aria-hidden="true">` +
    `<g class="cdrift" style="animation-duration:${dur}s;animation-delay:-${delay}s">${base}${lit}</g></svg>`
  );
}

// ── Signature illustration — posterior distribution as a Wilkinson dotplot ──
export function signatureSvg(): string {
  const W = 620;
  const H = 168;
  const baseY = 138;
  const gap = 12.4;
  const r = 3.0;
  const maxDots = 9;
  const cols = Math.floor(W / gap);
  const gauss = (x: number, m: number, sd: number) => Math.exp(-0.5 * Math.pow((x - m) / sd, 2));

  const ds: number[] = [];
  let maxd = 0;
  for (let i = 0; i < cols; i++) {
    const x = i / (cols - 1);
    const d = 0.96 * gauss(x, 0.36, 0.115) + 0.8 * gauss(x, 0.66, 0.1);
    ds.push(d);
    if (d > maxd) maxd = d;
  }

  let dots = "";
  for (let i = 0; i < cols; i++) {
    const n = Math.round((maxDots * ds[i]) / maxd);
    const cx = (i * gap + gap / 2).toFixed(1);
    for (let j = 0; j < n; j++) {
      const cy = (baseY - j * gap).toFixed(1);
      const crown = j === n - 1 && n > 2;
      dots += `<circle cx="${cx}" cy="${cy}" r="${r}" class="${crown ? "s-live" : "s-base"}"/>`;
    }
  }
  const rule = `<line x1="0" y1="${baseY + 9}" x2="${W}" y2="${baseY + 9}" class="s-rule"/>`;
  const mx = (0.51 * W).toFixed(1);
  const mark = `<line x1="${mx}" y1="6" x2="${mx}" y2="${baseY + 9}" class="s-mark"/>`;
  return (
    `<svg class="sig-svg" viewBox="-6 0 ${W + 12} ${H}" preserveAspectRatio="xMidYMid meet" ` +
    `role="img" aria-label="Distribución posterior del margen de la segunda vuelta">` +
    `${mark}<g class="cdrift" style="animation-duration:54s;animation-delay:-9s">${dots}</g>${rule}</svg>`
  );
}

// ── Tarjeta del Día aspect ratios ───────────────────────────────────────────
export type TarjetaRatio = "1:1" | "1.91:1" | "9:16";

export const TARJETA_ASPECT: Readonly<Record<TarjetaRatio, string>> = {
  "1:1": "1 / 1",
  "1.91:1": "1.91 / 1",
  "9:16": "9 / 16",
};

/** Short es-CO date stamp for the Tarjeta ("21 JUN"). */
export function runoffStamp(): string {
  return new Date(RUNOFF_ISO)
    .toLocaleDateString("es-CO", { day: "2-digit", month: "short" })
    .toUpperCase()
    .replace(".", "");
}
