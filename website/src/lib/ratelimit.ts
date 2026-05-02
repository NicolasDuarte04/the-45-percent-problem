/**
 * Lightweight in-memory sliding-window rate limiter.
 *
 * Phase 1 stand-in for Upstash Redis. Single-process only — fine for the
 * subscribe form on Vercel during early traffic, but it does **not** survive
 * function recycles or share state across regions. Swap for an Upstash-backed
 * implementation in Phase 5 (search for TODO(rate-limit-upstash)).
 */

type Bucket = {
  windowStartMs: number;
  count: number;
};

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
}

export function rateLimit(opts: {
  key: string;
  limit?: number;
  windowMs?: number;
}): RateLimitResult {
  const limit = opts.limit ?? 10;
  const windowMs = opts.windowMs ?? 60_000;
  const now = Date.now();

  const existing = buckets.get(opts.key);
  if (!existing || now - existing.windowStartMs >= windowMs) {
    buckets.set(opts.key, { windowStartMs: now, count: 1 });
    return { ok: true, limit, remaining: limit - 1, resetMs: now + windowMs };
  }

  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);
  const resetMs = existing.windowStartMs + windowMs;
  return {
    ok: existing.count <= limit,
    limit,
    remaining,
    resetMs,
  };
}

/** Test-only helper. */
export function __resetRateLimitForTests(): void {
  buckets.clear();
}
