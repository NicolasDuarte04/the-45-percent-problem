"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { TeamJump } from "./TeamJump";

interface Tab {
  id: string;
  label: string;
  href: string;
  match: (path: string) => boolean;
  /** Renders a small mono "BETA" badge inline after the label. */
  beta?: boolean;
}

const TABS: Tab[] = [
  {
    id: "overview",
    label: "Overview",
    href: "/",
    match: (p) => p === "/" || p === "",
  },
  {
    id: "matches",
    label: "Matches",
    href: "/matches",
    // Highlights on the index (/matches) and on any per-match detail
    // page (/match/M01). Both are covered by the "/match" prefix. The
    // Divergence Terminal keeps its own route and is no longer the
    // "Matches" destination.
    match: (p) => p.startsWith("/match"),
  },
  {
    id: "ledger",
    label: "Ledger",
    href: "/ledger",
    match: (p) => p.startsWith("/ledger"),
  },
  {
    id: "bracket",
    label: "Bracket",
    href: "/bracket",
    // cp-39: Bracket highlights only on /bracket. It previously also matched
    // any "/team" prefix, which wrongly lit Bracket on /teams and every
    // /team/[code] page (both now belong to the Teams tab below).
    match: (p) => p.startsWith("/bracket"),
  },
  {
    id: "teams",
    label: "Teams",
    href: "/teams",
    // Highlights on the /teams index and on every per-team progression page
    // (/team/[code]). The trailing slash on "/team/" keeps this from also
    // matching unrelated routes, and "/teams" is matched explicitly.
    match: (p) =>
      p === "/teams" ||
      p.startsWith("/teams/") ||
      p === "/team" ||
      p.startsWith("/team/"),
  },
  {
    id: "vault",
    label: "Vault",
    href: "/vault",
    match: (p) => p.startsWith("/vault"),
  },
  {
    id: "scenario",
    label: "Scenario Simulator",
    href: "/scenario",
    match: (p) => p.startsWith("/scenario"),
    beta: true,
  },
];

// The Desk tab is conditionally appended at render time when the
// `isOperator` prop is true. It is kept out of the TABS constant so a
// non-operator render never includes the tab in the DOM (no hidden
// element, no flicker).
const DESK_TAB: Tab = {
  id: "desk",
  label: "Desk",
  href: "/me",
  match: (p) => p.startsWith("/me"),
};

const TERMINAL_PREFIXES = [
  "/terminal",
  "/ledger",
  "/bracket",
  "/match",
  "/team",
];

function isTerminalRoute(pathname: string): boolean {
  return TERMINAL_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

interface EditorialMastheadProps {
  /**
   * Initial value for the `Desk` tab visibility on first paint. Server
   * callers can pass `false` (the new default after Checkpoint 17) and
   * let the client island below promote the flag on hydration once the
   * /api/me/session-status check resolves.
   *
   * Kept on the public interface so a caller that already knows the
   * operator state server-side (e.g. /me itself, which is force-dynamic
   * and reads cookies directly) can avoid the round trip.
   */
  isOperator?: boolean;
}

// cp-08 additive onboarding · Surface A · the persistent "First time?"
// masthead pill. Always available so a visitor who dismissed the chip,
// arrived deep-linked, or just wants the explainer later can re-open
// the modal. Reads `45a.onboarding.seen` from localStorage on mount;
// when absent, applies the .help-pulse class (a gentle opacity breath
// declared in globals.css). The OnboardingController owns the actual
// modal; this pill dispatches a custom event so cross-component
// coupling stays light. On dismissal anywhere (chip ✕, modal close,
// CTA click), the controller broadcasts `45a:onboarding:seen` so this
// pill clears its pulse without polling.
function MastheadOnboardingPill() {
  // Pulse is CSS-driven (see .help-pulse rule in globals.css, scoped to
  // html:not([data-onboarding-seen="true"])). The pre-hydrate script in
  // layout.tsx stamps the dataset attribute before paint, so returning
  // visitors render with the animation already suppressed: zero flash,
  // no useSyncExternalStore/hydration race. First-visit visitors get
  // the breath until any dismissal path elsewhere writes seen=true and
  // updates the dataset.
  //
  // The local `paused` flag adds .help-pulse-paused on this pill the
  // instant it is clicked, so the breath stops immediately for the
  // current visit even before the user closes the modal (which is what
  // actually writes seen). Per Design Package section 10 the pulse
  // "stops the moment ... the pill itself is clicked"; per the v2
  // brief, the pill click does NOT itself flag seen (the modal close
  // path does), so this is the right separation.
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);

  function onClick() {
    setPaused(true);
    // The OnboardingController listens for this event and opens the
    // modal regardless of where the masthead is rendered. The
    // controller's `closeModal` then writes seen and broadcasts the
    // `45a:onboarding:seen` event.
    try {
      window.dispatchEvent(new Event("45a:onboarding:open"));
    } catch {
      /* Event constructor unavailable on truly ancient runtimes. */
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      // Hidden on mobile to keep the masthead's wordmark + brief row
      // uncluttered at 375px (matches the "Open terminal" CTA's
      // mobile-hiding convention). First-visit visitors on mobile
      // discover onboarding via the chip; re-opening on mobile is
      // currently a localStorage-clear recovery path.
      className={`no-underline shrink-0 hidden md:inline-flex items-center md:order-5 help-pulse${paused ? " help-pulse-paused" : ""}`}
      aria-label="First time here? Read a 90-second orientation."
      title="First time here?"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: hover ? "var(--text-primary)" : "var(--text-tertiary)",
        background: "transparent",
        border: "1px solid var(--rule)",
        padding: "0 10px",
        height: 26,
        borderRadius: 4,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "color 120ms, border-color 120ms",
        borderColor: hover ? "var(--text-tertiary)" : "var(--rule)",
      }}
    >
      First time?
    </button>
  );
}

export function EditorialMasthead({
  isOperator: initialIsOperator = false,
}: EditorialMastheadProps = {}) {
  const pathname = usePathname() ?? "/";
  const onTerminal = isTerminalRoute(pathname);

  // Checkpoint 17 follow-up: read operator state on the client so the
  // Desk tab survives static prerendering. Pages under (editorial),
  // (quant), and (simulator) layouts no longer read the cookie at the
  // layout level, so the prerendered HTML always omits the Desk tab.
  // On hydration we hit /api/me/session-status (no-store, ~10 ms in
  // production) and promote the flag in place. For non-operators the
  // fetch is a no-op; for operators the Desk tab appears as soon as
  // the response lands.
  const [isOperator, setIsOperator] = useState(initialIsOperator);
  useEffect(() => {
    if (initialIsOperator) return;
    let cancelled = false;
    fetch("/api/me/session-status", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (cancelled || !body) return;
        if (body.isOperator === true) setIsOperator(true);
      })
      .catch(() => {
        // Silent: the worst case is the Desk tab is hidden on this
        // visit; the user can still type /me directly if they know it.
      });
    return () => {
      cancelled = true;
    };
  }, [initialIsOperator]);

  const tabs = isOperator ? [...TABS, DESK_TAB] : TABS;

  return (
    <header
      className="border-b"
      style={{
        borderColor: "var(--border-default)",
        background: "var(--bg-panel-elev)",
      }}
    >
      <div
        // Two-row stack on narrow viewports (≤md), single inline row on
        // md+. On mobile: row 1 holds the wordmark + the brief link;
        // row 2 holds the primary nav, full-width and horizontally
        // scrollable. The single-row md+ layout preserves the existing
        // brutalist density on desktop. The stack avoids the
        // flex-squeeze that previously pushed the nav to 0 width on
        // mobile because wordmark + brief + CTA consumed the entire
        // viewport.
        className="mx-auto flex flex-col md:flex-row md:items-baseline gap-3 md:gap-9 px-4 md:px-12 py-[14px] md:py-[22px]"
        style={{ maxWidth: 1152 }}
      >
        {/* Row 1 on mobile: wordmark + brief / CTA. Inline on md+. */}
        <div className="flex items-baseline justify-between gap-4 md:contents">
          <Link
            href="/"
            // text-[22px] on mobile keeps the wordmark from crowding the
            // "Today's brief" link in the new two-row stack; md:text-[24px]
            // restores the original desktop size so the masthead height
            // and downstream baseline cascade match the pre-Phase-1
            // rendering exactly (visual-regression baselines for
            // /ledger HIT row depend on this).
            className="no-underline shrink-0 text-[22px] md:text-[24px]"
            style={{
              fontFamily: "var(--font-serif)",
              letterSpacing: "-0.015em",
              color: "var(--text-primary)",
            }}
          >
            The{" "}
            <span className="wordmark-accent">45%</span>{" "}
            Problem
          </Link>

          {/* On mobile the brief link sits to the right of the wordmark.
              On md+ it falls back into the source-order position
              between the nav and the CTA via display: contents on the
              parent. */}
          <Link
            href="/brief"
            aria-current={pathname.startsWith("/brief") ? "page" : undefined}
            className="no-underline mono shrink-0 hover:underline underline-offset-4 md:order-3"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              color: pathname.startsWith("/brief")
                ? "var(--text-primary)"
                : "var(--text-tertiary)",
              whiteSpace: "nowrap",
            }}
          >
            Today&rsquo;s brief
          </Link>

          {!onTerminal && (
            <Link
              href="/terminal"
              // Hidden on mobile (redundant with the "Matches" tab in
              // the nav, which also points at /terminal). Visible from
              // md+ onwards where horizontal real estate allows it.
              className="no-underline hidden md:inline-flex items-center gap-1.5 shrink-0 md:order-4"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                fontWeight: 500,
                background: "var(--text-primary)",
                color: "var(--bg-root)",
                padding: "0 14px",
                height: 32,
                borderRadius: 6,
              }}
            >
              Open terminal <span style={{ opacity: 0.6 }}>→</span>
            </Link>
          )}

          {/* cp-08 additive onboarding pill. Source order places it
              after "Open terminal" on md+; on mobile the parent
              wrapper switches off display: contents so this falls into
              the same row as the wordmark and brief link, but the
              button itself is hidden on mobile via .hidden md:inline-flex
              to keep the narrow-viewport row uncluttered. */}
          <MastheadOnboardingPill />

          {/* cp-39 · global find-a-team. A compact search icon on every page
              that jumps to /team/[code] or the team-filtered /matches. Shown at
              all breakpoints; on mobile it sits in row 1 next to the brief link
              (small enough not to worsen the narrow-viewport row). */}
          <TeamJump />
        </div>

        <nav
          // Full-width scrolling row on mobile (its own row in the
          // flex-col stack); flex-1 on md+ where it sits between the
          // wordmark and the brief link. On mobile, min-w-0 +
          // overflow-x-auto + .no-scrollbar lets the nav scroll
          // horizontally without forcing the parent row past the
          // viewport edge. On md+ the scroll affordance is deliberately
          // switched off: md:min-w-fit restores the content floor that
          // min-w-0 removed, so the flex-1 nav can never shrink below
          // its tabs and collapse into a blank, scrollable underline
          // strip; md:overflow-visible drops the scroll container so all
          // six tabs render in full at desktop. flex-1 (grow) is kept so
          // the nav still expands to push the brief link and CTA to the
          // right. The order-2 class keeps the source-order layout
          // correct on md+ where the brief link is order-3 and the CTA
          // is order-4.
          className="flex min-w-0 md:min-w-fit flex-1 items-baseline gap-4 md:gap-6 overflow-x-auto md:overflow-visible no-scrollbar whitespace-nowrap md:order-2"
          aria-label="Primary"
        >
          {/* Mobile-only "Open terminal" entry. The desktop CTA lives in
              row 1 (hidden md:inline-flex) but is too wide to share the
              narrow mobile row 1 with the wordmark + brief link without
              overflowing the viewport. The Matches tab no longer routes
              to /terminal, so without this the terminal is unreachable on
              mobile. Placing it first in the horizontally-scrolling nav
              keeps it visible at rest and can never overflow the page.
              md:hidden so desktop uses the row-1 pill only. Gated on
              !onTerminal to match the desktop CTA's redundancy hiding. */}
          {!onTerminal && (
            <Link
              href="/terminal"
              className="no-underline shrink-0 self-center inline-flex items-center gap-1.5 md:hidden"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                fontWeight: 500,
                background: "var(--text-primary)",
                color: "var(--bg-root)",
                padding: "0 12px",
                height: 28,
                borderRadius: 6,
              }}
            >
              Open terminal <span style={{ opacity: 0.6 }}>→</span>
            </Link>
          )}
          {tabs.map((tab) => {
            const active = tab.match(pathname);
            return (
              <Link
                key={tab.id}
                href={tab.href}
                // shrink-0 keeps each tab at its full intrinsic width.
                // Without it, under horizontal pressure the flex items
                // squeeze and the inherited whitespace-nowrap label gets
                // clipped (e.g. "Scenario Simulator" → "Scena").
                //
                // The active-tab underline uses a large pad-down +
                // negative margin so the border sits exactly on the
                // header's bottom rule on md+. On mobile the nav is a
                // horizontal scroller (overflow-x-auto), which the CSS
                // spec forces to also clip/scroll the cross axis, so
                // that 22px overhang became a stray vertical scroll
                // region. Below md we shrink the overhang (pb-1.5 / mb-0)
                // so the underline sits inside the nav's own box and
                // there is nothing to scroll vertically; the full
                // 22 / -23 values are restored at md+ where the nav is
                // overflow-visible and aligns to the header rule.
                className="no-underline shrink-0 pb-1.5 md:pb-[22px] mb-0 md:-mb-[23px]"
                aria-current={active ? "page" : undefined}
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  color: active
                    ? "var(--text-primary)"
                    : "var(--text-tertiary)",
                  borderBottom: active
                    ? "1.5px solid var(--text-primary)"
                    : "1.5px solid transparent",
                }}
              >
                {tab.label}
                {tab.beta ? (
                  <span
                    aria-label="beta"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      marginLeft: 5,
                      opacity: 0.6,
                      textTransform: "uppercase",
                      letterSpacing: ".10em",
                    }}
                  >
                    Beta
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
