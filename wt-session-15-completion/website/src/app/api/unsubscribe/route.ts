import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscribers, unsubscribeLog } from "@/lib/db/schema";
import { verifyUnsubscribeToken } from "@/lib/email/hmac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function siteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return url.replace(/\/$/, "");
}

function redirectTo(path: string, status: 303 | 307 = 303): NextResponse {
  return NextResponse.redirect(`${siteUrl()}${path}`, { status });
}

async function applyUnsubscribe(u: string, s: string): Promise<boolean> {
  const payload = verifyUnsubscribeToken(u, s);
  if (!payload) return false;

  const rows = await db
    .select({ id: subscribers.id, email: subscribers.email })
    .from(subscribers)
    .where(eq(subscribers.id, payload.sub))
    .limit(1);
  const row = rows[0];
  if (!row) return false;

  const now = new Date();
  await db
    .update(subscribers)
    .set({ status: "unsubscribed", unsubscribedAt: now })
    .where(eq(subscribers.id, row.id));

  await db.insert(unsubscribeLog).values({
    subscriberId: row.id,
    email: row.email,
    reason: "user_link",
  });
  return true;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const u = req.nextUrl.searchParams.get("u") ?? "";
  const s = req.nextUrl.searchParams.get("s") ?? "";

  const ok = await applyUnsubscribe(u, s);
  return redirectTo(ok ? "/unsubscribe?state=success" : "/unsubscribe?state=invalid");
}

/**
 * RFC 8058 one-click POST handler. Mail clients send
 * `List-Unsubscribe=One-Click` as a form body to the unsubscribe URL.
 * We accept the same `u` and `s` from the URL query string, ignore the
 * body, and return 200.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const u = req.nextUrl.searchParams.get("u") ?? "";
  const s = req.nextUrl.searchParams.get("s") ?? "";

  const ok = await applyUnsubscribe(u, s);
  return ok
    ? new NextResponse(null, { status: 200 })
    : new NextResponse(null, { status: 400 });
}
