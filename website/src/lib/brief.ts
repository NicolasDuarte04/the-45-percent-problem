import { readFileSync } from "node:fs";
import path from "node:path";

export interface BriefSample {
  brief_date: string;
  issue_number: number;
  next_brief_utc: string;
  latest_archive_url: string;
  lead_in: {
    tournament_sentence: string;
    match_sentence: string;
    fallback_used: boolean;
  };
  teaser:
    | {
        has_divergence: true;
        match_label: string;
        side: string;
        model_prob: number;
        market_prob: number;
        edge_bps: number;
        edge_direction: "positive" | "negative";
      }
    | { has_divergence: false };
  featured_teams: string[];
}

// Phase 2 stub: read the static sample shipped in public/. Phase 3 swaps this
// for a fetch against /api/brief/latest, which serves the cron-written blob.
export function loadSampleBrief(): BriefSample {
  const file = path.join(process.cwd(), "public", "sample-brief.json");
  const raw = readFileSync(file, "utf8");
  return JSON.parse(raw) as BriefSample;
}
