"use client";

/**
 * Shared hooks for cp-08 additive onboarding. Both hooks use
 * `useSyncExternalStore` so they avoid the `react-hooks/set-state-in-effect`
 * lint rule: external state (media query, localStorage) is read directly
 * on every render and subscribed to via the store's subscribe callback,
 * with no synchronous setState in a `useEffect` body.
 *
 * SSR snapshot returns the conservative default for each hook (no
 * reduced motion, not seen) so first-paint markup matches what the
 * `beforeInteractive` script in layout.tsx stamps on the documentElement.
 */
import { useSyncExternalStore } from "react";

const ONBOARDING_SEEN_KEY = "45a.onboarding.seen";
const ONBOARDING_SEEN_EVENT = "45a:onboarding:seen";

function readSeenSnapshot(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_SEEN_KEY) === "true";
  } catch {
    return false;
  }
}

function subscribeSeen(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  function onCustom() {
    callback();
  }
  function onStorage(e: StorageEvent) {
    if (e.key === ONBOARDING_SEEN_KEY) callback();
  }
  window.addEventListener(ONBOARDING_SEEN_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(ONBOARDING_SEEN_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Returns the current value of `localStorage["45a.onboarding.seen"]`.
 * Re-renders the consumer when (a) the in-page custom event
 * `45a:onboarding:seen` fires (broadcast by OnboardingController on
 * any dismissal path) or (b) the cross-tab `storage` event signals a
 * write from another tab.
 */
export function useOnboardingSeen(): boolean {
  return useSyncExternalStore(
    subscribeSeen,
    readSeenSnapshot,
    /* SSR snapshot: treat as not-seen so the static prerender matches
       what the pre-hydrate script in layout.tsx writes for a first
       visit. Returning visitors swap to true after the script runs;
       useSyncExternalStore re-reads on the first client render and
       the consumer updates without a hydration mismatch warning
       (the chip is only mounted after `seen` flips to false on
       first render, which is the SSR default). */
    () => false,
  );
}

function subscribeReducedMotion(callback: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function readReducedMotionSnapshot(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Returns the current value of `prefers-reduced-motion: reduce`.
 * Used by the chip and modal to skip CSS entrance animations at the
 * render layer (globals.css also clamps via media query as a safety
 * net for users whose preference flips mid-session).
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    readReducedMotionSnapshot,
    /* SSR snapshot: false (no reduced motion). The chip and modal are
       only rendered client-side after first paint, so this default
       never reaches the DOM. */
    () => false,
  );
}
