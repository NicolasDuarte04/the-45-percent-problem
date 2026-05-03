import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { and, eq, gt } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscribers } from "@/lib/db/schema";
import { VERIFICATION_TOKEN_TTL_HOURS } from "@/lib/email/verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TokenQuery = z.object({
  token: z.string().min(16).max(256),
});

function siteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return url.replace(/\/$/, "");
}

function redirectTo(path: string): NextResponse {
  return NextResponse.redirect(`${siteUrl()}${path}`, { status: 303 });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const parsed = TokenQuery.safeParse({
    token: req.nextUrl.searchParams.get("token") ?? "",
  });
  if (!parsed.success) {
    return redirectTo("/verify?state=expired");
  }

  const { token } = parsed.data;
  const now = new Date();
  const ttlMs = VERIFICATION_TOKEN_TTL_HOURS * 3600 * 1000;
  const earliestSent = new Date(now.getTime() - ttlMs);

  const matched = await db
    .update(subscribers)
    .set({
      status: "active",
      verifiedAt: now,
      verificationToken: null,
    })
    .where(
      and(
        eq(subscribers.verificationToken, token),
        eq(subscribers.status, "pending"),
        gt(subscribers.verificationSentAt, earliestSent),
      ),
    )
    .returning({ id: subscribers.id });

  if (matched.length === 0) {
    // Idempotent path: token may already have been consumed and the user
    // is just re-clicking the link. If the email is now active, treat as success.
    const already = await db
      .select({ id: subscribers.id })
      .from(subscribers)
      .where(
        and(
          eq(subscribers.status, "active"),
          // Look up by hash of the token would be cleaner; for v1 we rely
          // on the just-cleared token being unrecoverable, so the only
          // signal we have is "no row matched". Treat as expired.
          sql`false`,
        ),
      )
      .limit(1);
    void already;
    return redirectTo("/verify?state=expired");
  }

  return redirectTo("/confirmed");
}
