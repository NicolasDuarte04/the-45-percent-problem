import { notFound } from "next/navigation";
import {
  loadSnapshotMeta,
  loadTeam,
} from "@/lib/data/loadSnapshot";
import { getStructuralTeams } from "@/lib/db/structuralData";
import { loadStructuralMaps, mergeTeamProgression } from "@/lib/db/structuralMerge";
import { TeamHeader } from "@/components/compositions/TeamHeader";
import { Flag } from "@/components/primitives/Flag";
import { ProgressionConeChart } from "@/components/compositions/ProgressionConeChart";
import { HistoricalChampionSparkline } from "@/components/compositions/HistoricalChampionSparkline";
import { UpcomingMatchesList } from "@/components/compositions/UpcomingMatchesList";
import { ProvenanceBlock } from "@/components/layout/ProvenanceBlock";

export const dynamic = "force-static";

export async function generateStaticParams() {
  // Generate the 48 routes from Drizzle (the canonical qualifier list), not
  // from disk snapshots: protects against snapshot drift adding/removing
  // teams that the draw doesn't sanction.
  const teams = await getStructuralTeams();
  return teams.map((t) => ({ code: t.fifa_code }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  try {
    const maps = await loadStructuralMaps();
    if (!maps.teamsByCode.has(code)) {
      return { title: "Team · The 45% Problem" };
    }
    const team = mergeTeamProgression(loadTeam(code), maps);
    return {
      title: `${team.display_name}. Team progression`,
      description: `Per-team progression cone from group stage to champion for ${team.display_name}.`,
    };
  } catch {
    return { title: "Team · The 45% Problem" };
  }
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const maps = await loadStructuralMaps();
  if (!maps.teamsByCode.has(code)) {
    notFound();
  }

  let team;
  try {
    team = mergeTeamProgression(loadTeam(code), maps);
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
      <div
        className="shrink-0 px-4 md:px-6 pt-6 pb-4 border-b"
        style={{ borderColor: "var(--border-default)" }}
      >
        <div className="max-w-[1152px] mx-auto px-0 md:px-12">
          <h1
            className="text-[18px] font-medium tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            <Flag code={team.fifa_code} size={14} /> {team.display_name}
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

      <div className="max-w-[1152px] mx-auto w-full px-4 md:px-12 py-6 flex flex-col gap-6">
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

        <ProvenanceBlock meta={meta} />
      </div>
    </div>
  );
}
