"use client";

/**
 * Alert configurator for the Tournament Scenario Simulator.
 *
 * VIRAL_LOOP_PIVOT.md §2 — replaces the old PredictionEmailGate. The pivot
 * is tonal: the user is not subscribing to a newsletter, they are arming
 * a position monitor. The component is rendered as a single bordered
 * panel with a key/value config grid: WATCH, TRIGGER, NOTIFY. Submitting
 * arms the alert; skipping replaces the panel body with "NOT ARMED"
 * (the panel does not unmount, so the user sees the cost of skipping).
 *
 * Submit semantics carried verbatim from the previous PredictionEmailGate:
 * we POST to /api/predictions/[id]/email via attachEmailToPrediction,
 * which delegates to the same subscribeService. Postgres remains the
 * system of record; suppression-list enforcement is unchanged.
 *
 * Forbidden vocab guardrails: no exclamation marks, no "newsletter",
 * no "spam" anywhere in the rendered copy.
 *
 * Behavior rules per §2.3:
 *   1. WATCH echoes the user's prediction (proves the alert is theirs).
 *   2. Validate on blur, not on every keystroke. Button stays
 *      enabled-looking until the user actually attempts a submit.
 *   3. Submit is locked for ≥1.2s after click regardless of network
 *      result, so the "did it work?" double-tap loop cannot fire.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  attachEmailToPrediction,
  type AttachEmailResult,
} from "@/lib/sim/predictionsApi";
import { useTypewriter } from "@/lib/motion/useTypewriter";
import type {
  ChampionsPathScenario,
  FinalFourScenario,
  FullBracketScenario,
  PublicPredictionView,
} from "@/lib/sim/types";

interface PredictionAlertConfiguratorProps {
  view: PublicPredictionView;
}

// ── State machine ─────────────────────────────────────────────────────────────
// Same shape carried over from PredictionEmailGate. Surface copy changes;
// API contract does not.

type ConfigState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "verification_sent"; via: "created" | "reactivated" }
  | { kind: "already_pending" }
  | { kind: "already_active" }
  | { kind: "skipped" }
  | { kind: "error"; copy: string };

const ERROR_COPY: Partial<Record<AttachEmailResult["kind"], string>> = {
  invalid:    "That email does not look right. Check the address and try again.",
  rateLimit:  "Too many attempts in a short window. Wait a moment and try again.",
  suppressed: "This email cannot be added to notifications.",
  complained: "This email cannot be added to notifications.",
  forbidden:  "Could not verify the request. Reload the page and try again.",
  notFound:   "This prediction is no longer available.",
  server:     "Something went wrong on our side. Try again in a moment.",
  network:    "Could not reach the server. Check your connection and try again.",
};

function emailLooksValid(value: string): boolean {
  // Loose client-side shape check; the server is the canonical validator.
  const v = value.trim();
  if (v.length < 3 || v.length > 254) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return false;
  return true;
}

// ── WATCH row content per scenario mode ───────────────────────────────────────
// The WATCH line is the "this alert is mine, not a generic newsletter" signal.
// Each mode reuses the codes that already render on the Trade Ticket so the
// user reads the same vocabulary in both surfaces.

function watchCodes(view: PublicPredictionView): string[] {
  switch (view.mode) {
    case "final_four":
      return (view.scenario as FinalFourScenario).semifinalists;
    case "champions_path": {
      const s = view.scenario as ChampionsPathScenario;
      const opps = [s.r16.opponent, s.qf?.opponent, s.sf?.opponent, s.f?.opponent]
        .filter((o): o is string => Boolean(o));
      return [s.team, ...opps];
    }
    case "full_bracket": {
      const champ = (view.scenario as FullBracketScenario).koAdvancers[30];
      return champ ? [champ] : [];
    }
  }
}

function watchSeparator(mode: PublicPredictionView["mode"]): string {
  // Champion's Path is a sequenced chain (team ▸ R16 opp ▸ QF opp …).
  // Final Four is an unordered set; render as a comma'd list.
  // Full Bracket reduces to the champion code, so the separator is moot.
  return mode === "champions_path" ? " > " : " · ";
}

/**
 * Mobile-friendly truncation. When more than `keep` codes would render,
 * the line collapses to "ARG > ALG > ... +N" so the WATCH row never
 * pushes the panel past 720px on a 375px viewport. Per the architect's
 * directive: redundancy is fine because the full ticket renders below.
 */
function truncatedWatch(codes: string[], sep: string, keep = 2): string {
  if (codes.length <= keep + 1) return codes.join(sep);
  const head = codes.slice(0, keep).join(sep);
  return `${head}${sep}…${sep}+${codes.length - keep}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PredictionAlertConfigurator({
  view,
}: PredictionAlertConfiguratorProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false); // true after first blur
  const [submitLockedUntil, setSubmitLockedUntil] = useState(0);
  const [state, setState] = useState<ConfigState>({ kind: "idle" });

  const codes = watchCodes(view);
  const sep = watchSeparator(view.mode);
  const watchFull = codes.length > 0 ? codes.join(sep) : "—";
  const watchShort = codes.length > 0 ? truncatedWatch(codes, sep, 2) : "—";

  // MOTION_SPEC.md §3 — typewriter for the WATCH row. Two parallel hook
  // instances keep the desktop and mobile-truncated strings on
  // independent typer states, so a viewport resize does not mid-animate
  // one of them. useInView triggers once at 50% visibility.
  // MOTION_SPEC.md §3 — typewriter trigger. Spec called for an
  // IntersectionObserver gate, but on this surface the configurator
  // is reached immediately after the share strip in 95%+ of sessions,
  // and both framer-motion's useInView and a hand-rolled
  // IntersectionObserver failed to flip to "intersecting" under
  // Next 16 + React 19 + RSC streaming (probable same-cause as the
  // StaggeredRevealItem framer issue). Fire unconditionally 540ms
  // after mount instead — that is the page-level stagger budget
  // (item index 2 = 360ms + 180ms post-cascade buffer), so typing
  // begins exactly as the panel finishes its entrance.
  const [typeActive, setTypeActive] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setTypeActive(true), 540);
    return () => window.clearTimeout(id);
  }, []);
  const watchTypedFull  = useTypewriter(watchFull,  { active: typeActive });
  const watchTypedShort = useTypewriter(watchShort, { active: typeActive });

  // §2.3 (3) — submit lock for 1.2s after click regardless of network result.
  // Prevents the "did it work?" double-submit loop responsible for half of
  // bounce in newsletter forms.
  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const now = Date.now();
      if (state.kind === "submitting") return;
      if (now < submitLockedUntil) return;

      // Surface the error inline if invalid; do NOT pre-disable the button.
      // The button "stays enabled-looking" until the user attempts to submit,
      // per §2.3 (2).
      if (!emailLooksValid(email)) {
        setTouched(true);
        setState({ kind: "error", copy: ERROR_COPY.invalid! });
        return;
      }

      setSubmitLockedUntil(now + 1200);
      setState({ kind: "submitting" });
      const result = await attachEmailToPrediction(
        view.id,
        email.trim().toLowerCase(),
      );
      switch (result.kind) {
        case "created":
        case "reactivated":
          setState({ kind: "verification_sent", via: result.kind });
          return;
        case "already_pending":
          setState({ kind: "already_pending" });
          return;
        case "already_active":
          setState({ kind: "already_active" });
          return;
        default: {
          const copy = ERROR_COPY[result.kind] ?? ERROR_COPY.server!;
          setState({ kind: "error", copy });
          return;
        }
      }
    },
    [email, state.kind, submitLockedUntil, view.id],
  );

  // §2.3 (2) — validate on blur (and Enter handled implicitly by submit).
  const handleBlur = useCallback(() => {
    if (email.length === 0) return;
    setTouched(true);
    if (!emailLooksValid(email)) {
      setState({ kind: "error", copy: ERROR_COPY.invalid! });
    } else if (state.kind === "error") {
      setState({ kind: "idle" });
    }
  }, [email, state.kind]);

  const handleSkip = useCallback(() => {
    setState({ kind: "skipped" });
  }, []);

  const handleUnskip = useCallback(() => {
    setState({ kind: "idle" });
    // Move focus back to the input so the user can resume immediately.
    queueMicrotask(() => inputRef.current?.focus());
  }, []);

  // ── Terminal states ────────────────────────────────────────────────────────

  if (state.kind === "verification_sent") {
    return (
      <SuccessPanel
        emailHint={emailHint(email)}
        title="ALERT · ARMED"
        // The body inverts the user's mental model: instead of "we sent you
        // an email", it is "the alert is not active yet" — a final step the
        // user wants to complete.
        line1={`Verification email sent to ${emailHint(email)}.`}
        line2="Click the link inside to finalize. The alert is not active until you confirm."
      />
    );
  }
  if (state.kind === "already_pending") {
    return (
      <SuccessPanel
        emailHint={emailHint(email)}
        title="ALERT · PENDING"
        line1="A verification is already on its way."
        line2="Check your inbox and click the most recent link to finalize. We did not resend, to avoid burning the in-flight token."
      />
    );
  }
  if (state.kind === "already_active") {
    return (
      <SuccessPanel
        emailHint={emailHint(email)}
        title="ALERT · ARMED"
        line1="This email is already on file."
        line2="The prediction is now linked to your address. You will get a single notification when its status changes."
      />
    );
  }
  if (state.kind === "skipped") {
    return <SkippedPanel onUnskip={handleUnskip} />;
  }

  // ── Active form ────────────────────────────────────────────────────────────

  const isSubmitting = state.kind === "submitting";
  const isError = state.kind === "error";

  return (
    <section
      aria-labelledby="alert-eyebrow"
      className="w-full border border-[var(--border-default)] bg-[var(--bg-panel-elev)]"
    >
      {/* ── Eyebrow row ───────────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between border-b border-[var(--rule)] px-5 py-3 sm:px-6"
      >
        <span
          id="alert-eyebrow"
          className="font-mono text-[11px] uppercase tracking-[0.10em] text-[var(--text-tertiary)]"
        >
          ALERT · ARM POSITION
        </span>
        <span
          aria-live="polite"
          className="font-mono text-[11px] uppercase tracking-[0.10em] text-[var(--text-quiet)]"
        >
          STATUS: <span className="alert-status-pip" aria-hidden>▍</span>
        </span>
      </header>

      {/* ── Key-value config grid ─────────────────────────────────────────── */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="px-5 py-5 sm:px-6 sm:py-6"
        aria-busy={isSubmitting}
      >
        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 sm:gap-x-8">
          {/* WATCH — read-only echo of the user's prediction. */}
          <dt className="font-mono text-[12px] uppercase tracking-[0.10em] text-[var(--text-tertiary)] leading-[1.6]">
            WATCH
          </dt>
          <dd className="min-w-0 font-mono text-[14px] tabular-nums text-[var(--text-primary)] leading-[1.6]">
            {/* Truncate on mobile (<sm); show the full chain on sm+.
                Both strings are typed out independently per
                MOTION_SPEC.md §3 — a resize never mid-animates the
                wrong one because each hook owns its own state. */}
            <span className="sm:hidden" title={watchFull}>{watchTypedShort}</span>
            <span className="hidden sm:inline">{watchTypedFull}</span>
          </dd>

          {/* TRIGGER — fixed string. Reads as terminal config, not a knob. */}
          <dt className="font-mono text-[12px] uppercase tracking-[0.10em] text-[var(--text-tertiary)] leading-[1.6]">
            TRIGGER
          </dt>
          <dd className="font-mono text-[14px] text-[var(--text-primary)] leading-[1.6]">
            state change only
          </dd>

          {/* NOTIFY — the only input. No placeholder text in the input
              itself; the WATCH and TRIGGER rows establish purpose. */}
          <dt className="self-center font-mono text-[12px] uppercase tracking-[0.10em] text-[var(--text-tertiary)] leading-[1.6]">
            NOTIFY
          </dt>
          <dd className="min-w-0">
            <label htmlFor={inputId} className="sr-only">
              Email address
            </label>
            <input
              ref={inputRef}
              id={inputId}
              type="email"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              required
              maxLength={254}
              value={email}
              onChange={(e) => {
                // §2.3 (2): do NOT validate on change. Just clear stale
                // error state so the user sees a clean canvas as they type.
                setEmail(e.target.value);
                if (state.kind === "error") setState({ kind: "idle" });
              }}
              onBlur={handleBlur}
              disabled={isSubmitting}
              className={[
                "alert-input",
                // Padding + bg-color come from globals.css `.alert-input`
                // so the inset look is consistent across the rest /
                // focus / valid / invalid states. Tailwind utilities
                // here only carry the layout primitives that don't
                // collide with that state machine.
                "block w-full py-2",
                "font-mono text-[14px] text-[var(--text-primary)]",
                isSubmitting ? "opacity-60" : "",
                touched && isError ? "is-invalid" : "",
                touched && !isError && emailLooksValid(email) ? "is-valid" : "",
              ].join(" ")}
            />
          </dd>
        </dl>

        {/* CTA row — ARM ALERT button + skip link. */}
        <div className="mt-6 flex flex-wrap items-baseline gap-x-6 gap-y-3">
          <button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className={[
              "border px-5 py-3",
              "font-mono text-[13px] uppercase tracking-[0.10em]",
              "transition-colors duration-100",
              "focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]",
              // Filled-bone CTA at rest. Inverting from outline to a
              // solid bone-white block makes the button unmistakably
              // the primary action against the elevated terminal
              // surface — the post-launch UX feedback flagged the
              // previous outline-on-dark version as too stealth.
              // Hover transitions to peach (the simulator's signature
              // accent reserved for hover / promoted / flag border per
              // design v2 §6).
              isSubmitting
                ? "border-[var(--border-default)] bg-transparent text-[var(--text-quiet)] cursor-progress opacity-70"
                : [
                    "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-root)]",
                    "hover:border-[var(--accent-warm)] hover:bg-[var(--accent-warm)]",
                    "cursor-pointer",
                  ].join(" "),
            ].join(" ")}
          >
            {isSubmitting ? "[ ARMING… ]" : "[ ARM ALERT ]"}
          </button>

          {/* Skip — half the visual weight of the CTA. The chevron is the
              affordance; no underline. */}
          <button
            type="button"
            onClick={handleSkip}
            disabled={isSubmitting}
            className={[
              "font-mono text-[12px] text-[var(--text-quiet)]",
              "hover:text-[var(--text-tertiary)]",
              "focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]",
            ].join(" ")}
          >
            skip ›
          </button>
        </div>

        {isError ? (
          <p
            role="alert"
            className="mt-4 font-mono text-[12px] text-[var(--ui-danger)]"
          >
            {state.copy}
          </p>
        ) : null}
      </form>

      {/* ── Footer constraint copy ────────────────────────────────────────── */}
      <footer
        className="border-t border-[var(--rule)] px-5 py-4 sm:px-6 font-sans text-[12px] leading-[1.5] text-[var(--text-tertiary)]"
      >
        Two emails maximum. One when the scenario becomes impossible. One if
        the model says it became more likely. No marketing.
      </footer>
    </section>
  );
}

// ── Internal: success / pending panels (terminal "ARMED" surface) ─────────────

interface SuccessPanelProps {
  title: string;
  line1: string;
  line2: string;
  emailHint: string;
}

function SuccessPanel({ title, line1, line2 }: SuccessPanelProps) {
  return (
    <section
      aria-live="polite"
      className="w-full border border-[var(--border-default)] bg-[var(--bg-panel-elev)]"
    >
      <header className="flex items-center justify-between border-b border-[var(--rule)] px-5 py-3 sm:px-6">
        <span className="font-mono text-[11px] uppercase tracking-[0.10em] text-[var(--text-tertiary)]">
          {title}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.10em] text-[var(--text-quiet)]">
          STATUS:{" "}
          <span className="alert-armed-glyph" aria-hidden>✓</span>
        </span>
      </header>
      <div className="px-5 py-5 sm:px-6 sm:py-6 font-mono text-[14px] leading-[1.6] text-[var(--text-primary)]">
        <p>{line1}</p>
        <p className="mt-2 text-[var(--text-tertiary)]">{line2}</p>
      </div>
    </section>
  );
}

// ── Internal: skip ("NOT ARMED") panel ────────────────────────────────────────

function SkippedPanel({ onUnskip }: { onUnskip: () => void }) {
  return (
    <section
      aria-live="polite"
      className="w-full border border-[var(--border-default)] bg-[var(--bg-panel-elev)]"
    >
      <header className="flex items-center justify-between border-b border-[var(--rule)] px-5 py-3 sm:px-6">
        <span className="font-mono text-[11px] uppercase tracking-[0.10em] text-[var(--text-quiet)]">
          ALERT · NOT ARMED
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.10em] text-[var(--text-quiet)]">
          STATUS: —
        </span>
      </header>
      <div className="flex items-center justify-between gap-4 px-5 py-5 sm:px-6 sm:py-6">
        <p className="font-mono text-[12px] text-[var(--text-quiet)]">
          The position monitor is off for this prediction.
        </p>
        <button
          type="button"
          onClick={onUnskip}
          className="font-mono text-[12px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]"
        >
          change your mind?
        </button>
      </div>
    </section>
  );
}

// ── Internal: visually shorten an email for echo lines ────────────────────────
function emailHint(value: string): string {
  const v = value.trim().toLowerCase();
  if (!v) return "your inbox";
  // Truncate the local part to 24 chars max so the success copy never wraps
  // awkwardly inside the 720px panel.
  return v.length > 36 ? `${v.slice(0, 33)}…` : v;
}

// ── TrackedFootnote — quiet acknowledgement when the row already has email ────
// Rendered by the parent when `view.hasTracking === true` on the first server
// render. The export name is preserved from the previous PredictionEmailGate
// module so the page consumer changes remain minimal.

export function TrackedFootnote() {
  return (
    <p
      aria-live="polite"
      className="w-full border-t border-[var(--rule)] pt-4 font-mono text-[11px] uppercase tracking-[0.10em] text-[var(--text-quiet)]"
    >
      <span className="alert-armed-glyph mr-2" aria-hidden>✓</span>
      Alert armed for this prediction.
    </p>
  );
}

