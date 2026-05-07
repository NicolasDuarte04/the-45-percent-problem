/**
 * OG Image generator for prediction permalinks.
 *
 * Renders a 1200×630 PNG that is pixel-accurate to the simulator canvas
 * design tokens (brutalist dark: #0F1216 base, sharp corners, mono data,
 * serif headline). Returned with a 1-hour cache header so Vercel and any
 * CDN amortise the Satori render cost.
 *
 * Layout per VIRAL_LOOP_PIVOT.md §1.3:
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │ 45ANALYTICS                  TOURNAMENT SCENARIO · <MODE>       │
 *   │ ───────────────────────────────────────────────────────────────│
 *   │  [56px flag tile]                       ┃ ─── 1px peach rule    │
 *   │                                          ┃                       │
 *   │  Story line, 32pt serif, two            ┃   1 in 7    (84pt)    │
 *   │  to four lines of breathing room.       ┃   ▆▆▆░░     Plausible │
 *   │                                          ┃                       │
 *   │  ARG  ALG  AUS  CUW  COD  (mono codes)  ┃   14.1%               │
 *   │                                          ┃   1,408 / 10,000 sims │
 *   │ ───────────────────────────────────────────────────────────────│
 *   │ 45A-2026-7X9W   MODEL c8a9c10   N=10,000   45ANALYTICS.COM/P/…  │
 *   └─────────────────────────────────────────────────────────────────┘
 *
 * Why this beats the Phase B layout for sharing:
 *   - Hero is `1 in N` (the line a sharer copies into the tweet body),
 *     not the percentage. Humans hold ratios more easily than percents.
 *   - The 5-mono-pip rarity bar registers a "reading" before any text
 *     is parsed — it survives the 200px Twitter timeline thumbnail.
 *   - The single peach 1px vertical rule is the 45analytics signature;
 *     repeated on the on-page hero (§3.1.B) so card and export read as
 *     one artifact.
 *   - Provenance footer reads like ISBN copy — equal-weight tracking,
 *     no separator pipes — so the image registers as research output,
 *     not a tipster account.
 *
 * Implementation invariants (carried from PR 1, §1.2.B):
 *   - runtime: nodejs (DB driver pins us off Edge — postgres-js TCP).
 *   - Every code path returns either valid PNG bytes with image/png, or
 *     a JSON error response that the client refuses to save under .png.
 *   - Font load is best-effort; failure renders with Satori defaults.
 *   - Flag SVGs are read from disk and inlined as data URIs, cached at
 *     module scope. A flag-load failure renders the panel without the
 *     flag rather than failing the whole image.
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
  RarityBand,
} from "@/lib/sim/types";

export const runtime = "nodejs";
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
  promoted: "#F9B88A", // --state-promoted (prism-peach) — the signature accent
  dead:     "#E76E8A", // --state-dead base (prism-rose)
} as const;

// ── Asset loaders — cached at module scope ────────────────────────────────────
const FONTS_DIR = path.join(process.cwd(), "public", "fonts");
const FLAGS_DIR = path.join(process.cwd(), "public", "assets", "flags");

let _cachedFonts: { mono: ArrayBuffer; serif: ArrayBuffer } | null = null;
const _cachedFlags = new Map<string, string>();

async function loadFonts(): Promise<{ mono: ArrayBuffer; serif: ArrayBuffer }> {
  if (_cachedFonts) return _cachedFonts;
  const [monoNode, serifNode] = await Promise.all([
    fs.readFile(path.join(FONTS_DIR, "JetBrainsMono-Regular.ttf")),
    fs.readFile(path.join(FONTS_DIR, "SourceSerif4-Regular.otf")),
  ]);
  // Detach from the Buffer pool so two parallel readFile calls cannot share
  // an underlying ArrayBuffer (a Node-version-dependent edge case).
  const toAB = (b: Buffer): ArrayBuffer =>
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
  _cachedFonts = { mono: toAB(monoNode), serif: toAB(serifNode) };
  return _cachedFonts;
}

/** Read a country flag SVG from disk and return a `data:image/svg+xml;base64,…`
 *  URI suitable for `<img src>` inside Satori. Returns `null` (not throws) on
 *  any failure so the OG render degrades to a flag-less panel rather than 500. */
async function loadFlagDataUri(code: string): Promise<string | null> {
  const key = code.toUpperCase();
  const hit = _cachedFlags.get(key);
  if (hit) return hit;
  try {
    const buf = await fs.readFile(path.join(FLAGS_DIR, `${key.toLowerCase()}.svg`));
    const uri = `data:image/svg+xml;base64,${buf.toString("base64")}`;
    _cachedFlags.set(key, uri);
    return uri;
  } catch {
    return null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPercent(count: number, total: number): string {
  if (total <= 0) return "0.00%";
  const pct = (count / total) * 100;
  if (pct < 1) return `${pct.toFixed(2)}%`;
  if (pct < 25) return `${pct.toFixed(1)}%`;
  return `${Math.round(pct)}%`;
}

/** 5-pip mono rarity bar. Map each named band onto a fill count so the bar
 *  reads visually before the caption is parsed. The "Plausible" example in
 *  VIRAL_LOOP_PIVOT.md §1.3 anchors the middle of the scale. */
const PIP_FILLED: Record<RarityBand, number> = {
  Common:              5,
  Plausible:           3,
  Uncommon:            2,
  Rare:                1,
  "Vanishingly rare":  1,
};
function rarityPips(band: RarityBand): string {
  const filled = PIP_FILLED[band];
  return "▆".repeat(filled) + "░".repeat(5 - filled);
}

const MODE_LABELS: Record<string, string> = {
  final_four:      "FINAL FOUR",
  champions_path:  "CHAMPION'S PATH",
  full_bracket:    "FULL BRACKET",
};

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

function heroInkColor(state: string): string {
  if (state === "promoted") return C.promoted;
  if (state === "dead") return C.dead;
  return C.ink;
}

// ── OG JSX — Satori-compatible React element tree ────────────────────────────
// Satori supports a flexbox subset of CSS only. Every <div> with more than
// one child must declare display: flex (or display: none) — failure to do so
// is what crashed PR 0's render and corrupted the download artifact.

interface OGImageProps {
  view: PublicPredictionView;
  flagDataUris: (string | null)[];
}

function OGImage({ view, flagDataUris }: OGImageProps) {
  const pctStr = formatPercent(view.countCurrent, view.total);
  const reading = getRarityBand(view.countCurrent, view.total);
  const oneInN = getOneInN(view.countCurrent, view.total);
  const codes = teamCodesForView(view);
  const modeLabel = MODE_LABELS[view.mode] ?? "SCENARIO";
  const isDead = view.state === "dead";
  const heroColor = heroInkColor(view.state);
  const pips = rarityPips(reading.band);

  // Provenance footer — single-line, ISBN-style. Equal-weight tracking,
  // whitespace-separated, no pipes. Formatted as one string so Satori
  // sees one text child on the footer span.
  const provenance = [
    view.id,
    `MODEL ${view.modelSha.slice(0, 7)}`,
    `N=${view.total.toLocaleString("en-US")}`,
    `45ANALYTICS.COM/P/${view.id.slice(-4)}`,
  ].join("   ");

  // Flag tile sizing — Final Four packs four 32px tiles; single-team modes
  // get one 56px tile. Aspect ratio fixed to 4:3 to match the on-page Flag.
  const isMulti = flagDataUris.length > 1;
  const flagSize = isMulti ? 32 : 56;
  const flagH = Math.round((flagSize * 3) / 4);

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
            fontSize: 22,
            color: C.ink,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
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
          {`TOURNAMENT SCENARIO · ${modeLabel}`}
        </span>
      </div>

      {/* ── Body (two columns + 1px peach divider) ──────────────────────── */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flex: 1,
          padding: "44px 48px 36px 48px",
          gap: 40,
          overflow: "hidden",
        }}
      >
        {/* Left column: flag tile + story line + team-codes strip */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minWidth: 0,
          }}
        >
          {/* Flag tile(s). On a flag-load failure, render an empty 56px box
              so the visual rhythm is preserved. */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: 8,
              marginBottom: 28,
            }}
          >
            {flagDataUris.map((uri, i) =>
              uri ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${codes[i]}-${i}`}
                  src={uri}
                  width={flagSize}
                  height={flagH}
                  style={{
                    border: `1px solid ${C.border}`,
                    objectFit: "cover",
                  }}
                  alt=""
                />
              ) : (
                <div
                  key={`fallback-${i}`}
                  style={{
                    display: "flex",
                    width: flagSize,
                    height: flagH,
                    border: `1px solid ${C.border}`,
                    backgroundColor: C.panel,
                  }}
                />
              ),
            )}
          </div>

          {/* Story line — primary serif moment. 32px gives the ratio hero
              room to breathe at 84pt. */}
          <div
            style={{
              fontFamily: "'Source Serif 4'",
              fontSize: 32,
              lineHeight: 1.3,
              color: C.ink,
              fontWeight: 400,
            }}
          >
            {view.storyLine}
          </div>

          {/* Team-codes strip — Bloomberg WATCHLIST line. Mono, no panel
              background, wide letter-spacing, single line. */}
          {codes.length > 0 ? (
            <div
              style={{
                display: "flex",
                marginTop: "auto",
                paddingTop: 24,
                fontFamily: "'JetBrains Mono'",
                fontSize: 14,
                color: C.soft,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              {codes.join("   ")}
            </div>
          ) : null}
        </div>

        {/* Peach signature rule — the single accent that says "45analytics"
            from across the room. Suppressed on dead state. */}
        {!isDead ? (
          <div
            style={{
              display: "flex",
              width: 1,
              backgroundColor: C.promoted,
              alignSelf: "stretch",
            }}
          />
        ) : null}

        {/* Right column: 1-in-N hero + 5-pip bar + caption + percentage unit */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 320,
            flexShrink: 0,
          }}
        >
          {/* 1 in N — the new hero. Sharers copy this string into the tweet
              body, so it gets the 84pt mono treatment. */}
          <div
            style={{
              fontFamily: "'JetBrains Mono'",
              fontSize: 84,
              lineHeight: 1,
              color: heroColor,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.02em",
              marginBottom: 18,
            }}
          >
            {oneInN}
          </div>

          {/* 5-pip mono rarity bar. Renders a visual reading before the
              caption is parsed. */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "baseline",
              gap: 12,
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono'",
                fontSize: 22,
                color: C.promoted,
                letterSpacing: "0.04em",
              }}
            >
              {pips}
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono'",
                fontSize: 13,
                color: C.soft,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {reading.band}
            </span>
          </div>

          {/* Percentage as the supporting unit. Drops to 48pt — the ratio
              above is the hero, this is the proof. */}
          <div
            style={{
              fontFamily: "'JetBrains Mono'",
              fontSize: 48,
              lineHeight: 1,
              color: C.ink,
              fontVariantNumeric: "tabular-nums",
              marginTop: 18,
              marginBottom: 8,
            }}
          >
            {pctStr}
          </div>

          {/* Denominator — anti-casino discipline: always visible. */}
          <div
            style={{
              fontFamily: "'JetBrains Mono'",
              fontSize: 13,
              color: C.quiet,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {`${view.countCurrent.toLocaleString("en-US")} / ${view.total.toLocaleString("en-US")} sims`}
          </div>
        </div>
      </div>

      {/* ── Footer (ISBN-style provenance, single line) ─────────────────── */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          padding: "16px 48px",
          borderTop: `1px solid ${C.border}`,
          fontFamily: "'JetBrains Mono'",
          fontSize: 11,
          color: C.quiet,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
        }}
      >
        <span>{provenance}</span>
      </div>
    </div>
  );
}

// ── Route handler ─────────────────────────────────────────────────────────────

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

    // Fonts and flags are best-effort. A missing font drops us to Satori
    // defaults; a missing flag renders an empty tile in its slot.
    let fonts: { mono: ArrayBuffer; serif: ArrayBuffer } | null;
    try {
      fonts = await loadFonts();
    } catch (err) {
      console.error("[og] font load failed — rendering with default fonts", err);
      fonts = null;
    }

    const flagCodes = flagCodesForView(view);
    const flagDataUris = await Promise.all(flagCodes.map(loadFlagDataUri));

    return new ImageResponse(
      <OGImage view={view} flagDataUris={flagDataUris} />,
      {
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
      },
    );
  } catch (err) {
    console.error("[og] render failed", err);
    return jsonError(500, "render_failed");
  }
}
