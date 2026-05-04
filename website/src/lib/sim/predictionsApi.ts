/**
 * Client-side fetch wrappers for the simulator's API. Pure browser code.
 *
 * `submitPrediction` POSTs to /api/predictions and returns either the
 * sanitized prediction view (success) or a typed error variant. The
 * route's response shape is preserved here so callers can switch on
 * `result.kind` without re-decoding.
 *
 * Note: this module does NOT touch localStorage. Inflight clearing is
 * the caller's responsibility (so we keep the contract narrow:
 * inflightStore for storage, predictionsApi for network).
 */

import type { PublicPredictionView } from "./types";

export type SubmitPredictionResult =
  | { kind: "ok"; prediction: PublicPredictionView }
  | { kind: "invalid" }
  | { kind: "rateLimit"; retryAfterMs: number }
  | { kind: "server" }
  | { kind: "network" };

export interface SubmitPredictionInput {
  mode: "final_four" | "champions_path" | "full_bracket";
  scenario: unknown;
  modelSha: string;
  snapshotSha: string;
}

export async function submitPrediction(
  input: SubmitPredictionInput,
): Promise<SubmitPredictionResult> {
  let res: Response;
  try {
    res = await fetch("/api/predictions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    return { kind: "network" };
  }

  if (res.ok) {
    try {
      const json = (await res.json()) as
        | { ok: true; prediction: PublicPredictionView }
        | { ok: false; error?: string };
      if ("ok" in json && json.ok && "prediction" in json) {
        return { kind: "ok", prediction: json.prediction };
      }
      return { kind: "server" };
    } catch {
      return { kind: "server" };
    }
  }

  if (res.status === 429) {
    let retryAfterMs = 0;
    try {
      const json = (await res.json()) as { retryAfterMs?: number };
      retryAfterMs = typeof json?.retryAfterMs === "number" ? json.retryAfterMs : 0;
    } catch {
      /* swallow */
    }
    return { kind: "rateLimit", retryAfterMs };
  }

  if (res.status >= 400 && res.status < 500) {
    return { kind: "invalid" };
  }

  return { kind: "server" };
}
