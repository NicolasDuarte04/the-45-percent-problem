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

interface EventMap {
  simulator_opened: { mode: SimulatorMode };
  first_pick: { mode: SimulatorMode };
  submit_success: { mode: SimulatorMode; rarity_band: RarityBand };
  share_action: { type: "copy" | "png" | "native" };
  alert_armed: undefined;
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
