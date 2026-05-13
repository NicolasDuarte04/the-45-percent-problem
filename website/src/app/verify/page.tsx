import type { Metadata } from "next";
import Link from "next/link";
import { AlertArmedBeacon } from "./AlertArmedBeacon";

export const metadata: Metadata = {
  title: "Verifying your subscription · 45analytics",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface VerifyPageProps {
  searchParams: Promise<{ state?: string }>;
}

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const { state } = await searchParams;
  const isExpired = state === "expired";

  return (
    <main
      data-surface="brief"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "clamp(24px, 6vw, 48px)",
      }}
    >
      <div style={{ maxWidth: 480, width: "100%" }}>
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
          [45A] DAILY BRIEF
        </p>
        {isExpired ? (
          <>
            <h1
              style={{
                fontFamily: "var(--brief-font-serif)",
                fontWeight: 400,
                fontSize: 28,
                lineHeight: 1.2,
                color: "var(--brief-ink)",
                margin: "0 0 16px",
              }}
            >
              That confirmation link has expired.
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
              Verification links last 24 hours. Subscribe again from the home
              page to receive a fresh link.
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
          </>
        ) : (
          <>
            <AlertArmedBeacon />
            <h1
              style={{
                fontFamily: "var(--brief-font-serif)",
                fontWeight: 400,
                fontSize: 28,
                lineHeight: 1.2,
                color: "var(--brief-ink)",
                margin: "0 0 16px",
              }}
            >
              Verifying your subscription…
            </h1>
            <p
              style={{
                fontFamily: "var(--brief-font-sans)",
                fontSize: 14,
                lineHeight: 1.7,
                color: "var(--brief-graphite)",
                margin: 0,
              }}
            >
              If this page does not redirect within a few seconds, the link is
              invalid or has already been used.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
