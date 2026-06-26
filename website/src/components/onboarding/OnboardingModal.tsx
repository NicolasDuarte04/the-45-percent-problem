"use client";

/**
 * cp-08 additive onboarding · Surface A · the 90-second explainer modal.
 *
 * Three plain claims plus one primary CTA. Focus-trapped (initial focus
 * on the card, Esc closes, scrim click closes). All dismissal paths
 * call `onClose`; the primary CTA additionally calls `onTrySimulator`.
 * The controller is responsible for translating any close into a write
 * of `45a.onboarding.seen = "true"`.
 *
 * Data props (`leaderName`, `leaderPDisplay`, `mcRunsDisplay`,
 * `osfUrl`) are pre-computed at the editorial layout level from the
 * live snapshot (see `lib/data/onboardingLeader.ts`). Display
 * formatting is the caller's responsibility so this component stays
 * pure presentation.
 *
 * Em-dash rewrites from SurfaceA.jsx's claims 01 and 03: the design
 * source used em-dashes; project rule forbids them. Claim 01 splits
 * into two sentences ("World Cup. Not a betting site."); claim 03
 * uses a colon ("every divergence: hits and misses with identical
 * weight."). Both rewrites preserve meaning.
 */
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./hooks";

interface OnboardingModalProps {
  onClose: () => void;
  onTrySimulator: () => void;
  /** Display name of the top team by p_champion. Already formatted. */
  leaderName: string;
  /** P_champion as a display string (e.g. "18.2"). Already formatted. */
  leaderPDisplay: string;
  /** mc_runs as a display string (e.g. "10,000"). Already formatted. */
  mcRunsDisplay: string;
  /** OSF preregistration link to show in the modal footer. */
  osfUrl: string;
}

export function OnboardingModal({
  onClose,
  onTrySimulator,
  leaderName,
  leaderPDisplay,
  mcRunsDisplay,
  osfUrl,
}: OnboardingModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Esc closes; initial focus lands on the card so keyboard users can
  // tab through the two CTAs immediately.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    cardRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const [closeHover, setCloseHover] = useState(false);
  const reduced = useReducedMotion();

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(20, 20, 20, 0.32)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        animation: reduced ? "none" : "overlayIn 160ms ease-out",
      }}
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="What this is"
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "80vh",
          overflowY: "auto",
          outline: "none",
          background: "var(--bg-panel-elev)",
          border: "1px solid var(--border-default)",
          borderRadius: 16,
          boxShadow: "var(--shadow-card)",
          animation: reduced
            ? "none"
            : "modalIn 180ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div
          style={{
            padding: "28px 32px 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          <div>
            <div
              className="mono"
              style={{
                fontSize: 11,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                color: "var(--text-tertiary)",
                marginBottom: 14,
              }}
            >
              <span style={{ color: "var(--brand-accent)" }}>§</span> What this is
            </div>
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 400,
                fontSize: 28,
                letterSpacing: "-0.015em",
                lineHeight: 1.2,
                margin: 0,
                color: "var(--text-primary)",
              }}
            >
              A research publication, read in 90 seconds.
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            onMouseEnter={() => setCloseHover(true)}
            onMouseLeave={() => setCloseHover(false)}
            style={{
              flexShrink: 0,
              width: 30,
              height: 30,
              borderRadius: 6,
              marginTop: -4,
              border: "1px solid var(--rule)",
              background: closeHover ? "var(--bg-panel)" : "transparent",
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

        <div
          style={{
            padding: "24px 32px 8px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <ClaimRow n="01">
            A{" "}
            <strong
              style={{ fontWeight: 600, color: "var(--text-primary)" }}
            >
              pre-registered probability model
            </strong>{" "}
            for the World Cup. Not a betting site. The method was committed to
            OSF before the data came in.
          </ClaimRow>
          <ClaimRow n="02">
            Each night it runs{" "}
            <strong
              style={{ fontWeight: 600, color: "var(--text-primary)" }}
            >
              {mcRunsDisplay} simulations
            </strong>{" "}
            of the tournament and publishes the results. Right now it puts{" "}
            {leaderName} first, at{" "}
            <span
              className="mono"
              style={{ color: "var(--text-primary)" }}
            >
              {leaderPDisplay}%
            </span>
            .
          </ClaimRow>
          <ClaimRow n="03">
            It logs every forecast in an append-only ledger; hits and misses
            carry identical weight. A market-comparison layer against{" "}
            <strong
              style={{ fontWeight: 600, color: "var(--text-primary)" }}
            >
              bookmaker odds
            </strong>{" "}
            is live for group-stage fixtures.
          </ClaimRow>
        </div>

        <div
          style={{
            padding: "18px 32px 28px",
            marginTop: 8,
            borderTop: "1px solid var(--rule)",
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={onTrySimulator}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 500,
              background: "var(--text-primary)",
              color: "var(--bg-root)",
              border: "1px solid var(--text-primary)",
              padding: "0 18px",
              height: 40,
              borderRadius: 6,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            Try the simulator <span style={{ opacity: 0.6 }}>→</span>
          </button>
          <button
            onClick={onClose}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--text-tertiary)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              height: 40,
              padding: "0 4px",
            }}
          >
            Got&nbsp;it
          </button>
          <div style={{ flex: 1 }} />
          <span
            className="mono"
            style={{
              fontSize: 10,
              color: "var(--text-quiet)",
              letterSpacing: "0.04em",
            }}
          >
            {osfUrl}
          </span>
        </div>
      </div>
    </div>
  );
}

function ClaimRow({
  n,
  children,
}: {
  n: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "28px 1fr",
        gap: 14,
        alignItems: "start",
      }}
    >
      <span
        className="mono"
        style={{
          fontSize: 11,
          color: "var(--text-quiet)",
          letterSpacing: "0.04em",
          paddingTop: 3,
        }}
      >
        {n}
      </span>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-sans)",
          fontSize: 15,
          lineHeight: 1.6,
          color: "var(--text-secondary)",
        }}
      >
        {children}
      </p>
    </div>
  );
}
