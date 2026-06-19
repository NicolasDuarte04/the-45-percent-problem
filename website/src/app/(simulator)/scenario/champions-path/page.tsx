import type { Metadata } from "next";
import { ModeChampionsPath } from "@/components/simulator/modes/ModeChampionsPath";
import { SimulatorChrome } from "@/components/simulator/SimulatorChrome";
import { scenarioShareMetadata } from "@/lib/sim/scenarioShareMetadata";

const baseMetadata: Metadata = {
  title: "Champion's Path · Scenario Simulator",
  description:
    "Trace your team's path from the Round of 16 to the final. See how often the model agrees.",
};

interface PageProps {
  searchParams: Promise<{ s?: string }>;
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const { s } = await searchParams;
  return scenarioShareMetadata(s, "/scenario/champions-path", baseMetadata);
}

export default function ChampionsPathPage() {
  const modelSha = process.env.MODEL_SHA ?? "phaseA-mock";
  const snapshotSha = process.env.SNAPSHOT_SHA ?? "phaseA-mock";

  return (
    <SimulatorChrome width="narrow">
      <ModeChampionsPath modelSha={modelSha} snapshotSha={snapshotSha} />
    </SimulatorChrome>
  );
}
