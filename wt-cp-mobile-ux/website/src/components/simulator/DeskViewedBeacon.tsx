"use client";

import { useEffect, useRef } from "react";

import { claimDeskViewed, track } from "@/lib/analytics/track";

/**
 * One-shot analytics beacon for the Forecast Desk. Fires `desk_viewed`
 * exactly once per session on mount when the cookie-valid /me page
 * renders. Renders no DOM; the only purpose is the side effect.
 *
 * Checkpoint 17 (A2): extracted from ForecastDesk so the desk shell
 * can be a server component while the analytics fire-once stays
 * properly client-side.
 */
export function DeskViewedBeacon() {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    if (claimDeskViewed()) {
      track("desk_viewed");
    }
  }, []);
  return null;
}
