/**
 * Shared test fixtures and mocks for the simulator API integration tests.
 *
 * Mocking strategy: each route's tests stub `@/lib/db` at the module
 * level via `vi.mock(...)` (hoisted), and tests configure per-call
 * return values through this file's helpers. The `chainMock` here
 * mimics drizzle's chainable query builder; every method returns the
 * chain itself, and the chain is thenable so `await db.select()...`
 * resolves to the configured result regardless of how many `.where`,
 * `.limit`, `.orderBy`, `.set`, `.values`, `.returning` calls it sees.
 *
 * Pure modules under `@/lib/sim/*` are exercised live; only the DB
 * client and (for the email-attach route) `subscribeService` are
 * mocked. The in-memory `rateLimit` is real and reset per test.
 */

import { NextRequest } from "next/server";
import type { Prediction } from "@/lib/db/schema";

// Minimal thenable that quacks like a drizzle query chain. Every chain
// method returns `chain` itself; the terminal await resolves to `result`.
//
// Return type is intentionally `any`: drizzle's `select()/insert()/update()`
// return strongly-typed builders (PgSelectBuilder, PgInsertBuilder,
// PgUpdateBuilder) that this duck-typed mock cannot satisfy structurally.
// Keeping `any` here is a localized escape hatch for test infrastructure;
// the route handler's runtime contract (the chain methods + thenable) is
// fully exercised by the integration tests below, which is what matters.
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function chainMock(result: unknown): any {
  const chain: Record<string, unknown> = {};
  chain.from = () => chain;
  chain.where = () => chain;
  chain.innerJoin = () => chain;
  chain.leftJoin = () => chain;
  chain.set = () => chain;
  chain.values = () => chain;
  chain.limit = () => chain;
  chain.orderBy = () => chain;
  chain.returning = () => chain;
  chain.onConflictDoUpdate = () => chain;
  chain.onConflictDoNothing = () => chain;
  chain.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  chain.catch = (reject: (e: unknown) => unknown) => Promise.resolve(result).catch(reject);
  return chain;
}

// Sample row matching the predictions-table $inferSelect type. Tests
// override individual fields via the `overrides` parameter.
export function samplePredictionRow(
  overrides: Partial<Prediction> = {},
): Prediction {
  return {
    id: "45A-2026-TEST",
    subscriberId: null,
    email: null,
    mode: "final_four",
    scenario: { semifinalists: ["ARG", "BRA", "FRA", "ENG"] },
    storyLine: "Argentina, Brazil, France, and England in the semifinals.",
    countOriginal: 184,
    countCurrent: 184,
    total: 10000,
    state: "alive",
    killedBy: null,
    modelSha: "a3f2c1d",
    snapshotSha: "9b7e2f4",
    submittedAt: new Date("2026-05-03T00:00:00.000Z"),
    updatedAt: new Date("2026-05-03T00:00:00.000Z"),
    ...overrides,
  };
}

// NextRequest provides .nextUrl and .cookies; both are used by the
// route handlers, so tests must construct NextRequest (not plain Request)
// even for paths that only read body/headers, for consistency.

export function jsonPostRequest(opts: {
  url: string;
  body: unknown;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
}): NextRequest {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...opts.headers,
  };
  if (opts.cookies) {
    const cookieHeader = Object.entries(opts.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
    headers["cookie"] = cookieHeader;
  }
  return new NextRequest(opts.url, {
    method: "POST",
    headers,
    body: typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body),
  });
}

export function getRequest(opts: {
  url: string;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
}): NextRequest {
  const headers: Record<string, string> = { ...opts.headers };
  if (opts.cookies) {
    const cookieHeader = Object.entries(opts.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
    headers["cookie"] = cookieHeader;
  }
  return new NextRequest(opts.url, {
    method: "GET",
    headers,
  });
}
