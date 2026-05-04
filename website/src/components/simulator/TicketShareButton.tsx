/**
 * Share / Download affordance for the Trade Ticket — Phase B.
 *
 * Two actions exposed on the simulator canvas:
 *   1. "↓ PNG"   — anchor href to /api/og/scenario/[id] with download attr.
 *                   The browser streams the OG image directly as a file save.
 *   2. "Share"   — tries the Web Share API (supported on iOS Safari, Chrome
 *                   on Android, macOS Ventura+). Falls back to copying the
 *                   permalink to the clipboard if Web Share is unavailable.
 *                   Shows a transient "Copied!" confirmation on the button.
 *
 * Design tokens: matches simulator canvas — sharp corners (radius 0),
 * mono labels, border-default stroke, bg-panel fill. The download link
 * is styled as an inline-anchor so users can also right-click → Save as.
 *
 * Client component — uses navigator.share / navigator.clipboard.
 */

"use client";

import { useState, useCallback } from "react";

interface TicketShareButtonProps {
  predictionId: string;
}

export function TicketShareButton({ predictionId }: TicketShareButtonProps) {
  const [copyLabel, setCopyLabel] = useState<"Share" | "Copied!">("Share");

  const ogHref = `/api/og/scenario/${predictionId}`;
  const downloadName = `45analytics-${predictionId}.png`;

  const handleShare = useCallback(async () => {
    // Construct the absolute permalink. `window.location.origin` is safe here
    // because this is a client component and will only run in the browser.
    const permalinkUrl = `${window.location.origin}/scenario/p/${predictionId}`;

    // Web Share API — available on modern mobile browsers + macOS Ventura+.
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "45analytics — Scenario Prediction",
          url: permalinkUrl,
        });
        return;
      } catch {
        // User cancelled (AbortError) or share failed — fall through to copy.
      }
    }

    // Clipboard fallback.
    try {
      await navigator.clipboard.writeText(permalinkUrl);
      setCopyLabel("Copied!");
      setTimeout(() => setCopyLabel("Share"), 2000);
    } catch {
      // Clipboard unavailable (rare: non-secure context or denied permission).
      // Silent fail — the user can still copy the URL from the address bar.
    }
  }, [predictionId]);

  return (
    <div className="flex items-center gap-2">
      {/* Download PNG */}
      <a
        href={ogHref}
        download={downloadName}
        className={[
          "inline-flex items-center gap-1.5",
          "border border-[var(--border-default)]",
          "bg-[var(--bg-panel)]",
          "px-3 py-1.5",
          "font-mono text-[11px] uppercase tracking-[0.10em]",
          "text-[var(--text-tertiary)]",
          "transition-colors duration-100",
          "hover:bg-[var(--bg-panel-elev)] hover:text-[var(--text-primary)]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-focus)]",
        ].join(" ")}
        aria-label={`Download prediction ${predictionId} as PNG`}
      >
        {/* Down-arrow in Unicode — no icon dep, pure text */}
        <span aria-hidden>↓</span>
        PNG
      </a>

      {/* Share / Copy link */}
      <button
        type="button"
        onClick={handleShare}
        className={[
          "inline-flex items-center gap-1.5",
          "border border-[var(--border-default)]",
          "bg-[var(--bg-panel)]",
          "px-3 py-1.5",
          "font-mono text-[11px] uppercase tracking-[0.10em]",
          copyLabel === "Copied!"
            ? "text-[var(--edge-positive)]"
            : "text-[var(--text-tertiary)]",
          "transition-colors duration-100",
          "hover:bg-[var(--bg-panel-elev)] hover:text-[var(--text-primary)]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-focus)]",
          "cursor-pointer",
        ].join(" ")}
        aria-live="polite"
        aria-label="Copy permalink to clipboard"
      >
        {copyLabel === "Copied!" ? (
          // Tick glyph while confirmed
          <span aria-hidden>✓</span>
        ) : (
          // Chain-link glyph while idle
          <span aria-hidden>⌘</span>
        )}
        {copyLabel}
      </button>
    </div>
  );
}
