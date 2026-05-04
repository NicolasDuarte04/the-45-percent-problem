"use client";

/**
 * Email gate for the Tournament Scenario Simulator. Per IMPL_PROMPT §11
 * + design v2 §5.9.
 *
 * IMPL_PROMPT §11.1 directed wrapping the existing <EmailCaptureForm />
 * verbatim. That component is hard-coded to the daily-brief design
 * tokens (--brief-*, cream paper aesthetic) and POSTs to /api/subscribe.
 * Mounting it inside the simulator's slate canvas would clash visually,
 * and its submission contract is wrong for this surface (we POST to
 * /api/predictions/[id]/email which delegates to the same
 * subscribeService under the hood, so the locked rules — Postgres as
 * the only system of record, one Resend client, suppression-list
 * enforcement — still hold).
 *
 * This component therefore renders a simulator-canvas-native form
 * with the same submit semantics. Forbidden-vocab grep, no exclamation
 * marks, brutalist sharp corners, mono+serif typography.
 *
 * Per IMPL_PROMPT §11.7 the skip path is local-only — clicking
 * "No thanks" hides the gate for the session. No new DB column is
 * added; tracking state is inferred from the prediction row's
 * subscriber_id (surfaced as the `hasTracking` boolean on the public
 * view).
 *
 * Non-blocking by design: the parent page renders the Reality Score
 * BEFORE this gate. The user gets the dopamine hit before any ask.
 */

import { useState, useId } from "react";
import { attachEmailToPrediction, type AttachEmailResult } from "@/lib/sim/predictionsApi";

interface PredictionEmailGateProps {
  predictionId: string;
}

type GateState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "verification_sent"; via: "created" | "reactivated" }
  | { kind: "already_pending" }
  | { kind: "already_active" }
  | { kind: "skipped" }
  | { kind: "error"; copy: string };

const ERROR_COPY: Partial<Record<AttachEmailResult["kind"], string>> = {
  invalid: "That email does not look right. Check the address and try again.",
  rateLimit: "Too many attempts in a short window. Wait a moment and try again.",
  suppressed: "This email cannot be added to notifications.",
  complained: "This email cannot be added to notifications.",
  forbidden: "Could not verify the request. Reload the page and try again.",
  notFound: "This prediction is no longer available.",
  server: "Something went wrong on our side. Try again in a moment.",
  network: "Could not reach the server. Check your connection and try again.",
};

function emailLooksValid(value: string): boolean {
  // Same loose shape used by /api/subscribe: trim, lowercase, has an @
  // and a dot in the right places. Server is the canonical validator.
  const v = value.trim();
  if (v.length < 3 || v.length > 254) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return false;
  return true;
}

export function PredictionEmailGate({ predictionId }: PredictionEmailGateProps) {
  const inputId = useId();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<GateState>({ kind: "idle" });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.kind === "submitting") return;
    if (!emailLooksValid(email)) {
      setState({ kind: "error", copy: ERROR_COPY.invalid! });
      return;
    }
    setState({ kind: "submitting" });
    const result = await attachEmailToPrediction(predictionId, email.trim().toLowerCase());
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
  }

  function handleSkip() {
    setState({ kind: "skipped" });
  }

  // Terminal success states render their own panel; the form stays gone.
  if (state.kind === "verification_sent") {
    return (
      <SuccessPanel
        title="Check your inbox to confirm."
        body="We sent a one-click verification link. Confirm it and you will get a single notification when this scenario becomes impossible, or when the model says it became more likely. Nothing else."
      />
    );
  }
  if (state.kind === "already_pending") {
    return (
      <SuccessPanel
        title="A verification is already on its way."
        body="Check your inbox for the most recent email and click the link to confirm. We did not send a new one to avoid burning the in-flight token."
      />
    );
  }
  if (state.kind === "already_active") {
    return (
      <SuccessPanel
        title="This email is already on file."
        body="The prediction is now linked to your address. You will get a single notification when its status changes."
      />
    );
  }
  if (state.kind === "skipped") {
    // Quiet acknowledgement — user dismissed the ask. Per design v2 §5.9,
    // the skip line is the conversational "just give me the image" path.
    return null;
  }

  return (
    <section
      aria-labelledby="gate-heading"
      className="mt-12 border-t border-[var(--rule)] pt-8"
    >
      <h2
        id="gate-heading"
        className="font-serif text-[24px] leading-[1.2] sm:text-[28px] text-[var(--text-primary)]"
      >
        Want to see if it actually happens?
      </h2>
      <p className="mt-3 max-w-[560px] font-sans text-[15px] leading-[1.5] text-[var(--text-tertiary)] sm:text-[16px]">
        The tournament starts soon. We will only email you if your prediction
        becomes impossible, or if the model says it became more likely. No
        marketing. No daily noise.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 max-w-[560px]" noValidate>
        <label htmlFor={inputId} className="sr-only">
          Email address
        </label>
        <input
          id={inputId}
          type="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          required
          maxLength={254}
          placeholder="your.email@domain"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state.kind === "error") setState({ kind: "idle" });
          }}
          disabled={state.kind === "submitting"}
          className="block w-full border-0 border-b border-[var(--border-default)] bg-transparent px-0 py-2 font-mono text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-quiet)] focus:border-[var(--accent-warm)] focus:outline-none focus:ring-0"
        />

        <div className="mt-6 flex flex-wrap items-baseline gap-x-6 gap-y-3">
          <button
            type="submit"
            disabled={state.kind === "submitting" || !emailLooksValid(email)}
            className={[
              "border px-5 py-3 font-mono text-[13px] uppercase tracking-[0.10em] transition-colors duration-100 focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]",
              state.kind === "submitting" || !emailLooksValid(email)
                ? "border-[var(--border-default)] text-[var(--text-quiet)] cursor-not-allowed"
                : "border-[var(--text-primary)] text-[var(--text-primary)] hover:border-[var(--accent-warm)] hover:text-[var(--accent-warm)] cursor-pointer",
            ].join(" ")}
          >
            {state.kind === "submitting"
              ? "[ Submitting... ]"
              : "[ Track my prediction ]"}
          </button>

          <button
            type="button"
            onClick={handleSkip}
            disabled={state.kind === "submitting"}
            className="font-sans text-[13px] text-[var(--text-quiet)] underline-offset-4 hover:text-[var(--text-primary)] hover:underline focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]"
          >
            No thanks, just give me the image.
          </button>
        </div>

        {state.kind === "error" ? (
          <p
            role="alert"
            className="mt-4 font-sans text-[13px] text-[var(--state-dead)]"
          >
            {state.copy}
          </p>
        ) : null}

        <p className="mt-6 font-sans text-[12px] leading-[1.5] text-[var(--text-quiet)]">
          By submitting, you agree to receive state-change notifications about
          this prediction. You can unsubscribe at any time.
        </p>
      </form>
    </section>
  );
}

// Internal — terminal-state success panel, simulator-canvas-styled.
function SuccessPanel({ title, body }: { title: string; body: string }) {
  return (
    <section
      aria-live="polite"
      className="mt-12 border-t border-[var(--rule)] pt-8"
    >
      <h2 className="font-serif text-[22px] leading-[1.25] sm:text-[26px] text-[var(--text-primary)]">
        {title}
      </h2>
      <p className="mt-3 max-w-[560px] font-sans text-[14px] leading-[1.5] text-[var(--text-tertiary)] sm:text-[15px]">
        {body}
      </p>
    </section>
  );
}

// Tracked-state stub — rendered by the parent when prediction.hasTracking
// is true on first server render. Quiet acknowledgement that someone is
// already getting notifications for this row.
export function TrackedFootnote() {
  return (
    <p className="mt-12 border-t border-[var(--rule)] pt-6 font-mono text-[11px] uppercase tracking-[0.10em] text-[var(--text-quiet)]">
      &#10003; This prediction is being tracked.
    </p>
  );
}
