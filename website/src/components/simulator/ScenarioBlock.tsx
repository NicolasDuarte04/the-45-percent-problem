/**
 * Mode-specific compact scenario listing for the Trade Ticket.
 *
 * Design v1 §4.1's anatomy of the scenario block:
 *   - Final Four:      `SF: ARG  BRA  FRA  ENG`
 *   - Champion's Path: `R16  MEX > USA   QF  MEX > GER   SF  MEX < BRA`
 *   - Full Bracket:    a 3-column grid of all 15 KO matches
 *
 * The 3-column Full Bracket layout from v1 is heavy for inline rendering;
 * for Phase A this component renders a more readable line-stack form
 * (SEMIFINALISTS, R16/QF/SF/F leaders, etc.). The canonical scenario
 * data lives on the prediction row in raw form — when the eventual
 * server-side share-card render arrives in Phase B, that surface can
 * use the v1 anatomy directly without refactoring this component.
 *
 * Pure server component; rendering only.
 */

import type {
  AnyScenario,
  ChampionsPathScenario,
  FinalFourScenario,
  FullBracketScenario,
  Mode,
} from "@/lib/sim/types";

interface ScenarioBlockProps {
  mode: Mode;
  scenario: AnyScenario;
}

export function ScenarioBlock({ mode, scenario }: ScenarioBlockProps) {
  switch (mode) {
    case "final_four":
      return <FinalFourBlock scenario={scenario as FinalFourScenario} />;
    case "champions_path":
      return <ChampionsPathBlock scenario={scenario as ChampionsPathScenario} />;
    case "full_bracket":
      return <FullBracketBlock scenario={scenario as FullBracketScenario} />;
  }
}

// ── Per-mode renders ─────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[10px] uppercase tracking-[0.10em] text-[var(--text-quiet)]">
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-1 font-mono text-[14px] tabular-nums tracking-[0.05em] text-[var(--text-primary)]">
      {children}
    </div>
  );
}

function FinalFourBlock({ scenario }: { scenario: FinalFourScenario }) {
  return (
    <div>
      <Label>Semifinalists</Label>
      <Row>{scenario.semifinalists.join("  ")}</Row>
    </div>
  );
}

function ChampionsPathBlock({ scenario }: { scenario: ChampionsPathScenario }) {
  const stages = [
    { key: "r16" as const, label: "R16" },
    { key: "qf" as const, label: "QF " },
    { key: "sf" as const, label: "SF " },
    { key: "f" as const, label: "F  " },
  ];
  return (
    <div className="space-y-1">
      <Label>Tracing</Label>
      <Row>{scenario.team}</Row>
      <div className="mt-3 space-y-0.5">
        {stages.map(({ key, label }) => {
          const stage = scenario[key];
          if (!stage) return null;
          // ">" for a win, "<" for a loss — matches the design v1 §4.1
          // ticker glyph; sticking to ASCII keeps the strip stable across
          // mail clients and any future server-side image render.
          const sep = stage.result === "W" ? ">" : "<";
          return (
            <div
              key={key}
              className="flex items-baseline gap-3 font-mono text-[13px] tabular-nums tracking-[0.05em] text-[var(--text-primary)]"
            >
              <span className="text-[var(--text-quiet)]">{label}</span>
              <span>
                {scenario.team} {sep} {stage.opponent}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FullBracketBlock({ scenario }: { scenario: FullBracketScenario }) {
  // R32 schema layout: [0..15]=R32 winners, [16..23]=R16, [24..27]=QF,
  // [28..29]=SF finalists, [30]=champion.
  const r32 = scenario.koAdvancers.slice(0, 16);
  const r16 = scenario.koAdvancers.slice(16, 24);
  const qf = scenario.koAdvancers.slice(24, 28);
  const sf = scenario.koAdvancers.slice(28, 30);
  const champion = scenario.koAdvancers[30];

  return (
    <div className="space-y-3">
      <div>
        <Label>Group winners</Label>
        <Row>{scenario.groupWinners.join("  ")}</Row>
      </div>
      <div>
        <Label>Runners-up</Label>
        <Row>{scenario.groupRunnersUp.join("  ")}</Row>
      </div>
      <div>
        <Label>Best 3rd-place</Label>
        <Row>{scenario.bestThirds.join("  ")}</Row>
      </div>
      <div>
        <Label>R16 qualifiers</Label>
        <Row>{r32.join("  ")}</Row>
      </div>
      <div>
        <Label>Quarterfinalists</Label>
        <Row>{r16.join("  ")}</Row>
      </div>
      <div>
        <Label>Semifinalists</Label>
        <Row>{qf.join("  ")}</Row>
      </div>
      <div>
        <Label>Finalists</Label>
        <Row>{sf.join("  ")}</Row>
      </div>
      <div>
        <Label>Champion</Label>
        <Row>{champion}</Row>
      </div>
    </div>
  );
}
