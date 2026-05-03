import { Suspense } from "react";
import {
  loadBracket,
  loadSnapshotMeta,
  loadTournament,
} from "@/lib/data/loadSnapshot";
import { loadStructuralMaps, mergeTournament } from "@/lib/db/structuralMerge";
import { BracketBoard } from "@/components/compositions/BracketBoard";
import { RoundProbabilityLegend } from "@/components/compositions/RoundProbabilityLegend";
import { ProvenanceBlock } from "@/components/layout/ProvenanceBlock";
import { CanvasTour } from "@/components/compositions/CanvasTour";
import { TourTriggerButton } from "@/components/compositions/TourTriggerButton";
import { BRACKET_STEPS, BRACKET_DURATION_SEC } from "./_steps";

export const dynamic = "force-static";

export const metadata = {
  title: "Bracket — The 45% Problem",
  description:
    "Single-page bracket with per-round marginal probabilities drawn from the Monte Carlo ensemble.",
};

export default async function BracketPage() {
  const maps = await loadStructuralMaps();
  const bracket = loadBracket();
  const tournament = mergeTournament(loadTournament(), maps);
  const meta = loadSnapshotMeta();

  return (
    <div
      className="flex flex-col"
      style={{
        backgroundColor: "var(--bg-root)",
        color: "var(--text-primary)",
      }}
    >
      <div
        className="shrink-0 px-4 md:px-6 pt-6 pb-4 border-b"
        style={{ borderColor: "var(--border-default)" }}
      >
        <div className="max-w-[1152px] mx-auto px-0 md:px-12 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1
              data-guide-id="bracket-masthead-title"
              className="text-[18px] font-medium tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Bracket
            </h1>
            <p
              className="text-[12px] mt-0.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              Per-round marginal probabilities · snapshot{" "}
              <span className="mono">{meta.snapshot_id}</span> · phase{" "}
              <span className="mono">{meta.tournament_phase.replace(/_/g, " ")}</span>
            </p>
          </div>
          <Suspense fallback={null}>
            <TourTriggerButton
              steps={BRACKET_STEPS}
              durationSeconds={BRACKET_DURATION_SEC}
            />
          </Suspense>
        </div>
      </div>

      <div className="max-w-[1152px] mx-auto w-full px-4 md:px-12 py-6 flex flex-col gap-6">
        <BracketBoard bracket={bracket} tournament={tournament} />

        <RoundProbabilityLegend />

        <ProvenanceBlock meta={meta} />
      </div>
      <Suspense fallback={null}>
        <CanvasTour steps={BRACKET_STEPS} />
      </Suspense>
    </div>
  );
}
