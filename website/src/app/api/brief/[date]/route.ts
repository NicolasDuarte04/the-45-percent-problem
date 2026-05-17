import { NextResponse, type NextRequest } from "next/server";
import { loadBriefByDate } from "@/lib/brief";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One published brief, addressed by ISO date (YYYY-MM-DD). Reads from
 * Vercel Blob first; the bundled sample serves as a local-dev convenience
 * for that one date.
 *
 * 400: invalid date format
 * 404: no brief for that date
 * 503: backend failure
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ date: string }> },
): Promise<NextResponse> {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }

  try {
    const brief = await loadBriefByDate(date);
    if (!brief) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json(brief, {
      headers: {
        // Past briefs are immutable once written; cache hard.
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err) {
    console.error("[/api/brief/[date]] failed to load brief", date, err);
    return NextResponse.json(
      { error: "brief_unavailable" },
      { status: 503 },
    );
  }
}
