/**
 * Shared OG render primitives.
 *
 * Both `/api/og/scenario/[id]` (user prediction permalinks) and
 * `/api/og/promo/[slug]` (curated evergreen promo scenarios) render
 * identical 1200x630 brutalist cards. This module owns the JSX, the
 * design tokens, the font and flag loaders, and the helpers so the two
 * routes cannot drift visually. The only difference between the two
 * surfaces is the content of the provenance footer.
 *
 * The directory is prefixed with `_` so Next.js excludes it from the
 * route resolver (private folder convention).
 */

import path from "node:path";
import fs from "node:fs/promises";

import { getRarityBand } from "@/lib/sim/getRarityBand";
import { getOneInN } from "@/lib/sim/getOneInN";
import type { Mode, PredictionState, RarityBand } from "@/lib/sim/types";

// ── Design tokens (mirrors [data-canvas="simulator"] in globals.css). ────────

export const OG_C = {
  bg:       "#0F1216",
  panel:    "#151A21",
  border:   "#262D37",
  ink:      "#EEE8DD",
  soft:     "#A8AFBC",
  quiet:    "#6D7585",
  promoted: "#F9B88A",
  dead:     "#E76E8A",
} as const;

// ── Asset loaders (cached at module scope). ──────────────────────────────────

const FONTS_DIR = path.join(process.cwd(), "public", "fonts");
const FLAGS_DIR = path.join(process.cwd(), "public", "assets", "flags");

let _cachedFonts: { mono: ArrayBuffer; serif: ArrayBuffer } | null = null;
const _cachedFlags = new Map<string, string>();

export async function loadFonts(): Promise<{ mono: ArrayBuffer; serif: ArrayBuffer }> {
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

/** Read a country flag SVG from disk and return a `data:image/svg+xml;base64,...`
 *  URI suitable for `<img src>` inside Satori. Returns `null` (not throws) on
 *  any failure so the OG render degrades to a flag-less panel rather than 500. */
export async function loadFlagDataUri(code: string): Promise<string | null> {
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

// ── Helpers ──────────────────────────────────────────────────────────────────

export function formatPercent(count: number, total: number): string {
  if (total <= 0) return "0.00%";
  const pct = (count / total) * 100;
  if (pct < 1) return `${pct.toFixed(2)}%`;
  if (pct < 25) return `${pct.toFixed(1)}%`;
  return `${Math.round(pct)}%`;
}

const PIP_FILLED: Record<RarityBand, number> = {
  Common:              5,
  Plausible:           3,
  Uncommon:            2,
  Rare:                1,
  "Vanishingly rare":  1,
};

export function rarityPips(band: RarityBand): string {
  const filled = PIP_FILLED[band];
  return "▆".repeat(filled) + "░".repeat(5 - filled);
}

export const MODE_LABELS: Record<Mode, string> = {
  final_four:      "FINAL FOUR",
  champions_path:  "CHAMPION'S PATH",
  full_bracket:    "FULL BRACKET",
};

function heroInkColor(state: PredictionState): string {
  if (state === "promoted") return OG_C.promoted;
  if (state === "dead") return OG_C.dead;
  return OG_C.ink;
}

// ── Component props ──────────────────────────────────────────────────────────

export interface OGCardProps {
  /** Headline serif sentence on the left column. */
  storyLine: string;
  /** Right-side header label (e.g. "FINAL FOUR"). */
  modeLabel: string;
  /** Pre-loaded flag data URIs, parallel to flagCodes. `null` entries render
   *  a blank tile so the visual rhythm survives a missing asset. */
  flagDataUris: (string | null)[];
  /** Team codes for the bottom Bloomberg-watchlist strip. */
  teamCodes: string[];
  /** Reality Score numerator. */
  count: number;
  /** Reality Score denominator (typically 10,000). */
  total: number;
  /** Prediction lifecycle state. Curated promos always pass `"alive"`. */
  state: PredictionState;
  /** Single-line ISBN-style provenance footer string. */
  provenance: string;
}

// ── OG JSX (Satori supports a flexbox subset of CSS only). ───────────────────

export function OGCard({
  storyLine,
  modeLabel,
  flagDataUris,
  teamCodes,
  count,
  total,
  state,
  provenance,
}: OGCardProps) {
  const pctStr = formatPercent(count, total);
  const reading = getRarityBand(count, total);
  const oneInN = getOneInN(count, total);
  const isDead = state === "dead";
  const heroColor = heroInkColor(state);
  const pips = rarityPips(reading.band);

  // Flag tile sizing. Final Four packs four 32px tiles; single-team modes
  // get one 56px tile.
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
        backgroundColor: OG_C.bg,
        fontFamily: "'JetBrains Mono'",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "24px 48px",
          borderBottom: `1px solid ${OG_C.border}`,
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono'",
            fontSize: 22,
            color: OG_C.ink,
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
            color: OG_C.quiet,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {`TOURNAMENT SCENARIO · ${modeLabel}`}
        </span>
      </div>

      {/* Body (two columns + 1px peach divider) */}
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
          {/* Flag tile(s). On a flag-load failure, render an empty box so the
              visual rhythm is preserved. */}
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
                  key={`${teamCodes[i] ?? "x"}-${i}`}
                  src={uri}
                  width={flagSize}
                  height={flagH}
                  style={{
                    border: `1px solid ${OG_C.border}`,
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
                    border: `1px solid ${OG_C.border}`,
                    backgroundColor: OG_C.panel,
                  }}
                />
              ),
            )}
          </div>

          {/* Story line (primary serif moment). */}
          <div
            style={{
              fontFamily: "'Source Serif 4'",
              fontSize: 32,
              lineHeight: 1.3,
              color: OG_C.ink,
              fontWeight: 400,
            }}
          >
            {storyLine}
          </div>

          {/* Team-codes strip (Bloomberg WATCHLIST line). */}
          {teamCodes.length > 0 ? (
            <div
              style={{
                display: "flex",
                marginTop: "auto",
                paddingTop: 24,
                fontFamily: "'JetBrains Mono'",
                fontSize: 14,
                color: OG_C.soft,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              {teamCodes.join("   ")}
            </div>
          ) : null}
        </div>

        {/* Peach signature rule. Suppressed on dead state. */}
        {!isDead ? (
          <div
            style={{
              display: "flex",
              width: 1,
              backgroundColor: OG_C.promoted,
              alignSelf: "stretch",
            }}
          />
        ) : null}

        {/* Right column: 1-in-N hero + 5-pip bar + percentage + denominator */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 320,
            flexShrink: 0,
          }}
        >
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
                color: OG_C.promoted,
                letterSpacing: "0.04em",
              }}
            >
              {pips}
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono'",
                fontSize: 13,
                color: OG_C.soft,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {reading.band}
            </span>
          </div>

          <div
            style={{
              fontFamily: "'JetBrains Mono'",
              fontSize: 48,
              lineHeight: 1,
              color: OG_C.ink,
              fontVariantNumeric: "tabular-nums",
              marginTop: 18,
              marginBottom: 8,
            }}
          >
            {pctStr}
          </div>

          <div
            style={{
              fontFamily: "'JetBrains Mono'",
              fontSize: 13,
              color: OG_C.quiet,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {`${count.toLocaleString("en-US")} / ${total.toLocaleString("en-US")} sims`}
          </div>
        </div>
      </div>

      {/* Footer (ISBN-style provenance, single line). */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          padding: "16px 48px",
          borderTop: `1px solid ${OG_C.border}`,
          fontFamily: "'JetBrains Mono'",
          fontSize: 11,
          color: OG_C.quiet,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
        }}
      >
        <span>{provenance}</span>
      </div>
    </div>
  );
}

// ── Shared ImageResponse font config ─────────────────────────────────────────

export function fontsToImageResponseOptions(
  fonts: { mono: ArrayBuffer; serif: ArrayBuffer } | null,
) {
  if (!fonts) return {};
  return {
    fonts: [
      {
        name: "JetBrains Mono",
        data: fonts.mono,
        style: "normal" as const,
        weight: 400 as const,
      },
      {
        name: "Source Serif 4",
        data: fonts.serif,
        style: "normal" as const,
        weight: 400 as const,
      },
    ],
  };
}
