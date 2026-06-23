import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyResendWebhook } from "@/lib/email/resendWebhook";

// Svix-compatible secret: "whsec_" + base64 of raw key bytes.
const RAW_KEY = Buffer.from("a-thirty-two-byte-test-key-000000");
const SECRET = `whsec_${RAW_KEY.toString("base64")}`;

function sign(id: string, timestamp: string, payload: string): string {
  const signedContent = `${id}.${timestamp}.${payload}`;
  const sig = createHmac("sha256", RAW_KEY).update(signedContent).digest("base64");
  return `v1,${sig}`;
}

const NOW = 1_750_000_000;
const ID = "msg_2abc";
const TS = String(NOW);
const PAYLOAD = JSON.stringify({ type: "email.delivered", data: { email_id: "re_1" } });

describe("verifyResendWebhook", () => {
  it("accepts a correctly signed payload", () => {
    expect(
      verifyResendWebhook({
        payload: PAYLOAD,
        secret: SECRET,
        nowSeconds: NOW,
        headers: { id: ID, timestamp: TS, signature: sign(ID, TS, PAYLOAD) },
      }),
    ).toBe(true);
  });

  it("accepts when the header carries multiple space-delimited signatures", () => {
    const good = sign(ID, TS, PAYLOAD);
    expect(
      verifyResendWebhook({
        payload: PAYLOAD,
        secret: SECRET,
        nowSeconds: NOW,
        headers: { id: ID, timestamp: TS, signature: `v1,deadbeef ${good}` },
      }),
    ).toBe(true);
  });

  it("rejects a tampered payload", () => {
    expect(
      verifyResendWebhook({
        payload: PAYLOAD + " ",
        secret: SECRET,
        nowSeconds: NOW,
        headers: { id: ID, timestamp: TS, signature: sign(ID, TS, PAYLOAD) },
      }),
    ).toBe(false);
  });

  it("rejects a signature made with a different secret", () => {
    const otherKey = Buffer.from("a-different-thirty-two-byte-key00");
    const signedContent = `${ID}.${TS}.${PAYLOAD}`;
    const sig = createHmac("sha256", otherKey).update(signedContent).digest("base64");
    expect(
      verifyResendWebhook({
        payload: PAYLOAD,
        secret: SECRET,
        nowSeconds: NOW,
        headers: { id: ID, timestamp: TS, signature: `v1,${sig}` },
      }),
    ).toBe(false);
  });

  it("rejects a stale timestamp outside the tolerance window", () => {
    const staleTs = String(NOW - 6 * 60);
    expect(
      verifyResendWebhook({
        payload: PAYLOAD,
        secret: SECRET,
        nowSeconds: NOW,
        headers: {
          id: ID,
          timestamp: staleTs,
          signature: sign(ID, staleTs, PAYLOAD),
        },
      }),
    ).toBe(false);
  });

  it("rejects when required Svix headers are missing", () => {
    expect(
      verifyResendWebhook({
        payload: PAYLOAD,
        secret: SECRET,
        nowSeconds: NOW,
        headers: { id: null, timestamp: TS, signature: sign(ID, TS, PAYLOAD) },
      }),
    ).toBe(false);
  });

  it("throws when no secret is configured", () => {
    expect(() =>
      verifyResendWebhook({
        payload: PAYLOAD,
        secret: "",
        nowSeconds: NOW,
        headers: { id: ID, timestamp: TS, signature: sign(ID, TS, PAYLOAD) },
      }),
    ).toThrow(/RESEND_WEBHOOK_SECRET/);
  });
});
