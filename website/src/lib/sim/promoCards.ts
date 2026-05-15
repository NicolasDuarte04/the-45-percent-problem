/**
 * Evergreen promo card catalog.
 *
 * Each entry is a curated Final Four scenario that the social-media
 * campaigns can link to. The slug is the stable URL key (used by the
 * promo OG route and by the `?card=` pre-fill path on the Final Four
 * page). The semifinalists and storyLine are the curated content; the
 * 1-in-N number rendered on each card is computed live from the
 * current snapshot at render time, so the card stays honest as the
 * model evolves.
 *
 * Rarity coverage at the current snapshot (M0 marginals, 2026-05-04):
 *   favorites  Rare              the model's top tier holds the semifinals
 *   euro-four  Rare              UEFA dominance scenario
 *   conmebol   Vanishingly rare  a South American sweep
 *   host-trio  Vanishingly rare  all three 2026 hosts plus a favourite
 *
 * Note: Final Four joint probabilities top out around 1.2% under the
 * snapshot's independence approximation, so no curated Final Four
 * scenario can reach the Plausible band today. Coverage favors the
 * spectrum the simulator can actually produce. See the PR description
 * for the spec-ambiguity resolution.
 *
 * Slug rules: lowercase, hyphen-separated, URL-safe, descriptive,
 * brand-neutral (no betting or sentiment language).
 */

import type { TeamCode } from "@/lib/sim/types";

export interface PromoCard {
  /** Stable URL slug. Treat as forever-immutable: it is cached by social
   *  platforms and used as the OG image cache key. */
  slug: string;
  /** Final Four semifinalists. No ordering significance among them; the
   *  reality-score canonicalisation sorts before hashing. */
  semifinalists: TeamCode[];
  /** Single descriptive sentence shown in the serif column. Present
   *  tense, neutral, set-theoretic. No exclamation marks. */
  storyLine: string;
}

export const PROMO_CARDS: readonly PromoCard[] = [
  {
    slug: "favorites",
    semifinalists: ["ESP", "FRA", "ARG", "BRA"],
    storyLine: "Spain, France, Argentina, and Brazil all reach the semifinals.",
  },
  {
    slug: "euro-four",
    semifinalists: ["ESP", "FRA", "GER", "ENG"],
    storyLine: "Spain, France, Germany, and England all reach the semifinals.",
  },
  {
    slug: "host-trio",
    semifinalists: ["USA", "MEX", "CAN", "ESP"],
    storyLine: "All three host nations reach the semifinals alongside Spain.",
  },
  {
    slug: "conmebol",
    semifinalists: ["ARG", "BRA", "URU", "ECU"],
    storyLine:
      "Argentina, Brazil, Uruguay, and Ecuador hold the semifinals for South America.",
  },
] as const;

const BY_SLUG: ReadonlyMap<string, PromoCard> = new Map(
  PROMO_CARDS.map((c) => [c.slug, c]),
);

/** Resolve a slug to its catalog entry, or `null` if the slug is not in
 *  the catalog. Consumers must treat `null` as a 404 / "render the
 *  landing page normally" signal; never fall back to a default card. */
export function getPromoCard(slug: string): PromoCard | null {
  return BY_SLUG.get(slug) ?? null;
}
