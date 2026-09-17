import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Resend signs webhooks with Svix. The signature scheme (no svix SDK needed):
 *
 *   signedContent = `${svix-id}.${svix-timestamp}.${rawBody}`
 *   expected      = base64( HMAC_SHA256(secretBytes, signedContent) )
 *
 * where `secretBytes` is the base64-decoded secret after stripping the
 * `whsec_` prefix. The `svix-signature` header is a space-delimited list of
 * `v<n>,<sig>` entries; the webhook is authentic if any v1 entry matches.
 *
 * We verify by hand (node:crypto only) to avoid adding the svix dependency.
 */

export interface SvixHeaders {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
}

// Reject timestamps further than this from now, to blunt replay attacks.
const TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;

export function verifyResendWebhook(opts: {
  payload: string;
  headers: SvixHeaders;
  secret?: string;
  nowSeconds?: number;
}): boolean {
  const secret = opts.secret ?? process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("RESEND_WEBHOOK_SECRET is not set.");
  }

  const { id, timestamp, signature } = opts.headers;
  if (!id || !timestamp || !signature) {
    return false;
  }

  const ts = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) {
    return false;
  }
  const now = opts.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > TIMESTAMP_TOLERANCE_SECONDS) {
    return false;
  }

  const secretKey = secret.startsWith("whsec_")
    ? secret.slice("whsec_".length)
    : secret;

  let keyBytes: Buffer;
  try {
    keyBytes = Buffer.from(secretKey, "base64");
  } catch {
    return false;
  }
  if (keyBytes.length === 0) {
    return false;
  }

  const signedContent = `${id}.${timestamp}.${opts.payload}`;
  const expected = createHmac("sha256", keyBytes)
    .update(signedContent)
    .digest("base64");
  const expectedBuf = Buffer.from(expected);

  for (const entry of signature.split(" ")) {
    const comma = entry.indexOf(",");
    const sig = comma === -1 ? entry : entry.slice(comma + 1);
    const sigBuf = Buffer.from(sig);
    if (
      sigBuf.length === expectedBuf.length &&
      timingSafeEqual(sigBuf, expectedBuf)
    ) {
      return true;
    }
  }

  return false;
}
