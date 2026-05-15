import { teamName } from "@/lib/data/wc2026-official-draw";
import { detectFullBracketStage } from "./types";
import type {
  AnyScenario,
  ChampionsPathScenario,
  FinalFourScenario,
  FullBracketScenario,
  Mode,
} from "./types";

/**
 * Render the one-line story sentence per design v2 §5.7 for the Trade
 * Ticket and per §5.4 for Champion's Path live narrative.
 *
 * This is the primary share-friendly text. Pure function. Server-rendered
 * at insert time (so the DB row matches the client render) and used
 * client-side during build for the live narrative.
 */
export function renderStoryLine(mode: Mode, scenario: AnyScenario): string {
  switch (mode) {
    case "final_four":
      return renderFinalFour(scenario as FinalFourScenario);
    case "champions_path":
      return renderChampionsPath(scenario as ChampionsPathScenario);
    case "full_bracket":
      return renderFullBracket(scenario as FullBracketScenario);
  }
}

function renderFinalFour(s: FinalFourScenario): string {
  const names = s.semifinalists.map(teamName);
  if (names.length !== 4) return "Four semifinalists.";
  return `${names[0]}, ${names[1]}, ${names[2]}, and ${names[3]} in the semifinals.`;
}

function renderChampionsPath(s: ChampionsPathScenario): string {
  const team = teamName(s.team);
  const parts: string[] = [];
  const stages: Array<["r16" | "qf" | "sf" | "f", string]> = [
    ["r16", "the Round of 16"],
    ["qf", "the Quarterfinal"],
    ["sf", "the Semifinal"],
    ["f", "the Final"],
  ];
  for (const [k, label] of stages) {
    const v = s[k];
    if (!v) continue;
    const opp = teamName(v.opponent);
    if (v.result === "W") {
      parts.push(`beats ${opp} in ${label}`);
    } else {
      parts.push(`falls to ${opp} in ${label}`);
      break; // truncate after a loss
    }
  }
  // Special case: full path of 4 wins is "wins the World Cup".
  const fStage = s.f;
  if (fStage?.result === "W" && parts.length === 4) {
    // Rewrite the final part to "and wins the World Cup".
    parts[3] = `wins the World Cup`;
  }
  if (parts.length === 0) return `${team} enters the knockouts.`;
  if (parts.length === 1) return `${team} ${parts[0]}.`;
  const last = parts.pop()!;
  return `${team} ${parts.join(", ")}, and ${last}.`;
}

function renderFullBracket(s: FullBracketScenario): string {
  // R32 schema layout: [0..15]=R32 winners, [16..23]=R16, [24..27]=QF,
  // [28..29]=SF winners (the two finalists), [30]=champion. Partial
  // submissions (Checkpoint 9, P1.1) truncate koAdvancers at a stage
  // boundary; the story line collapses to the commitment depth so the
  // headline reflects what the user actually called.
  const stage = detectFullBracketStage(s);
  switch (stage) {
    case "groups": {
      const first = teamName(s.groupWinners[0]);
      return `Twelve group winners called. ${first} leads the table.`;
    }
    case "r32": {
      const top = s.koAdvancers.slice(0, 3).map(teamName).join(", ");
      return `Sixteen teams into the Round of 16. ${top} headline the call.`;
    }
    case "r16": {
      const qf = s.koAdvancers.slice(16, 24);
      const top = qf.slice(0, 3).map(teamName).join(", ");
      return `Eight quarterfinalists called. ${top} headline the call.`;
    }
    case "qf": {
      const sf = s.koAdvancers.slice(24, 28).map(teamName);
      return `Four semifinalists: ${sf.join(", ")}.`;
    }
    case "sf": {
      const finalists = s.koAdvancers.slice(28, 30).map(teamName);
      return `Two finalists: ${finalists[0]} and ${finalists[1]}.`;
    }
    case "final": {
      const champ = s.koAdvancers[30];
      const finalistA = s.koAdvancers[28];
      const finalistB = s.koAdvancers[29];
      const champName = teamName(champ);
      const loser = champ === finalistA ? finalistB : finalistA;
      const loserName = teamName(loser);
      return `${champName} wins the World Cup, beating ${loserName} in the final.`;
    }
  }
}
