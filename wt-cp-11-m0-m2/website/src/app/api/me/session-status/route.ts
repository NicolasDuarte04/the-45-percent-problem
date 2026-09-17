import { NextResponse } from "next/server";

import { getOperatorSession } from "@/lib/sim/getOperatorSession";

// Checkpoint 17 follow-up: previously the route-group layouts read
// the operator cookie server-side and passed `isOperator` to the
// masthead. Once `/` and `/bracket` (and the pre-existing static
// vault pages) opted into static prerendering, that server-side
// read was baked at build time as `isOperator: false`, hiding the
// Desk tab for verified operators on every cached page.
//
// This endpoint moves the cookie check to a tiny per-request handler.
// The masthead is now a client component that fetches this on mount
// and conditionally renders the Desk tab. Always per-user, never cached.
export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const operator = await getOperatorSession();
  return NextResponse.json(
    { isOperator: operator !== null },
    {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}
