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
import { SimulatorChrome } from "@/components/simulator/SimulatorChrome";
import { TradeTicket } from "@/components/simulator/TradeTicket";

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
 * Page composition (top to bottom):
 *   - SimulatorChrome  — masthead with the project / surface / WC2026
 *                        eyebrow and the submission timestamp on the
 *                        right; hairline rule below.
 *   - TradeTicket      — the brutalist receipt card. Contains flags,
 *                        story line, RealityScorePanel, scenario block,
 *                        prediction ID strip, footer + watermark.
 *                        Internal reveals at t=100ms (band) and t=200ms
 *                        (1-in-N); the scenario block, ID strip, and
 *                        watermark reveal together at t=400ms via
 *                        .reveal-ticket per IMPL_PROMPT §9.
 *   - Email gate /
 *     TrackedFootnote  — the soft "want to track this?" prompt.
 *                        Reveals at t=1000ms via .reveal-gate. Rendered
 *                        only when the prediction is not yet attached
 *                        to a subscriber (server-derived from
 *                        view.hasTracking).
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
      <div className="pt-8 pb-12">
        <TradeTicket view={view} />
      </div>

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
