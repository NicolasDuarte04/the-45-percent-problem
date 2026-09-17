/**
 * src/lib/regenDispatch.ts
 *
 * cp-13 (Fix 6). On-demand snapshot-regeneration trigger.
 *
 * A settled match outcome only becomes visible on the public `/bracket` after
 * the snapshot-regeneration pipeline re-conditions the Monte Carlo ensemble on
 * the new result and rewrites `public/data/latest/{tournament,bracket}.json`.
 * That pipeline is a Python 10k-MC batch — it cannot run inside this serverless
 * function. So instead we fire a GitHub `repository_dispatch` (event type
 * `regen-snapshot`) which runs `.github/workflows/on_demand_regen.yml`. That
 * workflow shares the nightly's concurrency group, so an on-demand run and the
 * nightly can never execute simultaneously.
 *
 * Auth: a fine-grained GitHub PAT with `actions: write` on this repo, supplied
 * as `GITHUB_REGEN_PAT` (a Vercel project secret). Owner/repo are resolved from
 * explicit env, then Vercel's git system vars, then a hard fallback to the
 * canonical repo.
 *
 * Debounce: the Football-Data.org hourly cron can land several outcomes within
 * a minute. Each upsert request would otherwise fire its own dispatch, and the
 * regeneration is identical regardless of how many outcomes triggered it. We
 * collapse bursts to at most one dispatch per `DEBOUNCE_WINDOW_MS` using a
 * module-level timestamp. This is per-worker/in-memory and therefore best-effort
 * (a cold start or a second concurrent worker can still dispatch); it is the
 * agreed starting point. The follow-up to move this to a distributed cache
 * (Vercel KV) is tracked in PLAN.md's post-launch backlog.
 *
 * Never throws and never fails the caller's response: the upsert that triggered
 * it has already committed. A missing/invalid config or a transient GitHub error
 * is reported in the returned object, not raised.
 */

import { randomUUID } from "node:crypto";

const REGEN_EVENT_TYPE = "regen-snapshot";
const DEBOUNCE_WINDOW_MS = 60_000;
const FALLBACK_OWNER = "NicolasDuarte04";
const FALLBACK_REPO = "the-45-percent-problem";

/** Module-level debounce clock. Best-effort, per worker. */
let lastDispatchAt = 0;

export type RegenDispatchResult = {
  /** True only when GitHub accepted the dispatch (HTTP 204). */
  ok: boolean;
  /** A client-generated correlation id, echoed into the workflow's
   *  client_payload so a dispatch can be traced to a run. Null when skipped. */
  eventId: string | null;
  /** True when no dispatch was attempted (debounced or not configured). */
  skipped: boolean;
  /** Why the dispatch did not succeed/run, when applicable. */
  reason?: "debounced" | "not_configured" | "dispatch_failed";
  /** Detail for `dispatch_failed`. */
  error?: string;
};

type RegenConfig = { token: string; owner: string; repo: string };

function resolveConfig(): RegenConfig | null {
  const token = process.env.GITHUB_REGEN_PAT;
  if (!token) return null;
  const owner =
    process.env.GITHUB_REGEN_OWNER ||
    process.env.VERCEL_GIT_REPO_OWNER ||
    FALLBACK_OWNER;
  const repo =
    process.env.GITHUB_REGEN_REPO ||
    process.env.VERCEL_GIT_REPO_SLUG ||
    FALLBACK_REPO;
  return { token, owner, repo };
}

/**
 * Fire (or debounce) a snapshot-regeneration dispatch.
 *
 * @returns a result describing whether GitHub accepted the dispatch, it was
 *   debounced, or the trigger is not configured. The caller surfaces this in
 *   its response body so operators can see whether a regen kicked off.
 */
export async function triggerOnDemandRegen(opts?: {
  reason?: string;
  triggeredByMatchId?: string;
}): Promise<RegenDispatchResult> {
  const config = resolveConfig();
  if (!config) {
    // No PAT provisioned (e.g. local dev, preview deploy, test). Degrade
    // silently: the nightly cron remains the safety-net regeneration path.
    return { ok: false, eventId: null, skipped: true, reason: "not_configured" };
  }

  const now = Date.now();
  if (now - lastDispatchAt < DEBOUNCE_WINDOW_MS) {
    return { ok: false, eventId: null, skipped: true, reason: "debounced" };
  }
  // Claim the window *before* awaiting so two near-simultaneous requests in the
  // same worker collapse to one dispatch instead of racing past the check.
  const previousDispatchAt = lastDispatchAt;
  lastDispatchAt = now;

  const eventId = randomUUID();
  try {
    const res = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/dispatches`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${config.token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
          "User-Agent": "the-45-percent-problem-regen",
        },
        body: JSON.stringify({
          event_type: REGEN_EVENT_TYPE,
          client_payload: {
            dispatch_id: eventId,
            reason: opts?.reason ?? "match-outcome-upsert",
            triggered_by_match_id: opts?.triggeredByMatchId ?? null,
          },
        }),
      },
    );

    if (!res.ok) {
      // A failed dispatch should not suppress the next legitimate attempt for a
      // full window — roll the clock back so a retry can fire immediately.
      lastDispatchAt = previousDispatchAt;
      const detail = await res.text().catch(() => "");
      console.error(
        "[regenDispatch] repository_dispatch rejected",
        res.status,
        detail.slice(0, 200),
      );
      return {
        ok: false,
        eventId,
        skipped: false,
        reason: "dispatch_failed",
        error: `github ${res.status}`,
      };
    }

    return { ok: true, eventId, skipped: false };
  } catch (err) {
    lastDispatchAt = previousDispatchAt;
    const error = err instanceof Error ? err.message : String(err);
    console.error("[regenDispatch] repository_dispatch threw", error);
    return {
      ok: false,
      eventId,
      skipped: false,
      reason: "dispatch_failed",
      error,
    };
  }
}
