import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LandingHero } from "@/components/simulator/LandingHero";
import { ModeSelectorCards } from "@/components/simulator/ModeSelectorCards";
import { SimulatorChrome } from "@/components/simulator/SimulatorChrome";
import { SimulatorTrailer } from "@/components/simulator/SimulatorTrailer";
import { TeamGrid } from "@/components/simulator/TeamGrid";
import { getPromoCard } from "@/lib/sim/promoCards";
import { computeRealityScore } from "@/lib/sim/computeRealityScore";
import { canonicalizeScenario } from "@/lib/sim/canonicalizeScenario";
import { getOneInN } from "@/lib/sim/getOneInN";

interface PageProps {
  searchParams: Promise<{ card?: string }>;
}

const BASE_METADATA: Metadata = {
  title: "Scenario Simulator · 45analytics",
  description:
    "Call the World Cup 2026. Compare your scenario against 10,000 simulated tournaments and see how often the model agrees.",
};

/**
 * Simulator landing page.
 *
 * Layout (top to bottom):
 *   - Editorial masthead (from layout)
 *   - SimulatorChrome top mast strip
 *   - LandingHero
 *   - ModeSelectorCards
 *   - SimulatorTrailer
 *   - TeamGrid
 *   - SiteFooter (from layout)
 *
 * `?card=<slug>` (P0.7) is a marketing convenience. When the slug
 * resolves to a catalog entry the page server-redirects to the Final
 * Four surface pre-filled with the curated scenario. Invalid or absent
 * slugs fall through and render the landing page normally. Metadata
 * still surfaces the promo unfurl on the original URL when the slug is
 * valid so social-platform crawlers that do not follow redirects still
 * unfurl the right card.
 */
export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const { card: slug } = await searchParams;
  if (!slug) return BASE_METADATA;
  const card = getPromoCard(slug);
  if (!card) return BASE_METADATA;

  const scenario = { semifinalists: card.semifinalists };
  const canonical = canonicalizeScenario("final_four", scenario);
  const { count, total } = computeRealityScore("final_four", canonical, scenario);
  const oneInN = getOneInN(count, total);

  const title = `${oneInN}. ${card.storyLine}`;
  const description = card.storyLine;
  const ogImageUrl = `/api/og/promo/${card.slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/scenario?card=${card.slug}`,
      siteName: "45analytics",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `Promo scenario: ${card.storyLine}`,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function ScenarioLandingPage({ searchParams }: PageProps) {
  const { card: slug } = await searchParams;
  if (slug && getPromoCard(slug)) {
    redirect(`/scenario/final-four?card=${slug}`);
  }

  return (
    <SimulatorChrome width="narrow">
      <LandingHero />
      <ModeSelectorCards />
      <SimulatorTrailer />
      <TeamGrid />
    </SimulatorChrome>
  );
}
