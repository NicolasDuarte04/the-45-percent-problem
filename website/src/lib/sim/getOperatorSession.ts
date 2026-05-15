import { cookies } from "next/headers";

import {
  COOKIE_NAME as OWNER_COOKIE_NAME,
  verifyOwnerCookie,
  type OwnerCookiePayload,
} from "./ownerCookie";

/**
 * Server-side check for the operator (signed `45a:sim:owner`) cookie.
 *
 * Used by:
 *   1. The route-group layouts that render `EditorialMasthead`, to
 *      conditionally surface the `Desk` nav tab.
 *   2. The `/me` Forecast Desk page itself.
 *
 * Reads via the async `cookies()` API (Next 16). Returns the verified
 * payload on success, or null when the cookie is missing, malformed,
 * or its signature does not match. Callers can safely treat null as
 * "no operator session on this device" without further branching.
 *
 * No side effects: this helper does not refresh the cookie. Sliding
 * renewal happens inside the dashboard list endpoint (`/api/predictions`)
 * where a Set-Cookie header is allowed. Server Components cannot set
 * cookies during render.
 */
export async function getOperatorSession(): Promise<OwnerCookiePayload | null> {
  const store = await cookies();
  const value = store.get(OWNER_COOKIE_NAME)?.value;
  return verifyOwnerCookie(value);
}
