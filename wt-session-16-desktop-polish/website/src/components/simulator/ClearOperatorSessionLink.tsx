"use client";

import { useState } from "react";

/**
 * [ Clear operator session ] button. Posts to /api/me/logout (which
 * clears the signed `45a:sim:owner` cookie), then reloads the page so
 * the server re-evaluates the session and renders the unauthenticated
 * empty state.
 *
 * Checkpoint 17 (A2): extracted from ForecastDesk so the desk shell
 * can be a server component while this single button stays a tiny
 * client island.
 */
export function ClearOperatorSessionLink() {
  const [pending, setPending] = useState(false);
  return (
    <p className="mt-16">
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          if (pending) return;
          setPending(true);
          try {
            await fetch("/api/me/logout", {
              method: "POST",
              credentials: "same-origin",
            });
          } catch {
            // Swallow: the user can refresh manually if the network
            // call failed. Reloading still re-evaluates the cookie on
            // the server, so a partial failure is recoverable.
          }
          window.location.reload();
        }}
        className="font-mono text-[11px] uppercase tracking-[0.10em] text-[var(--text-quiet)] hover:text-[var(--text-tertiary)] focus:outline-none focus-visible:underline underline-offset-4 disabled:opacity-60"
      >
        [ Clear operator session ]
      </button>
    </p>
  );
}
