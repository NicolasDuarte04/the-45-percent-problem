/**
 * Cached prediction fetcher: shared by the permalink page and generateMetadata.
 *
 * React's `cache()` memoises the result per request so the DB is only hit once
 * even when both `generateMetadata` and `Page` call this function in the same
 * RSC render cycle.
 *
 * Returns the raw Prediction row (not yet sanitised) so callers can choose
 * the appropriate view projection (toPublicPredictionView, etc.).
 * Returns `null` when the ID is not found.
 */

import { cache } from "react";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { predictions } from "@/lib/db/schema";
import type { Prediction } from "@/lib/db/schema";

export const getPrediction = cache(
  async (id: string): Promise<Prediction | null> => {
    const rows = await db
      .select()
      .from(predictions)
      .where(eq(predictions.id, id))
      .limit(1);
    return rows[0] ?? null;
  },
);
