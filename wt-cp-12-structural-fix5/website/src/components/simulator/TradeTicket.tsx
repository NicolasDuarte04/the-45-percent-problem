/**
 * Trade Ticket per IMPL_PROMPT §12 + design v2 §5.7.
 *
 * Brutalist receipt aesthetic: single 1px border, sharp corners
 * (--radius: 0 from the simulator canvas), dense vertical stack.
 * No drop shadow, no rounded corners, no gradient. The ticket IS
 * the page's main visual surface on the permalink; story line at
 * the top, score block, scenario block, ID strip, watermark at
 * the bottom-right. Hairline rules separate the four internal
 * sections so the visual hierarchy reads even at a glance.
 *
 * Reveal timing per IMPL_PROMPT §9 (CSS-only, see globals.css):
 *   - story line, score label, hero number, denominator: t=0
 *   - rarity band group: t=100ms (.reveal-band, panel-internal)
 *   - 1-in-N sentence:    t=200ms (.reveal-one-in-n, panel-internal)
 *   - scenario block:     t=400ms (.reveal-ticket)
 *   - ID strip + footer:  t=400ms (.reveal-ticket)
 *   - watermark:          t=400ms (.reveal-ticket)
 *
 * Phase A: client-side render only. The user can screenshot the
 * ticket card directly from the page. Server-side image render via
 * @vercel/og + a /api/og/scenario/[id] endpoint is Phase B per
 * IMPL_PROMPT §12. html2canvas-based "Download PNG" is also deferred
 * (would add a dep + bundle weight; user can screenshot in the
 * meantime).
 *
 * Flag treatment per design v2 §5.7:
 *   - Final Four:      4 flags in a row above the story line
 *   - Champion's Path: 1 flag (the team being traced)
 *   - Full Bracket:    1 flag (the predicted champion)
 *
 * Pure server component.
 */

import { Flag } from "@/components/primitives/Flag";
import { RealityScoreReveal } from "@/components/simulator/reality/RealityScoreReveal";
import { ScenarioBlock } from "@/components/simulator/ScenarioBlock";
import type {
  ChampionsPathScenario,
  FinalFourScenario,
  FullBracketScenario,
  PublicPredictionView,
} from "@/lib/sim/types";

interface TradeTicketProps {
  view: PublicPredictionView;
  /**
   * VIRAL_LOOP §3.1.D: when true, the ticket renders only the scenario
   * detail block, the prediction-ID strip, and the provenance footer;
   * the flag tile, story line, and Reality Score block are omitted
   * because the parent has lifted them above the share / alert strip
   * as the page-level hero. Defaults to false (the standalone-card
   * shape used by the Phase B layout).
   */
  compact?: boolean;
}

function flagsForView(view: PublicPredictionView): string[] {
  switch (view.mode) {
    case "final_four":
      return (view.scenario as FinalFourScenario).semifinalists;
    case "champions_path":
      return [(view.scenario as ChampionsPathScenario).team];
    case "full_bracket": {
      // R32 schema: koAdvancers[30] is the champion (31 total advancers).
      // Checkpoint 9 (P1.1) admits partial scenarios where the champion is
      // not set; fall back to the alphabetically-first group winner so the
      // hero tile renders a representative flag from the user's call.
      const fb = view.scenario as FullBracketScenario;
      const champ = fb.koAdvancers[30];
      if (champ) return [champ];
      const fallback = [...fb.groupWinners].sort()[0];
      return fallback ? [fallback] : [];
    }
  }
}

export function TradeTicket({ view, compact = false }: TradeTicketProps) {
  const flagCodes = flagsForView(view);
  const permalinkPath = `/scenario/p/${view.id}`;

  return (
    <article
      aria-labelledby={compact ? "ticket-scenario-label" : "ticket-story"}
      className="border border-[var(--border-default)] bg-[var(--bg-panel)] p-6 sm:p-8"
    >
      {/* Flag slot, story line, and Reality Score block are conditionally
          rendered. In compact mode (VIRAL_LOOP §3.1.D), the parent has
          already lifted these above the share strip as the page hero, so
          the ticket card carries only the scenario detail + provenance. */}
      {!compact ? (
        <>
          {flagCodes.length > 0 ? (
            <div className="mb-5 flex items-center gap-2">
              {flagCodes.map((code) => (
                <Flag
                  key={code}
                  code={code}
                  size={view.mode === "champions_path" || view.mode === "full_bracket" ? 32 : 24}
                />
              ))}
            </div>
          ) : null}

          <h1
            id="ticket-story"
            className="font-serif text-[24px] leading-[1.25] sm:text-[32px] text-[var(--text-primary)]"
          >
            {view.storyLine}
          </h1>

          <div className="mt-8">
            <RealityScoreReveal
              count={view.countCurrent}
              total={view.total}
              state={view.state}
            />
          </div>
        </>
      ) : null}

      {/* Scenario block: mode-specific compact mono listing. Reveals
          at t=400ms with .reveal-ticket per IMPL_PROMPT §9. The leading
          rule + spacing only apply when the panel sits beneath the
          Reality Score block; in compact mode the scenario IS the
          opening surface, so it renders flush. */}
      <section
        aria-labelledby="ticket-scenario-label"
        className={
          compact
            ? "reveal-ticket"
            : "reveal-ticket mt-8 border-t border-[var(--rule)] pt-6"
        }
      >
        <span id="ticket-scenario-label" className="sr-only">
          Scenario data
        </span>
        <ScenarioBlock mode={view.mode} scenario={view.scenario} />
      </section>

      {/* Prediction ID strip: design v1 §4.1. §3.1.A reclassifies the
          ID hex from --text-tertiary to --text-quiet so the page hero
          gains visual weight without growing. */}
      <section
        aria-labelledby="ticket-id-label"
        className="reveal-ticket mt-8 flex flex-wrap items-baseline justify-between gap-3 border-t border-[var(--rule)] pt-4 font-mono text-[10px] uppercase tracking-[0.10em] text-[var(--text-quiet)]"
      >
        <span id="ticket-id-label">
          Prediction ID{" "}
          <span className="text-[var(--text-quiet)]">{view.id}</span>
        </span>
        <span className="tabular-nums normal-case tracking-normal text-[10px]">
          45analytics.com{permalinkPath}
        </span>
      </section>

      {/* Footer + watermark. §3.1.A demotes the watermark from raw
          opacity:0.4 to the --text-quiet token so its weight matches
          the rest of the provenance row. */}
      <section className="reveal-ticket mt-2 flex flex-wrap items-baseline justify-between gap-3 font-mono text-[9px] uppercase tracking-[0.10em] text-[var(--text-quiet)]">
        <span className="tabular-nums">
          Model {view.modelSha.slice(0, 7)} · Snapshot{" "}
          {view.snapshotSha.slice(0, 7)} · N=
          {view.total.toLocaleString("en-US")}
        </span>
        <span
          aria-label="45analytics watermark"
          className="font-sans normal-case tracking-normal text-[10px] text-[var(--text-quiet)]"
        >
          45analytics
        </span>
      </section>
    </article>
  );
}
