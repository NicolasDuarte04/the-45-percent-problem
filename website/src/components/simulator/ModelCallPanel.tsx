import { Flag } from "@/components/primitives/Flag";
import { loadSnapshotMeta, loadTournament } from "@/lib/data/loadSnapshot";
import { COUNTRY_NAMES, type FifaCode } from "@/lib/flags/countries";
import {
  buildTeamReachLookup,
  deriveModalBracket,
  type ModalBracket,
  type TeamReachLookup,
} from "@/lib/sim/modalBracket";
import type {
  ChampionsPathScenario,
  FinalFourScenario,
  FullBracketScenario,
  PublicPredictionView,
  TeamCode,
} from "@/lib/sim/types";

/**
 * Side-by-side comparison between the user's scenario and the model's
 * modal call. Mounts on the permalink page between the hero and the
 * share strip.
 *
 * The component is deliberately descriptive, not evaluative. Matches
 * carry a quiet warm accent (var(--accent-warm)); non-matches carry
 * none. There are no sentiment colours, no scores, no badges, no
 * celebratory or judgmental copy. The header is locked to the form
 * "[N] OF [M] [things] MATCH THE MODEL'S MODAL CALL" so the panel
 * reads as a set-theoretic disclosure surface.
 */

type StageKey = "r16" | "qf" | "sf" | "f";
const STAGE_ORDER: readonly StageKey[] = ["r16", "qf", "sf", "f"] as const;
const STAGE_LABELS: Record<StageKey, string> = {
  r16: "R16",
  qf: "QF",
  sf: "SF",
  f: "F",
};

function teamName(code: TeamCode): string {
  return COUNTRY_NAMES[code as FifaCode] ?? code;
}

interface ModelCallPanelProps {
  view: PublicPredictionView;
}

export function ModelCallPanel({ view }: ModelCallPanelProps) {
  const tournament = loadTournament();
  const meta = loadSnapshotMeta();
  const modal = deriveModalBracket(tournament);
  const reach = buildTeamReachLookup(tournament);

  const shortCode = meta.code_sha.slice(0, 8);
  const snapshotId = meta.snapshot_id;

  return (
    <section
      aria-label="Comparison between your call and the model's modal call"
      className="bg-[var(--bg-panel-elev)] border border-[var(--border-default)] p-5 sm:p-6"
    >
      <div
        className="mono text-[10px] uppercase tracking-[0.14em] mb-2"
        style={{ color: "var(--text-tertiary)" }}
      >
        Model call · Comparison
      </div>

      {view.mode === "final_four" ? (
        <FinalFourBody
          scenario={view.scenario as FinalFourScenario}
          modal={modal}
        />
      ) : null}

      {view.mode === "champions_path" ? (
        <ChampionsPathBody
          scenario={view.scenario as ChampionsPathScenario}
          reach={reach}
        />
      ) : null}

      {view.mode === "full_bracket" ? (
        <FullBracketBody
          scenario={view.scenario as FullBracketScenario}
          modal={modal}
        />
      ) : null}

      <div
        className="mono text-[11px] mt-6 pt-4 border-t"
        style={{
          color: "var(--text-quiet)",
          borderColor: "var(--border-subtle)",
        }}
      >
        Model state · snapshot {snapshotId} · code {shortCode}
      </div>
    </section>
  );
}

// ─── Shared chrome ───────────────────────────────────────────────────────────

function PanelHeader({ text }: { text: string }) {
  return (
    <h2
      className="mono text-[14px] sm:text-[15px] uppercase tracking-[0.08em]"
      style={{ color: "var(--text-primary)" }}
    >
      {text}
    </h2>
  );
}

function ColumnLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mono text-[10px] uppercase tracking-[0.14em] mb-3"
      style={{ color: "var(--text-tertiary)" }}
    >
      {children}
    </div>
  );
}

interface TeamChipProps {
  code: TeamCode;
  matched: boolean;
}

function TeamChip({ code, matched }: TeamChipProps) {
  return (
    <div
      className="flex items-center gap-2 py-1.5"
      style={{
        borderLeft: matched ? "2px solid var(--accent-warm)" : "2px solid transparent",
        paddingLeft: 8,
        color: matched ? "var(--text-primary)" : "var(--text-secondary)",
      }}
      aria-label={
        matched
          ? `${teamName(code)}: appears in both sets`
          : `${teamName(code)}: present in this column only`
      }
    >
      <Flag code={code} size={18} />
      <span className="mono text-[13px]" style={{ letterSpacing: "0.02em" }}>
        {code}
      </span>
      <span
        className="text-[12px] truncate"
        style={{ color: matched ? "var(--text-secondary)" : "var(--text-tertiary)" }}
      >
        {teamName(code)}
      </span>
    </div>
  );
}

// ─── Final Four body ─────────────────────────────────────────────────────────

function FinalFourBody({
  scenario,
  modal,
}: {
  scenario: FinalFourScenario;
  modal: ModalBracket;
}) {
  const userSet = new Set<string>(scenario.semifinalists);
  const modelSet = new Set<string>(modal.qfWinners);
  const matchCount = scenario.semifinalists.filter((c) => modelSet.has(c)).length;

  const userSorted = [...scenario.semifinalists].sort();
  const modelSorted = [...modal.qfWinners].sort();

  return (
    <>
      <PanelHeader
        text={`${matchCount} of 4 semifinalists match the model's modal call`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-5">
        <div>
          <ColumnLabel>Your call</ColumnLabel>
          <ul className="space-y-1">
            {userSorted.map((code) => (
              <li key={`u-${code}`}>
                <TeamChip code={code} matched={modelSet.has(code)} />
              </li>
            ))}
          </ul>
        </div>
        <div>
          <ColumnLabel>Model&apos;s call</ColumnLabel>
          <ul className="space-y-1">
            {modelSorted.map((code) => (
              <li key={`m-${code}`}>
                <TeamChip code={code} matched={userSet.has(code)} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

// ─── Champion's Path body ────────────────────────────────────────────────────

function reachProbForStage(
  stage: StageKey,
  reach: TeamReachLookup,
): number {
  // For each stage, return P(team reaches next bucket | reaches tournament)
  // i.e. the marginal probability of the user's "W" outcome:
  //   r16 W → reaches QF → p_quarterfinal
  //   qf  W → reaches SF → p_semifinal
  //   sf  W → reaches F  → p_final
  //   f   W → champion   → p_champion
  switch (stage) {
    case "r16":
      return reach.pQF;
    case "qf":
      return reach.pSF;
    case "sf":
      return reach.pF;
    case "f":
      return reach.pC;
  }
}

function ChampionsPathBody({
  scenario,
  reach,
}: {
  scenario: ChampionsPathScenario;
  reach: Record<string, TeamReachLookup>;
}) {
  const teamReach = reach[scenario.team];
  const filledStages = STAGE_ORDER.filter((s) => scenario[s] !== undefined);

  type Row = {
    stage: StageKey;
    opponent: TeamCode;
    userResult: "W" | "L";
    pAdvance: number;
    modalIsAdvance: boolean;
    matched: boolean;
  };

  const rows: Row[] = filledStages.map((stage) => {
    const stageData = scenario[stage]!;
    const pAdvance = teamReach ? reachProbForStage(stage, teamReach) : 0;
    const modalIsAdvance = pAdvance >= 0.5;
    const matched =
      (stageData.result === "W" && modalIsAdvance) ||
      (stageData.result === "L" && !modalIsAdvance);
    return {
      stage,
      opponent: stageData.opponent,
      userResult: stageData.result,
      pAdvance,
      modalIsAdvance,
      matched,
    };
  });

  const matchCount = rows.filter((r) => r.matched).length;
  const total = rows.length;

  return (
    <>
      <PanelHeader
        text={`${matchCount} of ${total} ${total === 1 ? "stage" : "stages"} match the model's modal call`}
      />

      <div className="mt-5 overflow-x-auto">
        <table
          className="w-full text-left"
          style={{ borderCollapse: "collapse" }}
        >
          <thead>
            <tr
              className="mono text-[10px] uppercase tracking-[0.14em]"
              style={{ color: "var(--text-tertiary)" }}
            >
              <th className="py-2 pr-4 font-normal">Stage</th>
              <th className="py-2 pr-4 font-normal">Your opponent</th>
              <th className="py-2 pr-4 font-normal">Result</th>
              <th className="py-2 font-normal">Model&apos;s call</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.stage}
                style={{
                  borderTop: "1px solid var(--border-subtle)",
                }}
                aria-label={`Stage ${STAGE_LABELS[row.stage]}: your call ${
                  row.userResult === "W" ? "WIN" : "LOSS"
                } against ${teamName(row.opponent)}; model places the team at ${
                  row.modalIsAdvance ? "advancing" : "eliminated"
                } with marginal probability ${(row.pAdvance * 100).toFixed(0)} percent.`}
              >
                <td
                  className="mono text-[12px] py-3 pr-4"
                  style={{
                    color: "var(--text-primary)",
                    borderLeft: row.matched
                      ? "2px solid var(--accent-warm)"
                      : "2px solid transparent",
                    paddingLeft: 8,
                  }}
                >
                  {STAGE_LABELS[row.stage]}
                </td>
                <td className="py-3 pr-4">
                  <span className="inline-flex items-center gap-2">
                    <Flag code={row.opponent} size={16} />
                    <span
                      className="mono text-[12px]"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {row.opponent}
                    </span>
                  </span>
                </td>
                <td
                  className="mono text-[12px] py-3 pr-4"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {row.userResult === "W" ? "WIN" : "LOSS"}
                </td>
                <td
                  className="mono text-[12px] py-3"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {row.modalIsAdvance ? "ADVANCES" : "ELIMINATED"}
                  <span style={{ color: "var(--text-quiet)", marginLeft: 8 }}>
                    {(row.pAdvance * 100).toFixed(0)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── Full Bracket body ───────────────────────────────────────────────────────

interface RoundOverlap {
  label: string;
  matchCount: number;
  total: number;
}

function FullBracketBody({
  scenario,
  modal,
}: {
  scenario: FullBracketScenario;
  modal: ModalBracket;
}) {
  // Per-round set intersection between the user's KO advancers and the
  // model's modal selections. The model's selections are independent
  // top-k sorts (round by round), so set membership is the meaningful
  // comparison; index alignment is not (the snapshot does not encode
  // fixed bracket pairings). Sum across rounds becomes the panel header.
  const userR32 = new Set(scenario.koAdvancers.slice(0, 16));
  const userR16 = new Set(scenario.koAdvancers.slice(16, 24));
  const userQF = new Set(scenario.koAdvancers.slice(24, 28));
  const userSF = new Set(scenario.koAdvancers.slice(28, 30));
  const userChamp = scenario.koAdvancers[30];

  const modelR32 = new Set<string>(modal.r32Winners);
  const modelR16 = new Set<string>(modal.r16Winners);
  const modelQF = new Set<string>(modal.qfWinners);
  const modelSF = new Set<string>(modal.sfWinners);

  function intersect(a: Set<string>, b: Set<string>): number {
    let n = 0;
    for (const v of a) if (b.has(v)) n++;
    return n;
  }

  const rounds: RoundOverlap[] = [
    { label: "R32", matchCount: intersect(userR32, modelR32), total: 16 },
    { label: "R16", matchCount: intersect(userR16, modelR16), total: 8 },
    { label: "QF", matchCount: intersect(userQF, modelQF), total: 4 },
    { label: "SF", matchCount: intersect(userSF, modelSF), total: 2 },
    {
      label: "F",
      matchCount: userChamp && modal.champion === userChamp ? 1 : 0,
      total: 1,
    },
  ];

  const totalMatches = rounds.reduce((acc, r) => acc + r.matchCount, 0);
  const championMatch = userChamp && modal.champion === userChamp;

  return (
    <>
      <PanelHeader
        text={`${totalMatches} of 31 advancements match the model's modal bracket`}
      />

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <ColumnLabel>Your champion</ColumnLabel>
          {userChamp ? (
            <TeamChip code={userChamp} matched={Boolean(championMatch)} />
          ) : (
            <div
              className="mono text-[12px]"
              style={{ color: "var(--text-quiet)" }}
            >
              not set
            </div>
          )}
        </div>
        <div>
          <ColumnLabel>Model&apos;s modal champion</ColumnLabel>
          {modal.champion ? (
            <TeamChip
              code={modal.champion}
              matched={Boolean(championMatch)}
            />
          ) : (
            <div
              className="mono text-[12px]"
              style={{ color: "var(--text-quiet)" }}
            >
              not set
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <ColumnLabel>Per-round overlap</ColumnLabel>
        <ul className="space-y-1">
          {rounds.map((r) => {
            const fullMatch = r.matchCount === r.total && r.total > 0;
            return (
              <li
                key={r.label}
                className="flex items-center gap-4 py-2"
                style={{
                  borderLeft: fullMatch
                    ? "2px solid var(--accent-warm)"
                    : "2px solid transparent",
                  paddingLeft: 8,
                  borderTop: "1px solid var(--border-subtle)",
                }}
                aria-label={`${r.label}: ${r.matchCount} of ${r.total} teams overlap with the model's set.`}
              >
                <span
                  className="mono text-[12px]"
                  style={{
                    color: "var(--text-primary)",
                    minWidth: 36,
                  }}
                >
                  {r.label}
                </span>
                <span
                  className="mono text-[12px]"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {r.matchCount} / {r.total}
                </span>
                <span
                  className="mono text-[10px] uppercase tracking-[0.14em]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  in shared set
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
