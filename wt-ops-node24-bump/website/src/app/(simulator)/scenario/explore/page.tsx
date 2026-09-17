import type { Metadata } from "next";
import { SimulatorChrome } from "@/components/simulator/SimulatorChrome";
import { BandPicker } from "@/components/simulator/explore/BandPicker";
import { ExploreScenarioCard } from "@/components/simulator/explore/ExploreScenarioCard";
import {
  DEFAULT_BAND,
  parseBandSlug,
} from "@/components/simulator/explore/bandDefinitions";
import { generateExploreScenarios } from "@/lib/sim/rarityExplorer";
import { loadSnapshotMeta } from "@/lib/data/loadSnapshot";

/**
 * Reverse rarity lookup landing (Checkpoint 11, P2.2).
 *
 * Server component. force-dynamic so the snapshot meta and the picked
 * band are resolved per request; the rarityExplorer module caches the
 * enumeration across requests so the cost is paid once per process.
 *
 * robots noindex: this page is exploratory and the OG unfurl path is the
 * promo card surface, not this index.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Browse rarities · Scenario Simulator",
  description:
    "Pick a rarity band. Five example scenarios appear below, with the 1-in-N count from the current model snapshot.",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ band?: string }>;
}

export default async function ScenarioExplorePage({ searchParams }: PageProps) {
  const { band: bandParam } = await searchParams;
  const selectedBand = parseBandSlug(bandParam) ?? DEFAULT_BAND;
  const scenarios = generateExploreScenarios(selectedBand);

  let snapshotId = "unknown";
  let codeSha = "unknown";
  try {
    const meta = loadSnapshotMeta();
    snapshotId = meta.snapshot_id;
    codeSha = meta.code_sha.slice(0, 8);
  } catch {
    // Render the page even if the snapshot meta is unavailable in dev.
  }

  return (
    <SimulatorChrome width="narrow">
      <section aria-labelledby="explore-heading" className="pt-2 pb-8">
        <h1
          id="explore-heading"
          className="font-serif text-[36px] sm:text-[44px] leading-[1.05]"
          style={{ color: "var(--text-primary)" }}
        >
          Browse rarities
        </h1>
        <p
          className="mt-3 font-mono text-[12px] uppercase tracking-[0.12em]"
          style={{ color: "var(--text-tertiary)" }}
        >
          Pick a rarity band. Five example scenarios appear below.
        </p>

        <BandPicker selected={selectedBand} />

        {scenarios.length > 0 ? (
          <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {scenarios.map((scenario) => (
              <li
                key={scenario.semifinalists.join("-")}
                className="contents"
              >
                <ExploreScenarioCard scenario={scenario} band={selectedBand} />
              </li>
            ))}
          </ul>
        ) : (
          <div
            className="mt-8 border p-6 font-mono text-[12px]"
            style={{
              borderColor: "var(--border-default)",
              color: "var(--text-tertiary)",
            }}
            role="status"
          >
            No combinations match this band at the current snapshot. Pick
            another band above.
          </div>
        )}

        <div
          className="mt-10 font-mono text-[11px]"
          style={{ color: "var(--text-quiet)" }}
        >
          Model state · snapshot {snapshotId} · code {codeSha}
        </div>
      </section>
    </SimulatorChrome>
  );
}
