import type { Metadata } from "next";
import Link from "next/link";
import { SectionHead } from "@/components/compositions/SectionHead";
import { EmailCaptureForm } from "@/components/email/EmailCaptureForm";
import { LiveDataBlock } from "@/components/email/LiveDataBlock";
import { TeamChipStrip } from "@/components/email/TeamChipStrip";

// LiveDataBlock now reads from Vercel Blob via lib/brief.ts; the page picks
// up the cron's nightly write within the revalidate window. Phase 4 will add
// a targeted revalidatePath() call from the dispatch hook for instant freshness.
export const revalidate = 600;

export const metadata: Metadata = {
  title: "Daily brief | 45analytics",
  description:
    "The 45A daily brief from the World Cup 2026 run: probabilistic divergences from the Monte Carlo model, one issue per UTC day. Now a completed, fully readable archive. Methodology open.",
};

export default async function BriefSignupPage({
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
      <section
        data-surface="brief"
        style={{ background: "transparent" }}
        aria-label="Subscribe to the 45A daily brief"
      >
        <SectionHead
          eyebrow="Daily brief"
          title="The model and the market, now a complete archive"
        />
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            lineHeight: 1.7,
            color: "var(--text-secondary)",
            margin: "0 0 8px",
            maxWidth: 560,
          }}
        >
          How likely was your team to win? How likely did the market think?
        </p>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            lineHeight: 1.7,
            color: "var(--text-secondary)",
            margin: "0 0 16px",
            maxWidth: 560,
          }}
        >
          Through the World Cup 2026 window the brief ran one issue per UTC day,
          each built from 10,000 Monte Carlo simulations. The run is complete;
          every issue is collected in the{" "}
          <Link href="/briefs" style={{ color: "var(--accent-focus)", fontWeight: 500 }}>
            brief archive
          </Link>
          , free to read.
        </p>
        <LiveDataBlock showFallbackMarker={showFallbackMarker} />
        <EmailCaptureForm source="brief" />
        <TeamChipStrip />
      </section>
    </div>
  );
}
