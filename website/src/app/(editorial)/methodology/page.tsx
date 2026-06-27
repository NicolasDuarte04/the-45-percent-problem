/**
 * /methodology: research-product entry point.
 *
 * Phase 2 had this route as a thin redirect to `/vault/methodology` (the
 * long-form essay). Per the Phase 3 implementation prompt, the daily-brief
 * <LiveDataBlock /> should also surface here; visitors landing on the
 * methodology surface get a "today's number" reference alongside the link
 * into the vault essay. The redirect was preserving link rot from a Phase 1
 * URL move; we keep the URL alive but no longer auto-redirect.
 *
 * The vault essay at `/vault/methodology` remains the canonical long-form
 * page and is reached via the prominent CTA below.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { LiveDataBlock } from "@/components/email/LiveDataBlock";

// Pulls from Vercel Blob via lib/brief.ts; cron writes propagate within 10 min.
export const revalidate = 600;

export const metadata: Metadata = {
  title: "Methodology | 45analytics",
  description:
    "The 45analytics model in one sentence; and a link into the long-form Phase 1 framework essay. Today's daily brief shown above for reference.",
};

export default async function MethodologyEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ debug?: string }>;
}) {
  const sp = await searchParams;
  const showFallbackMarker = sp.debug === "fallback";

  return (
    <div
      className="mx-auto"
      style={{
        maxWidth: 1152,
        padding: "clamp(40px, 6vw, 64px) clamp(16px, 4vw, 48px)",
        color: "var(--text-primary)",
      }}
    >
      <header style={{ maxWidth: 720, marginBottom: 32 }}>
        <div
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
            marginBottom: 14,
          }}
        >
          Methodology
        </div>
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            letterSpacing: "-0.015em",
            fontSize: 36,
            lineHeight: 1.1,
            margin: 0,
            color: "var(--text-primary)",
          }}
        >
          A bivariate Poisson model with Dixon-Coles correction, run nightly.
        </h1>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            lineHeight: 1.7,
            color: "var(--text-secondary)",
            margin: "16px 0 0",
            maxWidth: 640,
          }}
        >
          10,000 Monte Carlo simulations per nightly snapshot. The
          pre-registered market layer de-vigs bookmaker odds via the power
          method, flags edges above a 3% mainline threshold (5% for
          derivatives), and suppresses them when the volatility gate triggers.
          This layer is live for group-stage fixtures; knockout fixtures are
          not yet covered, since those pairings are not known in advance.
          The full specification: every parameter, every calibration step,
          every kill criterion: lives in the vault.
        </p>
      </header>

      <section
        data-surface="brief"
        style={{ background: "transparent", marginBottom: 40 }}
        aria-label="Today's brief at a glance"
      >
        <div
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
            marginBottom: 14,
          }}
        >
          Today&rsquo;s brief
        </div>
        <LiveDataBlock showFallbackMarker={showFallbackMarker} />
      </section>

      <section
        style={{
          maxWidth: 640,
          padding: "20px 24px",
          border: "1px solid var(--rule)",
          borderRadius: 2,
          background: "var(--bg-panel-elev)",
        }}
        aria-label="Full methodology"
      >
        <div
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: ".10em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
            marginBottom: 8,
          }}
        >
          ◆ Long-form
        </div>
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 18,
            lineHeight: 1.45,
            color: "var(--text-primary)",
            margin: "0 0 12px",
          }}
        >
          The full methodology essay.
        </p>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            lineHeight: 1.7,
            color: "var(--text-secondary)",
            margin: "0 0 16px",
          }}
        >
          Model roster, simulation engine, market layer, volatility gate,
          and kill criteria. The web-native counterpart to the Phase 1
          framework PDF, reading time about 20 minutes.
        </p>
        <Link
          href="/vault/methodology"
          className="no-underline"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-primary)",
            borderBottom: "1px solid var(--text-primary)",
            paddingBottom: 1,
          }}
        >
          Read the full methodology →
        </Link>
      </section>

      <aside
        aria-label="Amendment record"
        style={{
          maxWidth: 640,
          marginTop: 24,
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          lineHeight: 1.6,
          fontStyle: "italic",
          color: "var(--text-tertiary)",
        }}
      >
        Probabilities are computed against amendment v1.1 of the locked
        champion artifact; see
        {" "}
        <code
          className="mono"
          style={{ fontSize: 11, fontStyle: "normal" }}
        >
          osf/amendments/amendment_v1.1_data_completeness.md
        </code>
        {" "}
        for the data-completeness backfill record.
      </aside>
    </div>
  );
}
