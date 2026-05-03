"use client";

/**
 * Cloudflare Turnstile widget wrapper.
 *
 * v1: deferred. The widget is mounted only when
 * NEXT_PUBLIC_TURNSTILE_ENABLED === "true". Until then this component
 * renders nothing and onToken is never called. The /api/subscribe route
 * tolerates the absent token via the TODO(turnstile) comment there.
 *
 * When re-enabling: load https://challenges.cloudflare.com/turnstile/v0/api.js,
 * mount the widget div with data-sitekey={NEXT_PUBLIC_TURNSTILE_SITE_KEY},
 * and call onToken from the data-callback bridge.
 */
export interface TurnstileProps {
  onToken: (token: string) => void;
  theme?: "light" | "dark" | "auto";
}

export function Turnstile(_: TurnstileProps): null {
  if (process.env.NEXT_PUBLIC_TURNSTILE_ENABLED !== "true") return null;
  // TODO(turnstile): real widget mount goes here.
  return null;
}
