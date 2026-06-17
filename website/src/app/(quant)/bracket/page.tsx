import { Suspense } from "react";
import {
  loadBracket,
  loadSnapshotMeta,
  loadTournament,
} from "@/lib/data/loadSnapshot";
import { loadStructuralMaps, mergeTournament } from "@/lib/db/structuralMerge";
import { resolveSnapshotPickerState } from "@/lib/data/snapshotPicker";
import { BracketBoard } from "@/components/compositions/BracketBoard";
import { RoundProbabilityLegend } from "@/components/compositions/RoundProbabilityLegend";
import { ProvenanceBlock } from "@/components/layout/ProvenanceBlock";
import { CanvasTour } from "@/components/compositions/CanvasTour";
import { TourTriggerButton } from "@/components/compositions/TourTriggerButton";
import {
  SnapshotPicker,
  SnapshotBanner,
} from "@/components/compositions/SnapshotPicker";
import { SnapshotAwareBracket } from "@/components/compositions/SnapshotAwareBracket";
import { BRACKET_STEPS, BRACKET_DURATION_SEC } from "./_steps";

export const metadata = {
  title: "Bracket · The 45% Problem",
  description:
    "Single-page bracket with per-round marginal probabilities drawn from the Monte Carlo ensemble.",
};

// Checkpoint 17 (A1): page reads zero per-request input. The snapshot
// toggle is a client island; historical snapshots are fetched via the
// /api/snapshots/[id]/page-data endpoint. Default view is statically
// prerendered.
export const dynamic = "force-static";

export default async function BracketPage() {
  const picker = resolveSnapshotPickerState(undefined);

  const maps = await loadStructuralMaps();
  const bracket = loadBracket(undefined);
  const tournament = mergeTournament(loadTournament(undefined), maps);
  const meta = loadSnapshotMeta(undefined);

  return (
    <div
      className="flex flex-col"
      style={{
        backgroundColor: "var(--bg-root)",
        color: "var(--text-primary)",
      }}
    >
      <Suspense fallback={null}>
        <SnapshotAwareBracket current={picker.current} weekAgo={picker.weekAgo}>
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
                  Frozen pre-tournament forecast · per-round marginal
                  probabilities from the locked Monte Carlo batch · snapshot{" "}
                  <span className="mono">{meta.snapshot_id}</span> · phase{" "}
                  <span className="mono">{meta.tournament_phase.replace(/_/g, " ")}</span>
                </p>
                <p
                  className="text-[12px] mt-1"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  These probabilities do not yet condition on settled results.
                  They are the pre-tournament forecast the public ledger grades,
                  held fixed as matches play out.
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <SnapshotPicker
                  current={picker.current}
                  weekAgo={picker.weekAgo}
                  selectedId={picker.selected.id}
                  basePath="/bracket"
                />
                <Suspense fallback={null}>
                  <TourTriggerButton
                    steps={BRACKET_STEPS}
                    durationSeconds={BRACKET_DURATION_SEC}
                  />
                </Suspense>
              </div>
            </div>
          </div>

          <div className="max-w-[1152px] mx-auto w-full px-4 md:px-12 py-6 flex flex-col gap-6">
            <SnapshotBanner
              selected={picker.selected}
              current={picker.current}
              basePath="/bracket"
            />
            <BracketBoard bracket={bracket} tournament={tournament} />

            <RoundProbabilityLegend />

            <ProvenanceBlock meta={meta} />
          </div>
        </SnapshotAwareBracket>
      </Suspense>
      <Suspense fallback={null}>
        <CanvasTour steps={BRACKET_STEPS} />
      </Suspense>
    </div>
  );
}
