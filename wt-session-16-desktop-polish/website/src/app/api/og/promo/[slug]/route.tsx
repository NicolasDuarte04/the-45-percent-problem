/**
 * OG image generator for curated promo scenarios.
 *
 * Renders a 1200x630 PNG indistinguishable from the prediction permalink
 * OG card except for the provenance footer, which reads
 *   `PROMO · {snapshot_id} · {code_sha_8}`
 * to distinguish curated scenarios from real user predictions.
 *
 * The 1-in-N number on the card is computed live from the current
 * snapshot via `computeRealityScore`, so the rarity follows the model
 * naturally as the snapshot rotates. The slug is the stable identity;
 * the rarity is not.
 *
 * Cached for one hour at the edge (matching the scenario OG route).
 * Invalid slug returns 404 with a JSON body so social platforms treat
 * the unfurl as missing rather than rendering a generic fallback.
 */

import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

import { computeRealityScore } from "@/lib/sim/computeRealityScore";
import { canonicalizeScenario } from "@/lib/sim/canonicalizeScenario";
import { getPromoCard } from "@/lib/sim/promoCards";
import { loadSnapshotMeta } from "@/lib/data/loadSnapshot";
import {
  MODE_LABELS,
  OGCard,
  fontsToImageResponseOptions,
  loadFlagDataUri,
  loadFonts,
} from "../../_lib/scenarioOG";

export const runtime = "nodejs";
export const revalidate = 3600;

function jsonError(status: number, code: string): Response {
  return new Response(JSON.stringify({ error: code }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
): Promise<Response> {
  try {
    const { slug } = await ctx.params;
    const card = getPromoCard(slug);
    if (!card) return jsonError(404, "not_found");

    // Score the scenario against the current snapshot. The rarity number
    // on the card refreshes naturally each hour as the snapshot rotates.
    const scenario = { semifinalists: card.semifinalists };
    const canonical = canonicalizeScenario("final_four", scenario);
    const { count, total } = computeRealityScore(
      "final_four",
      canonical,
      scenario,
    );

    // Snapshot meta drives the provenance footer. A meta-load failure
    // should not 500 the card; fall back to "unknown" tokens so the image
    // still renders.
    let snapshotId = "unknown";
    let codeShort = "unknown";
    try {
      const meta = loadSnapshotMeta();
      snapshotId = meta.snapshot_id;
      codeShort = meta.code_sha.slice(0, 8);
    } catch (err) {
      console.error("[og/promo] snapshot meta load failed", err);
    }

    let fonts: { mono: ArrayBuffer; serif: ArrayBuffer } | null;
    try {
      fonts = await loadFonts();
    } catch (err) {
      console.error("[og/promo] font load failed, rendering with default fonts", err);
      fonts = null;
    }

    const flagDataUris = await Promise.all(card.semifinalists.map(loadFlagDataUri));
    const provenance = `PROMO   ${snapshotId}   ${codeShort}`;

    return new ImageResponse(
      (
        <OGCard
          storyLine={card.storyLine}
          modeLabel={MODE_LABELS.final_four}
          flagDataUris={flagDataUris}
          teamCodes={card.semifinalists}
          count={count}
          total={total}
          state="alive"
          provenance={provenance}
        />
      ),
      {
        width: 1200,
        height: 630,
        ...fontsToImageResponseOptions(fonts),
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `inline; filename="45analytics-promo-${card.slug}.png"`,
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
      },
    );
  } catch (err) {
    console.error("[og/promo] render failed", err);
    return jsonError(500, "render_failed");
  }
}
