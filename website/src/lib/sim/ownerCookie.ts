import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Owner cookie for the simulator dashboard.
 *
 * The cookie identifies the verified email that owns a set of predictions.
 * It is set on `/api/verify` when the verification token belongs to a
 * simulator subscriber, and refreshed on every dashboard visit (sliding
 * 1-year renewal). A user who returns within 11 months keeps it; one
 * gone 13 months re-verifies via the email link in any state-change
 * notification (Phase B+) or the magic-link flow (Phase B+).
 *
 * Security: signed with PREDICTION_OWNER_HMAC_SECRET: a SEPARATE secret
 * from UNSUBSCRIBE_HMAC_SECRET, because the threat models differ
 * (unsubscribe is one-shot; this is session-equivalent).
 */

export const COOKIE_NAME = "45a:sim:owner";
export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

const ENCODER: BufferEncoding = "base64url";

function getSecret(): string {
  const s = process.env.PREDICTION_OWNER_HMAC_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "PREDICTION_OWNER_HMAC_SECRET must be set and >= 32 chars. Generate via: openssl rand -hex 32",
    );
  }
  return s;
}

function sign(input: string): string {
  return createHmac("sha256", getSecret())
    .update(input)
    .digest()
    .toString(ENCODER);
}

export interface OwnerCookiePayload {
  /** Lowercased verified email. */
  email: string;
  /** Issued-at, seconds since epoch. */
  iat: number;
}

export function signOwnerCookie(email: string): string {
  const payload: OwnerCookiePayload = {
    email: email.toLowerCase(),
    iat: Math.floor(Date.now() / 1000),
  };
  const u = Buffer.from(JSON.stringify(payload), "utf8").toString(ENCODER);
  const s = sign(u);
  return `${u}.${s}`;
}

export function verifyOwnerCookie(value: string | undefined | null): OwnerCookiePayload | null {
  if (!value) return null;
  const dot = value.indexOf(".");
  if (dot < 0) return null;
  const u = value.slice(0, dot);
  const s = value.slice(dot + 1);
  if (!u || !s) return null;

  let expected: string;
  try {
    expected = sign(u);
  } catch {
    return null; // missing/invalid secret at runtime
  }

  const a = Buffer.from(s);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const json = Buffer.from(u, ENCODER).toString("utf8");
    const parsed = JSON.parse(json) as Partial<OwnerCookiePayload>;
    if (typeof parsed.email !== "string" || typeof parsed.iat !== "number") {
      return null;
    }
    return { email: parsed.email, iat: parsed.iat };
  } catch {
    return null;
  }
}

/** Cookie attribute string for `Set-Cookie`. */
export function cookieSetHeader(value: string): string {
  return [
    `${COOKIE_NAME}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
    process.env.NODE_ENV === "production" ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

/** Cookie clear header: used on dashboard sign-out, if/when added. */
export function cookieClearHeader(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/**
 * Sliding renewal: re-issue the owner cookie with a fresh `iat` and a
 * fresh `Max-Age`. Call from the dashboard handler on each visit so a
 * returning user keeps their session as long as they engage; only
 * absences longer than COOKIE_MAX_AGE_SECONDS force a re-verification
 * via the magic link in any state-change email (Phase B+).
 *
 * Usage: `response.headers.set('Set-Cookie', slidingRenewHeader(payload))`
 * after a successful `verifyOwnerCookie`.
 */
export function slidingRenewHeader(payload: OwnerCookiePayload): string {
  const renewed = signOwnerCookie(payload.email);
  return cookieSetHeader(renewed);
}
