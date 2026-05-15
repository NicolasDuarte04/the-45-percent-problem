/**
 * Typed wrapper for the Plausible custom event API.
 *
 * SSR-safe: silently no-ops when window is undefined or Plausible has not
 * loaded yet. The EventMap discriminated union prevents callers from emitting
 * free-form event names or mismatched props.
 *
 * Plausible requires script.tagged-events.js (not script.js) for
 * window.plausible() calls; the layout.tsx script tag must use that variant.
 */

import type { RarityBand } from "@/lib/sim/types";

type SimulatorMode = "final_four" | "champions_path" | "full_bracket";
type SimulatorSurface = "page" | "inline";

interface EventMap {
  // `surface` discriminates between the dedicated /scenario/* mode pages
  // ("page") and the inline Final Four section embedded on the home page
  // ("inline"). Lets us count engaged simulator opens separately from
  // home-page passive views (the home view is already a Plausible
  // page-view event). Added for P0.1.
  simulator_opened: { mode: SimulatorMode; surface: SimulatorSurface };
  first_pick: { mode: SimulatorMode };
  submit_success: { mode: SimulatorMode; rarity_band: RarityBand };
  share_action: { type: "copy" | "png" | "native" | "copy_post" };
  alert_armed: undefined;
  // Fires once per session per slug when the Final Four page hydrates with
  // a valid `initialScenario` derived from a promo card slug (`?card=`).
  // Added for P0.7. The slug attributes social-channel conversions per
  // curated scenario; deduped via sessionStorage so a reload on the same
  // URL does not re-fire.
  promo_card_landed: { slug: string };
}

declare global {
  interface Window {
    plausible?: (
      name: string,
      opts?: { props?: Record<string, string> },
    ) => void;
  }
}

export function track<K extends keyof EventMap>(
  name: K,
  ...args: EventMap[K] extends undefined ? [] : [props: EventMap[K]]
): void {
  if (typeof window === "undefined") return;
  if (typeof window.plausible !== "function") return;
  const props = args[0] as Record<string, string> | undefined;
  if (props) {
    window.plausible(name, { props });
  } else {
    window.plausible(name);
  }
}

/** Session-scoped dedup guard for first_pick. Returns true if the event
 * should fire (first occurrence this session); sets the key so subsequent
 * calls within the same browser session return false.
 */
export function claimFirstPick(mode: SimulatorMode): boolean {
  if (typeof window === "undefined") return false;
  const key = `45a:track:first_pick:${mode}`;
  if (sessionStorage.getItem(key)) return false;
  sessionStorage.setItem(key, "1");
  return true;
}

/** Session-scoped dedup guard for promo_card_landed. Returns true on the
 * first hydration of a given slug in this session; subsequent calls with
 * the same slug return false. Mirrors `claimFirstPick`. */
export function claimPromoLanded(slug: string): boolean {
  if (typeof window === "undefined") return false;
  const key = `45a:track:promo_landed:${slug}`;
  if (sessionStorage.getItem(key)) return false;
  sessionStorage.setItem(key, "1");
  return true;
}
