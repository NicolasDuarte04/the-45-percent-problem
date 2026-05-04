/**
 * Trade Ticket per IMPL_PROMPT §12 + design v2 §5.7.
 *
 * Brutalist receipt aesthetic: single 1px border, sharp corners
 * (--radius: 0 from the simulator canvas), dense vertical stack.
 * No drop shadow, no rounded corners, no gradient. The ticket IS
 * the page's main visual surface on the permalink — story line at
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
import { RealityScorePanel } from "@/components/simulator/RealityScorePanel";
import { ScenarioBlock } from "@/components/simulator/ScenarioBlock";
import type {
  ChampionsPathScenario,
  FinalFourScenario,
  FullBracketScenario,
  PublicPredictionView,
} from "@/lib/sim/types";

interface TradeTicketProps {
  view: PublicPredictionView;
}

function flagsForView(view: PublicPredictionView): string[] {
  switch (view.mode) {
    case "final_four":
      return (view.scenario as FinalFourScenario).semifinalists;
    case "champions_path":
      return [(view.scenario as ChampionsPathScenario).team];
    case "full_bracket": {
      // R32 schema: koAdvancers[30] is the champion (31 total advancers).
      const fb = view.scenario as FullBracketScenario;
      const champ = fb.koAdvancers[30];
      return champ ? [champ] : [];
    }
  }
}

export function TradeTicket({ view }: TradeTicketProps) {
  const flagCodes = flagsForView(view);
  const permalinkPath = `/scenario/p/${view.id}`;

  return (
    <article
      aria-labelledby="ticket-story"
      className="border border-[var(--border-default)] bg-[var(--bg-panel)] p-6 sm:p-8"
    >
      {/* Flag slot — design v2 §5.7. One row of flags above the story
          line; size scales with mode (Final Four shows 4 small flags,
          single-team modes show one larger flag). */}
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

      {/* Story line — primary share-friendly serif sentence. */}
      <h1
        id="ticket-story"
        className="font-serif text-[24px] leading-[1.25] sm:text-[32px] text-[var(--text-primary)]"
      >
        {view.storyLine}
      </h1>

      {/* Reality Score block. The panel itself owns its internal
          reveal classes (.reveal-band at 100ms, .reveal-one-in-n at
          200ms). The hero number renders at t=0 per IMPL_PROMPT §9
          step 1. */}
      <div className="mt-8">
        <RealityScorePanel
          count={view.countCurrent}
          total={view.total}
          state={view.state}
        />
      </div>

      {/* Scenario block — mode-specific compact mono listing. Reveals
          at t=400ms with .reveal-ticket per IMPL_PROMPT §9. Hairline
          rule above separates the score block from the data block. */}
      <section
        aria-labelledby="ticket-scenario-label"
        className="reveal-ticket mt-8 border-t border-[var(--rule)] pt-6"
      >
        <span id="ticket-scenario-label" className="sr-only">
          Scenario data
        </span>
        <ScenarioBlock mode={view.mode} scenario={view.scenario} />
      </section>

      {/* Prediction ID strip — same data as design v1 §4.1's strip.
          Permalink rendered as 45analytics.com/p/{id} on the right.
          Reveals with the rest of the ticket metadata at t=400ms. */}
      <section
        aria-labelledby="ticket-id-label"
        className="reveal-ticket mt-8 flex flex-wrap items-baseline justify-between gap-3 border-t border-[var(--rule)] pt-4 font-mono text-[10px] uppercase tracking-[0.10em] text-[var(--text-quiet)]"
      >
        <span id="ticket-id-label">
          Prediction ID{" "}
          <span className="text-[var(--text-tertiary)]">{view.id}</span>
        </span>
        <span className="tabular-nums normal-case tracking-normal text-[10px]">
          45analytics.com{permalinkPath}
        </span>
      </section>

      {/* Footer + watermark. Footer carries the model SHA, snapshot
          SHA, and N=10000 — design v1 §4.1 reproducibility metadata.
          Watermark in the bottom-right corner at 40% opacity. */}
      <section className="reveal-ticket mt-2 flex flex-wrap items-baseline justify-between gap-3 font-mono text-[9px] uppercase tracking-[0.10em] text-[var(--text-quiet)]">
        <span className="tabular-nums">
          Model {view.modelSha.slice(0, 7)} · Snapshot{" "}
          {view.snapshotSha.slice(0, 7)} · N=
          {view.total.toLocaleString("en-US")}
        </span>
        <span
          aria-label="45analytics watermark"
          className="font-sans normal-case tracking-normal text-[10px]"
          style={{ opacity: 0.4 }}
        >
          45analytics
        </span>
      </section>
    </article>
  );
}
