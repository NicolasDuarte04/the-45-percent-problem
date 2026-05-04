import type { Metadata } from "next";
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
    "The 45A daily brief. Probabilistic divergences from the nightly Monte Carlo run. One issue per UTC day. Methodology open. Unsubscribe one click.",
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
          title="The model and the market, every day at 12:00 UTC"
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
          How likely is your team to win? How likely does the market think?
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
          Get the quantitative baseline before kickoff. We run 10,000
          simulations daily to track your team&rsquo;s true probability of
          advancing, delivered straight to your inbox.
        </p>
        <LiveDataBlock showFallbackMarker={showFallbackMarker} />
        <EmailCaptureForm source="brief" />
        <TeamChipStrip />
      </section>
    </div>
  );
}
