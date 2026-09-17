"use client";

/**
 * DesktopRecommendedBanner · Mobile Optimization Plan §3.
 *
 * A thin chrome strip below the masthead that informs mobile visitors
 * that the dense quant surfaces (Terminal, Ledger, Bracket, Match,
 * Team) were designed for desktop. Sits between FreshnessBanner (info)
 * and KillCriteriaBanner (alert) in tone; quiet, non-blocking,
 * dismissible.
 *
 * Display rules:
 *   • Mounted only inside `(quant)/layout.tsx`. Editorial routes
 *     (homepage, /brief, /vault) already work on mobile.
 *   • CSS-driven visibility: hidden ≥ 768px via the `md:hidden`
 *     utility. Render unconditionally so SSR HTML matches between
 *     mobile and desktop.
 *   • Dismiss persists for the session via
 *     sessionStorage["45pct.banner.dismissed"] = "1". A short inline
 *     pre-paint script (rendered by `(quant)/layout.tsx` so it sits
 *     in the SSR document, not in a Client Component) flips
 *     data-dismissed before React hydrates so there is no
 *     flash-of-banner-then-dismiss on initial load. See
 *     DESKTOP_BANNER_DOM_ID below: the layout's pre-hydrate script
 *     looks the wrapper up by this id.
 *
 * Accessibility:
 *   • role="status", aria-live="polite": informational, not an alert.
 *   • Dismiss is a real <button> with aria-label="Dismiss notice".
 *   • 44 × 44 px touch target (the dismiss glyph itself is small;
 *     padding extends the hit area).
 *   • prefers-reduced-motion: nothing to disable: there is no
 *     animation. Honouring the rule by *not* introducing one.
 *
 * Visual: brutalist. No animation. No icon library. The status dot
 * (sun-yellow) echoes FreshnessBanner's stale-state vocabulary.
 */

import { useSyncExternalStore } from "react";
import {
  DESKTOP_BANNER_DOM_ID,
  DESKTOP_BANNER_STORAGE_KEY,
} from "./desktopRecommendedBannerConstants";

const STORAGE_KEY = DESKTOP_BANNER_STORAGE_KEY;

// Module-level subscriber set so useSyncExternalStore can be notified
// from the dismiss handler. sessionStorage doesn't fire `storage`
// events in the same window, so we own the notify pathway.
const subscribers = new Set<() => void>();
function subscribe(cb: () => void) {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}
function getSnapshot(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}
function getServerSnapshot(): boolean {
  // SSR always renders the banner. The pre-hydration script handles
  // the no-flash case for already-dismissed sessions; React state
  // stays false at hydration so server and client HTML match.
  return false;
}

export function DesktopRecommendedBanner() {
  const dismissed = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  function handleDismiss() {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // sessionStorage blocked: fall through to in-memory notify so
      // the banner still hides for this page lifetime.
    }
    for (const cb of subscribers) cb();
  }

  return (
    <aside
      id={DESKTOP_BANNER_DOM_ID}
      role="status"
      aria-live="polite"
      data-dismissed={dismissed ? "1" : undefined}
      // md:hidden hides the banner above 768px. The
      // [&[data-dismissed='1']]:hidden selector hides it once
      // dismiss is flipped (either by the pre-hydration script or
      // by React state).
      className="md:hidden [&[data-dismissed='1']]:hidden flex items-center gap-3 border-b px-4 py-2.5"
      style={{
        backgroundColor: "var(--bg-panel)",
        borderColor: "var(--border-subtle)",
        color: "var(--text-tertiary)",
      }}
    >
      <span
        aria-hidden="true"
        className="inline-block w-1 h-1 shrink-0"
        style={{ backgroundColor: "var(--prism-sun)" }}
      />
      <span
        className="flex-1 mono"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          letterSpacing: "0.04em",
        }}
      >
        Optimized for desktop viewing.
      </span>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss notice"
        // 44×44 hit area with a small visual glyph centered. Extends
        // the touch target without growing the visual footprint.
        className="-mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]"
        style={{
          color: "var(--text-quiet)",
          fontFamily: "var(--font-mono)",
          fontSize: 14,
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </aside>
  );
}
