/**
 * OG Image generator for prediction permalinks.
 *
 * Renders a 1200x630 PNG that is pixel-accurate to the simulator canvas
 * design tokens (brutalist dark: #0F1216 base, sharp corners, mono data,
 * serif headline). Returned with a 1-hour cache header so Vercel and any
 * CDN amortise the Satori render cost.
 *
 * The visual primitives (color tokens, font loader, flag loader, the JSX
 * card itself) live in `../_lib/scenarioOG.tsx` so the curated promo
 * route `/api/og/promo/[slug]` and this route render an identical
 * artifact. The only per-route difference is the provenance footer.
 *
 * Layout (per VIRAL_LOOP_PIVOT.md §1.3):
 *   header (45ANALYTICS / TOURNAMENT SCENARIO · MODE)
 *   body two-column with 1px peach signature rule
 *   footer single-line ISBN-style provenance
 *
 * Implementation invariants (carried from PR 1, §1.2.B):
 *   - runtime: nodejs (DB driver pins us off Edge: postgres-js TCP).
 *   - Every code path returns either valid PNG bytes with image/png, or
 *     a JSON error response that the client refuses to save under .png.
 *   - Font load is best-effort; failure renders with Satori defaults.
 *   - A flag-load failure renders the panel without that flag rather
 *     than failing the whole image.
 */

import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { predictions } from "@/lib/db/schema";
import { isValidPredictionId } from "@/lib/sim/generatePredictionId";
import { toPublicPredictionView } from "@/lib/sim/predictionViews";
import type {
  ChampionsPathScenario,
  FinalFourScenario,
  FullBracketScenario,
  PublicPredictionView,
} from "@/lib/sim/types";

import {
  MODE_LABELS,
  OGCard,
  fontsToImageResponseOptions,
  loadFlagDataUri,
  loadFonts,
} from "../../_lib/scenarioOG";

export const runtime = "nodejs";
export const revalidate = 3600;

// ── Per-mode field extraction ────────────────────────────────────────────────

/** Team codes shown in the Bloomberg-watchlist strip below the story line. */
function teamCodesForView(view: PublicPredictionView): string[] {
  switch (view.mode) {
    case "final_four":
      return (view.scenario as FinalFourScenario).semifinalists;
    case "champions_path":
      return [(view.scenario as ChampionsPathScenario).team];
    case "full_bracket": {
      // R32 schema: koAdvancers[30] is the champion (31 total advancers).
      const champ = (view.scenario as FullBracketScenario).koAdvancers[30];
      return champ ? [champ] : [];
    }
  }
}

/** Flags shown as the hero tile in the top-left. Final Four shows four 32px
 *  tiles in a row; single-team modes show one 56px tile. */
function flagCodesForView(view: PublicPredictionView): string[] {
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

// ── Route handler ────────────────────────────────────────────────────────────

// Invariant (PR 1 §1.2.B): every code path returns either a valid PNG with
// Content-Type: image/png, or a JSON error response that the client-side
// download flow refuses to save under a .png filename.
function jsonError(status: number, code: string): Response {
  return new Response(JSON.stringify({ error: code }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await ctx.params;

    if (!isValidPredictionId(id)) {
      return jsonError(404, "not_found");
    }

    const rows = await db
      .select()
      .from(predictions)
      .where(eq(predictions.id, id))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return jsonError(404, "not_found");
    }

    const view = toPublicPredictionView(row);

    let fonts: { mono: ArrayBuffer; serif: ArrayBuffer } | null;
    try {
      fonts = await loadFonts();
    } catch (err) {
      console.error("[og] font load failed, rendering with default fonts", err);
      fonts = null;
    }

    const flagCodes = flagCodesForView(view);
    const flagDataUris = await Promise.all(flagCodes.map(loadFlagDataUri));
    const teamCodes = teamCodesForView(view);
    const modeLabel = MODE_LABELS[view.mode] ?? "SCENARIO";

    // Provenance footer: ISBN-style. Equal-weight tracking, whitespace-
    // separated, no pipes. Formatted as one string so Satori sees one text
    // child on the footer span.
    const provenance = [
      view.id,
      `MODEL ${view.modelSha.slice(0, 7)}`,
      `N=${view.total.toLocaleString("en-US")}`,
      `45ANALYTICS.COM/P/${view.id.slice(-4)}`,
    ].join("   ");

    return new ImageResponse(
      (
        <OGCard
          storyLine={view.storyLine}
          modeLabel={modeLabel}
          flagDataUris={flagDataUris}
          teamCodes={teamCodes}
          count={view.countCurrent}
          total={view.total}
          state={view.state}
          provenance={provenance}
        />
      ),
      {
        width: 1200,
        height: 630,
        ...fontsToImageResponseOptions(fonts),
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `inline; filename="45analytics-${view.id}.png"`,
          "Cache-Control": "public, max-age=3600, s-maxage=3600, immutable",
        },
      },
    );
  } catch (err) {
    console.error("[og] render failed", err);
    return jsonError(500, "render_failed");
  }
}
