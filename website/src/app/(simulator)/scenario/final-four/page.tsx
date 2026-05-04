import type { Metadata } from "next";
import { ModeFinalFour } from "@/components/simulator/modes/ModeFinalFour";
import { SimulatorChrome } from "@/components/simulator/SimulatorChrome";

export const metadata: Metadata = {
  title: "Final Four — Scenario Simulator",
  description: "Pick the four semifinalists. See how often the model agrees.",
};

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

  return (
    <SimulatorChrome width="narrow">
      <ModeFinalFour modelSha={modelSha} snapshotSha={snapshotSha} />
    </SimulatorChrome>
  );
}
