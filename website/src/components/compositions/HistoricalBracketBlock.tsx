"use client";

import { useEffect, useState } from "react";

import type {
  BracketSnapshot,
  SnapshotMeta,
  TournamentSnapshot,
} from "@/lib/data/schemas";
import type { SnapshotInfo } from "@/lib/data/snapshotPicker";

import { BracketBoard } from "@/components/compositions/BracketBoard";
import { RoundProbabilityLegend } from "@/components/compositions/RoundProbabilityLegend";
import {
  SnapshotBanner,
  SnapshotPicker,
} from "@/components/compositions/SnapshotPicker";
import { ProvenanceBlock } from "@/components/layout/ProvenanceBlock";

interface HistoricalBracketBlockProps {
  snapshotId: string;
  current: SnapshotInfo;
  weekAgo: SnapshotInfo | null;
}

interface BracketPageData {
  meta: SnapshotMeta;
  bracket: BracketSnapshot;
  tournament: TournamentSnapshot;
}

type FetchState =
  | { kind: "loading" }
  | { kind: "ready"; data: BracketPageData; selected: SnapshotInfo }
  | { kind: "error"; message: string };

export function HistoricalBracketBlock({
  snapshotId,
  current,
  weekAgo,
}: HistoricalBracketBlockProps) {
  const [state, setState] = useState<FetchState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    fetch(
      `/api/snapshots/${encodeURIComponent(snapshotId)}/page-data?surface=bracket`,
    )
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({ error: "unknown" }));
          throw new Error(String(body.error ?? r.status));
        }
        return (await r.json()) as BracketPageData;
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
    return (
      <ShellChrome
        current={current}
        weekAgo={weekAgo}
        selectedId={snapshotId}
        body={
          <div
            className="mono"
            style={{
              fontSize: 12,
              letterSpacing: ".04em",
              color: "var(--text-tertiary)",
              padding: "32px 0",
            }}
          >
            Loading historical snapshot {snapshotId}...
          </div>
        }
      />
    );
  }

  if (state.kind === "error") {
    return (
      <ShellChrome
        current={current}
        weekAgo={weekAgo}
        selectedId={snapshotId}
        body={
          <div
            className="mono"
            style={{
              fontSize: 12,
              letterSpacing: ".04em",
              color: "var(--text-tertiary)",
              padding: "32px 0",
            }}
          >
            Snapshot {snapshotId} could not be loaded ({state.message}).
          </div>
        }
      />
    );
  }

  const { data, selected } = state;
  const { tournament, bracket, meta } = data;

  return (
    <ShellChrome
      current={current}
      weekAgo={weekAgo}
      selectedId={selected.id}
      meta={meta}
      body={
        <>
          <SnapshotBanner
            selected={selected}
            current={current}
            basePath="/bracket"
          />
          <BracketBoard bracket={bracket} tournament={tournament} />
          <RoundProbabilityLegend />
          <ProvenanceBlock meta={meta} />
        </>
      }
    />
  );
}

function ShellChrome({
  current,
  weekAgo,
  selectedId,
  meta,
  body,
}: {
  current: SnapshotInfo;
  weekAgo: SnapshotInfo | null;
  selectedId: string;
  meta?: SnapshotMeta;
  body: React.ReactNode;
}) {
  const displayedSnapshotId = meta?.snapshot_id ?? selectedId;
  const displayedPhase = meta?.tournament_phase.replace(/_/g, " ") ?? "";

  return (
    <>
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
              <span className="mono">{displayedSnapshotId}</span>
              {displayedPhase ? (
                <>
                  {" "}· phase <span className="mono">{displayedPhase}</span>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <SnapshotPicker
              current={current}
              weekAgo={weekAgo}
              selectedId={selectedId}
              basePath="/bracket"
            />
          </div>
        </div>
      </div>

      <div className="max-w-[1152px] mx-auto w-full px-4 md:px-12 py-6 flex flex-col gap-6">
        {body}
      </div>
    </>
  );
}

function daysBetween(referenceIsoDate: string, snapshotId: string): number {
  const refMs = Date.parse(`${referenceIsoDate}T00:00:00Z`);
  const snapMs = Date.parse(snapshotId);
  if (Number.isNaN(refMs) || Number.isNaN(snapMs)) return 0;
  return Math.max(0, Math.round((refMs - snapMs) / (24 * 60 * 60 * 1000)));
}
