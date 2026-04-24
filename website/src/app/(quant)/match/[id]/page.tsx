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
import { HashChip } from "@/components/primitives/HashChip";
import { SubNav } from "@/components/layout/SubNav";

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
      <div className="max-w-[1152px] mx-auto w-full px-12 pt-5 pb-2">
        <SubNav
          links={[
            { href: "/terminal", label: "Terminal", direction: "back" },
            {
              href: `/team/${match.home.fifa_code}`,
              label: `${match.home.fifa_code} team`,
              direction: "forward",
            },
            {
              href: `/team/${match.away.fifa_code}`,
              label: `${match.away.fifa_code} team`,
              direction: "forward",
            },
            { href: "/bracket", label: "Bracket", direction: "forward" },
          ]}
        />
      </div>

      <div
        className="shrink-0 px-6 pt-4 pb-4 border-b"
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

        <div
          className="rounded-lg"
          style={{
            background: "var(--bg-panel)",
            border: "1px solid var(--border-subtle)",
            padding: "14px 16px",
          }}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className="mono text-[10px] uppercase tracking-[.08em]"
              style={{ color: "var(--text-quiet)" }}
            >
              provenance
            </span>
            <HashChip sha={meta.code_sha} kind="code_sha" />
            <HashChip sha={meta.data_sha} kind="data_sha" />
            <span className="flex-1" />
            <span
              className="mono text-[11px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              pre-registered ·{" "}
              <a
                href="https://osf.io/8b5hd"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--accent-focus)", textDecoration: "none" }}
              >
                osf.io/8b5hd
              </a>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
