"use client";

/**
 * cp-08 additive onboarding · Surface A · controller.
 *
 * Mounted at the editorial layout level so it sits alongside the
 * masthead on every editorial route. Owns three pieces of UI state:
 * `seen`, `showChip`, `showModal`. Reads `localStorage[SEEN_KEY]` on
 * mount, listens for the custom event `45a:onboarding:open` (dispatched
 * by the masthead pill in EditorialMasthead.tsx) so the modal is
 * reachable from any editorial page.
 *
 * Chip is gated to the homepage only (the spec is "homepage onboarding"
 * and the chip's settle delay only makes sense once the hero has
 * established). Modal renders wherever the controller is mounted.
 *
 * All dismissal paths write `45a.onboarding.seen = "true"`:
 *   - chip ✕ click
 *   - modal Esc / scrim / ✕ / "Got it"
 *   - modal "Try the simulator" CTA
 * After the write, the controller also stamps the `<html>` data
 * attribute (so the trophy-settle CSS scope picks up the change
 * without a full reload) and notifies the masthead pill via a custom
 * event so the help-pulse class clears.
 *
 * cp-09 (Surface B simulator overlay) reuses the `45a.*` localStorage
 * namespace with its own key `45a.onboarding.tour`. This controller
 * never touches that key; the boundary is preserved by convention.
 */
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { OnboardingChip } from "./OnboardingChip";
import { OnboardingModal } from "./OnboardingModal";
import { useOnboardingSeen } from "./hooks";

const SEEN_KEY = "45a.onboarding.seen";
const OPEN_EVENT = "45a:onboarding:open";
const SEEN_EVENT = "45a:onboarding:seen";

function writeSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, "true");
  } catch {
    /* localStorage may be disabled; treat as in-memory dismissal only. */
  }
  // Keep the document-level attribute in sync so the trophy-settle CSS
  // rule (html:not([data-onboarding-seen="true"]) .trophy-settle) takes
  // effect immediately for any subsequent client-side navigation.
  try {
    document.documentElement.setAttribute("data-onboarding-seen", "true");
  } catch {
    /* document may not exist in SSR; the controller is "use client" so this is defensive only. */
  }
  // Notify the masthead pill and the useOnboardingSeen subscribers so
  // they update without polling.
  try {
    window.dispatchEvent(new Event(SEEN_EVENT));
  } catch {
    /* event constructor unavailable on truly ancient runtimes. */
  }
}

interface OnboardingControllerProps {
  /** Display name of the top team by p_champion. e.g. "Spain". */
  leaderName: string;
  /** Pre-formatted display string for p_champion, e.g. "18.2". */
  leaderPDisplay: string;
  /** Pre-formatted display string for mc_runs, e.g. "10,000". */
  mcRunsDisplay: string;
  /** OSF preregistration link to show in the modal footer. */
  osfUrl: string;
  /** Delay before the first-visit chip reveals. Default 2500ms (per Design Package §10). */
  chipDelayMs?: number;
}

export function OnboardingController({
  leaderName,
  leaderPDisplay,
  mcRunsDisplay,
  osfUrl,
  chipDelayMs = 2500,
}: OnboardingControllerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/";

  // `seen` is sourced from localStorage via the shared hook so any
  // dismissal anywhere (chip ✕, modal close, masthead pill click in
  // another tab) re-renders this component without a polling loop.
  // The SSR snapshot is `false`, which matches the pre-hydrate script's
  // first-visit default in layout.tsx.
  const seen = useOnboardingSeen();
  const [chipReady, setChipReady] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // `showChip` is derived. The timer only flips `chipReady` once after
  // the settle delay; gating on `seen` and `isHome` happens at the
  // render layer so the chip vanishes the moment the visitor crosses
  // off the home path or dismisses anywhere.
  const showChip = chipReady && !seen && isHome && !showModal;

  // Listen for the masthead pill's force-open event. Fires from any
  // editorial route the masthead is mounted on. The setState happens
  // inside the event callback, not synchronously in the effect body,
  // so it does not trigger the react-hooks/set-state-in-effect rule.
  useEffect(() => {
    function onOpen() {
      setShowModal(true);
    }
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  // First-visit chip reveal. Settle delay gives the page time to
  // establish (per Design Package §4). Only schedules a timer when
  // first-visit conditions hold; the setState lives inside the
  // timeout callback, not the effect body.
  useEffect(() => {
    if (seen || !isHome) return;
    // Respect prefers-reduced-motion by clamping the delay so users who
    // dislike motion don't sit through 2.5s of waiting on top of the
    // animation suppression that globals.css applies.
    let delay = chipDelayMs;
    if (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      delay = Math.min(delay, 400);
    }
    const t = setTimeout(() => setChipReady(true), Math.max(0, delay));
    return () => clearTimeout(t);
  }, [seen, isHome, chipDelayMs]);

  function dismissChip() {
    writeSeen();
  }
  function openModal() {
    setShowModal(true);
  }
  function closeModal() {
    writeSeen();
    setShowModal(false);
  }
  function trySim() {
    writeSeen();
    setShowModal(false);
    // Navigate to the simulator. cp-09 (Surface B) is not yet shipped,
    // so this lands the visitor on the existing /scenario page.
    router.push("/scenario");
  }

  return (
    <>
      {showChip && (
        <OnboardingChip onOpen={openModal} onDismiss={dismissChip} />
      )}
      {showModal && (
        <OnboardingModal
          onClose={closeModal}
          onTrySimulator={trySim}
          leaderName={leaderName}
          leaderPDisplay={leaderPDisplay}
          mcRunsDisplay={mcRunsDisplay}
          osfUrl={osfUrl}
        />
      )}
    </>
  );
}
