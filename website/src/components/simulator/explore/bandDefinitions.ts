/**
 * Locked vocabulary for the /scenario/explore band picker. The display
 * labels are uppercase per the brutalist mono style; the internal `band`
 * field uses the title-case form that getRarityBand returns and that
 * RealityScorePanel renders. The `slug` is the URL-safe form used in
 * the ?band= query.
 */

import type { RarityBand } from "@/lib/sim/types";

export const BAND_SLUGS = [
  "common",
  "plausible",
  "uncommon",
  "rare",
  "vanishingly-rare",
] as const;
export type BandSlug = (typeof BAND_SLUGS)[number];

export interface BandDefinition {
  slug: BandSlug;
  band: RarityBand;
  label: string;
}

export const BAND_DEFINITIONS: readonly BandDefinition[] = [
  { slug: "common", band: "Common", label: "COMMON" },
  { slug: "plausible", band: "Plausible", label: "PLAUSIBLE" },
  { slug: "uncommon", band: "Uncommon", label: "UNCOMMON" },
  { slug: "rare", band: "Rare", label: "RARE" },
  { slug: "vanishingly-rare", band: "Vanishingly rare", label: "VANISHINGLY RARE" },
] as const;

const BY_SLUG: ReadonlyMap<BandSlug, BandDefinition> = new Map(
  BAND_DEFINITIONS.map((d) => [d.slug, d]),
);

const BY_BAND: ReadonlyMap<RarityBand, BandDefinition> = new Map(
  BAND_DEFINITIONS.map((d) => [d.band, d]),
);

export function parseBandSlug(raw: string | undefined): RarityBand | null {
  if (!raw) return null;
  const def = BY_SLUG.get(raw as BandSlug);
  return def ? def.band : null;
}

export function slugForBand(band: RarityBand): BandSlug {
  return BY_BAND.get(band)!.slug;
}

export function labelForBand(band: RarityBand): string {
  return BY_BAND.get(band)!.label;
}

/**
 * Default landing band when ?band= is absent or invalid.
 *
 * The brief specified "plausible" on the assumption that band would have
 * the widest user-mass appeal. Under the current snapshot's independence
 * approximation Final Four joint probabilities top out around 1.2%, so
 * Common and Plausible are both empty (see promoCards.ts header note).
 * The default falls back to Uncommon, which is the rarest band that
 * actually has content (354 combinations at this snapshot) and reads
 * closest to the brief's "not too obvious, not too rare" intent.
 *
 * Revisit if the snapshot ever produces enough Final-Four mass to
 * populate Plausible.
 */
export const DEFAULT_BAND: RarityBand = "Uncommon";
