"use client";

import { useEffect, useState, type ReactNode } from "react";

import type {
  DivergenceSnapshot,
  EvaluationMetrics,
  SnapshotMeta,
  TournamentSnapshot,
} from "@/lib/data/schemas";
import type { SnapshotInfo } from "@/lib/data/snapshotPicker";

import { FeaturedDivergences } from "@/components/compositions/FeaturedDivergences";
import { MostLikelyBracket } from "@/components/compositions/MostLikelyBracket";
import {
  GhostLink,
  SectionHead,
} from "@/components/compositions/SectionHead";
import {
  SnapshotBanner,
  SnapshotPicker,
} from "@/components/compositions/SnapshotPicker";
import { TerminalDashboard } from "@/components/compositions/TerminalDashboard";
import { TournamentCalibrationStrip } from "@/components/compositions/TournamentCalibrationStrip";
import { TournamentLeaderboard } from "@/components/compositions/TournamentLeaderboard";
import { TrailerSection } from "@/components/compositions/TrailerSection";
import { SnapshotUnavailableNotice } from "@/components/compositions/SnapshotUnavailableNotice";

interface HistoricalHomeBlockProps {
  snapshotId: string;
  current: SnapshotInfo;
  weekAgo: SnapshotInfo | null;
  /** The current-snapshot home content, shown as fallback when the requested
   *  snapshot is unavailable. */
  fallback: ReactNode;
}

interface HomePageData {
  meta: SnapshotMeta;
  tournament: TournamentSnapshot;
  divergence: DivergenceSnapshot;
  evaluation: EvaluationMetrics;
}

type FetchState =
  | { kind: "loading" }
  | { kind: "ready"; data: HomePageData; selected: SnapshotInfo }
  | { kind: "error"; message: string };

export function HistoricalHomeBlock({
  snapshotId,
  current,
  weekAgo,
  fallback,
}: HistoricalHomeBlockProps) {
  const [state, setState] = useState<FetchState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    fetch(`/api/snapshots/${encodeURIComponent(snapshotId)}/page-data?surface=home`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({ error: "unknown" }));
          throw new Error(String(body.error ?? r.status));
        }
        return (await r.json()) as HomePageData;
      })
      .then((data) => {
        if (cancelled) return;
        const selected: SnapshotInfo =
          weekAgo && weekAgo.id === snapshotId
            ? weekAgo
            : {
                id: data.meta.snapshot_id,
                date: data.meta.snapshot_id.slice(0, 10),
                codeSha: "",
                daysOld: daysBetween(current.date, data.meta.snapshot_id),
                label: data.meta.snapshot_id.slice(0, 10),
              };
        setState({ kind: "ready", data, selected });
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setState({ kind: "error", message: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [snapshotId, current.date, weekAgo]);

  if (state.kind === "loading") {
    return <LoadingSkeleton current={current} weekAgo={weekAgo} selectedId={snapshotId} />;
  }

  if (state.kind === "error") {
    // cp-39: the requested snapshot is unavailable (pruned/unknown, or a
    // transient failure). Fall back to the current snapshot content, but say
    // so explicitly rather than silently showing latest under the requested id.
    const variant = /not found/i.test(state.message) ? "pruned" : "error";
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <SnapshotUnavailableNotice
          requestedId={snapshotId}
          currentId={current.id}
          variant={variant}
        />
        {fallback}
      </div>
    );
  }

  const { data, selected } = state;
  const { tournament, divergence, evaluation, meta } = data;

  return (
    <>
      <section style={{ marginBottom: 56 }}>
        <SectionHead
          eyebrow="§ 0 · Scenario"
          title="Call the final four."
          rightSlot={
            <GhostLink href="/scenario/final-four">
              Enter the simulator →
            </GhostLink>
          }
        />
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            lineHeight: 1.65,
            color: "var(--text-tertiary)",
            margin: 0,
            maxWidth: 540,
          }}
        >
          Pick four semifinalists. The model has run 10,000 simulated
          tournaments. See where your scenario lands.
        </p>
      </section>

      <section style={{ marginBottom: 56 }}>
        <SectionHead
          eyebrow="§ 1 · Championship pricing"
          title="Tournament leaderboard"
          rightSlot={
            <div
              style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}
            >
              <SnapshotPicker
                current={current}
                weekAgo={weekAgo}
                selectedId={selected.id}
                basePath="/"
              />
              <GhostLink href="/bracket">All 48 teams →</GhostLink>
            </div>
          }
        />
        <div style={{ marginBottom: 12 }}>
          <SnapshotBanner selected={selected} current={current} basePath="/" />
        </div>
        <div className="overflow-x-auto">
          <TournamentLeaderboard tournament={tournament} />
        </div>
      </section>

      <section style={{ marginBottom: 56 }}>
        <SectionHead
          eyebrow="§ 1.5 · Modal path"
          title="Most likely bracket"
          rightSlot={<GhostLink href="/bracket">Full bracket →</GhostLink>}
        />
        <div className="overflow-x-auto">
          <MostLikelyBracket tournament={tournament} />
        </div>
      </section>

      <TrailerSection src="/assets/trailer.mp4" />

      <section style={{ marginBottom: 56 }}>
        <SectionHead eyebrow="§ 1.6 · Terminal" title="Dashboard" />
        <TerminalDashboard divergence={divergence} tournament={tournament} />
      </section>

      <section style={{ marginBottom: 56 }}>
        <SectionHead
          eyebrow="§ 2 · This window"
          title="Featured divergences"
          rightSlot={<GhostLink href="/terminal">Full terminal →</GhostLink>}
        />
        <FeaturedDivergences divergence={divergence} />
      </section>

      <section style={{ marginBottom: 56 }}>
        <SectionHead
          eyebrow="§ 3 · Calibration"
          title="How the model is doing"
        />
        <TournamentCalibrationStrip evaluation={evaluation} meta={meta} />
      </section>
    </>
  );
}

function LoadingSkeleton({
  current,
  weekAgo,
  selectedId,
}: {
  current: SnapshotInfo;
  weekAgo: SnapshotInfo | null;
  selectedId: string;
}) {
  return (
    <section style={{ marginBottom: 56 }}>
      <SectionHead
        eyebrow="§ 1 · Championship pricing"
        title="Tournament leaderboard"
        rightSlot={
          <SnapshotPicker
            current={current}
            weekAgo={weekAgo}
            selectedId={selectedId}
            basePath="/"
          />
        }
      />
      <div
        className="mono"
        style={{
          fontSize: 12,
          letterSpacing: ".04em",
          color: "var(--text-tertiary)",
          padding: "32px 0",
        }}
      >
        Loading historical snapshot {selectedId}...
      </div>
    </section>
  );
}

function daysBetween(referenceIsoDate: string, snapshotId: string): number {
  const refMs = Date.parse(`${referenceIsoDate}T00:00:00Z`);
  const snapMs = Date.parse(snapshotId);
  if (Number.isNaN(refMs) || Number.isNaN(snapMs)) return 0;
  return Math.max(0, Math.round((refMs - snapMs) / (24 * 60 * 60 * 1000)));
}
