import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { predictions } from "@/lib/db/schema";
import { isValidPredictionId } from "@/lib/sim/generatePredictionId";
import { toPublicPredictionView } from "@/lib/sim/predictionViews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public read by prediction ID. Used by:
 *   - the public permalink page `/scenario/p/[id]` (server-rendered),
 *   - the dashboard's "view ticket" inline render,
 *   - any future share-card image renderer.
 *
 * Returns a sanitized view via toPublicPredictionView — no email,
 * no subscriberId. Per handoff §3 addition (c), the public permalink
 * must not leak either field.
 *
 * No auth, no rate limit in Phase A. The endpoint is link-public:
 * anyone with the short ID gets the sanitized record. Crawler exclusion
 * happens at the page layer via <meta name="robots" content="noindex,nofollow">.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await ctx.params;
  if (!isValidPredictionId(id)) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(predictions)
    .where(eq(predictions.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return NextResponse.json({ ok: false, error: "notFound" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, prediction: toPublicPredictionView(row) });
}
