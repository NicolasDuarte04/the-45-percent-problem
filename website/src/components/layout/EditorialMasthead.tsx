"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Tab {
  id: string;
  label: string;
  href: string;
  match: (path: string) => boolean;
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
];

export function EditorialMasthead() {
  const pathname = usePathname() ?? "/";

  return (
    <header
      className="border-b"
      style={{
        borderColor: "var(--border-default)",
        background: "var(--bg-panel-elev)",
      }}
    >
      <div
        className="mx-auto flex items-baseline gap-9 px-12 py-[22px]"
        style={{ maxWidth: 1152 }}
      >
        <Link
          href="/"
          className="no-underline"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 24,
            letterSpacing: "-0.015em",
            color: "var(--text-primary)",
          }}
        >
          The{" "}
          <span className="wordmark-accent">45%</span>{" "}
          Problem
        </Link>

        <nav
          className="flex items-baseline gap-6 flex-1"
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
              </Link>
            );
          })}
        </nav>

        <Link
          href="/terminal"
          className="no-underline inline-flex items-center gap-1.5"
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
      </div>
    </header>
  );
}
