"use client";

/**
 * One scenario card for /scenario/explore (Checkpoint 11, P2.2).
 *
 * Brutalist card: flag row, story line in serif, "1 in N · pct%" line in
 * mono, a small --accent-warm band chip, and a single action link to the
 * Final Four page pre-filled with the four teams. The card click is
 * tracked via the explore_card_clicked Plausible event; navigation uses
 * next/link so the route transition stays in-app.
 */

import Link from "next/link";
import { Flag } from "@/components/primitives/Flag";
import { track } from "@/lib/analytics/track";
import type { RarityBand } from "@/lib/sim/types";
import type { ExploreScenario } from "@/lib/sim/rarityExplorer";
import { labelForBand } from "./bandDefinitions";

interface ExploreScenarioCardProps {
  scenario: ExploreScenario;
  band: RarityBand;
}

export function ExploreScenarioCard({
  scenario,
  band,
}: ExploreScenarioCardProps) {
  const teamsParam = scenario.semifinalists.join(",");
  const pct = (scenario.count / scenario.total) * 100;
  const pctLabel = pct >= 1 ? `${pct.toFixed(2)}%` : `${pct.toFixed(3)}%`;
  const bandLabel = labelForBand(band);

  function handleClick() {
    track("explore_card_clicked", { band, teams: teamsParam });
  }

  return (
    <article
      className="group flex h-full flex-col border bg-[var(--bg-panel-elev)] p-5 transition-colors duration-100"
      style={{
        borderColor: "var(--border-default)",
      }}
    >
      <div className="flex items-center gap-3" aria-label="Semifinalists">
        {scenario.semifinalists.map((code) => (
          <span key={code} className="inline-flex items-center gap-1.5">
            <Flag code={code} size={24} />
            <span
              className="font-mono text-[11px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              {code}
            </span>
          </span>
        ))}
      </div>

      <p
        className="mt-4 font-serif text-[16px] leading-[1.4]"
        style={{ color: "var(--text-primary)" }}
      >
        {scenario.storyLine}
      </p>

      <div
        className="mt-3 font-mono text-[13px]"
        style={{ color: "var(--text-secondary)" }}
      >
        {scenario.oneInN} · {pctLabel}
      </div>

      <div className="mt-3">
        <span
          className="inline-block font-mono text-[10px] uppercase tracking-[0.14em] px-2 py-0.5"
          style={{
            border: "1px solid var(--accent-warm)",
            color: "var(--accent-warm)",
          }}
        >
          {bandLabel}
        </span>
      </div>

      <div className="mt-5 flex-1" />

      <Link
        href={`/scenario/final-four?teams=${teamsParam}`}
        onClick={handleClick}
        className="font-mono text-[12px] uppercase tracking-[0.10em] transition-colors duration-100 hover:text-[var(--accent-warm)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]"
        style={{ color: "var(--text-primary)" }}
        aria-label={`Try this scenario: ${scenario.storyLine}`}
      >
        [ Try this scenario → ]
      </Link>
    </article>
  );
}
