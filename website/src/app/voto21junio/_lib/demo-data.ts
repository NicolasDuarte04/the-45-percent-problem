/**
 * El Voto del 21 de Junio — demo data fixtures (Session 01).
 *
 * EVERY user-facing number in the /voto21junio routes reads from this file.
 * No component hardcodes a probability, a count, or a date. When the live
 * pipelines land (Sessions 02-04), this module is the single seam that gets
 * swapped for a snapshot reader; the component tree never changes.
 *
 * These are PLACEHOLDER numbers, fabricated for the prototype. The UI labels
 * them "datos de ejemplo" wherever they surface, per IMPLEMENTATION_PLAN §3.4
 * (no false data) and the project-wide honesty rule.
 */

/** The runoff. Every public string spells the date; only paths use the codename. */
export const RUNOFF_ISO = "2026-06-21T08:00:00-05:00";

/** Candidate identity. Names only — never adjectives, never a candidate color. */
export interface Candidate {
  readonly id: "cepeda" | "espriella";
  readonly name: string;
}

export const CEPEDA: Candidate = { id: "cepeda", name: "Iván Cepeda" };
export const ESPRIELLA: Candidate = { id: "espriella", name: "Abelardo de la Espriella" };

/**
 * Probability of the day. P(Cepeda) is the stored value; P(Espriella) is its
 * complement so the two always sum to 100. Demo value: 48 / 52.
 */
export const P_CEPEDA = 48;

/**
 * Pulso Patrio — composite mobilization index (0-100) and its reference from
 * "anoche" (last night). 58 with a +4 overnight delta => reference 54.
 */
export const PULSO = 58;
export const PULSO_REFERENCE = 54;

/** Integrated public polls feeding the day's probability. */
export const ENCUESTAS_COUNT = 41;

/** The five signals that compose the Pulso Patrio index (each 0-100). */
export interface PulsoInput {
  readonly nm: string;
  readonly v: number;
}

export const PULSO_INPUTS: readonly PulsoInput[] = [
  { nm: "Búsquedas “21 de junio”", v: 64 },
  { nm: "Registro / cedulación", v: 51 },
  { nm: "Intención declarada de votar", v: 60 },
  { nm: "Movilización en redes", v: 57 },
  { nm: "Asistencia a eventos", v: 49 },
];

/**
 * First-round national result (real anchor, percent). Espriella led the first
 * round; this frames the runoff honestly rather than implying a Cepeda lead.
 */
export const NATIONAL_R1 = {
  espriella: 43.7,
  cepeda: 40.9,
  otros: 15.4,
} as const;

/** Per-municipio demo dataset. r1 = [cepeda, espriella, otros] percent. */
export interface Municipio {
  readonly name: string;
  readonly dept: string;
  /** First-round split [cepeda, espriella, otros], percent. */
  readonly r1: readonly [number, number, number];
  /** Eligible voters who did not vote in the first round. */
  readonly abst: number;
  /** Votes that would flip / widen the municipio in the runoff. */
  readonly flip: number;
  /** Share of the national margin this municipio can move, percent. */
  readonly share: number;
}

export const MUNICIPIOS: Readonly<Record<string, Municipio>> = {
  "Bogotá": { name: "Bogotá", dept: "Distrito Capital", r1: [46, 39, 15], abst: 1_240_000, flip: 38_400, share: 9.2 },
  "Medellín": { name: "Medellín", dept: "Antioquia", r1: [33, 52, 15], abst: 690_000, flip: 21_700, share: 5.4 },
  "Envigado": { name: "Envigado", dept: "Antioquia", r1: [29, 56, 15], abst: 58_000, flip: 3_150, share: 0.7 },
  "Quibdó": { name: "Quibdó", dept: "Chocó", r1: [49, 35, 16], abst: 71_000, flip: 2_400, share: 0.6 },
  "San Andrés": { name: "San Andrés", dept: "Archipiélago", r1: [42, 43, 15], abst: 22_000, flip: 540, share: 0.2 },
} as const;

/** The municipio the Mapa opens on by default (typeahead search is Session 05). */
export const DEFAULT_MUNICIPIO = "Bogotá";

/** Conversation group size: "habla con 4 personas" → grupos = flip / 5. */
export const GROUP_SIZE = 5;

/** Snapshot / code stamps shown in footers — flagged as demo. */
export const SNAPSHOT_STAMP = "snapshot c9f2a1 · code: 3f7a2b · datos de ejemplo";
