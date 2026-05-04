import type { Metadata } from "next";
import { ModeChampionsPath } from "@/components/simulator/modes/ModeChampionsPath";
import { SimulatorChrome } from "@/components/simulator/SimulatorChrome";

export const metadata: Metadata = {
  title: "Champion's Path — Scenario Simulator",
  description:
    "Trace your team's path from the Round of 16 to the final. See how often the model agrees.",
};

export default function ChampionsPathPage() {
  const modelSha = process.env.MODEL_SHA ?? "phaseA-mock";
  const snapshotSha = process.env.SNAPSHOT_SHA ?? "phaseA-mock";

  return (
    <SimulatorChrome width="narrow">
      <ModeChampionsPath modelSha={modelSha} snapshotSha={snapshotSha} />
    </SimulatorChrome>
  );
}
