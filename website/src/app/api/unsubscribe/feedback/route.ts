import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscribers, unsubscribeLog } from "@/lib/db/schema";
import { verifyUnsubscribeToken } from "@/lib/email/hmac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FeedbackBody = z.object({
  u: z.string().min(1).max(2048),
  s: z.string().min(1).max(512),
  reason: z.enum(["too_frequent", "not_relevant", "expected_other", "other"]).optional(),
  feedbackText: z.string().trim().max(2000).optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const parsed = FeedbackBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const { u, s, reason, feedbackText } = parsed.data;
  const payload = verifyUnsubscribeToken(u, s);
  if (!payload) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 401 });
  }

  const rows = await db
    .select({ id: subscribers.id, email: subscribers.email })
    .from(subscribers)
    .where(eq(subscribers.id, payload.sub))
    .limit(1);
  const row = rows[0];
  if (!row) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 404 });
  }

  await db.insert(unsubscribeLog).values({
    subscriberId: row.id,
    email: row.email,
    reason: reason ?? null,
    feedbackText: feedbackText ?? null,
  });

  return NextResponse.json({ ok: true }, { status: 202 });
}
