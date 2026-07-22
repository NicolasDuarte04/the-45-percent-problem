import type { Metadata } from "next";
import Link from "next/link";
import { AlertArmedBeacon } from "./AlertArmedBeacon";

export const metadata: Metadata = {
  title: "Subscription confirmed · 45analytics",
  robots: { index: false, follow: false },
};

interface ConfirmedPageProps {
  searchParams: Promise<{ source?: string }>;
}

export default async function ConfirmedPage({ searchParams }: ConfirmedPageProps) {
  const { source } = await searchParams;
  return (
    <>
      {source === "alert" && <AlertArmedBeacon />}
    <main
      data-surface="brief"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "clamp(24px, 6vw, 48px)",
      }}
    >
      <div style={{ maxWidth: 560, width: "100%" }}>
        <p
          style={{
            fontFamily: "var(--brief-font-mono)",
            fontSize: 10,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "var(--brief-graphite-quiet)",
            margin: "0 0 16px",
          }}
        >
          [45A] DAILY BRIEF · ✓ CONFIRMED
        </p>

        <h1
          style={{
            fontFamily: "var(--brief-font-serif)",
            fontWeight: 400,
            fontSize: 28,
            lineHeight: 1.2,
            color: "var(--brief-ink)",
            margin: "0 0 20px",
          }}
        >
          You are subscribed.
        </h1>

        <p
          style={{
            fontFamily: "var(--brief-font-sans)",
            fontSize: 14,
            lineHeight: 1.7,
            color: "var(--brief-graphite)",
            margin: "0 0 24px",
          }}
        >
          The World Cup 2026 brief is complete; every issue is in the archive.
          Methodology stays open. Unsubscribe with one click from any email.
        </p>

        {/* Phase 3 mounts <LiveDataBlock /> here. Static placeholder for v1. */}
        <section
          aria-label="Latest brief preview"
          style={{
            background: "var(--brief-bg-elev)",
            border: "1px solid var(--brief-hairline)",
            borderRadius: 2,
            padding: "16px 18px",
            marginBottom: 24,
          }}
        >
          <p
            style={{
              fontFamily: "var(--brief-font-mono)",
              fontSize: 10,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--brief-graphite-quiet)",
              margin: "0 0 8px",
            }}
          >
            ◆ ARCHIVE
          </p>
          <p
            style={{
              fontFamily: "var(--brief-font-sans)",
              fontSize: 13,
              lineHeight: 1.7,
              color: "var(--brief-graphite)",
              margin: 0,
            }}
          >
            Past briefs and the live data block land in the archive once the
            tournament window opens.
          </p>
        </section>

        <p
          style={{
            fontFamily: "var(--brief-font-serif)",
            fontStyle: "italic",
            fontSize: 11,
            lineHeight: 1.6,
            color: "var(--brief-graphite)",
            margin: "16px 0 24px",
          }}
        >
          45analytics publishes probabilistic estimates and model-versus-market
          divergences. Nothing on this site is advice of any kind. Probabilities
          are subject to revision as new data arrives.
        </p>

        <Link
          href="/"
          style={{
            fontFamily: "var(--brief-font-mono)",
            fontSize: 11,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "var(--brief-ink)",
            textDecoration: "underline",
            textUnderlineOffset: 3,
          }}
        >
          ← Back to home
        </Link>
      </div>
    </main>
    </>
  );
}
