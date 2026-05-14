/**
 * Share / Download affordance for the Trade Ticket.
 *
 * Two actions exposed on the simulator canvas:
 *   1. "↓ PNG"   — fetches /api/og/scenario/[id], validates Content-Type
 *                   begins with `image/png`, then triggers a blob save.
 *                   Refuses to write the response to disk if the route
 *                   fell through to a JSON/HTML error path. Cycles
 *                   `↓ PNG` → `Generating…` → `↓ PNG` (or `Failed, retry`
 *                   on error).
 *   2. "Share"   — tries the Web Share API (supported on iOS Safari, Chrome
 *                   on Android, macOS Ventura+). Falls back to copying the
 *                   permalink to the clipboard if Web Share is unavailable.
 *                   Shows a transient "Copied!" confirmation on the button.
 *
 * Design tokens: matches simulator canvas — sharp corners (radius 0),
 * mono labels, border-default stroke, bg-panel fill.
 *
 * Client component — uses navigator.share / navigator.clipboard.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics/track";
import { getOneInN } from "@/lib/sim/getOneInN";

interface TicketShareButtonProps {
  predictionId: string;
  count: number;
  total: number;
  storyLine: string;
}

type DownloadState = "idle" | "loading" | "error";
type CopyPostState = "idle" | "copied" | "error";

const DOWNLOAD_LABEL: Record<DownloadState, string> = {
  idle:    "PNG",
  loading: "Generating…",
  error:   "Failed, retry",
};

const COPY_POST_LABEL: Record<CopyPostState, string> = {
  idle:   "Copy as post",
  copied: "Copied!",
  error:  "Failed, retry",
};

const COMPOSER_MAX_CHARS = 280;

/**
 * Robust clipboard write with a synchronous fallback. The modern
 * `navigator.clipboard.writeText` is denied (NotAllowedError) when the
 * document does not have focus at the moment of the click; the legacy
 * textarea + `document.execCommand("copy")` path tolerates that, so we
 * try it second. Returns true on success, false otherwise.
 */
async function writeClipboardText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn("[ticket-share] clipboard.writeText denied, falling back", err);
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    ta.style.pointerEvents = "none";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (err) {
    console.warn("[ticket-share] execCommand copy fallback failed", err);
    return false;
  }
}

/**
 * Assemble the one-tap composer string: `1 in N. {storyLine}. {permalink}`.
 * If the composed string would exceed 280 characters (X's hard limit),
 * truncate the storyLine with a single ellipsis (U+2026) so the full
 * string fits.
 */
export function buildComposerString(
  count: number,
  total: number,
  storyLine: string,
  permalink: string,
): string {
  const oneInN = getOneInN(count, total);
  const trimmedStory = storyLine.replace(/\.+\s*$/, "").trim();
  const fixedLen = oneInN.length + 2 + 2 + permalink.length; // "1 in N" + ". " + ". " + permalink
  const availableForStory = COMPOSER_MAX_CHARS - fixedLen;
  let story = trimmedStory;
  if (availableForStory > 1 && story.length > availableForStory) {
    story = story.slice(0, availableForStory - 1) + "…";
  }
  return `${oneInN}. ${story}. ${permalink}`;
}

export function TicketShareButton({
  predictionId,
  count,
  total,
  storyLine,
}: TicketShareButtonProps) {
  const [copyLabel, setCopyLabel] = useState<"Share" | "Copied!">("Share");
  const [downloadState, setDownloadState] = useState<DownloadState>("idle");
  const [copyPostState, setCopyPostState] = useState<CopyPostState>("idle");
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const ogHref = `/api/og/scenario/${predictionId}`;
  const downloadName = `45analytics-${predictionId}.png`;

  // VIRAL_LOOP §3.1.E — single 1.6s opacity cycle once the buttons have
  // been visible for 6 s without user action. The IntersectionObserver
  // guards "in the viewport"; the 6 s timer is the "user did not act"
  // signal. A second-and-final fire never happens (animation is `once`),
  // so we do not pulse repeatedly the way a casino would.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const el = wrapperRef.current;
    if (!el) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let fired = false;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          if (timer) {
            clearTimeout(timer);
            timer = null;
          }
          return;
        }
        if (fired || timer) return;
        timer = setTimeout(() => {
          el.classList.add("nudge-once");
          fired = true;
          // Strip the class after the animation completes so re-entering
          // the viewport later does not re-fire visually.
          setTimeout(() => el.classList.remove("nudge-once"), 1700);
        }, 6000);
      },
      { threshold: 0.6 },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleDownload = useCallback(async () => {
    // Guard re-entry: a second click while loading would either no-op or
    // double-trigger the save dialog. Idle and error states are both
    // re-clickable; loading is not.
    if (downloadState === "loading") return;

    setDownloadState("loading");
    try {
      const res = await fetch(ogHref, { cache: "force-cache" });
      if (!res.ok) {
        throw new Error(`http_${res.status}`);
      }
      const ct = res.headers.get("content-type") ?? "";
      // Strict prefix match: any non-PNG response (JSON error, HTML error
      // page, plain-text 5xx) is rejected here rather than written to disk
      // under a `.png` filename — that mismatch is the original bug.
      if (!ct.toLowerCase().startsWith("image/png")) {
        throw new Error("not_png");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      try {
        const a = document.createElement("a");
        a.href = url;
        a.download = downloadName;
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
      } finally {
        URL.revokeObjectURL(url);
      }
      track("share_action", { type: "png" });
      setDownloadState("idle");
    } catch (err) {
      console.error("[ticket-share] download failed", err);
      setDownloadState("error");
      // Auto-recover the affordance after 3s so the user can retry without
      // a page reload.
      setTimeout(() => setDownloadState("idle"), 3000);
    }
  }, [ogHref, downloadName, downloadState]);

  const handleCopyPost = useCallback(async () => {
    // VIRAL_LOOP §3.1.G (Checkpoint 5, P0.8). Assemble a platform-agnostic
    // social post string the user can paste directly into X, LinkedIn,
    // Threads, or Mastodon. No emoji, no hashtags, no "via" attribution.
    const permalinkUrl = `${window.location.origin}/scenario/p/${predictionId}`;
    const composed = buildComposerString(count, total, storyLine, permalinkUrl);
    const wrote = await writeClipboardText(composed);
    if (wrote) {
      track("share_action", { type: "copy_post" });
      setCopyPostState("copied");
      setTimeout(() => setCopyPostState("idle"), 1500);
    } else {
      setCopyPostState("error");
      setTimeout(() => setCopyPostState("idle"), 3000);
    }
  }, [predictionId, count, total, storyLine]);

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
        track("share_action", { type: "native" });
        return;
      } catch {
        // User cancelled (AbortError) or share failed — fall through to copy.
      }
    }

    // Clipboard fallback.
    try {
      await navigator.clipboard.writeText(permalinkUrl);
      track("share_action", { type: "copy" });
      setCopyLabel("Copied!");
      setTimeout(() => setCopyLabel("Share"), 2000);
    } catch {
      // Clipboard unavailable (rare: non-secure context or denied permission).
      // Silent fail — the user can still copy the URL from the address bar.
    }
  }, [predictionId]);

  return (
    <div ref={wrapperRef} className="flex items-center gap-2">
      {/* Copy as post (Checkpoint 5, P0.8). Assembled "1 in N. story. URL"
          string, one tap, one paste. Sits leftmost as the most actionable
          option for text-platform shares; PNG is the visual artifact, and
          the Web Share API (mobile-native) stays rightmost. */}
      <button
        type="button"
        onClick={handleCopyPost}
        className={[
          "inline-flex items-center gap-1.5",
          "border border-[var(--border-default)]",
          "bg-[var(--bg-panel)]",
          "px-3 py-1.5",
          "font-mono text-[11px] uppercase tracking-[0.10em]",
          copyPostState === "copied"
            ? "text-[var(--edge-positive)]"
            : copyPostState === "error"
            ? "text-[var(--state-dead,#E76E8A)]"
            : "text-[var(--text-tertiary)]",
          "transition-colors duration-100",
          "hover:bg-[var(--bg-panel-elev)] hover:text-[var(--text-primary)]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-focus)]",
          "cursor-pointer",
        ].join(" ")}
        aria-live="polite"
        aria-label="Copy assembled social post to clipboard"
      >
        <span aria-hidden>
          {copyPostState === "copied" ? "✓" : copyPostState === "error" ? "!" : "↗"}
        </span>
        {COPY_POST_LABEL[copyPostState]}
      </button>

      {/* Download PNG — typed fetch + content-type validation. The button
          replaces the prior `<a download>` so a non-PNG response (JSON 4xx /
          HTML 5xx) is detected and surfaced as "Failed, retry" instead of
          being written to disk under a .png filename. */}
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloadState === "loading"}
        aria-busy={downloadState === "loading"}
        aria-live="polite"
        aria-label={`Download prediction ${predictionId} as PNG`}
        className={[
          "inline-flex items-center gap-1.5",
          "border border-[var(--border-default)]",
          "bg-[var(--bg-panel)]",
          "px-3 py-1.5",
          "font-mono text-[11px] uppercase tracking-[0.10em]",
          downloadState === "error"
            ? "text-[var(--state-dead,#E76E8A)]"
            : "text-[var(--text-tertiary)]",
          "transition-colors duration-100",
          "hover:bg-[var(--bg-panel-elev)] hover:text-[var(--text-primary)]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-focus)]",
          "cursor-pointer",
          "disabled:cursor-progress disabled:opacity-70",
        ].join(" ")}
      >
        <span aria-hidden>
          {downloadState === "loading" ? "…" : downloadState === "error" ? "!" : "↓"}
        </span>
        {DOWNLOAD_LABEL[downloadState]}
      </button>

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
