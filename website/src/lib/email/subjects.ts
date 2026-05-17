/**
 * Subject-line builder for the daily brief.
 *
 * Six variants per Addendum v2; three quant-register, three fan-register. 
 * all in the same `[45A | YYYY-MM-DD]` masthead format. Phase 5 wires the
 * register choice per subscriber based on open-rate signals; v1 picks based
 * on the `register` argument, defaulting to quant.
 *
 * Each variant is content-aware: the chosen line is the one that has
 * meaningful content from the brief data. If a variant cannot be filled
 * (e.g., no movers, no divergences), we fall through to a quieter variant.
 */

import type { BriefSample, BriefDivergence } from "@/lib/brief";
import { COUNTRY_NAMES, isFifaCode } from "@/lib/flags/countries";

export type SubjectRegister = "quant" | "fan";

const NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  (Object.entries(COUNTRY_NAMES) as [string, string][]).map(([code, name]) => [
    name,
    code,
  ]),
);

function teamCode(displayName: string): string {
  return NAME_TO_CODE[displayName] ?? displayName.toUpperCase().slice(0, 3);
}

function bracketPrefix(briefDate: string): string {
  return `[45A | ${briefDate}]`;
}

function divergencesAboveThreshold(brief: BriefSample): BriefDivergence[] {
  return brief.top_divergences.filter((d) => Math.abs(d.edge_bps) >= 300);
}

function gatesTripped(brief: BriefSample): number {
  return brief.top_divergences.filter((d) => d.volatility_gate.triggered).length;
}

function formatEdgeBps(d: BriefDivergence): string {
  const sign = d.edge_direction === "positive" ? "+" : "-";
  return `${sign}${Math.abs(d.edge_bps)} bps`;
}

// ─── Subject variants (return undefined if the brief lacks the data) ────────

export function buildQuantSubjects(brief: BriefSample): string[] {
  const prefix = bracketPrefix(brief.brief_date);
  const above = divergencesAboveThreshold(brief);
  const lead = above[0] ?? brief.top_divergences[0];
  const gateCount = gatesTripped(brief);
  const issueLabel = `Issue ${String(brief.issue_number).padStart(3, "0")}`;
  const subjects: string[] = [];

  if (lead && above.length > 0) {
    const matchLabel = `${teamCode(lead.home)} vs ${teamCode(lead.away)}`;
    subjects.push(
      `${prefix} ${above.length} divergence${above.length === 1 ? "" : "s"} > 300 bps | ${matchLabel} leads at ${formatEdgeBps(lead)}`,
    );
  }

  if (above.length > 0) {
    subjects.push(
      `${prefix} ${brief.model_variant} vs market: ${above.length} gap${above.length === 1 ? "" : "s"} exceed threshold${gateCount > 0 ? ` | ${gateCount} gate${gateCount === 1 ? "" : "s"} tripped` : ""}`,
    );
  }

  const titleMover = brief.tournament_movers.find(
    (m) => m.metric === "title_probability",
  );
  if (titleMover) {
    const sign = titleMover.delta_bps >= 0 ? "+" : "-";
    subjects.push(
      `${prefix} ${issueLabel} | ${titleMover.team} title prob ${sign}${Math.abs(titleMover.delta_bps)} bps | daily model output`,
    );
  } else {
    subjects.push(`${prefix} ${issueLabel} | daily model output`);
  }

  return subjects;
}

export function buildFanSubjects(brief: BriefSample): string[] {
  const prefix = bracketPrefix(brief.brief_date);
  const subjects: string[] = [];

  const titleMover = brief.tournament_movers.find(
    (m) => m.metric === "title_probability",
  );
  if (titleMover) {
    const verb = titleMover.delta < 0 ? "drop" : "rise";
    subjects.push(
      `${prefix} ${titleMover.team}'s title chances ${verb} overnight`,
    );
  }

  const positiveLead = brief.top_divergences.find(
    (d) => d.edge_direction === "positive" && Math.abs(d.edge_bps) >= 300,
  );
  if (positiveLead) {
    const matchLabel = `${teamCode(positiveLead.home)} vs ${teamCode(positiveLead.away)}`;
    const favored =
      positiveLead.side === "home"
        ? positiveLead.home
        : positiveLead.side === "away"
          ? positiveLead.away
          : null;
    if (favored) {
      subjects.push(
        `${prefix} ${matchLabel}: our model thinks ${favored} is more likely than the bookmakers do`,
      );
    }
  }

  const meaningfulMovers = brief.tournament_movers.filter(
    (m) => Math.abs(m.delta_bps) >= 100,
  );
  if (meaningfulMovers.length > 0) {
    subjects.push(
      `${prefix} ${meaningfulMovers.length} team${meaningfulMovers.length === 1 ? "" : "s"}' World Cup chances moved meaningfully today`,
    );
  }

  return subjects;
}

/**
 * Pick one subject for an actual send. Phase 5 will rotate based on
 * subscriber signals; v1 just returns the first line of the requested
 * register, falling back to the other register if the first is empty.
 */
export function buildSubject(
  brief: BriefSample,
  register: SubjectRegister = "quant",
): string {
  const primary =
    register === "quant" ? buildQuantSubjects(brief) : buildFanSubjects(brief);
  if (primary.length > 0) return primary[0];

  const secondary =
    register === "quant" ? buildFanSubjects(brief) : buildQuantSubjects(brief);
  if (secondary.length > 0) return secondary[0];

  // Last-ditch: a content-free line that still says which issue this is.
  return `${bracketPrefix(brief.brief_date)} Issue ${String(brief.issue_number).padStart(3, "0")}`;
}

// `isFifaCode` is re-exported so the seed-briefs-blob.ts helper can validate
// inputs without importing two modules.
export { isFifaCode };
