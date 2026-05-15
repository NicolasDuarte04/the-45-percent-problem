import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { predictions } from "@/lib/db/schema";

import {
  toOwnerPredictionView,
  type OwnerPredictionView,
} from "./predictionViews";

/**
 * Shared predictions-by-email query used by:
 *   1. /api/predictions GET (owner-scoped dashboard list endpoint)
 *   2. /me Forecast Desk page (server component)
 *
 * Both call sites prove ownership via the signed `45a:sim:owner` cookie
 * before invoking this helper. The helper itself performs no auth check;
 * it is a pure read keyed on the email argument.
 *
 * Returns predictions newest-first, serialised through
 * `toOwnerPredictionView` so callers can render uniformly without
 * touching raw rows.
 *
 * The `email` argument is expected to be already lowercased by the
 * caller (the cookie payload stores lowercase; query strings are
 * lowercased via Zod). The query uses `lower(predictions.email)` to
 * match historical rows that may have been written with mixed case.
 */
export async function getUserPredictions(
  email: string,
): Promise<OwnerPredictionView[]> {
  const rows = await db
    .select()
    .from(predictions)
    .where(eq(sql`lower(${predictions.email})`, email))
    .orderBy(desc(predictions.submittedAt));
  return rows.map(toOwnerPredictionView);
}
