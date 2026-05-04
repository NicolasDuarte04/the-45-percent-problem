import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { isValidPredictionId } from "@/lib/sim/generatePredictionId";
import { getPrediction } from "@/lib/sim/getPrediction";
import { toPublicPredictionView } from "@/lib/sim/predictionViews";
import {
  PredictionEmailGate,
  TrackedFootnote,
} from "@/components/simulator/PredictionEmailGate";
import { SimulatorChrome } from "@/components/simulator/SimulatorChrome";
import { TradeTicket } from "@/components/simulator/TradeTicket";
import { TicketShareButton } from "@/components/simulator/TicketShareButton";

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
 * Phase B additions:
 *   - generateMetadata wires og:image + twitter:image to /api/og/scenario/[id]
 *     so social unfurl works automatically when the URL is shared.
 *   - TicketShareButton renders below the Trade Ticket for "↓ PNG" download
 *     and "Share" (Web Share API → clipboard fallback).
 *   - getPrediction (react/cache) is called once and reused by both
 *     generateMetadata and Page so the DB is never hit twice per request.
 *
 * Page composition (top to bottom):
 *   - SimulatorChrome  — masthead with eyebrow + submission timestamp
 *   - TradeTicket      — brutalist receipt card (server component)
 *   - TicketShareButton— download PNG + share/copy permalink (client component)
 *   - Email gate /
 *     TrackedFootnote  — soft "want to track this?" prompt
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
    title: "Scenario — 45analytics",
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
    title: `${row.storyLine} — 45analytics`,
    description,
    openGraph: {
      title: `${row.storyLine} — 45analytics`,
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
      title: `${row.storyLine} — 45analytics`,
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

  // getPrediction is memoised by react/cache — the same request that called
  // generateMetadata above reuses the cached result; no second DB round-trip.
  const row = await getPrediction(id);
  if (!row) notFound();

  // Sanitize before any field crosses the network boundary into the page tree
  // (defense in depth — the page renderer never sees email or subscriberId).
  const view = toPublicPredictionView(row);

  // Submission timestamp formatted for the right-aligned masthead meta strip
  // per design v1 §4.1: YYYY-MM-DD HH:MM UTC.
  const submitted = new Date(view.submittedAt);
  const submittedMeta = `${submitted.toISOString().slice(0, 16).replace("T", " ")} UTC`;

  return (
    <SimulatorChrome width="narrow" rightMeta={submittedMeta}>
      <div className="pt-8 pb-12">
        <TradeTicket view={view} />

        {/* Share / download strip — reveals with the ticket at t=400ms. */}
        <div className="reveal-ticket mt-4 flex justify-end">
          <TicketShareButton predictionId={view.id} />
        </div>
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
