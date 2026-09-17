/**
 * Scenario to URL serialization for the exploratory share loop.
 *
 * A user's current Scenario Simulator view is serialized into a single
 * `?s=` query parameter so that opening the link reconstructs the exact
 * same scenario, with no server write. This is deliberately separate from
 * the submitted-prediction permalink (`/scenario/p/[id]`), which persists
 * to Postgres and earns a 45A-2026-XXXX ticket id. Casual exploratory
 * shares stay serverless and never touch the predictions dataset.
 *
 * The serialized unit is `{ mode, scenario }`, the same discriminated
 * shape the submit route validates (ScenarioPayload). Two decoders:
 *
 *   - decodeScenarioDraft: tolerant. Accepts any object whose `mode` is a
 *     valid Mode and whose `scenario` is an object. Used by the builder to
 *     rehydrate the view, including partial / in-flight drafts. The mode
 *     components sanitize each field as they map it into their own state,
 *     so a partial or slightly malformed scenario reopens as far as it can
 *     rather than throwing.
 *   - decodeScenarioStrict: validates against ScenarioPayloadSchema. Used
 *     by the OG image route and generateMetadata, which need a complete,
 *     projectable scenario to render the card. A partial draft returns
 *     null there, and the caller falls back to the default page card.
 *
 * Encoding is URL-safe base64 of the JSON (no `+`, `/`, or `=`), so the
 * value is safe to drop straight into a query string. base64 keeps the
 * URL compact: even the deepest full-bracket scenario (63 team codes)
 * stays well within safe URL length limits.
 *
 * Isomorphic: uses TextEncoder / btoa, both available in the browser and
 * in the Node OG route runtime. No DOM or Node-only APIs at module scope.
 */

import {
  ModeSchema,
  ScenarioPayloadSchema,
  type Mode,
  type ScenarioPayload,
} from "./types";

/** The single query key carrying the serialized scenario. */
export const SCENARIO_PARAM = "s";

// ── base64url (isomorphic, no escape/unescape, no Buffer) ─────────────────────

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): string | null {
  try {
    const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    const binary = atob(b64 + pad);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

// ── Encode ────────────────────────────────────────────────────────────────────

/**
 * Serialize a `{ mode, scenario }` payload into the `?s=` value. Accepts
 * any scenario object (complete or partial); the builder generates this
 * from the user's current view, the OG route reads it back.
 */
export function encodeScenarioParam(payload: {
  mode: Mode;
  scenario: unknown;
}): string {
  return toBase64Url(JSON.stringify({ mode: payload.mode, scenario: payload.scenario }));
}

// ── Decode ──────────────────────────────────────────────────────────────────

export interface ScenarioDraft {
  mode: Mode;
  /**
   * Raw, unvalidated scenario object. The consuming mode component maps
   * each field into its own build state with the same defensive checks it
   * already applies to the localStorage carve-out.
   */
  scenario: Record<string, unknown>;
}

/**
 * Tolerant decode for the builder. Returns null on any structural failure
 * (bad base64, non-JSON, unknown mode, non-object scenario) so a garbage
 * `?s=` falls back to an empty builder rather than throwing. A partial but
 * structurally valid scenario is returned as-is for the component to
 * rehydrate as far as it can.
 */
export function decodeScenarioDraft(
  raw: string | null | undefined,
): ScenarioDraft | null {
  if (!raw) return null;
  const json = fromBase64Url(raw);
  if (json === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const mode = (parsed as { mode?: unknown }).mode;
  const scenario = (parsed as { scenario?: unknown }).scenario;
  if (!ModeSchema.safeParse(mode).success) return null;
  if (!scenario || typeof scenario !== "object") return null;
  return { mode: mode as Mode, scenario: scenario as Record<string, unknown> };
}

/**
 * Strict decode for OG / metadata. Validates against ScenarioPayloadSchema
 * (the exact schema the submit route uses), so only a complete, projectable
 * scenario passes. Returns null for partial drafts or garbage.
 */
export function decodeScenarioStrict(
  raw: string | null | undefined,
): ScenarioPayload | null {
  const draft = decodeScenarioDraft(raw);
  if (!draft) return null;
  const result = ScenarioPayloadSchema.safeParse(draft);
  return result.success ? result.data : null;
}

// ── Browser URL helpers ───────────────────────────────────────────────────────

/** Read the `?s=` value from the current location (browser only). */
export function readScenarioParam(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return new URLSearchParams(window.location.search).get(SCENARIO_PARAM);
  } catch {
    return null;
  }
}

/**
 * The current pathname plus any query params except `s`. Used to strip the
 * shared `?s=` once the visitor starts editing, so a reload reads their own
 * (now-owned) draft from localStorage rather than the shared scenario.
 * Preserves unrelated params (e.g. `?card=`, `?debug=`).
 */
export function urlWithoutScenarioParam(): string {
  if (typeof window === "undefined") return "/";
  const url = new URL(window.location.href);
  url.searchParams.delete(SCENARIO_PARAM);
  const qs = url.searchParams.toString();
  return qs ? `${url.pathname}?${qs}` : url.pathname;
}

/**
 * A clean, canonical share URL for the given payload: origin + current
 * pathname + `?s=<encoded>`, dropping any unrelated query params so the
 * link a user shares is tidy. Browser only.
 */
export function buildScenarioShareUrl(payload: {
  mode: Mode;
  scenario: unknown;
}): string {
  const param = encodeScenarioParam(payload);
  const { origin, pathname } = window.location;
  return `${origin}${pathname}?${SCENARIO_PARAM}=${param}`;
}
