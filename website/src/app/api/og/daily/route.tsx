/**
 * Daily share-card image generator (1080x1350, Instagram feed 4:5).
 *
 * Renders a branded PNG from the live published snapshot so the operator can
 * post a polished daily card instead of a raw terminal screenshot. Two
 * variants, selected by `?variant=recap|preview`:
 *   - recap   : the matches PLAYED on the most recent audience-local day with
 *               results, each with its real final score and the probability the
 *               model gave the result, plus a champion calibration strip.
 *   - preview : the fixtures on the earliest audience-local day still to be
 *               played, with the model's modal scoreline and top 1X2 outcome.
 * An explicit `?day=YYYY-MM-DD` override pins the subject day for either
 * variant. Auto-selection means the card regenerates daily with no manual work.
 *
 * Framing is strictly calibration-led. No market lines or betting edges appear
 * (the market column is intentionally pending). Copy is Colombian Spanish.
 *
 * Implementation invariants mirror the existing OG routes:
 *   - runtime: nodejs (the flag/font loaders read from disk).
 *   - Every code path returns either valid PNG bytes with image/png, or a JSON
 *     error the client refuses to save under .png.
 *   - Font load is best-effort; flag-load failure renders a blank tile rather
 *     than failing the whole image.
 *   - Cached one hour at the edge, matching the other OG routes.
 */
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

import { loadAllMatches, loadEvaluationMetrics } from "@/lib/data/loadSnapshot";
import { formatMono } from "@/lib/formatters";
import { modalScoreline } from "@/lib/data/matchListing";
import {
  type DailyVariant,
  dayNumber,
  formatSpanishDate,
  matchesForCard,
  previewNote,
  recapNote,
  selectPreviewDay,
  selectRecapDay,
  spanishName,
} from "@/lib/data/dailyShareCard";
import {
  DailyCard,
  type DailyRow,
} from "../_lib/dailyCard";
import {
  fontsToImageResponseOptions,
  loadFlagDataUri,
  loadFonts,
} from "../_lib/scenarioOG";

export const runtime = "nodejs";
// The subject day and variant come from the query string (request.url), so the
// route is dynamic by design rather than statically prerenderable. CDN caching
// still happens per-URL via the Cache-Control header set below.
export const dynamic = "force-dynamic";

// The busiest match-day in WC 2026 has 5 fixtures; cap at 6 for safe headroom
// so the fixed-height layout never overflows the 1350px canvas.
const MAX_ROWS = 6;

function jsonError(status: number, code: string): Response {
  return new Response(JSON.stringify({ error: code }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const url = new URL(req.url);
    const variantParam = url.searchParams.get("variant");
    const variant: DailyVariant = variantParam === "preview" ? "preview" : "recap";

    const dayParam = url.searchParams.get("day");
    const dayOverride = dayParam && DAY_RE.test(dayParam) ? dayParam : null;

    const matches = loadAllMatches();

    const subjectDay =
      dayOverride ??
      (variant === "recap" ? selectRecapDay(matches) : selectPreviewDay(matches));

    let fonts: { mono: ArrayBuffer; serif: ArrayBuffer } | null;
    try {
      fonts = await loadFonts();
    } catch (err) {
      console.error("[og/daily] font load failed, rendering with default fonts", err);
      fonts = null;
    }

    // No subject day means the snapshot has no matches for this variant
    // (e.g. pre-tournament recap). Render a graceful empty card, not a 500.
    if (!subjectDay) {
      return renderCard(
        {
          variant,
          dayNumber: 0,
          dateLabel: "",
          rows: [],
          metrics: null,
          emptyNote:
            variant === "recap"
              ? "Aún no hay partidos jugados."
              : "No hay partidos por jugar.",
        },
        variant,
        fonts,
      );
    }

    const dayMatches = matchesForCard(matches, subjectDay, variant).slice(0, MAX_ROWS);

    const rows: DailyRow[] = await Promise.all(
      dayMatches.map(async (m): Promise<DailyRow> => {
        const [homeFlag, awayFlag] = await Promise.all([
          loadFlagDataUri(m.home.fifa_code),
          loadFlagDataUri(m.away.fifa_code),
        ]);

        let center = "vs";
        let centerLabel = "1X2";
        if (variant === "recap" && m.score) {
          center = `${m.score.home}-${m.score.away}`;
          centerLabel = "Final";
        } else {
          const modal = modalScoreline(m.p_model_goals);
          if (modal) {
            center = `${modal.home}-${modal.away}`;
            centerLabel = "Modal";
          }
        }

        return {
          homeName: spanishName(m.home.fifa_code, m.home.display_name),
          awayName: spanishName(m.away.fifa_code, m.away.display_name),
          homeFlag,
          awayFlag,
          p: m.p_model_1x2,
          center,
          centerLabel,
          note: variant === "recap" ? recapNote(m) : previewNote(m),
        };
      }),
    );

    // Champion calibration strip, recap only. A metrics-load failure should
    // drop the strip, not fail the card.
    let metrics: { brier: string; rps: string; n: number } | null = null;
    if (variant === "recap") {
      try {
        const ev = loadEvaluationMetrics();
        const brier = ev.brier.M_STAR;
        const rps = ev.rps.M_STAR;
        if (brier != null && rps != null) {
          metrics = {
            brier: formatMono(brier, 3),
            rps: formatMono(rps, 3),
            n: ev.champion_metric_n ?? ev.matches_settled,
          };
        }
      } catch (err) {
        console.error("[og/daily] evaluation metrics load failed", err);
      }
    }

    return renderCard(
      {
        variant,
        dayNumber: dayNumber(subjectDay),
        dateLabel: formatSpanishDate(subjectDay),
        rows,
        metrics,
        emptyNote:
          rows.length === 0
            ? variant === "recap"
              ? "Aún no hay partidos jugados."
              : "No hay partidos por jugar."
            : null,
      },
      variant,
      fonts,
    );
  } catch (err) {
    console.error("[og/daily] render failed", err);
    return jsonError(500, "render_failed");
  }
}

function renderCard(
  props: React.ComponentProps<typeof DailyCard>,
  variant: DailyVariant,
  fonts: { mono: ArrayBuffer; serif: ArrayBuffer } | null,
): Response {
  return new ImageResponse(<DailyCard {...props} />, {
    width: 1080,
    height: 1350,
    ...fontsToImageResponseOptions(fonts),
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="45analytics-dia-${variant}.png"`,
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
