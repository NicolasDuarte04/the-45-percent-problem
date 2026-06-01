"use client";

/**
 * cp-08 additive onboarding · Surface A · the first-visit chip.
 *
 * Fixed bottom-right floating chip with two hit targets: the body
 * (opens the modal) and a ✕ (dismisses without opening). Slides in
 * from outside the corner over 300ms via the `chipIn` keyframe in
 * globals.css; reduced-motion users get the same final position with
 * no transition.
 *
 * Render gating (mount on the home path only, hide after seen) is the
 * OnboardingController's responsibility, not this component's.
 */
import { useState } from "react";
import { useReducedMotion } from "./hooks";

interface OnboardingChipProps {
  onOpen: () => void;
  onDismiss: () => void;
}

export function OnboardingChip({ onOpen, onDismiss }: OnboardingChipProps) {
  // Hover state for the ✕ button so the styled hover treatment can
  // live inline (avoids declaring yet another class in globals.css for
  // a single use). Same pattern the rest of the file uses for the
  // hover treatment on the close affordance.
  const [closeHover, setCloseHover] = useState(false);

  // Respect prefers-reduced-motion at render time: if true, omit the
  // CSS animation entirely so the chip appears in its final position
  // without translation. globals.css also clamps via the
  // @media (prefers-reduced-motion: reduce) rule, but reading the
  // preference here saves the runtime animation declaration on user
  // agents that report `reduce`.
  const reduced = useReducedMotion();

  return (
    <div
      role="status"
      style={{
        position: "fixed",
        right: 24,
        bottom: 24,
        zIndex: 50,
        display: "flex",
        alignItems: "stretch",
        background: "var(--bg-panel-elev)",
        border: "1px solid var(--border-default)",
        borderRadius: 10,
        boxShadow: "var(--shadow-card)",
        animation: reduced
          ? "none"
          : "chipIn 300ms cubic-bezier(0.4, 0, 0.2, 1)",
        maxWidth: "calc(100vw - 48px)",
      }}
    >
      <button
        onClick={onOpen}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 8px 12px 16px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--text-tertiary)",
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
          }}
        >
          First time here?
        </span>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            color: "var(--text-primary)",
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          Read in 90 seconds
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: "var(--accent-focus)",
          }}
        >
          →
        </span>
      </button>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        onMouseEnter={() => setCloseHover(true)}
        onMouseLeave={() => setCloseHover(false)}
        style={{
          width: 34,
          borderLeft: "1px solid var(--rule)",
          background: closeHover ? "var(--bg-panel)" : "transparent",
          borderTop: "none",
          borderRight: "none",
          borderBottom: "none",
          borderTopRightRadius: 10,
          borderBottomRightRadius: 10,
          color: closeHover ? "var(--text-primary)" : "var(--text-quiet)",
          cursor: "pointer",
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          transition: "background 120ms, color 120ms",
        }}
      >
        ✕
      </button>
    </div>
  );
}
