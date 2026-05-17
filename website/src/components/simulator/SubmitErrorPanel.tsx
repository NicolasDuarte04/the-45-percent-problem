"use client";

/**
 * SubmitErrorPanel · Phase E §9 (E.1).
 *
 * The Phase D error state was a single inline string with no recovery
 * affordance. This panel replaces it with:
 *
 *   - A short, human message: "We couldn't reach the model. This is
 *     on us, not you." (server / network / unknown errors).
 *   - `[ TRY AGAIN ]` button that re-fires `onRetry` with the same
 *     payload from the parent's state; no client state lost.
 *   - `[ COPY DIAGNOSTIC ]` link that copies a short diagnostic
 *     string (error code + ISO timestamp + scenario hash if provided)
 *     to the clipboard for the user to send if it persists.
 *   - A small retry counter so the user sees progress; after 3
 *     failed retries we surface a heavier "still failing" state
 *     and ease them toward the diagnostic copy path.
 *
 * Backoff: §9 (E.1) calls for 1s / 2s / 4s exponential. We disable
 * the [ TRY AGAIN ] button for the backoff window after each failure
 * so the user can't hammer the API.
 *
 * Validation errors (`invalid`) and rate-limit errors (`rateLimit`)
 * keep their existing copy: those aren't "on us" failures, so the
 * "this is on us" line is hidden for those kinds.
 */

import { useEffect, useRef, useState } from "react";

export type SubmitErrorKind =
  | "rateLimit"
  | "network"
  | "invalid"
  | "server";

/**
 * One field-level issue surfaced for `kind: "invalid"` (only present
 * when the route returned them under `?debug=1`).
 */
export interface SubmitInvalidIssueView {
  path: string;
  message: string;
}

interface SubmitErrorPanelProps {
  kind: SubmitErrorKind;
  /** Re-fires the submit with the parent-held payload. Required. */
  onRetry: () => void | Promise<void>;
  /** Optional scenario hash: included in the diagnostic copy. */
  scenarioHash?: string;
  /** Disable retry while a submit is already in flight. */
  retryInFlight?: boolean;
  /**
   * Field-level issues for `kind: "invalid"`. Optional: when present
   * we render them under the headline so the user knows which slots to
   * revisit. Surfaced from the route's `?debug=1` payload.
   */
  invalidIssues?: SubmitInvalidIssueView[];
  /**
   * Seconds until rate limit clears. Optional: when present we
   * substitute the literal `{n}` placeholder in the rate-limit
   * headline. Falls back to "a moment" if absent.
   */
  rateLimitRetrySeconds?: number;
}

const BACKOFF_MS = [1000, 2000, 4000]; // §9 (E.1). 1s, 2s, 4s.

function headlineFor(
  kind: SubmitErrorKind,
  opts: { rateLimitRetrySeconds?: number; missingSlots?: number } = {},
): string {
  switch (kind) {
    case "network":
      return "Lost the connection. Try again.";
    case "rateLimit": {
      const n = opts.rateLimitRetrySeconds;
      const wait = typeof n === "number" && n > 0 ? `${n}s` : "a moment";
      return `Too many submits. Try again in ${wait}.`;
    }
    case "invalid": {
      const m = opts.missingSlots ?? 0;
      if (m > 0) {
        return `Bracket incomplete: ${m} slot${m === 1 ? "" : "s"} need attention.`;
      }
      return "Something in the scenario looks wrong. Reset and try again.";
    }
    case "server":
    default:
      return "Model engine threw. We're looking at the logs.";
  }
}

function formatDiagnostic(
  kind: SubmitErrorKind,
  scenarioHash?: string,
  retryCount = 0,
): string {
  const ts = new Date().toISOString();
  const parts = [
    `code=${kind}`,
    `ts=${ts}`,
    `retries=${retryCount}`,
  ];
  if (scenarioHash) parts.push(`scenario=${scenarioHash.slice(0, 12)}`);
  return parts.join(" ");
}

export function SubmitErrorPanel({
  kind,
  onRetry,
  scenarioHash,
  retryInFlight = false,
  invalidIssues,
  rateLimitRetrySeconds,
}: SubmitErrorPanelProps) {
  const [retryCount, setRetryCount] = useState(0);
  // backoffSeconds = remaining seconds before [ Try again ] re-enables;
  // 0 means available now. The retry handler bumps this; an interval
  // ticks it down. Avoids reading Date.now() during render.
  const [backoffSeconds, setBackoffSeconds] = useState(0);
  const [copied, setCopied] = useState(false);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (backoffSeconds <= 0) return;
    const handle = setInterval(() => {
      setBackoffSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(handle);
  }, [backoffSeconds]);

  useEffect(() => {
    return () => {
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
    };
  }, []);

  const inBackoff = backoffSeconds > 0;
  const heavyFailing = retryCount >= BACKOFF_MS.length;
  const headlineCopy = headlineFor(kind, {
    rateLimitRetrySeconds,
    missingSlots: invalidIssues?.length,
  });

  async function handleRetryClick() {
    if (retryInFlight || inBackoff) return;
    const slot = Math.min(retryCount, BACKOFF_MS.length - 1);
    const seconds = Math.ceil(BACKOFF_MS[slot] / 1000);
    setBackoffSeconds(seconds);
    setRetryCount((c) => c + 1);
    await onRetry();
  }

  async function handleCopyDiagnostic() {
    // Snapshot retryCount at click time; safe to read state inside an
    // event handler (just not during render).
    const text = formatDiagnostic(kind, scenarioHash, retryCount);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // No clipboard access: fall through; the user still sees the text below.
    }
    setCopied(true);
    if (copyResetRef.current) clearTimeout(copyResetRef.current);
    copyResetRef.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex flex-col items-start gap-3"
    >
      <p className="font-sans text-[14px] text-[var(--state-dead)]">
        {headlineCopy}
      </p>

      {kind === "invalid" && invalidIssues && invalidIssues.length > 0 ? (
        <ul className="list-disc pl-5 font-mono text-[11px] text-[var(--text-quiet)]">
          {invalidIssues.slice(0, 6).map((iss, idx) => (
            <li key={`${iss.path}-${idx}`}>
              <span className="text-[var(--text-primary)]">{iss.path || "(payload)"}</span>
              {iss.message ? <>. {iss.message}</> : null}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleRetryClick}
          disabled={retryInFlight || inBackoff || kind === "invalid"}
          className={[
            "border px-4 py-2 font-mono text-[12px] uppercase tracking-[0.10em] transition-colors duration-100 focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]",
            retryInFlight || inBackoff || kind === "invalid"
              ? "border-[var(--border-default)] text-[var(--text-quiet)] cursor-not-allowed"
              : // Mission 3. `--ui-danger` (deep rose) is the accent on
                // the recovery affordance: this panel only renders for
                // failures, so the hover tone semantically matches the
                // surface, not the brand-warm CTA.
                "border-[var(--text-primary)] text-[var(--text-primary)] hover:border-[var(--ui-danger)] hover:text-[var(--ui-danger)] cursor-pointer",
          ].join(" ")}
        >
          {retryInFlight
            ? "[ Retrying... ]"
            : inBackoff
              ? `[ Wait ${backoffSeconds}s ]`
              : "[ Try again ]"}
        </button>

        <button
          type="button"
          onClick={handleCopyDiagnostic}
          className="font-mono text-[11px] uppercase tracking-[0.10em] text-[var(--text-quiet)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]"
        >
          {copied ? "[ Copied ]" : "[ Copy diagnostic ]"}
        </button>
      </div>

      {heavyFailing ? (
        <p className="font-sans text-[12px] italic text-[var(--text-quiet)]">
          Still failing after several tries. Copy the diagnostic above and
          email us: we&rsquo;ll dig into it.
        </p>
      ) : null}
    </div>
  );
}
