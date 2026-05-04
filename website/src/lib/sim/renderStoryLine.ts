import { teamName } from "@/lib/data/wc2026-official-draw";
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
  // The 15th KO advancer is the predicted champion. The 13th and 14th
  // are the two finalists. The model's final-loser is whichever of those
  // two is NOT the 15th.
  const champ = s.koAdvancers[14];
  const finalistA = s.koAdvancers[12];
  const finalistB = s.koAdvancers[13];
  const champName = teamName(champ);
  const loser = champ === finalistA ? finalistB : finalistA;
  const loserName = teamName(loser);
  return `${champName} wins the World Cup, beating ${loserName} in the final.`;
}
