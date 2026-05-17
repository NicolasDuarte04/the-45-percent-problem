/**
 * localStorage carve-out for the in-flight scenario being built.
 *
 * Per resolution #7: ONE key, scoped to simulator components only,
 * cleared on submit and on mode change. The carve-out exists so a
 * page refresh mid-build does not lose progress; it is NOT a store
 * for submitted predictions (those live in Postgres and are surfaced
 * via the dashboard list endpoint).
 *
 * SSR-safe: every public function checks `typeof window` and is a
 * no-op on the server.
 */

import type { Mode } from "./types";

export const INFLIGHT_KEY = "45a:simulator:inflight";

export interface InflightScenario {
  mode: Mode;
  /**
   * Mode-specific scenario data, validated by the route handler at
   * submit time. Stored as `unknown` here because partial in-flight
   * states do not satisfy the full Zod schema (e.g. a Final Four
   * with only two teams selected).
   */
  scenario: unknown;
  /** Last write time, ms since epoch. Used to age-out very stale entries. */
  updatedAt: number;
}

/** Entries older than this are treated as stale and cleared on read. */
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readInflight(): InflightScenario | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(INFLIGHT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<InflightScenario>;
    if (
      typeof parsed?.mode !== "string" ||
      typeof parsed?.updatedAt !== "number" ||
      parsed.scenario === undefined
    ) {
      // Malformed payload: drop it.
      window.localStorage.removeItem(INFLIGHT_KEY);
      return null;
    }
    if (Date.now() - parsed.updatedAt > MAX_AGE_MS) {
      window.localStorage.removeItem(INFLIGHT_KEY);
      return null;
    }
    return parsed as InflightScenario;
  } catch {
    return null;
  }
}

export function writeInflight(mode: Mode, scenario: unknown): void {
  if (!isBrowser()) return;
  try {
    const payload: InflightScenario = { mode, scenario, updatedAt: Date.now() };
    window.localStorage.setItem(INFLIGHT_KEY, JSON.stringify(payload));
  } catch {
    /* localStorage may be full or disabled; fail silently. */
  }
}

export function clearInflight(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(INFLIGHT_KEY);
  } catch {
    /* no-op */
  }
}

/**
 * Read the in-flight scenario only when its mode matches the current
 * mode page. If the user navigated from Final Four → Champion's Path,
 * the mismatched entry is cleared and `null` is returned (mode change
 * clears, per resolution #7).
 */
export function readInflightForMode(mode: Mode): unknown | null {
  const entry = readInflight();
  if (!entry) return null;
  if (entry.mode !== mode) {
    clearInflight();
    return null;
  }
  return entry.scenario;
}
