/**
 * OG image generator for URL-state (exploratory) scenario shares.
 *
 * Sibling of `/api/og/scenario/[id]`, but keyed on the serialized scenario
 * in the `?s=` query parameter instead of a database id. No DB read, no
 * Postgres row: the scenario travels entirely in the URL, so a casual share
 * never writes to the predictions dataset (the submitted-prediction
 * permalink remains the only path that earns a ticket id).
 *
 * The card is rendered with the same shared `OGCard` primitive as the
 * permalink and promo routes, so all three stay visually identical. The one
 * deliberate difference: this card has no ticket id and no submitted-only
 * chrome. The provenance footer carries only the domain, the simulation
 * denominator, and a projection tagline; `state` is always "alive" because
 * a URL-state share has no lifecycle.
 *
 * Story line and the 1-in-N projection figure are computed with the same
 * pure functions the simulator and submit route use (renderStoryLine,
 * canonicalizeScenario, computeRealityScore), so the shared card matches
 * what the user saw in the builder.
 *
 * Invariants carried from the permalink route:
 *   - runtime: nodejs (font / flag reads use node:fs).
 *   - Every code path returns either valid PNG bytes with image/png, or a
 *     JSON error response that a client refuses to save under .png.
 *   - Font and flag loads are best-effort and degrade gracefully.
 */

import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

import { canonicalizeScenario } from "@/lib/sim/canonicalizeScenario";
import { computeRealityScore } from "@/lib/sim/computeRealityScore";
import { renderStoryLine } from "@/lib/sim/renderStoryLine";
import { decodeScenarioStrict, SCENARIO_PARAM } from "@/lib/sim/scenarioUrl";
import type {
  ChampionsPathScenario,
  FinalFourScenario,
  FullBracketScenario,
  ScenarioPayload,
} from "@/lib/sim/types";

import {
  MODE_LABELS,
  OGCard,
  type OGCardProps,
  fontsToImageResponseOptions,
  loadFlagDataUri,
  loadFonts,
} from "../../_lib/scenarioOG";

export const runtime = "nodejs";

// ── Per-mode field extraction (operates on the raw scenario, no DB view) ──────

/** Team codes for the watchlist strip and the hero flag tile(s). */
function teamCodesFor(payload: ScenarioPayload): string[] {
  switch (payload.mode) {
    case "final_four":
      return (payload.scenario as FinalFourScenario).semifinalists;
    case "champions_path":
      return [(payload.scenario as ChampionsPathScenario).team];
    case "full_bracket": {
      const fb = payload.scenario as FullBracketScenario;
      const champ = fb.koAdvancers[30];
      if (champ) return [champ];
      const fallback = [...fb.groupWinners].sort()[0];
      return fallback ? [fallback] : [];
    }
  }
}

// ── Card-data assembly (no JSX; any throw is caught and mapped to 500) ─────────

async function buildCardData(
  payload: ScenarioPayload,
): Promise<{
  props: OGCardProps;
  fonts: { mono: ArrayBuffer; serif: ArrayBuffer } | null;
}> {
  const storyLine = renderStoryLine(payload.mode, payload.scenario);
  const canonical = canonicalizeScenario(payload.mode, payload.scenario);
  const { count, total } = computeRealityScore(
    payload.mode,
    canonical,
    payload.scenario,
  );

  let fonts: { mono: ArrayBuffer; serif: ArrayBuffer } | null;
  try {
    fonts = await loadFonts();
  } catch (err) {
    console.error("[og:by-state] font load failed, using defaults", err);
    fonts = null;
  }

  const teamCodes = teamCodesFor(payload);
  const flagDataUris = await Promise.all(teamCodes.map(loadFlagDataUri));
  const modeLabel = MODE_LABELS[payload.mode] ?? "SCENARIO";

  // Provenance footer with no ticket id and no submitted-only chrome: just
  // the domain, the denominator, and a projection tagline.
  const provenance = [
    "45ANALYTICS.COM",
    `N=${total.toLocaleString("en-US")}`,
    "WHAT THE MODEL PROJECTS",
  ].join("   ");

  return {
    fonts,
    props: {
      storyLine,
      modeLabel,
      flagDataUris,
      teamCodes,
      count,
      total,
      state: "alive",
      provenance,
    },
  };
}

// ── Route handler ────────────────────────────────────────────────────────────

function jsonError(status: number, code: string): Response {
  return new Response(JSON.stringify({ error: code }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(req: NextRequest): Promise<Response> {
  const raw = req.nextUrl.searchParams.get(SCENARIO_PARAM);

  // Strict decode: only a complete, projectable scenario renders a card. A
  // partial draft or garbage param returns 404 (and generateMetadata never
  // points og:image here for those, so this is only hit directly).
  const payload = decodeScenarioStrict(raw);
  if (!payload) {
    return jsonError(404, "not_found");
  }

  let card: Awaited<ReturnType<typeof buildCardData>>;
  try {
    card = await buildCardData(payload);
  } catch (err) {
    console.error("[og:by-state] render failed", err);
    return jsonError(500, "render_failed");
  }

  return new ImageResponse(<OGCard {...card.props} />, {
    width: 1200,
    height: 630,
    ...fontsToImageResponseOptions(card.fonts),
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": 'inline; filename="45analytics-scenario.png"',
      // Cacheable per unique ?s=; an exploratory share is immutable content
      // for a given scenario.
      "Cache-Control": "public, max-age=3600, s-maxage=3600, immutable",
    },
  });
}
