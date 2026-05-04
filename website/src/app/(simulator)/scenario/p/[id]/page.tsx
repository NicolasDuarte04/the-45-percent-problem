import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { predictions } from "@/lib/db/schema";
import { isValidPredictionId } from "@/lib/sim/generatePredictionId";
import { toPublicPredictionView } from "@/lib/sim/predictionViews";
import {
  PredictionEmailGate,
  TrackedFootnote,
} from "@/components/simulator/PredictionEmailGate";
import { RealityScorePanel } from "@/components/simulator/RealityScorePanel";
import { SimulatorChrome } from "@/components/simulator/SimulatorChrome";

export const dynamic = "force-dynamic";

/**
 * Public permalink page for a submitted prediction.
 *
 * Per IMPL_PROMPT §14 + handoff §3 addition (c):
 *   - Server-rendered from Postgres (not from /api/predictions/[id] —
 *     direct DB read avoids a same-origin fetch on every page load).
 *   - Sanitized via toPublicPredictionView before rendering. Email and
 *     subscriberId never enter the page tree.
 *   - <meta name="robots" content="noindex,nofollow"> via Next 16
 *     metadata API. Link-public (anyone with the short ID can view)
 *     but not crawler-indexed.
 *
 * Phase A scope: shows the storyLine, RealityScorePanel, prediction ID,
 * and the model/snapshot SHAs in the footer. Trade Ticket render is
 * Phase A scope but ships in a later step (it pairs with the Trade
 * Ticket component which is a separate UI piece).
 */

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Scenario — 45analytics",
};

export default async function PredictionPermalinkPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  if (!isValidPredictionId(id)) notFound();

  const rows = await db
    .select()
    .from(predictions)
    .where(eq(predictions.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) notFound();

  // Sanitize before any field crosses the network boundary into the
  // page tree (defense in depth — the page renderer never sees email
  // or subscriberId).
  const view = toPublicPredictionView(row);

  // Submission timestamp formatted for the right-aligned masthead meta
  // strip per design v1 §4.1: YYYY-MM-DD HH:MM UTC.
  const submitted = new Date(view.submittedAt);
  const submittedMeta = `${submitted.toISOString().slice(0, 16).replace("T", " ")} UTC`;

  return (
    <SimulatorChrome width="narrow" rightMeta={submittedMeta}>
      {/* Story line — the share-friendly serif sentence. */}
      <section className="pt-10 pb-8" aria-labelledby="story-line">
        <h1
          id="story-line"
          className="font-serif text-[24px] leading-[1.3] sm:text-[32px] text-[var(--text-primary)]"
        >
          {view.storyLine}
        </h1>
      </section>

      {/* Reality Score block. The score's hero number renders at t=0;
          the rarity band reveals at t=100ms and the 1-in-N at t=200ms.
          Both internal reveals are owned by the panel itself via the
          `.reveal-band` and `.reveal-one-in-n` classes (see
          globals.css under "Simulator reveal sequence"). */}
      <RealityScorePanel
        count={view.countCurrent}
        total={view.total}
        state={view.state}
      />

      {/* Prediction ID strip — the closest equivalent on this page to
          the Trade Ticket of design v1 §4.1. Reveals at t=400ms via
          the `.reveal-ticket` class. The actual <TradeTicket /> with
          its full anatomy (story, score block, scenario block,
          watermark, etc.) is a separate UI piece scoped for a later
          step; this strip carries the reproducibility metadata that
          will end up at the bottom of that ticket as well. */}
      <section
        aria-labelledby="prediction-id-label"
        className="reveal-ticket mt-12 border-t border-[var(--rule)] pt-6"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.10em] text-[var(--text-quiet)]">
          <span id="prediction-id-label">
            Prediction ID <span className="text-[var(--text-tertiary)]">{view.id}</span>
          </span>
          <span className="tabular-nums">
            MODEL {view.modelSha.slice(0, 7)} · SNAPSHOT {view.snapshotSha.slice(0, 7)} · N=
            {view.total.toLocaleString("en-US")}
          </span>
        </div>
      </section>

      {/* Email gate — non-blocking, fades in at t=1000ms via the
          `.reveal-gate` class. Reading order on the page is intentionally
          chrome → story → score → ticket-strip → gate, so the
          last-to-appear element is also the lowest-priority "soft ask"
          per design v2 §5.6+§5.9. Rendered only when the prediction is
          not yet attached to a subscriber (server-derived from the
          row's subscriber_id via view.hasTracking). When tracking is
          already in place, we render a quiet footnote instead — same
          reveal slot, calmer content. */}
      <div className="reveal-gate">
        {view.hasTracking ? (
          <TrackedFootnote />
        ) : (
          <PredictionEmailGate predictionId={view.id} />
        )}
      </div>
    </SimulatorChrome>
  );
}
