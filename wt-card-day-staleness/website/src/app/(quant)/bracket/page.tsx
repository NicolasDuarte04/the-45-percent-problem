import { Suspense } from "react";
import {
  loadBracket,
  loadLiveBracket,
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
import { BracketViewToggle } from "@/components/compositions/BracketViewToggle";
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

  // cp-16b: the live conditional bracket is an UNGRADED, off-by-default view.
  // The PUBLISH GATE is this flag, read at build time (page is force-static):
  // unset / anything but "1" -> no live surface is exposed (production-safe).
  // The operator flips NEXT_PUBLIC_LIVE_BRACKET=1 in Vercel and redeploys only
  // after filing osf/amendments/deviation_cp-16b_live_conditional_bracket.md.
  // loadLiveBracket is a null loader, so a missing live object renders
  // frozen-only with no error (fallback).
  const liveEnabled = process.env.NEXT_PUBLIC_LIVE_BRACKET === "1";
  const live = liveEnabled ? loadLiveBracket(undefined) : null;
  const liveTournament = live ? mergeTournament(live.tournament, maps) : null;

  const frozenPanel = (
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
  );

  // cp-bracket-ux FIX A: derive the conditioned-state sentence from the live
  // provenance flag instead of the hardcoded step-b "not yet active" copy.
  // conditioning is wired now (the active batch conditions on settled results),
  // so the live numbers diverge from the frozen forecast and the copy must say
  // so. The "scored by the public ledger" line, the NOT-graded badge, and the
  // source-batch / conditioned provenance are unchanged in both branches.
  const livePanel =
    live && liveTournament ? (
      <div>
        <div
          className="shrink-0 px-4 md:px-6 pt-6 pb-4 border-b"
          style={{ borderColor: "var(--border-default)" }}
        >
          <div className="max-w-[1152px] mx-auto px-0 md:px-12">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h2
                className="text-[18px] font-medium tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                Live conditional view
              </h2>
              <span
                className="text-[11px] font-medium px-1.5 py-0.5 rounded"
                style={{
                  color: "var(--text-secondary)",
                  backgroundColor: "var(--bg-subtle, rgba(127,127,127,0.12))",
                }}
              >
                NOT graded
              </span>
            </div>
            <p
              className="text-[12px] mt-1 max-w-[68ch]"
              style={{ color: "var(--text-tertiary)" }}
            >
              {live.provenance.conditioned
                ? "Current-state conditional view, NOT graded. Conditioning is active: this view reflects settled results so far and now differs from the frozen forecast."
                : "Current-state conditional view, NOT graded; conditioning not yet active, currently matches the frozen forecast."}{" "}
              Only the frozen pre-tournament forecast above is scored by the
              public ledger. Sourced from active batch{" "}
              <span className="mono">{live.provenance.live_source_batch_id}</span>
              {" "}· conditioned{" "}
              <span className="mono">
                {String(live.provenance.conditioned)}
              </span>
              .
            </p>
          </div>
        </div>
        <div className="max-w-[1152px] mx-auto w-full px-4 md:px-12 py-6">
          <BracketBoard bracket={live.bracket} tournament={liveTournament} />
        </div>
      </div>
    ) : null;

  return (
    <div
      className="flex flex-col"
      style={{
        backgroundColor: "var(--bg-root)",
        color: "var(--text-primary)",
      }}
    >
      {/* cp-bracket-ux FIX B: when the live view is available (flag on AND
          loadLiveBracket non-null) a top-of-page toggle switches Frozen <->
          Live without scrolling, Frozen default, Live clearly NOT graded. When
          unavailable the page renders frozen-only with no toggle, preserving
          the flag gate exactly as before. */}
      {livePanel ? (
        <BracketViewToggle frozen={frozenPanel} live={livePanel} />
      ) : (
        frozenPanel
      )}

      <Suspense fallback={null}>
        <CanvasTour steps={BRACKET_STEPS} />
      </Suspense>
    </div>
  );
}
