/**
 * El Voto del 21 de Junio — data contract + pure normalizers (Session 08).
 *
 * This module is the typed seam between the real 21J snapshots and the voto
 * surface. It is deliberately PURE and isomorphic: no `fs`, no `server-only`,
 * no React. The server reader (`snapshot-source.ts`) does the file I/O and then
 * hands the parsed JSON to the `normalize*` functions here; the unit tests call
 * the same normalizers directly with fixtures. Keeping the mapping pure is what
 * makes the sufficiency gating testable without touching the filesystem.
 *
 * Every figure on the surface carries its source's `data_sufficiency`. Today
 * the model is "thin" and the pulso is "demo", so "honest" means: show the real
 * number, framed preliminary, never as a settled call. See the design decision
 * (Nicolás, 2026-06-07): live, framed preliminary, gated by data_sufficiency.
 */

import {
  CEPEDA,
  ENCUESTAS_COUNT,
  ESPRIELLA,
  NATIONAL_R1,
  P_CEPEDA,
  PULSO,
  PULSO_INPUTS,
  RUNOFF_ISO,
  SNAPSHOT_STAMP,
} from "./demo-data";

/**
 * The three states a figure can be in.
 *  - "ok":   the source cleared its own sufficiency bar; show it confidently.
 *  - "thin": real data, but unstable / wide / boundary — show it framed preliminary.
 *  - "demo": placeholder OR a graceful-fallback read; show it labelled as ejemplo.
 * Any value the reader does not recognise collapses to "demo" (fail safe).
 */
export type Sufficiency = "ok" | "thin" | "demo";

export function asSufficiency(raw: unknown): Sufficiency {
  if (raw === "ok") return "ok";
  if (raw === "thin") return "thin";
  return "demo";
}

/** True when the figure must not be presented as a settled call. */
export function isPreliminary(s: Sufficiency): boolean {
  return s !== "ok";
}

// ── Model (21j/latest.json) ──────────────────────────────────────────────────

export interface ModelData {
  /** P(Cepeda gana la 2ª vuelta), percent 0-100. */
  readonly pCepeda: number;
  /** P(Espriella), complement, percent. */
  readonly pEspriella: number;
  /** National margin (Cepeda − Espriella) mean, percentage points. */
  readonly marginMeanPp: number;
  /** Margin 80% credible interval, percentage points. */
  readonly marginLoPp: number;
  readonly marginHiPp: number;
  /** Two-way vote-share for Cepeda, 80% CI, percent. */
  readonly shareCepedaLoPct: number;
  readonly shareCepedaHiPct: number;
  readonly sufficiency: Sufficiency;
  readonly snapshotDate: string;
  readonly nPolls: number;
  readonly newestPollDate: string;
  /** Pollsters that actually fed the posterior (snapshot pollsters_included). */
  readonly pollstersIncluded: readonly string[];
  /** Polls considered before the calibrated-cycle gate (n_polls_considered). */
  readonly nPollsConsidered: number;
  /** Polls dropped by the gate (considered minus used). */
  readonly nPollsExcluded: number;
  /** Recency half-life H in days, read from the calibration JSON. */
  readonly recencyHalflifeDays: number;
  /** Plain reasons the snapshot was flagged thin (data_sufficiency_reasons). */
  readonly suffReasons: readonly string[];
  /** True when this is the demo fallback, not a real snapshot read. */
  readonly isFallback: boolean;
}

function pct1(n: number): number {
  return Math.round(n * 1000) / 10; // 0.4637 -> 46.4
}

/** Map a parsed 21j/latest.json into ModelData. Throws on a missing core field. */
export function normalizeModel(raw: Record<string, unknown>): ModelData {
  const pC = raw.p_cepeda;
  const pE = raw.p_espriella;
  if (typeof pC !== "number" || typeof pE !== "number") {
    throw new Error("model snapshot missing p_cepeda / p_espriella");
  }
  const margin = (raw.margin ?? {}) as Record<string, number>;
  const shareC = (raw.share_cepeda ?? {}) as Record<string, number>;
  const included = Array.isArray(raw.pollsters_included)
    ? (raw.pollsters_included as unknown[]).map(String)
    : [];
  const considered = Number(raw.n_polls_considered ?? raw.n_polls ?? 0);
  const used = Number(raw.n_polls_used ?? raw.n_polls ?? 0);
  const reasons = Array.isArray(raw.data_sufficiency_reasons)
    ? (raw.data_sufficiency_reasons as unknown[]).map(String)
    : [];
  return {
    pCepeda: pct1(pC),
    pEspriella: pct1(pE),
    marginMeanPp: round1(margin.mean ?? 0),
    marginLoPp: round1(margin.ci80_low ?? 0),
    marginHiPp: round1(margin.ci80_high ?? 0),
    shareCepedaLoPct: round1((shareC.ci80_low ?? 0) * 100),
    shareCepedaHiPct: round1((shareC.ci80_high ?? 0) * 100),
    sufficiency: asSufficiency(raw.data_sufficiency),
    snapshotDate: String(raw.snapshot_date ?? "s/d"),
    nPolls: Number(raw.n_polls ?? 0),
    newestPollDate: String(raw.newest_poll_date ?? "s/d"),
    pollstersIncluded: included,
    nPollsConsidered: considered,
    nPollsExcluded: Math.max(0, considered - used),
    recencyHalflifeDays: Number(raw.recency_halflife_days ?? 0),
    suffReasons: reasons,
    isFallback: false,
  };
}

export function demoModel(): ModelData {
  return {
    pCepeda: P_CEPEDA,
    pEspriella: 100 - P_CEPEDA,
    marginMeanPp: 0,
    marginLoPp: -10,
    marginHiPp: 10,
    shareCepedaLoPct: 44,
    shareCepedaHiPct: 52,
    sufficiency: "demo",
    snapshotDate: "ejemplo",
    nPolls: 0,
    newestPollDate: "ejemplo",
    pollstersIncluded: [],
    nPollsConsidered: 0,
    nPollsExcluded: 0,
    recencyHalflifeDays: 0,
    suffReasons: [],
    isFallback: true,
  };
}

// ── Pulso (pulso/latest.json) ────────────────────────────────────────────────

export interface PulsoSignal {
  readonly nm: string;
  /** 0-100, or null when the signal has no reading yet. */
  readonly v: number | null;
  readonly available: boolean;
}

export interface PulsoData {
  readonly index: number;
  readonly inputsLive: number;
  readonly inputsTotal: number;
  readonly signals: readonly PulsoSignal[];
  /** Overnight change. null when there is no prior reading to compare against. */
  readonly delta: number | null;
  readonly sufficiency: Sufficiency;
  readonly snapshotHour: string;
  readonly isFallback: boolean;
}

/** Human labels for the five Pulso source keys. */
const PULSO_SOURCE_LABELS: Record<string, string> = {
  headlines: "Titulares de prensa",
  trends: "Búsquedas en Google",
  market: "Mercado (Polymarket)",
  x: "Tono en X",
  tiktok: "Velocidad en TikTok",
};

/** Map a parsed pulso/latest.json into PulsoData. Throws if index is absent. */
export function normalizePulso(raw: Record<string, unknown>): PulsoData {
  const index = raw.index_value;
  if (typeof index !== "number") {
    throw new Error("pulso snapshot missing index_value");
  }
  const readings = Array.isArray(raw.readings) ? (raw.readings as Record<string, unknown>[]) : [];
  const signals: PulsoSignal[] = readings.map((r) => {
    const key = String(r.source ?? "");
    const v = typeof r.value === "number" ? r.value : null;
    return {
      nm: PULSO_SOURCE_LABELS[key] ?? key,
      v: v === null ? null : Math.round(v),
      available: r.available === true && v !== null,
    };
  });
  return {
    index: Math.round(index),
    inputsLive: Number(raw.inputs_live ?? signals.filter((s) => s.available).length),
    inputsTotal: Number(raw.inputs_total ?? signals.length),
    signals,
    // The history has a single reading, so there is no honest overnight delta.
    // We surface null (→ "primer registro") rather than fabricate a change.
    delta: typeof raw.overnight_delta === "number" ? raw.overnight_delta : null,
    sufficiency: asSufficiency(raw.data_sufficiency),
    snapshotHour: String(raw.snapshot_hour ?? "s/d"),
    isFallback: false,
  };
}

export function demoPulso(): PulsoData {
  return {
    index: PULSO,
    inputsLive: 0,
    inputsTotal: PULSO_INPUTS.length,
    signals: PULSO_INPUTS.map((i) => ({ nm: i.nm, v: i.v, available: false })),
    delta: null,
    sufficiency: "demo",
    snapshotHour: "ejemplo",
    isFallback: true,
  };
}

// ── Mapa (processed/mapa_municipios.json) ────────────────────────────────────

export interface MapaData {
  readonly granularity: string;
  readonly sufficiency: Sufficiency;
  readonly coverageNote: string;
  readonly isFallback: boolean;
}

/** Map a parsed mapa_municipios.json into MapaData. Throws if granularity absent. */
export function normalizeMapa(raw: Record<string, unknown>): MapaData {
  const granularity = raw.granularity;
  if (typeof granularity !== "string") {
    throw new Error("mapa snapshot missing granularity");
  }
  const marginSource = (raw.national_margin_source ?? {}) as Record<string, unknown>;
  const coverage = (raw.coverage ?? {}) as Record<string, unknown>;
  // The mapa is only as trustworthy as the national margin it leans on, and it
  // is departamento-level (not municipio). Never present it as "ok".
  const sourceSuff = asSufficiency(marginSource.data_sufficiency);
  return {
    granularity,
    sufficiency: sourceSuff === "ok" ? "thin" : sourceSuff,
    coverageNote: String(coverage.municipio_coverage ?? coverage.note ?? ""),
    isFallback: false,
  };
}

export function demoMapa(): MapaData {
  return {
    granularity: "departamento",
    sufficiency: "demo",
    coverageNote: "datos de ejemplo",
    isFallback: true,
  };
}

// ── The full bundle handed to the surface ────────────────────────────────────

export interface VotoData {
  readonly model: ModelData;
  readonly pulso: PulsoData;
  readonly mapa: MapaData;
  readonly encuestasCount: number;
  readonly runoffIso: string;
  /** Footer stamp, e.g. "modelo 2026-06-04 · preliminar". */
  readonly stamp: string;
  /** True when ANY of the three sources fell back to demo. */
  readonly anyFallback: boolean;
}

/** Static demo identity values that never come from a snapshot. */
export const STATIC = {
  cepedaName: CEPEDA.name,
  espriellaName: ESPRIELLA.name,
  nationalR1: NATIONAL_R1,
  runoffIso: RUNOFF_ISO,
  demoStamp: SNAPSHOT_STAMP,
  encuestasCount: ENCUESTAS_COUNT,
} as const;

/** Assemble the bundle + derive the footer stamp from the model state. */
export function buildVotoData(model: ModelData, pulso: PulsoData, mapa: MapaData): VotoData {
  const anyFallback = model.isFallback || pulso.isFallback || mapa.isFallback;
  const label = isPreliminary(model.sufficiency) ? "preliminar" : "en vivo";
  const stamp = model.isFallback
    ? STATIC.demoStamp
    : `modelo ${model.snapshotDate} · ${model.nPolls} encuestas · ${label}`;
  return {
    model,
    pulso,
    mapa,
    encuestasCount: model.isFallback ? STATIC.encuestasCount : model.nPolls,
    runoffIso: STATIC.runoffIso,
    stamp,
    anyFallback,
  };
}

/** The all-demo bundle: used when the whole read fails. */
export function demoVotoData(): VotoData {
  return buildVotoData(demoModel(), demoPulso(), demoMapa());
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
