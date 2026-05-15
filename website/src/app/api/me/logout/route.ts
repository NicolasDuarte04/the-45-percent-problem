import { NextResponse } from "next/server";

import { cookieClearHeader } from "@/lib/sim/ownerCookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Clear the `45a:sim:owner` cookie. Used by the `[ Clear operator
 * session ]` affordance on /me. The endpoint accepts POST only so the
 * action cannot be invoked by a stray <img> or prefetch.
 *
 * No rate limit: the action is destructive only to the caller's own
 * session, has no side effect beyond the response Set-Cookie header,
 * and is gated by the browser sending the cookie back.
 */
export async function POST(): Promise<NextResponse> {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set("Set-Cookie", cookieClearHeader());
  return response;
}
