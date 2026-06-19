import type { Metadata } from "next";
import { ModeFullBracket } from "@/components/simulator/modes/ModeFullBracket";
import { SimulatorChrome } from "@/components/simulator/SimulatorChrome";
import { scenarioShareMetadata } from "@/lib/sim/scenarioShareMetadata";

const baseMetadata: Metadata = {
  title: "Full Bracket · Scenario Simulator",
  description:
    "Call the whole tournament. Twelve group winners, twelve runners-up, then the knockouts.",
};

interface PageProps {
  searchParams: Promise<{ s?: string }>;
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const { s } = await searchParams;
  return scenarioShareMetadata(s, "/scenario/full-bracket", baseMetadata);
}

export default function FullBracketPage() {
  const modelSha = process.env.MODEL_SHA ?? "phaseA-mock";
  const snapshotSha = process.env.SNAPSHOT_SHA ?? "phaseA-mock";

  return (
    <SimulatorChrome width="wide">
      <ModeFullBracket modelSha={modelSha} snapshotSha={snapshotSha} />
    </SimulatorChrome>
  );
}
