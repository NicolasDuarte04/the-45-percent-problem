/**
 * src/lib/revalidation.ts
 *
 * cp-13 (Fix 6). Shared revalidation helper for the public snapshot surfaces.
 *
 * When a settled match outcome is committed (via /api/admin/match-outcomes or
 * /api/ingest/match-outcomes), the public quant pages should drop their cached
 * static renders so the next request re-derives them. This helper centralises
 * the route list so the two endpoints can never drift apart.
 *
 * IMPORTANT — what this does and does not accomplish today (see
 * docs/onboarding/cp-13-inspection-notes.md §6): the public quant pages are
 * `force-static` and render probabilities from build-time-frozen JSON
 * (`public/data/latest/*.json`) merged with structural *identity* from the
 * fixtures DB. A match_outcomes upsert changes neither, so on its own
 * `revalidatePath` re-renders identical bytes. The data that actually changes
 * the bracket is produced by the snapshot-regeneration pipeline; cp-13 triggers
 * that pipeline on-demand from the same endpoints (see regenDispatch.ts). This
 * helper is the correct, forward-compatible cache-purge hook to pair with that
 * regeneration: it costs nothing today and becomes load-bearing the moment any
 * of these routes reads a runtime-mutable settled source.
 *
 * `revalidatePath` is a server-only API and must be called from a route handler
 * or server action at request time — never at module load. Both callers invoke
 * this from inside their POST handler after the upsert has committed.
 */

import { revalidatePath } from "next/cache";

type RouteSpec = {
  /** The path passed to revalidatePath. For dynamic routes use the literal
   *  `[param]` segment together with `type: "page"`. */
  path: string;
  type?: "page" | "layout";
};

/**
 * Every public surface whose render depends on the tournament snapshot. Static
 * routes are revalidated by their literal path; dynamic routes are revalidated
 * by their route pattern + `"page"` so that *all* matching pages are purged
 * (e.g. one call clears every `/match/<id>`), not just a single concrete URL.
 */
const PUBLIC_SNAPSHOT_ROUTES: readonly RouteSpec[] = [
  { path: "/bracket" },
  { path: "/" },
  { path: "/ledger" },
  { path: "/match/[id]", type: "page" },
  { path: "/team/[code]", type: "page" },
] as const;

export type RevalidationResult = {
  ok: boolean;
  revalidated: string[];
  failed: { route: string; error: string }[];
};

/**
 * Revalidate every public snapshot route. Never throws: a failure on one route
 * is recorded and the rest still run, and the overall call is safe to invoke
 * from a handler whose database write has already committed (we would rather
 * lose freshness on one surface than fail an upsert that is already durable).
 */
export function revalidatePublicSnapshotRoutes(): RevalidationResult {
  const revalidated: string[] = [];
  const failed: { route: string; error: string }[] = [];

  for (const route of PUBLIC_SNAPSHOT_ROUTES) {
    try {
      if (route.type) {
        revalidatePath(route.path, route.type);
      } else {
        revalidatePath(route.path);
      }
      revalidated.push(route.path);
    } catch (err) {
      failed.push({
        route: route.path,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { ok: failed.length === 0, revalidated, failed };
}
