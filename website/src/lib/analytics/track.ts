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

import type { FullBracketStage, RarityBand } from "@/lib/sim/types";

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
  // `stage` is set only for full_bracket submissions and reports the
  // commitment depth (groups, r32, r16, qf, sf, final). Added in
  // Checkpoint 9 (P1.1) so analytics can tell whether the partial-
  // submit affordance is being used or users still mostly go deep.
  submit_success: {
    mode: SimulatorMode;
    rarity_band: RarityBand;
    stage?: FullBracketStage;
  };
  share_action: { type: "copy" | "png" | "native" | "copy_post" };
  alert_armed: undefined;
  // Fires once per session per slug when the Final Four page hydrates with
  // a valid `initialScenario` derived from a promo card slug (`?card=`).
  // Added for P0.7. The slug attributes social-channel conversions per
  // curated scenario; deduped via sessionStorage so a reload on the same
  // URL does not re-fire.
  promo_card_landed: { slug: string };
  // Fires once per session for cookie-valid /me page loads (P0.3,
  // Checkpoint 8). Counts engaged returning-user visits to the
  // Forecast Desk. Deduped via `claimDeskViewed`. The unauthenticated
  // empty state must not emit this event.
  desk_viewed: undefined;
  // Fires every time the user clicks a band button on /scenario/explore
  // (Checkpoint 11, P2.2). No dedup: each click is the exploration-depth
  // signal we want to measure.
  explore_band_selected: { band: RarityBand };
  // Fires when the user clicks a scenario card's "Try this scenario"
  // link on /scenario/explore. `teams` is the comma-separated team
  // code list (e.g. "ARG,BRA,ESP,FRA") so downstream analytics can
  // join clicks to the canonical scenario.
  explore_card_clicked: { band: RarityBand; teams: string };
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

/** Session-scoped dedup guard for desk_viewed. Returns true the first
 * time the cookie-valid /me page mounts in a session; subsequent visits
 * within the same session return false. Mirrors `claimFirstPick`. */
export function claimDeskViewed(): boolean {
  if (typeof window === "undefined") return false;
  const key = "45a:track:desk_viewed";
  if (sessionStorage.getItem(key)) return false;
  sessionStorage.setItem(key, "1");
  return true;
}
