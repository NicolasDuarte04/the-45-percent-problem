/**
 * OG Image generator for prediction permalinks — Phase B.
 *
 * Renders a 1200×630 PNG that is pixel-accurate to the simulator canvas
 * design tokens (brutalist dark: bg-root #0F1216, sharp corners, mono
 * data, serif headline). Returned with a 1-hour cache header so Vercel
 * Edge and CDNs amortise the Satori render cost.
 *
 * Layout (two-column body):
 *   Header  — "45analytics" wordmark  ·  mode eyebrow
 *   ──────────────────────────────────────────────────── 1px rule
 *   Left    — team codes strip · story line (serif 34px)
 *   Right   — REALITY SCORE label · hero % · rarity band · 1-in-N
 *   ──────────────────────────────────────────────────── 1px rule
 *   Footer  — prediction ID (left) · permalink (right)
 *
 * Font files live in public/fonts/ and are read once then cached at the
 * module scope. No external HTTP calls at render time.
 *
 * Per IMPL_PROMPT §12 + handoff Phase B addition:
 *   - runtime: nodejs (DB + fs access required)
 *   - ImageResponse from next/og (bundled in Next.js 16)
 *   - No CSS variables — all tokens inlined as hex literals
 */

import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import path from "node:path";
import fs from "node:fs/promises";

import { db } from "@/lib/db";
import { predictions } from "@/lib/db/schema";
import { isValidPredictionId } from "@/lib/sim/generatePredictionId";
import { toPublicPredictionView } from "@/lib/sim/predictionViews";
import { getRarityBand } from "@/lib/sim/getRarityBand";
import { getOneInN } from "@/lib/sim/getOneInN";
import type {
  ChampionsPathScenario,
  FinalFourScenario,
  FullBracketScenario,
  PublicPredictionView,
} from "@/lib/sim/types";

export const runtime = "nodejs";
// OG images are immutable for a given prediction state; re-validate after 1 h.
export const revalidate = 3600;

// ── Design tokens — simulator canvas (#0F1216 base) ──────────────────────────
// Mirrors [data-canvas="simulator"] in globals.css. No CSS variables in Satori.
const C = {
  bg:       "#0F1216", // --bg-root
  panel:    "#151A21", // --bg-panel
  border:   "#262D37", // --border-default / --rule
  ink:      "#EEE8DD", // --text-primary
  soft:     "#A8AFBC", // --text-tertiary
  quiet:    "#6D7585", // --text-quiet
  promoted: "#F9B88A", // --state-promoted (prism-peach)
  dead:     "#E76E8A", // --state-dead base (prism-rose)
} as const;

// ── Font loading — cached at module scope for subsequent requests ──────────────
const FONTS_DIR = path.join(process.cwd(), "public", "fonts");

let _cachedFonts: { mono: ArrayBuffer; serif: ArrayBuffer } | null = null;

async function loadFonts(): Promise<{ mono: ArrayBuffer; serif: ArrayBuffer }> {
  if (_cachedFonts) return _cachedFonts;

  const [monoNode, serifNode] = await Promise.all([
    fs.readFile(path.join(FONTS_DIR, "JetBrainsMono-Regular.ttf")),
    // Use the smaller OTF (236 KB) over the variable TTF (1.2 MB) for speed.
    fs.readFile(path.join(FONTS_DIR, "SourceSerif4-Regular.otf")),
  ]);

  // Buffer.prototype.buffer may point into a shared pool for small allocations;
  // slice the exact range to guarantee a standalone ArrayBuffer in all cases.
  const toAB = (b: Buffer): ArrayBuffer =>
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

  _cachedFonts = { mono: toAB(monoNode), serif: toAB(serifNode) };
  return _cachedFonts;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPercent(count: number, total: number): string {
  if (total <= 0) return "0.00%";
  const pct = (count / total) * 100;
  if (pct < 1) return `${pct.toFixed(2)}%`;
  if (pct < 25) return `${pct.toFixed(1)}%`;
  return `${Math.round(pct)}%`;
}

function heroInkColor(state: string): string {
  if (state === "promoted") return C.promoted;
  if (state === "dead") return C.dead;
  return C.ink;
}

const MODE_LABELS: Record<string, string> = {
  final_four:      "FINAL FOUR",
  champions_path:  "CHAMPION'S PATH",
  full_bracket:    "FULL BRACKET",
};

/** Team codes shown in the chip strip above the story line. */
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

// ── OG JSX — Satori-compatible React element tree ────────────────────────────
// All layout is flexbox. No grid, no CSS variables, no relative units —
// Satori supports only a subset of CSS (see vercel/satori for the full list).

function OGImage({ view }: { view: PublicPredictionView }) {
  const pctStr = formatPercent(view.countCurrent, view.total);
  const reading = getRarityBand(view.countCurrent, view.total);
  const oneInN = getOneInN(view.countCurrent, view.total);
  const codes = teamCodesForView(view);
  const modeLabel = MODE_LABELS[view.mode] ?? "SCENARIO";
  const promotedPrefix = view.state === "promoted" ? "▲ " : "";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: C.bg,
        fontFamily: "'JetBrains Mono'",
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "24px 48px",
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono'",
            fontSize: 17,
            color: C.ink,
            letterSpacing: "-0.01em",
          }}
        >
          45analytics
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono'",
            fontSize: 11,
            color: C.quiet,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {`SCENARIO · ${modeLabel}`}
        </span>
      </div>

      {/* ── Body (two columns) ──────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flex: 1,
          padding: "44px 48px 0 48px",
          gap: 48,
          overflow: "hidden",
        }}
      >
        {/* Left: team code chips + story line ──────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minWidth: 0,
          }}
        >
          {/* Team-code chips */}
          {codes.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 20,
              }}
            >
              {codes.map((code) => (
                <span
                  key={code}
                  style={{
                    fontFamily: "'JetBrains Mono'",
                    fontSize: 12,
                    color: C.quiet,
                    letterSpacing: "0.08em",
                    backgroundColor: C.panel,
                    padding: "3px 9px",
                    border: `1px solid ${C.border}`,
                  }}
                >
                  {code}
                </span>
              ))}
            </div>
          )}

          {/* Story line */}
          <div
            style={{
              fontFamily: "'Source Serif 4'",
              fontSize: 34,
              lineHeight: 1.27,
              color: C.ink,
              fontWeight: 400,
            }}
          >
            {view.storyLine}
          </div>
        </div>

        {/* Right: Reality Score block ───────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 300,
            flexShrink: 0,
          }}
        >
          {/* "REALITY SCORE" eyebrow */}
          <div
            style={{
              fontFamily: "'JetBrains Mono'",
              fontSize: 11,
              color: C.quiet,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            Reality Score
          </div>

          {/* Hero percentage. Concatenate prefix + value into a single string
              so Satori sees one text child — adjacent JSX expressions render
              as a children array, which Satori rejects on non-flex divs. */}
          <div
            style={{
              fontFamily: "'JetBrains Mono'",
              fontSize: 64,
              lineHeight: 1,
              color: heroInkColor(view.state),
              fontVariantNumeric: "tabular-nums",
              marginBottom: 12,
            }}
          >
            {`${promotedPrefix}${pctStr}`}
          </div>

          {/* Denominator — anti-casino discipline: always visible */}
          <div
            style={{
              fontFamily: "'JetBrains Mono'",
              fontSize: 12,
              color: C.soft,
              marginBottom: 28,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {`${view.countCurrent.toLocaleString("en-US")} / ${view.total.toLocaleString("en-US")} sims`}
          </div>

          {/* Rarity band (serif) */}
          <div
            style={{
              fontFamily: "'Source Serif 4'",
              fontSize: 26,
              lineHeight: 1.1,
              color: C.ink,
              marginBottom: 6,
            }}
          >
            {reading.band}
          </div>

          {/* Band caption */}
          <div
            style={{
              fontFamily: "'JetBrains Mono'",
              fontSize: 12,
              color: C.soft,
              marginBottom: 16,
            }}
          >
            {reading.caption}
          </div>

          {/* 1-in-N restatement */}
          <div
            style={{
              fontFamily: "'JetBrains Mono'",
              fontSize: 14,
              color: C.ink,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {oneInN}
          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 48px",
          borderTop: `1px solid ${C.border}`,
          marginTop: "auto",
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono'",
            fontSize: 11,
            color: C.quiet,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {`Prediction ID · ${view.id}`}
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono'",
            fontSize: 11,
            color: C.quiet,
            opacity: 0.7,
          }}
        >
          {`45analytics.com/scenario/p/${view.id}`}
        </span>
      </div>
    </div>
  );
}

// ── Route handler ─────────────────────────────────────────────────────────────

// Invariant: every code path on this route returns either (a) a valid PNG with
// `Content-Type: image/png`, or (b) a JSON error response that the client-side
// download flow will detect (via Content-Type sniff) and refuse to save under
// a `.png` filename. There is no path that returns plain-text/HTML bytes,
// because the Trade-Ticket download button uses `<a download>`-style flows
// that blindly write whatever the server returned to disk.
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

    // Font load is best-effort: a missing font drops us to Satori's default
    // family rather than a 500. Both branches still emit a valid PNG.
    let fonts: { mono: ArrayBuffer; serif: ArrayBuffer } | null;
    try {
      fonts = await loadFonts();
    } catch (err) {
      console.error("[og] font load failed — rendering with default fonts", err);
      fonts = null;
    }

    return new ImageResponse(<OGImage view={view} />, {
      width: 1200,
      height: 630,
      ...(fonts
        ? {
            fonts: [
              {
                name: "JetBrains Mono",
                data: fonts.mono,
                style: "normal",
                weight: 400,
              },
              {
                name: "Source Serif 4",
                data: fonts.serif,
                style: "normal",
                weight: 400,
              },
            ],
          }
        : {}),
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="45analytics-${view.id}.png"`,
        "Cache-Control": "public, max-age=3600, s-maxage=3600, immutable",
      },
    });
  } catch (err) {
    console.error("[og] render failed", err);
    return jsonError(500, "render_failed");
  }
}
