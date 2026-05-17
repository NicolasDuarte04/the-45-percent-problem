import type { Metadata } from "next";
import { ModeFullBracket } from "@/components/simulator/modes/ModeFullBracket";
import { SimulatorChrome } from "@/components/simulator/SimulatorChrome";

export const metadata: Metadata = {
  title: "Full Bracket · Scenario Simulator",
  description:
    "Call the whole tournament. Twelve group winners, twelve runners-up, then the knockouts.",
};

export default function FullBracketPage() {
  const modelSha = process.env.MODEL_SHA ?? "phaseA-mock";
  const snapshotSha = process.env.SNAPSHOT_SHA ?? "phaseA-mock";

  return (
    <SimulatorChrome width="wide">
      <ModeFullBracket modelSha={modelSha} snapshotSha={snapshotSha} />
    </SimulatorChrome>
  );
}
