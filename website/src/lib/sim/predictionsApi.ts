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

// ── Email-attach (POST /api/predictions/[id]/email) ─────────────────────────

/**
 * Discriminated outcome for the email-attach endpoint. Maps the route's
 * status codes 1:1 so callers can render variant-specific copy without
 * decoding HTTP themselves.
 */
export type AttachEmailResult =
  | { kind: "created" }        // verification email sent (new subscriber)
  | { kind: "reactivated" }    // verification email sent (was unsubscribed/bounced)
  | { kind: "already_pending" }    // verification already in flight
  | { kind: "already_active" }     // already subscribed; no fresh verification
  | { kind: "suppressed" }     // hard stop: cannot be re-added
  | { kind: "complained" }     // hard stop: previously complained
  | { kind: "invalid" }        // bad email shape, malformed body, bad id
  | { kind: "rateLimit"; retryAfterMs: number }
  | { kind: "forbidden" }      // CSRF: cross-origin POST rejected
  | { kind: "notFound" }       // prediction id no longer resolves
  | { kind: "server" }         // 5xx
  | { kind: "network" };       // fetch threw

export async function attachEmailToPrediction(
  predictionId: string,
  email: string,
): Promise<AttachEmailResult> {
  let res: Response;
  try {
    res = await fetch(`/api/predictions/${encodeURIComponent(predictionId)}/email`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
  } catch {
    return { kind: "network" };
  }

  if (res.ok) {
    try {
      const json = (await res.json()) as { ok?: boolean; status?: string };
      switch (json.status) {
        case "created":
          return { kind: "created" };
        case "reactivated":
          return { kind: "reactivated" };
        case "already_pending":
          return { kind: "already_pending" };
        case "already_active":
          return { kind: "already_active" };
        default:
          return { kind: "server" };
      }
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

  if (res.status === 403) return { kind: "forbidden" };
  if (res.status === 404) return { kind: "notFound" };

  if (res.status === 409) {
    try {
      const json = (await res.json()) as { error?: string };
      if (json.error === "suppressed") return { kind: "suppressed" };
      if (json.error === "complained") return { kind: "complained" };
    } catch {
      /* swallow */
    }
    return { kind: "server" };
  }

  if (res.status >= 400 && res.status < 500) return { kind: "invalid" };
  return { kind: "server" };
}
