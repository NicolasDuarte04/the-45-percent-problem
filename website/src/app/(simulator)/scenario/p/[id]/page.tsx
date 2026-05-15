import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { isValidPredictionId } from "@/lib/sim/generatePredictionId";
import { getPrediction } from "@/lib/sim/getPrediction";
import { toPublicPredictionView } from "@/lib/sim/predictionViews";
import {
  PredictionAlertConfigurator,
  TrackedFootnote,
} from "@/components/simulator/PredictionAlertConfigurator";
import { Flag } from "@/components/primitives/Flag";
import { ModelCallPanel } from "@/components/simulator/ModelCallPanel";
import { RealityScoreReveal } from "@/components/simulator/reality/RealityScoreReveal";
import { SimulatorChrome } from "@/components/simulator/SimulatorChrome";
import {
  StaggeredReveal,
  StaggeredRevealItem,
} from "@/components/simulator/StaggeredReveal";
import { TicketShareButton } from "@/components/simulator/TicketShareButton";
import { TradeTicket } from "@/components/simulator/TradeTicket";
import type {
  ChampionsPathScenario,
  FinalFourScenario,
  FullBracketScenario,
  PublicPredictionView,
} from "@/lib/sim/types";

export const dynamic = "force-dynamic";

/** Mirror of TradeTicket.flagsForView, re-implemented at the page layer
 *  so the hero can render the flag tile without re-importing private helpers. */
function heroFlags(view: PublicPredictionView): string[] {
  switch (view.mode) {
    case "final_four":
      return (view.scenario as FinalFourScenario).semifinalists;
    case "champions_path":
      return [(view.scenario as ChampionsPathScenario).team];
    case "full_bracket": {
      const champ = (view.scenario as FullBracketScenario).koAdvancers[30];
      return champ ? [champ] : [];
    }
  }
}

/**
 * Public permalink page for a submitted prediction.
 *
 * Per IMPL_PROMPT §14 + handoff §3 addition (c):
 *   - Server-rendered from Postgres (not from /api/predictions/[id];
 *     direct DB read avoids a same-origin fetch on every page load).
 *   - Sanitized via toPublicPredictionView before rendering. Email and
 *     subscriberId never enter the page tree.
 *   - <meta name="robots" content="noindex,nofollow"> via Next 16
 *     metadata API. Link-public (anyone with the short ID can view)
 *     but not crawler-indexed.
 *
 * Phase B additions:
 *   - generateMetadata wires og:image + twitter:image to /api/og/scenario/[id]
 *     so social unfurl works automatically when the URL is shared.
 *   - TicketShareButton renders below the Trade Ticket for "↓ PNG" download
 *     and "Share" (Web Share API → clipboard fallback).
 *   - getPrediction (react/cache) is called once and reused by both
 *     generateMetadata and Page so the DB is never hit twice per request.
 *
 * Page composition (top to bottom). VIRAL_LOOP §3.1.D:
 *   - SimulatorChrome  · masthead with eyebrow + submission timestamp
 *   - Hero stack       · flag tile, story line, Reality Score block
 *                          (lifted out of TradeTicket so the user does not
 *                          have to scroll past the receipt to act)
 *   - Share strip      · ↓ PNG · Share (lifted up under the hero)
 *   - Email gate /     · soft "want to track this?" prompt, lifted up
 *     TrackedFootnote     above the receipt
 *   - TradeTicket      · compact mode: scenario detail + ID strip +
 *                          provenance footer only (the canonical receipt
 *                          card, demoted below the fold)
 */

// ── OG metadata ───────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  const base: Metadata = {
    robots: { index: false, follow: false },
    title: "Scenario · 45analytics",
  };

  if (!isValidPredictionId(id)) return base;

  const row = await getPrediction(id);
  if (!row) return base;

  // Clamp story line to a tweet-friendly length for the description field.
  const description =
    row.storyLine.length > 140
      ? `${row.storyLine.slice(0, 137)}…`
      : row.storyLine;

  const ogImageUrl = `/api/og/scenario/${id}`;

  return {
    ...base,
    title: `${row.storyLine} · 45analytics`,
    description,
    openGraph: {
      title: `${row.storyLine} · 45analytics`,
      description,
      url: `/scenario/p/${id}`,
      siteName: "45analytics",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `Scenario prediction: ${row.storyLine}`,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${row.storyLine} · 45analytics`,
      description,
      images: [ogImageUrl],
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PredictionPermalinkPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  if (!isValidPredictionId(id)) notFound();

  // getPrediction is memoised by react/cache; the same request that called
  // generateMetadata above reuses the cached result; no second DB round-trip.
  const row = await getPrediction(id);
  if (!row) notFound();

  // Sanitize before any field crosses the network boundary into the page tree
  // (defense in depth; the page renderer never sees email or subscriberId).
  const view = toPublicPredictionView(row);

  // Submission timestamp formatted for the right-aligned masthead meta strip
  // per design v1 §4.1: YYYY-MM-DD HH:MM UTC.
  const submitted = new Date(view.submittedAt);
  const submittedMeta = `${submitted.toISOString().slice(0, 16).replace("T", " ")} UTC`;

  const flagCodes = heroFlags(view);
  const flagSize =
    view.mode === "champions_path" || view.mode === "full_bracket" ? 32 : 24;

  return (
    <SimulatorChrome width="narrow" rightMeta={submittedMeta}>
      {/* Result + Next-Steps dossier. Unified container that groups
          the hero, share strip, and alert configurator on a single
          elevated surface. The outer card uses --bg-panel (#151A21)
          against the root --bg-root (#0F1216), with a 1px
          --border-default rule. The inner alert configurator is
          further elevated to --bg-panel-elev (#1C222B) so it reads
          as a distinct config terminal sitting on the dossier
          surface: three depth tiers: root → dossier → terminal.
          Per the post-launch UX feedback: the previous floating
          layout looked too brutalist-stealth on the dark canvas. */}
      <section
        aria-labelledby="hero-story"
        className="mt-8 mb-12 border border-[var(--border-default)] bg-[var(--bg-panel)] p-6 sm:p-8"
      >
        {/* MOTION_SPEC.md §2 · page-level cascade. Three children fade
            and lift 8px in turn: hero (240ms), share strip (+180ms),
            alert configurator (+180ms). The .reveal-* CSS classes stay
            on the inner elements as a no-JS fallback; once mounted, the
            cascade takes over and the CSS ones are no-ops. */}
        <StaggeredReveal>
          <StaggeredRevealItem index={0}>
            {/* Hero stack: flag tile + story line + Reality Score block.
                Lifted out of TradeTicket per VIRAL_LOOP §3.1.D so the
                share + alert actions can sit immediately below without
                the user scrolling past the entire receipt. */}
            <div>
              {flagCodes.length > 0 ? (
                <div className="mb-5 flex items-center gap-2">
                  {flagCodes.map((code) => (
                    <Flag key={code} code={code} size={flagSize} />
                  ))}
                </div>
              ) : null}

              <h1
                id="hero-story"
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
            </div>
          </StaggeredRevealItem>

          {/* You vs the model panel (Checkpoint 4, P0.2). Set-theoretic
              comparison between the user's scenario and the model's
              modal call. Inserted between the hero and the share strip
              so the user lands on the comparison before any next-step
              affordance. The 180ms cascade between items is preserved
              by incrementing the indices below. */}
          <StaggeredRevealItem index={1} className="mt-8">
            <ModelCallPanel view={view} />
          </StaggeredRevealItem>

          {/* Share / download strip, right-aligned so the hero reads
              as the primary surface. The 6s nudge-once pulse
              (§3.1.E) is wired inside TicketShareButton. */}
          <StaggeredRevealItem index={2} className="mt-6 flex justify-end">
            <TicketShareButton
              predictionId={view.id}
              count={view.countCurrent}
              total={view.total}
              storyLine={view.storyLine}
            />
          </StaggeredRevealItem>

          {/* Alert configurator. VIRAL_LOOP §2 (PR 3). Sits inside
              the dossier card and elevates further to bg-panel-elev
              for the nested-terminal feel. When the row already
              carries a subscriber_id, render the quiet
              TrackedFootnote acknowledgement instead. */}
          <StaggeredRevealItem index={3} className="mt-8">
            {view.hasTracking ? (
              <TrackedFootnote />
            ) : (
              <PredictionAlertConfigurator view={view} />
            )}
          </StaggeredRevealItem>
        </StaggeredReveal>
      </section>

      {/* Trade Ticket card, demoted below the fold. Compact mode renders
          only the scenario detail + ID strip + provenance footer; the
          flag, story line, and Reality Score now live in the hero above. */}
      <div className="mb-12">
        <TradeTicket view={view} compact />
      </div>
    </SimulatorChrome>
  );
}
