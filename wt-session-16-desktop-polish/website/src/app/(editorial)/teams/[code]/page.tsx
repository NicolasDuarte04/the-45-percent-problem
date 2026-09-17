import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { COUNTRY_NAMES, isFifaCode, type FifaCode } from "@/lib/flags/countries";

export const dynamic = "force-static";

export async function generateStaticParams(): Promise<{ code: FifaCode }[]> {
  return (Object.keys(COUNTRY_NAMES) as FifaCode[]).map((code) => ({ code }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  if (!isFifaCode(code)) {
    return { title: "Team not found | 45analytics" };
  }
  return {
    title: `${COUNTRY_NAMES[code]} | 45analytics`,
    description: `${COUNTRY_NAMES[code]}'s 2026 FIFA World Cup outlook. Full per-team pages with model-vs-market probability over time arrive in a later phase.`,
  };
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  if (!isFifaCode(code)) notFound();

  const name = COUNTRY_NAMES[code];

  return (
    <div
      className="mx-auto"
      style={{
        maxWidth: 1152,
        padding: "clamp(40px, 6vw, 64px) clamp(16px, 4vw, 48px)",
        color: "var(--text-primary)",
      }}
    >
      <header style={{ maxWidth: 720, marginBottom: 48 }}>
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
          Teams · <span style={{ color: "var(--text-primary)" }}>{code}</span>
        </div>
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            letterSpacing: "-0.015em",
            fontSize: 40,
            lineHeight: 1.1,
            margin: 0,
            color: "var(--text-primary)",
          }}
        >
          {name}
        </h1>
      </header>

      <section
        style={{
          maxWidth: 640,
          padding: "20px 24px",
          border: "1px solid var(--rule)",
          borderRadius: 2,
          background: "var(--bg-panel-elev)",
        }}
        aria-label="Coming soon"
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
          ◆ Placeholder
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
          Coming soon.
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
          Per-team pages will show model-vs-market probability over time,
          group-stage standings, and bracket-path projections. Until that
          ships, the daily brief is the live model output.
        </p>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Link
            href="/brief"
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
            Daily brief →
          </Link>
          <Link
            href="/teams"
            className="no-underline"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text-tertiary)",
            }}
          >
            All 48 teams
          </Link>
        </div>
      </section>
    </div>
  );
}
