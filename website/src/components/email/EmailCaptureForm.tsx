"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Turnstile } from "./Turnstile";

type FormState = "idle" | "validating" | "pending" | "error";

type ErrorVariant =
  | "invalid"
  | "active"
  | "pending"
  | "rateLimit"
  | "turnstile"
  | "server";

const ERROR_COPY: Record<ErrorVariant, string> = {
  invalid: "That email does not look right. Check the address and try again.",
  active: "This address is already subscribed. Check your inbox for the daily brief.",
  pending: "A confirmation email is already on its way. Check your inbox.",
  rateLimit: "Too many attempts in a short window. Wait a minute and try again.",
  turnstile: "Captcha check failed. Reload the page and try again.",
  server: "Something went wrong on our side. Try again in a moment.",
};

export interface EmailCaptureFormProps {
  /** "desktop" = horizontal input + button; "mobile" = stacked. */
  layout?: "desktop" | "mobile";
  source?: string;
}

const t = {
  ink: "var(--brief-ink)",
  graphite: "var(--brief-graphite)",
  graphiteQuiet: "var(--brief-graphite-quiet)",
  hairline: "var(--brief-hairline)",
  bg: "var(--brief-bg)",
  bgElev: "var(--brief-bg-elev)",
  edgeNeg: "var(--brief-edge-negative)",
  fontMono: "var(--brief-font-mono)",
  fontSans: "var(--brief-font-sans)",
  fontSerif: "var(--brief-font-serif)",
};

export function EmailCaptureForm({
  layout = "desktop",
  source,
}: EmailCaptureFormProps) {
  const [state, setState] = useState<FormState>("idle");
  const [errorVariant, setErrorVariant] = useState<ErrorVariant>("invalid");
  const [email, setEmail] = useState("");
  const turnstileTokenRef = useRef<string | null>(null);
  const inputId = useId();
  const errorId = useId();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "validating" || state === "pending") return;

    setState("validating");

    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrorVariant("invalid");
      setState("error");
      return;
    }

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          source,
          turnstileToken: turnstileTokenRef.current ?? undefined,
        }),
      });

      if (res.status === 202) {
        setState("pending");
        return;
      }

      let data: { error?: string } = {};
      try {
        data = (await res.json()) as { error?: string };
      } catch {
        /* fall through */
      }
      const variant = (data.error ?? "server") as ErrorVariant;
      setErrorVariant(
        (Object.keys(ERROR_COPY) as ErrorVariant[]).includes(variant)
          ? variant
          : "server",
      );
      setState("error");
    } catch {
      setErrorVariant("server");
      setState("error");
    }
  }

  if (state === "pending") {
    return <PendingPanel email={email} layout={layout} />;
  }

  const isStacked = layout === "mobile";
  const isError = state === "error";
  const isBusy = state === "validating";

  return (
    <>
      {/* CSS-only stacking + 44px touch targets at ≤480px. Scoped to
          the form via .email-capture-form so the rule does not leak
          to other forms. Per Mobile Optimization Plan §4 Phase 1
          task 5. */}
      <style>{`
        .email-capture-form {
          display: grid;
          grid-template-columns: ${isStacked ? "1fr" : "minmax(0, 1fr) auto"};
          gap: 8px;
          max-width: 560px;
        }
        @media (max-width: 480px) {
          .email-capture-form { grid-template-columns: 1fr; }
        }
      `}</style>
      <form
        onSubmit={handleSubmit}
        noValidate
        aria-busy={isBusy}
        className="email-capture-form"
      >
        <label htmlFor={inputId} className="sr-only">
          Email address
        </label>
        <input
          id={inputId}
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state === "error") setState("idle");
          }}
          placeholder="your@email.com"
          aria-invalid={isError}
          aria-describedby={isError ? errorId : undefined}
          disabled={isBusy}
          style={{
            fontFamily: t.fontMono,
            fontSize: 13,
            color: t.ink,
            background: t.bgElev,
            border: `1px solid ${isError ? t.edgeNeg : t.hairline}`,
            borderRadius: 2,
            padding: "10px 12px",
            outline: "none",
            minHeight: 44,
          }}
        />
        <button
          type="submit"
          disabled={isBusy}
          style={{
            fontFamily: t.fontMono,
            fontSize: 11,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: t.bg,
            background: t.ink,
            border: `1px solid ${t.ink}`,
            borderRadius: 2,
            padding: "10px 16px",
            cursor: isBusy ? "wait" : "pointer",
            minHeight: 44,
            opacity: isBusy ? 0.6 : 1,
          }}
        >
          {isBusy ? "VERIFYING ▮▯▯" : "RECEIVE BRIEF"}
        </button>

        <Turnstile
          onToken={(token) => {
            turnstileTokenRef.current = token;
          }}
        />

        {isError && (
          <p
            id={errorId}
            role="alert"
            style={{
              gridColumn: "1 / -1",
              fontFamily: t.fontSans,
              fontSize: 12,
              color: t.edgeNeg,
              margin: "4px 0 0",
            }}
          >
            {ERROR_COPY[errorVariant]}
          </p>
        )}

        <p
          style={{
            gridColumn: "1 / -1",
            fontFamily: t.fontSans,
            fontSize: 11,
            color: t.graphiteQuiet,
            margin: "8px 0 0",
            lineHeight: 1.6,
          }}
        >
          Daily, 12:00 UTC. Methodology open. Unsubscribe one click.
        </p>
      </form>
    </>
  );
}

function PendingPanel({ email, layout }: { email: string; layout: "desktop" | "mobile" }) {
  return (
    <div
      style={{
        background: t.bgElev,
        border: `1px solid ${t.hairline}`,
        borderRadius: 2,
        padding: layout === "mobile" ? "20px 18px" : "24px 24px",
        maxWidth: 560,
      }}
    >
      <p
        style={{
          fontFamily: t.fontMono,
          fontSize: 10,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: t.graphiteQuiet,
          margin: "0 0 12px",
        }}
      >
        ◆ PENDING CONFIRMATION
      </p>
      <p
        style={{
          fontFamily: t.fontSerif,
          fontSize: 17,
          lineHeight: 1.45,
          color: t.ink,
          margin: "0 0 12px",
        }}
      >
        We sent a confirmation link to <span style={{ fontFamily: t.fontMono, fontSize: 14 }}>{email}</span>.
      </p>
      <p
        style={{
          fontFamily: t.fontSans,
          fontSize: 13,
          lineHeight: 1.7,
          color: t.graphite,
          margin: 0,
        }}
      >
        Click the link in that email to start receiving the brief. The link expires in 24 hours.
        If it does not arrive within a minute, check spam.
      </p>
    </div>
  );
}
