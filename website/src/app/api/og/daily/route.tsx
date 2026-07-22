/**
 * Daily share-card image generator (1080x1350, Instagram feed 4:5).
 *
 * Renders a branded PNG from the live published snapshot so the operator can
 * post a polished daily card instead of a raw terminal screenshot. Two
 * variants, selected by `?variant=recap|preview`:
 *   - recap   : the matches PLAYED on the most recent COMPLETED audience-local
 *               day before today, each with its real final score and the
 *               probability the model gave the result, plus a champion
 *               calibration strip.
 *   - preview : today's fixtures (the audience-local day of the wall clock),
 *               with the model's modal scoreline and top 1X2 outcome.
 * Both are anchored to the audience-local "today" so the card tracks the
 * calendar rather than the data's played-state; ingestion lag can no longer drag
 * a variant into the past. An explicit `?day=YYYY-MM-DD` override pins the
 * subject day for either variant. Auto-selection regenerates daily with no
 * manual work.
 *
 * Framing is strictly calibration-led. No market lines or betting edges appear
 * (the market column is intentionally pending). Copy is English.
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

import {
  loadAllMatches,
  loadEvaluationMetrics,
  loadLedger,
  loadLiveKnockouts,
  loadSnapshotMeta,
} from "@/lib/data/loadSnapshot";
import { formatMono } from "@/lib/formatters";
import {
  type DailyVariant,
  audienceDayKeyFromMs,
  dayNumber,
  formatCardDate,
  isTournamentComplete,
  matchesForCard,
  previewScorelines,
  recapNote,
  selectPreviewDay,
  selectRecapDay,
  shootoutNote,
} from "@/lib/data/dailyShareCard";
import {
  CompletedCard,
  DailyCard,
  type DailyRow,
} from "../_lib/dailyCard";
import type { ScorelineChip } from "@/lib/data/dailyShareCard";
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

    // Graded group cards (matches/) plus the explicitly UNGRADED cp-17 live
    // knockout cards (matches_live/), merged for DISPLAY only, exactly as the
    // /matches page does. loadLiveKnockouts returns [] until the real draw
    // resolves, so this is a no-op pre-feed; once populated, the share card
    // tracks the real fixture list (R32 through the Final) instead of going
    // blind once the group stage is over. Neither card feeds any scored
    // surface: this route renders an image and writes nothing back, so the
    // graded ledger and calibration metrics are untouched.
    const matches = [...loadAllMatches(), ...loadLiveKnockouts()];

    // Anchor auto-selection to the audience-local "today" so the card tracks the
    // calendar, not the data's played-state (a lagging snapshot can no longer
    // push the preview into the past or present a stale recap as yesterday's).
    const todayKey = audienceDayKeyFromMs(Date.now());
    const subjectDay =
      dayOverride ??
      (variant === "recap"
        ? selectRecapDay(matches, todayKey)
        : selectPreviewDay(matches, todayKey));

    // Whether the subject day is the audience-local "today" (America/Bogota, the
    // same basis todayKey and every dayKey use). The preview header only claims
    // "Playing today" when this holds; a fixture pulled forward from a rest day
    // (subjectDay > todayKey) reads "Upcoming" with its real date instead, so a
    // July 14 fixture is never labelled as playing on July 12. Recap ignores it.
    const isToday = subjectDay != null && subjectDay === todayKey;

    let fonts: { mono: ArrayBuffer; serif: ArrayBuffer } | null;
    try {
      fonts = await loadFonts();
    } catch (err) {
      console.error("[og/daily] font load failed, rendering with default fonts", err);
      fonts = null;
    }

    // cp-44: once the tournament is complete there is no day to preview and no
    // fresh day to recap, so both variants render one completed-tournament
    // summary card built strictly from committed published numbers, instead of
    // an empty "No matches to play" preview or a stale recap of the final day.
    // This is gated on the snapshot meta (completed phase, 0 remaining), so
    // pre-completion behaviour is byte-identical.
    const meta = loadSnapshotMeta();
    if (isTournamentComplete(meta)) {
      let metrics: { brier: string; rps: string; n: number } | null = null;
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

      // R16 kill-criterion checkpoint, read from the published artifact. The gap
      // is displayed as its magnitude with an explicit direction word; positive
      // gap_in_se means M2 was worse than M0, negative means better. The graded
      // ledger size (the pre-registered group-stage forecast count) is read from
      // the same artifact's n rather than hardcoded.
      let checkpoint: { gapText: string; fired: boolean } | null = null;
      let gradedN = 0;
      try {
        const cp = loadEvaluationMetrics().r16_checkpoint;
        if (cp) {
          const direction = cp.gap_in_se > 0 ? "worse than" : "better than";
          checkpoint = {
            gapText: `${Math.abs(cp.gap_in_se).toFixed(2)} SE ${direction} M0`,
            fired: cp.tripped,
          };
          gradedN = cp.n;
        }
      } catch (err) {
        console.error("[og/daily] r16 checkpoint load failed", err);
      }
      // Fallback to the graded ledger's own row count if the checkpoint artifact
      // is unavailable, so the number is always sourced from a committed file.
      if (gradedN === 0) {
        try {
          gradedN = loadLedger().length;
        } catch {
          gradedN = 0;
        }
      }

      return renderCompleted(
        {
          settledCount: meta.matches_settled,
          gradedN,
          metrics,
          checkpoint,
        },
        fonts,
      );
    }

    // No subject day means the snapshot has no matches for this variant
    // (e.g. pre-tournament recap, or a knockout-phase gap where the group
    // fixtures are all played and the live knockout feed has no fixture for
    // this day yet). Render a graceful empty card, not a 500. The header still
    // reads the correct calendar day: derive "Day N" and the date from today,
    // not a hardcoded 0, so a fixture-less card shows "Day 18", never "Day 0".
    if (!subjectDay) {
      return renderCard(
        {
          variant,
          dayNumber: dayNumber(todayKey),
          dateLabel: formatCardDate(todayKey),
          isToday: true,
          rows: [],
          metrics: null,
          emptyNote:
            variant === "recap"
              ? "No matches played yet."
              : "No matches to play.",
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

        // Recap keeps the centre final-score column and the calibration note.
        // Preview drops both: the top-3 scoreline strip below the 1X2 bar now
        // carries the modal scoreline (its #1) and the rest, so the centre
        // value and the "favorito ... marcador modal" note would only repeat it.
        let center = "vs";
        let centerLabel = "1X2";
        let scorelines: ScorelineChip[] = [];
        let note: string | null = null;
        if (variant === "recap") {
          if (m.score) {
            center = `${m.score.home}-${m.score.away}`;
            centerLabel = "Final";
          }
          // cp-29: a penalty-decided knockout ends level in regulation. Keep the
          // regulation score as the headline but label it "Penales" and prepend
          // the shootout resolution to the note so the card never shows a bare
          // "1-1 Final" that hides how the tie was decided.
          const pen = shootoutNote(m);
          const cal = recapNote(m);
          if (pen) {
            centerLabel = "Penalties";
            note = cal ? `${pen} · ${cal}` : pen;
          } else {
            note = cal;
          }
        } else {
          scorelines = previewScorelines(m.p_model_goals);
        }

        return {
          homeName: m.home.display_name,
          awayName: m.away.display_name,
          homeCode: m.home.fifa_code.toUpperCase(),
          awayCode: m.away.fifa_code.toUpperCase(),
          homeFlag,
          awayFlag,
          p: m.p_model_1x2,
          center,
          centerLabel,
          scorelines,
          note,
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
        dateLabel: formatCardDate(subjectDay),
        isToday,
        rows,
        metrics,
        emptyNote:
          rows.length === 0
            ? variant === "recap"
              ? "No matches played yet."
              : "No matches to play."
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
      "Content-Disposition": `inline; filename="45analytics-day-${variant}.png"`,
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

// cp-44: the completed-tournament summary card, rendered for every variant once
// the tournament is over. Same canvas and cache posture as renderCard.
function renderCompleted(
  props: React.ComponentProps<typeof CompletedCard>,
  fonts: { mono: ArrayBuffer; serif: ArrayBuffer } | null,
): Response {
  return new ImageResponse(<CompletedCard {...props} />, {
    width: 1080,
    height: 1350,
    ...fontsToImageResponseOptions(fonts),
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="45analytics-tournament-summary.png"`,
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
