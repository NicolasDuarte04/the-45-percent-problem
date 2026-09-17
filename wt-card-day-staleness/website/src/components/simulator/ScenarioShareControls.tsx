"use client";

/**
 * Share controls for the Scenario Simulator (exploratory, URL-state).
 *
 * Serializes the user's current scenario into a `?s=` link and offers
 * three targets plus the native share sheet where supported:
 *   - Copy link  · copies the canonical share URL to the clipboard.
 *   - LinkedIn   · share-offsite, which only takes the URL; the card text
 *                  comes from the page's OG meta (og:title / og:description).
 *   - X          · intent/tweet with a projection-framed text plus the URL.
 *   - Share      · navigator.share where available, else copies the URL.
 *
 * Framing guardrail: every label and share string describes what the model
 * PROJECTS. No gambling-coded framing of any kind appears here.
 *
 * Rendered only when the parent has a complete, projectable scenario, so
 * the shared link always renders the rich per-scenario OG card. The row is
 * `flex-wrap`, so it never forces horizontal overflow on narrow phones.
 *
 * Design tokens mirror TicketShareButton (sharp corners, mono labels,
 * border-default stroke, bg-panel fill).
 */

import { useCallback, useState } from "react";
import { track } from "@/lib/analytics/track";
import { writeClipboardText } from "@/lib/clipboard";
import { renderStoryLine } from "@/lib/sim/renderStoryLine";
import { buildScenarioShareUrl } from "@/lib/sim/scenarioUrl";
import type { AnyScenario, Mode } from "@/lib/sim/types";

interface ScenarioShareControlsProps {
  mode: Mode;
  scenario: AnyScenario;
}

const BUTTON_CLASS = [
  "inline-flex items-center gap-1.5",
  "border border-[var(--border-default)]",
  "bg-[var(--bg-panel)]",
  "px-3 py-1.5",
  "font-mono text-[11px] uppercase tracking-[0.10em]",
  "text-[var(--text-tertiary)]",
  "transition-colors duration-100",
  "hover:bg-[var(--bg-panel-elev)] hover:text-[var(--text-primary)]",
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-focus)]",
  "cursor-pointer",
].join(" ");

/**
 * The free text we control on X (LinkedIn share-offsite takes only the URL).
 * Projection-framed: states what the model projects, nothing more. The
 * story line carries the scenario specifics (the forced result, the team).
 */
function buildShareText(mode: Mode, scenario: AnyScenario): string {
  const story = renderStoryLine(mode, scenario).replace(/\s+$/, "");
  const ending = /[.?!]$/.test(story) ? "" : ".";
  return `${story}${ending} Here is what the model projects.`;
}

export function ScenarioShareControls({
  mode,
  scenario,
}: ScenarioShareControlsProps) {
  const [copyLinkLabel, setCopyLinkLabel] = useState<"Copy link" | "Copied">(
    "Copy link",
  );
  const [shareLabel, setShareLabel] = useState<"Share" | "Copied">("Share");

  const handleCopyLink = useCallback(async () => {
    const url = buildScenarioShareUrl({ mode, scenario });
    const wrote = await writeClipboardText(url);
    if (wrote) {
      track("share_action", { type: "copy_link" });
      setCopyLinkLabel("Copied");
      setTimeout(() => setCopyLinkLabel("Copy link"), 1500);
    }
  }, [mode, scenario]);

  const handleLinkedIn = useCallback(() => {
    const url = buildScenarioShareUrl({ mode, scenario });
    const target = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    track("share_action", { type: "linkedin" });
    window.open(target, "_blank", "noopener,noreferrer");
  }, [mode, scenario]);

  const handleX = useCallback(() => {
    const url = buildScenarioShareUrl({ mode, scenario });
    const text = buildShareText(mode, scenario);
    const target = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    track("share_action", { type: "x" });
    window.open(target, "_blank", "noopener,noreferrer");
  }, [mode, scenario]);

  const handleShare = useCallback(async () => {
    const url = buildScenarioShareUrl({ mode, scenario });
    const text = buildShareText(mode, scenario);
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "45analytics scenario", text, url });
        track("share_action", { type: "native" });
        return;
      } catch {
        // User cancelled or share failed; fall through to clipboard.
      }
    }
    const wrote = await writeClipboardText(url);
    if (wrote) {
      track("share_action", { type: "copy" });
      setShareLabel("Copied");
      setTimeout(() => setShareLabel("Share"), 2000);
    }
  }, [mode, scenario]);

  return (
    <div className="mt-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.10em] text-[var(--text-quiet)]">
        Share what the model projects
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleCopyLink}
          className={BUTTON_CLASS}
          aria-live="polite"
          aria-label="Copy a link that reopens this scenario"
        >
          <span aria-hidden>{copyLinkLabel === "Copied" ? "✓" : "⌘"}</span>
          {copyLinkLabel}
        </button>
        <button
          type="button"
          onClick={handleLinkedIn}
          className={BUTTON_CLASS}
          aria-label="Share this scenario on LinkedIn"
        >
          <span aria-hidden>in</span>
          LinkedIn
        </button>
        <button
          type="button"
          onClick={handleX}
          className={BUTTON_CLASS}
          aria-label="Share this scenario on X"
        >
          <span aria-hidden>{"\u{1D54F}"}</span>
          X
        </button>
        <button
          type="button"
          onClick={handleShare}
          className={BUTTON_CLASS}
          aria-live="polite"
          aria-label="Share this scenario"
        >
          <span aria-hidden>{shareLabel === "Copied" ? "✓" : "↗"}</span>
          {shareLabel}
        </button>
      </div>
    </div>
  );
}
