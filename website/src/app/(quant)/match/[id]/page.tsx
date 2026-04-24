import { notFound } from "next/navigation";
import {
  loadAllMatches,
  loadLedger,
  loadMatch,
  loadSnapshotMeta,
} from "@/lib/data/loadSnapshot";
import { MatchHeader } from "@/components/compositions/MatchHeader";
import { MarketBreakdownPanel } from "@/components/compositions/MarketBreakdownPanel";
import { GoalMatrixHeatmap } from "@/components/compositions/GoalMatrixHeatmap";
import { StrengthInputsPanel } from "@/components/compositions/StrengthInputsPanel";
import { RelatedLedgerRecords } from "@/components/compositions/RelatedLedgerRecords";
import { ProvenanceBlock } from "@/components/layout/ProvenanceBlock";

export const dynamic = "force-static";

export async function generateStaticParams() {
  const matches = loadAllMatches();
  return matches.map((m) => ({ id: m.match_id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const match = loadMatch(id);
    return {
      title: `${match.home.display_name} vs ${match.away.display_name} — Match detail`,
      description: `Per-match probability breakdown, goal matrix, and strength inputs for the ${match.round} fixture on ${match.kickoff_utc}.`,
    };
  } catch {
    return { title: "Match detail — The 45% Problem" };
  }
}

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let match;
  try {
    match = loadMatch(id);
  } catch {
    notFound();
  }

  const records = loadLedger();
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
        className="shrink-0 px-6 pt-6 pb-4 border-b"
        style={{ borderColor: "var(--border-default)" }}
      >
        <div className="max-w-[1152px] mx-auto px-12">
          <h1
            className="text-[18px] font-medium tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {match.home.display_name} vs {match.away.display_name}
          </h1>
          <p
            className="text-[12px] mt-0.5"
            style={{ color: "var(--text-tertiary)" }}
          >
            {match.round} · kickoff{" "}
            <span className="mono">{match.kickoff_utc}</span> · snapshot{" "}
            <span className="mono">{meta.snapshot_id}</span>
          </p>
        </div>
      </div>

      <div className="max-w-[1152px] mx-auto w-full px-12 py-6 flex flex-col gap-6">
        <MatchHeader match={match} />

        <MarketBreakdownPanel match={match} />

        <GoalMatrixHeatmap
          grid={match.p_model_goals}
          homeCode={match.home.fifa_code}
          awayCode={match.away.fifa_code}
          homeName={match.home.display_name}
          awayName={match.away.display_name}
        />

        <StrengthInputsPanel match={match} />

        <RelatedLedgerRecords match={match} records={records} />

        <ProvenanceBlock meta={meta} />
      </div>
    </div>
  );
}
