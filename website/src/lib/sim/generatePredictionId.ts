import { randomBytes } from "node:crypto";

// Crockford base32 alphabet — excludes I, L, O, U to avoid visual
// confusion (1/I, 1/L, 0/O) and accidental profanity (U).
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const PREFIX = "45A-2026-";
const TAIL_LEN = 4;

/**
 * Generate one prediction ID candidate. Format: `45A-2026-XXXX` where
 * XXXX is four Crockford-base32 chars from a cryptographically-strong
 * random source. The space is 32^4 = 1,048,576 — plenty of headroom
 * before a collision is statistically meaningful, but the caller must
 * still check for collisions on insert and retry.
 */
export function generatePredictionId(): string {
  const bytes = randomBytes(TAIL_LEN);
  let tail = "";
  for (let i = 0; i < TAIL_LEN; i++) {
    tail += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `${PREFIX}${tail}`;
}

/**
 * Validate the textual shape of a prediction ID.
 */
export function isValidPredictionId(id: string): boolean {
  if (!id.startsWith(PREFIX)) return false;
  const tail = id.slice(PREFIX.length);
  if (tail.length !== TAIL_LEN) return false;
  for (const ch of tail) {
    if (!ALPHABET.includes(ch)) return false;
  }
  return true;
}

/**
 * Generate a unique prediction ID by retrying until `existsCheck`
 * returns false. Caps at `maxAttempts` (default 5) and throws on
 * exhaustion — at 1M IDs and a low-volume Phase A, that ceiling is
 * effectively unreachable.
 */
export async function generateUniquePredictionId(
  existsCheck: (id: string) => Promise<boolean>,
  maxAttempts = 5,
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = generatePredictionId();
    if (!(await existsCheck(candidate))) return candidate;
  }
  throw new Error(
    `generateUniquePredictionId: exhausted ${maxAttempts} attempts; investigate before raising the cap.`,
  );
}

export const PREDICTION_ID_REGEX = /^45A-2026-[0-9A-HJKMNP-TV-Z]{4}$/;
