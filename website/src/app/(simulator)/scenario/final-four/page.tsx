import type { Metadata } from "next";
import { ModeFinalFour } from "@/components/simulator/modes/ModeFinalFour";
import { SimulatorChrome } from "@/components/simulator/SimulatorChrome";
import { loadTournament } from "@/lib/data/loadSnapshot";
import type { TeamCode } from "@/lib/sim/types";

export const metadata: Metadata = {
  title: "Final Four — Scenario Simulator",
  description: "Pick the four semifinalists. See how often the model agrees.",
};

/**
 * Top four teams by P(reach SF). This is the same set MostLikelyBracket
 * renders as the SF column on the home page (`bySF.slice(0, 4)`), so the
 * "model's call" labelling is consistent across the site.
 *
 * Returns an empty array if the snapshot is missing or any of the top
 * four codes do not match the strict 3-letter TeamCode regex; in that
 * case the ghost-fill button degrades to not rendering.
 */
function getModalSemifinalists(): TeamCode[] {
  try {
    const tournament = loadTournament();
    const top4 = [...tournament.teams]
      .sort((a, b) => b.p_semifinal - a.p_semifinal)
      .slice(0, 4)
      .map((t) => t.fifa_code);
    if (top4.length !== 4) return [];
    const valid = top4.filter((c): c is TeamCode => /^[A-Z]{3}$/.test(c));
    return valid.length === 4 ? valid : [];
  } catch {
    return [];
  }
}

/**
 * Final Four mode — server entry. Reads modelSha/snapshotSha from
 * server-side env vars and passes them to the client component, so
 * those identifiers never flow through NEXT_PUBLIC_* (kept off the
 * static bundle). Falls back to short placeholder hashes for local
 * dev when the env is not populated.
 */
export default function FinalFourPage() {
  const modelSha = process.env.MODEL_SHA ?? "phaseA-mock";
  const snapshotSha = process.env.SNAPSHOT_SHA ?? "phaseA-mock";
  const modalSemifinalists = getModalSemifinalists();

  return (
    <SimulatorChrome width="narrow">
      <ModeFinalFour
        modelSha={modelSha}
        snapshotSha={snapshotSha}
        modalSemifinalists={modalSemifinalists}
      />
    </SimulatorChrome>
  );
}
