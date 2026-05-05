"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
    href: "/terminal",
    match: (p) => p.startsWith("/match") || p.startsWith("/terminal"),
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
    match: (p) => p.startsWith("/bracket") || p.startsWith("/team"),
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

export function EditorialMasthead() {
  const pathname = usePathname() ?? "/";
  const onTerminal = isTerminalRoute(pathname);

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
            className="no-underline shrink-0"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 22,
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
              // Hidden on mobile — redundant with the "Matches" tab in
              // the nav, which also points at /terminal. Visible from
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
        </div>

        <nav
          // Full-width scrolling row on mobile (its own row in the
          // flex-col stack); flex-1 on md+ where it sits between the
          // wordmark and the brief link. min-w-0 + overflow-x-auto +
          // .no-scrollbar lets the nav scroll horizontally without
          // forcing the parent row past the viewport edge. The order-2
          // class keeps the source-order layout correct on md+ where
          // the brief link is order-3 and the CTA is order-4.
          className="flex min-w-0 flex-1 items-baseline gap-4 md:gap-6 overflow-x-auto no-scrollbar whitespace-nowrap md:order-2"
          aria-label="Primary"
        >
          {TABS.map((tab) => {
            const active = tab.match(pathname);
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className="no-underline"
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
                  paddingBottom: 22,
                  marginBottom: -23,
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
