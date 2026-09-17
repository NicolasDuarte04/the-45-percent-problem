import { createHmac, timingSafeEqual } from "node:crypto";

const ENCODER_ALPHABET = "base64url" as const;

function getSecret(): string {
  const secret = process.env.UNSUBSCRIBE_HMAC_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "UNSUBSCRIBE_HMAC_SECRET must be set and >= 32 chars. Generate via: openssl rand -hex 32",
    );
  }
  return secret;
}

export interface UnsubscribeTokenPayload {
  /** Subscriber UUID. */
  sub: string;
  /** Issued-at, seconds since epoch. */
  iat: number;
}

function sign(input: string): string {
  return createHmac("sha256", getSecret())
    .update(input)
    .digest()
    .toString(ENCODER_ALPHABET);
}

/**
 * Build an unsubscribe URL component pair (`u`, `s`) per the contract in
 * Phase 2. `u` carries the encoded payload; `s` carries the HMAC signature.
 *
 * Use `verifyUnsubscribeToken` on the server to recover the payload.
 */
export function signUnsubscribeToken(payload: UnsubscribeTokenPayload): {
  u: string;
  s: string;
} {
  const u = Buffer.from(JSON.stringify(payload), "utf8").toString(
    ENCODER_ALPHABET,
  );
  const s = sign(u);
  return { u, s };
}

export function verifyUnsubscribeToken(
  u: string,
  s: string,
): UnsubscribeTokenPayload | null {
  if (!u || !s) return null;

  const expected = sign(u);
  const a = Buffer.from(s);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const json = Buffer.from(u, ENCODER_ALPHABET).toString("utf8");
    const parsed = JSON.parse(json) as Partial<UnsubscribeTokenPayload>;
    if (typeof parsed.sub !== "string" || typeof parsed.iat !== "number") {
      return null;
    }
    return { sub: parsed.sub, iat: parsed.iat };
  } catch {
    return null;
  }
}

/**
 * RFC 8058 compliant List-Unsubscribe header pair. The POST endpoint must
 * accept `List-Unsubscribe=One-Click` form bodies and treat them as an
 * authenticated unsubscribe.
 */
export function buildListUnsubscribeHeaders(opts: {
  unsubscribeUrl: string;
}): Record<string, string> {
  return {
    "List-Unsubscribe": `<${opts.unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
