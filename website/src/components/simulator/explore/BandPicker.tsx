"use client";

/**
 * Band picker for /scenario/explore (Checkpoint 11, P2.2).
 *
 * Five buttons, brutalist mono uppercase, the locked vocabulary from
 * RealityScorePanel. The selected band carries an --accent-warm border
 * matching the existing simulator "matched state" pattern (see
 * ModelCallPanel team chips); the others use --border-default.
 *
 * Clicking a button does two things: emits the explore_band_selected
 * Plausible event and pushes the new ?band= query so the server re-runs
 * generateExploreScenarios for the chosen band. The page is force-dynamic
 * so the new sample renders on the next paint.
 */

import { useRouter } from "next/navigation";
import { track } from "@/lib/analytics/track";
import type { RarityBand } from "@/lib/sim/types";
import {
  BAND_DEFINITIONS,
  type BandSlug,
  slugForBand,
} from "./bandDefinitions";

interface BandPickerProps {
  selected: RarityBand;
}

export function BandPicker({ selected }: BandPickerProps) {
  const router = useRouter();
  const selectedSlug = slugForBand(selected);

  function handleSelect(slug: BandSlug, band: RarityBand) {
    if (slug === selectedSlug) return;
    track("explore_band_selected", { band });
    router.push(`/scenario/explore?band=${slug}`);
  }

  return (
    <nav
      aria-label="Pick a rarity band"
      className="mt-6 flex flex-wrap gap-2"
    >
      {BAND_DEFINITIONS.map((def) => {
        const isSelected = def.slug === selectedSlug;
        return (
          <button
            key={def.slug}
            type="button"
            onClick={() => handleSelect(def.slug, def.band)}
            aria-pressed={isSelected}
            className="font-mono text-[11px] uppercase tracking-[0.12em] px-3 py-2 transition-colors duration-100 focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]"
            style={{
              border: `1px solid ${
                isSelected ? "var(--accent-warm)" : "var(--border-default)"
              }`,
              color: isSelected
                ? "var(--accent-warm)"
                : "var(--text-primary)",
              background: "transparent",
            }}
          >
            [ {def.label} ]
          </button>
        );
      })}
    </nav>
  );
}
