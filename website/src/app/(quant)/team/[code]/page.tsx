import { notFound } from "next/navigation";
import {
  loadAllTeams,
  loadSnapshotMeta,
  loadTeam,
} from "@/lib/data/loadSnapshot";
import { TeamHeader } from "@/components/compositions/TeamHeader";
import { ProgressionConeChart } from "@/components/compositions/ProgressionConeChart";
import { HistoricalChampionSparkline } from "@/components/compositions/HistoricalChampionSparkline";
import { UpcomingMatchesList } from "@/components/compositions/UpcomingMatchesList";
import { HashChip } from "@/components/primitives/HashChip";
import { SubNav } from "@/components/layout/SubNav";

export const dynamic = "force-static";

export async function generateStaticParams() {
  const teams = loadAllTeams();
  return teams.map((t) => ({ code: t.fifa_code }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  try {
    const team = loadTeam(code);
    return {
      title: `${team.display_name} — Team progression`,
      description: `Per-team progression cone from group stage to champion for ${team.display_name}.`,
    };
  } catch {
    return { title: "Team — The 45% Problem" };
  }
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  let team;
  try {
    team = loadTeam(code);
  } catch {
    notFound();
  }

  const meta = loadSnapshotMeta();

  return (
    <div
      className="flex flex-col"
      style={{
        backgroundColor: "var(--bg-root)",
        color: "var(--text-primary)",
      }}
    >
      <div className="max-w-[1400px] mx-auto w-full px-6 pt-5 pb-2">
        <SubNav
          links={[
            { href: "/terminal", label: "Terminal", direction: "back" },
            { href: "/bracket", label: "Bracket", direction: "forward" },
          ]}
        />
      </div>

      <div
        className="shrink-0 px-6 pt-4 pb-4 border-b"
        style={{ borderColor: "var(--border-default)" }}
      >
        <div className="max-w-[1400px] mx-auto">
          <h1
            className="text-[18px] font-medium tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {team.display_name}
          </h1>
          <p
            className="text-[12px] mt-0.5"
            style={{ color: "var(--text-tertiary)" }}
          >
            Team progression · group <span className="mono">{team.group}</span> ·
            snapshot <span className="mono">{meta.snapshot_id}</span>
          </p>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto w-full px-6 py-6 flex flex-col gap-6">
        <TeamHeader team={team} />

        <ProgressionConeChart
          progression={team.progression}
          fifaCode={team.fifa_code}
          displayName={team.display_name}
        />

        <HistoricalChampionSparkline
          history={team.history}
          fifaCode={team.fifa_code}
        />

        <UpcomingMatchesList
          matches={team.upcoming_matches}
          fifaCode={team.fifa_code}
        />

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
