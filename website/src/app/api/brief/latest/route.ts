import { NextResponse } from "next/server";
import { loadLatestBrief } from "@/lib/brief";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Newest published daily brief. Reads from Vercel Blob first; falls back
 * to the bundled sample when Blob is empty / unavailable. The Blob path
 * is populated by the Phase 4 Python pipeline + cron.
 *
 * Response shape: BriefSample (see lib/brief.ts).
 */
export async function GET(): Promise<NextResponse> {
  try {
    const brief = await loadLatestBrief();
    return NextResponse.json(brief, {
      headers: {
        // Edge cache for 5 minutes; the cron-driven update path will
        // explicitly revalidate when Phase 4 wires the webhook.
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (err) {
    console.error("[/api/brief/latest] failed to load brief", err);
    return NextResponse.json(
      { error: "brief_unavailable" },
      { status: 503 },
    );
  }
}
