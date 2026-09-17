import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sendLog, subscribers, suppressionList } from "@/lib/db/schema";
import { verifyResendWebhook } from "@/lib/email/resendWebhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Resend delivery webhook. Records the lifecycle of every send against
 * send_log (matched by Resend's message id) and, on a hard bounce or spam
 * complaint, marks the subscriber and adds them to the suppression list so
 * we stop mailing a dead or hostile address.
 *
 * Wiring: add this URL as a webhook in the Resend dashboard
 * (https://resend.com/webhooks), subscribe to the delivered / bounced /
 * complained (and optionally opened / clicked) events, and set
 * RESEND_WEBHOOK_SECRET to the signing secret it shows.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const payload = await req.text();

  let valid: boolean;
  try {
    valid = verifyResendWebhook({
      payload,
      headers: {
        id: req.headers.get("svix-id"),
        timestamp: req.headers.get("svix-timestamp"),
        signature: req.headers.get("svix-signature"),
      },
    });
  } catch (err) {
    // Misconfiguration (no secret). Surface as a server error, not a 401.
    console.error("[resend-webhook] verification error", err);
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }

  if (!valid) {
    return NextResponse.json({ ok: false, error: "invalid_signature" }, {
      status: 401,
    });
  }

  let event: {
    type?: string;
    data?: { email_id?: string; to?: string[] | string };
  };
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const type = event.type ?? "";
  const messageId = event.data?.email_id ?? null;
  const toRaw = Array.isArray(event.data?.to)
    ? event.data?.to[0]
    : event.data?.to;
  const email = toRaw?.trim().toLowerCase() ?? null;
  const now = new Date();

  // Stamp the matching send_log row's lifecycle column. No-op if the message
  // id is unknown (e.g. a send that predates send_log logging).
  async function stampSendLog(column: "deliveredAt" | "openedAt" | "clickedAt" | "bouncedAt" | "complainedAt") {
    if (!messageId) return;
    await db
      .update(sendLog)
      .set({ [column]: now })
      .where(eq(sendLog.messageId, messageId));
  }

  async function suppress(reason: "bounced" | "complained") {
    if (!email) return;
    await db
      .update(subscribers)
      .set({ status: reason })
      .where(eq(subscribers.email, email));
    await db
      .insert(suppressionList)
      .values({ email, reason })
      .onConflictDoNothing();
  }

  switch (type) {
    case "email.delivered":
      await stampSendLog("deliveredAt");
      break;
    case "email.opened":
      await stampSendLog("openedAt");
      break;
    case "email.clicked":
      await stampSendLog("clickedAt");
      break;
    case "email.bounced":
      await stampSendLog("bouncedAt");
      await suppress("bounced");
      break;
    case "email.complained":
      await stampSendLog("complainedAt");
      await suppress("complained");
      break;
    default:
      // email.sent, email.delivery_delayed, etc. Acknowledge without action.
      break;
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
