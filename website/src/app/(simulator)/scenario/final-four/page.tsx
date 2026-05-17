import type { Metadata } from "next";
import { ModeFinalFour } from "@/components/simulator/modes/ModeFinalFour";
import { SimulatorChrome } from "@/components/simulator/SimulatorChrome";
import { loadTournament } from "@/lib/data/loadSnapshot";
import { getModalSemifinalists } from "@/lib/sim/modalBracket";
import { getPromoCard } from "@/lib/sim/promoCards";
import { computeRealityScore } from "@/lib/sim/computeRealityScore";
import { canonicalizeScenario } from "@/lib/sim/canonicalizeScenario";
import { getOneInN } from "@/lib/sim/getOneInN";
import { COUNTRY_NAMES } from "@/lib/flags/countries";
import type { TeamCode } from "@/lib/sim/types";

interface PageProps {
  searchParams: Promise<{ card?: string; teams?: string }>;
}

/**
 * Parse a `?teams=ESP,FRA,ARG,BRA` query into a validated TeamCode[4].
 * Returns null if the parameter is absent, malformed, includes an unknown
 * code, or does not name exactly four distinct teams. Codes are
 * upper-cased defensively before validation.
 */
function parseTeamsParam(raw: string | undefined): TeamCode[] | null {
  if (!raw) return null;
  const codes = raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  if (codes.length !== 4) return null;
  if (new Set(codes).size !== 4) return null;
  const known = COUNTRY_NAMES as Record<string, string>;
  for (const c of codes) {
    if (!/^[A-Z]{3}$/.test(c)) return null;
    if (!known[c]) return null;
  }
  return codes as TeamCode[];
}

/**
 * Final Four mode, server entry.
 *
 * Reads modelSha/snapshotSha from server-side env vars and passes them
 * to the client component, so those identifiers never flow through
 * NEXT_PUBLIC_* (kept off the static bundle). Falls back to short
 * placeholder hashes for local dev when the env is not populated.
 *
 * `?card=<slug>` (P0.7) pre-fills the four slots with a curated promo
 * scenario and rewires the OG / Twitter unfurl to the promo image. Invalid
 * slugs are ignored (the page renders normally, no error UI).
 */
export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const { card: slug } = await searchParams;
  const base: Metadata = {
    title: "Final Four · Scenario Simulator",
    description: "Pick the four semifinalists. See how often the model agrees.",
  };

  if (!slug) return base;
  const card = getPromoCard(slug);
  if (!card) return base;

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
      url: `/scenario/final-four?card=${card.slug}`,
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

export default async function FinalFourPage({ searchParams }: PageProps) {
  const { card: slug, teams: teamsParam } = await searchParams;
  const modelSha = process.env.MODEL_SHA ?? "phaseA-mock";
  const snapshotSha = process.env.SNAPSHOT_SHA ?? "phaseA-mock";

  let modalSemifinalists: ReturnType<typeof getModalSemifinalists> = [];
  try {
    modalSemifinalists = getModalSemifinalists(loadTournament());
  } catch {
    modalSemifinalists = [];
  }

  // `?card=` takes priority over `?teams=` when both are present, so the
  // curated promo OG / unfurl is preserved. `?teams=` is the explore-page
  // hand-off (Checkpoint 11, P2.2); it pre-fills the same slot row but
  // does not set a promoSlug, so the generic Final Four OG renders.
  const promo = slug ? getPromoCard(slug) : null;
  const teamsPreset = promo ? null : parseTeamsParam(teamsParam);
  const initialScenario = promo
    ? promo.semifinalists
    : (teamsPreset ?? undefined);

  return (
    <SimulatorChrome width="narrow">
      <ModeFinalFour
        modelSha={modelSha}
        snapshotSha={snapshotSha}
        modalSemifinalists={modalSemifinalists}
        initialScenario={initialScenario}
        promoSlug={promo ? promo.slug : undefined}
      />
    </SimulatorChrome>
  );
}
