import Link from "next/link";
import type { Metadata } from "next";
import { Eyebrow } from "@/components/editorial/Eyebrow";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Research Vault — The 45% Problem",
  description:
    "Long-form essays, the Phase 1 framework PDF, the pre-registration artifact, the kill-criteria statement, and the glossary.",
};

interface Pillar {
  eyebrow: string;
  title: string;
  blurb: string;
  entries: Array<{
    href: string;
    title: string;
    kind: string;
    length?: string;
  }>;
}

// §8.2 page system — four editorial pillars.
const pillars: Pillar[] = [
  {
    eyebrow: "§ I · Essays",
    title: "Long-form",
    blurb:
      "Web-native readings of the methodology. Each piece stands alone; figures inside read from the current snapshot.",
    entries: [
      {
        href: "/vault/the-45-percent",
        title: "The 45% Problem",
        kind: "Titular essay",
        length: "10\u201312 min",
      },
      {
        href: "/vault/why-probabilities",
        title: "Why probabilities, not predictions",
        kind: "Long-form",
        length: "8\u201310 min",
      },
      {
        href: "/vault/models",
        title: "Anatomy of M0 through M\u2605",
        kind: "Long-form",
        length: "12\u201315 min",
      },
      {
        href: "/vault/simulation",
        title: "Bivariate Poisson & Monte Carlo",
        kind: "Long-form",
        length: "10 min",
      },
      {
        href: "/vault/market-layer",
        title: "De-vigging, edge, and the power method",
        kind: "Long-form",
        length: "8 min",
      },
      {
        href: "/vault/volatility-gate",
        title: "The five gate rules",
        kind: "Long-form",
        length: "6 min",
      },
      {
        href: "/vault/evaluation",
        title: "Brier, log-loss, CLV in plain English",
        kind: "Long-form",
        length: "8 min",
      },
    ],
  },
  {
    eyebrow: "§ II · Artifacts",
    title: "Record of method",
    blurb:
      "Sources of record. The Phase 1 framework PDF and the OSF pre-registration lockdown.",
    entries: [
      {
        href: "/vault/framework",
        title: "Phase 1 framework (PDF)",
        kind: "Artifact",
      },
      {
        href: "/vault/preregistration",
        title: "OSF pre-registration",
        kind: "Artifact",
      },
    ],
  },
  {
    eyebrow: "§ III · Status",
    title: "Public commitments",
    blurb:
      "The kill-criteria statement is a pre-registered commitment: if M\u2605 underperforms the null baseline by the Round of 16, the project publishes a null result.",
    entries: [
      {
        href: "/vault/kill-criteria",
        title: "Kill-criteria statement",
        kind: "Status",
        length: "2 min",
      },
    ],
  },
  {
    eyebrow: "§ IV · Reference",
    title: "Glossary & notation",
    blurb:
      "Definitions, the symbol table mirroring the paper, and the canonical citation block.",
    entries: [
      { href: "/vault/glossary", title: "Glossary A\u2013Z", kind: "Reference" },
      { href: "/vault/notation", title: "Symbol table", kind: "Reference" },
      { href: "/vault/citation", title: "BibTeX & APA", kind: "Reference" },
    ],
  },
];

export default function VaultIndexPage() {
  return (
    <>
      <div
        className="mx-auto"
        style={{
          maxWidth: 1152,
          padding: "64px 48px",
          color: "var(--text-primary)",
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <header style={{ maxWidth: 640, marginBottom: 72 }}>
          <Eyebrow style={{ marginBottom: 16 }}>Research Vault</Eyebrow>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 500,
              fontSize: "clamp(2.5rem, 5vw, 3rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.015em",
              color: "var(--text-primary)",
              margin: "0 0 24px",
            }}
          >
            The methodology, written for the web.
          </h1>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 18,
              lineHeight: "30px",
              color: "var(--text-secondary)",
              margin: 0,
            }}
          >
            In the v1.0 site the methodology lived inside a PDF. Here it
            lives in prose, with living figures that read from the current
            snapshot. A non-specialist can follow the argument; a specialist
            can verify it.
          </p>
        </header>

        {/* ── Four pillar panels ──────────────────────────────────────── */}
        <section
          aria-label="Vault pillars"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 24,
          }}
        >
          {pillars.map((pillar) => (
            <article
              key={pillar.title}
              className="vault-pillar"
              style={{
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-panel-elev)",
                padding: "28px 28px 20px",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                flexDirection: "column",
                minHeight: 360,
              }}
            >
              <Eyebrow style={{ marginBottom: 12 }}>{pillar.eyebrow}</Eyebrow>
              <h2
                style={{
                  fontFamily: "var(--font-serif)",
                  fontWeight: 500,
                  fontSize: 24,
                  lineHeight: "32px",
                  color: "var(--text-primary)",
                  margin: "0 0 12px",
                }}
              >
                {pillar.title}
              </h2>
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 15,
                  lineHeight: "24px",
                  color: "var(--text-tertiary)",
                  margin: "0 0 24px",
                }}
              >
                {pillar.blurb}
              </p>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "auto 0 0",
                  display: "grid",
                  gap: 12,
                }}
              >
                {pillar.entries.map((entry) => (
                  <li key={entry.href}>
                    <Link
                      href={entry.href}
                      className="group block"
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "8px 0",
                        borderTop: "1px solid var(--rule)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-serif)",
                          fontSize: 16,
                          lineHeight: "22px",
                          fontWeight: 500,
                        }}
                      >
                        {entry.title}
                      </span>
                      {entry.length ? (
                        <span
                          className="mono"
                          style={{
                            fontSize: 11,
                            color: "var(--text-quiet)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {entry.length}
                        </span>
                      ) : (
                        <span
                          className="vault-eyebrow"
                          style={{
                            fontSize: 10,
                            color: "var(--text-quiet)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {entry.kind}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      </div>
    </>
  );
}
