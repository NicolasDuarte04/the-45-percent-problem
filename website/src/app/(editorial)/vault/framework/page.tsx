import Link from "next/link";
import type { Metadata } from "next";
import { Eyebrow } from "@/components/editorial/Eyebrow";
import { PdfEmbed } from "@/components/editorial/PdfEmbed";
import { loadSnapshotMeta } from "@/lib/data/loadSnapshot";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Phase 1 framework (PDF) — Research Vault",
  description:
    "The Phase 1 framework paper, embedded and downloadable. Remains the artifact of record; the web Vault is the primary reading surface.",
};

interface TocEntry {
  section: string;
  title: string;
  /** If set, the web-native equivalent article lives at this route. */
  webHref?: string;
  webTitle?: string;
}

// §8.7 — TOC maps paper sections to the web-native equivalent where one exists.
const toc: TocEntry[] = [
  {
    section: "\u00A7 1",
    title: "Problem framing: the residual variance",
    webHref: "/vault/the-45-percent",
    webTitle: "The 45% Problem",
  },
  {
    section: "\u00A7 2",
    title: "Why probability distributions over point predictions",
    webHref: "/vault/why-probabilities",
    webTitle: "Why probabilities",
  },
  {
    section: "\u00A7 3",
    title: "Model lineage: M0 through M\u2605",
    webHref: "/vault/models",
    webTitle: "Anatomy of M0\u2013M\u2605",
  },
  {
    section: "\u00A7 3.2",
    title: "Bivariate Poisson with Dixon-Coles correction",
    webHref: "/vault/simulation",
    webTitle: "Simulation",
  },
  {
    section: "\u00A7 4",
    title: "Market layer \u2014 de-vigging and the power method",
    webHref: "/vault/market-layer",
    webTitle: "Market layer",
  },
  {
    section: "\u00A7 5",
    title: "Volatility gate \u2014 the five rules",
    webHref: "/vault/volatility-gate",
    webTitle: "Volatility gate",
  },
  {
    section: "\u00A7 6",
    title: "Evaluation \u2014 Brier, log-loss, CLV",
    webHref: "/vault/evaluation",
    webTitle: "Evaluation",
  },
];

const PDF_HREF = "/papers/phase1-framework.pdf";

export default function FrameworkPage() {
  const meta = loadSnapshotMeta();

  return (
    <>
      <article
        className="mx-auto"
        style={{
          maxWidth: 1152,
          padding: "64px 48px 96px",
          color: "var(--text-primary)",
        }}
      >
        <header style={{ maxWidth: "68ch", marginBottom: 40 }}>
          <Eyebrow style={{ marginBottom: 16 }}>§ II · Artifact of record</Eyebrow>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 500,
              fontSize: 48,
              lineHeight: "56px",
              letterSpacing: "-0.015em",
              margin: "0 0 24px",
            }}
          >
            Phase 1 framework
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
            What&#8217;s in this paper, who it&#8217;s for, and what the web
            Vault covers instead. The PDF remains the artifact of record for
            citation and archival, pre-registered alongside the OSF lockdown.
            For narrative reading, the long-form Vault articles linked in the
            outline below are the primary surface.
          </p>
        </header>

        {/* ── Actions bar ───────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            marginBottom: 32,
            maxWidth: "68ch",
          }}
        >
          <a
            href={PDF_HREF}
            download
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              border: "1px solid var(--border-default)",
              background: "var(--bg-panel-elev)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              borderRadius: "var(--radius-sm)",
            }}
          >
            <span aria-hidden>↓</span> Download PDF
          </a>
          <span
            className="mono"
            style={{
              fontSize: 12,
              color: "var(--text-tertiary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: "6px 10px",
            }}
            aria-label={`Cited against snapshot ${meta.snapshot_id}`}
          >
            <span style={{ color: "var(--text-quiet)", opacity: 0.7 }}>
              snapshot:
            </span>{" "}
            {meta.snapshot_id}
          </span>
          <span
            className="mono"
            style={{
              fontSize: 12,
              color: "var(--text-tertiary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: "6px 10px",
            }}
            aria-label={`Pre-registration tag ${meta.pre_reg_tag}`}
          >
            <span style={{ color: "var(--text-quiet)", opacity: 0.7 }}>
              tag:
            </span>{" "}
            {meta.pre_reg_tag}
          </span>
        </div>

        {/* ── PDF embed ─────────────────────────────────────────────────── */}
        <section aria-label="Embedded PDF" style={{ marginBottom: 72 }}>
          <PdfEmbed src={PDF_HREF} title="Phase 1 framework paper" />
        </section>

        {/* ── Outline ───────────────────────────────────────────────────── */}
        <section
          aria-labelledby="outline-heading"
          style={{ maxWidth: "68ch" }}
        >
          <h2
            id="outline-heading"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 500,
              fontSize: 28,
              lineHeight: "36px",
              margin: "0 0 8px",
            }}
          >
            Outline
          </h2>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 16,
              lineHeight: "26px",
              color: "var(--text-tertiary)",
              margin: "0 0 24px",
            }}
          >
            Each paper section links to its web-native Vault article where
            one exists. The web version carries the same argument with
            living figures drawn from the current snapshot.
          </p>

          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {toc.map((entry) => (
              <li
                key={entry.section}
                style={{
                  display: "grid",
                  gridTemplateColumns: "56px 1fr auto",
                  alignItems: "baseline",
                  gap: 16,
                  padding: "14px 0",
                  borderTop: "1px solid var(--rule)",
                }}
              >
                <span
                  className="mono"
                  style={{
                    color: "var(--text-quiet)",
                    fontSize: 13,
                  }}
                >
                  {entry.section}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 17,
                    color: "var(--text-primary)",
                  }}
                >
                  {entry.title}
                </span>
                {entry.webHref ? (
                  <Link
                    href={entry.webHref}
                    className="vault-eyebrow"
                    style={{
                      color: "var(--accent-focus)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    read → {entry.webTitle}
                  </Link>
                ) : (
                  <span
                    className="vault-eyebrow"
                    style={{ color: "var(--text-quiet)" }}
                  >
                    PDF only
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      </article>
    </>
  );
}
