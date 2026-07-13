/**
 * Daily Instagram share card (1080x1350, feed 4:5), World-Cup-branded look.
 *
 * Rendered by /api/og/daily via `next/og` ImageResponse (Satori). This module
 * owns the JSX and the design tokens so the route stays a thin data-loading
 * shell. It reuses the font loader and the flag loader from scenarioOG.tsx, so
 * the daily card cannot drift from the rest of the site's social artifacts.
 *
 * Two variants share one layout:
 *   - "recap"   : real final scores in gold plus the probability the model gave
 *                 the result, with a public-record calibration line (RPS first).
 *   - "preview" : the model's top-3 modal scorelines and a gold favorite chip.
 *
 * Visual language (original, no FIFA marks of any kind):
 *   - Deep navy premium canvas (#0A1730), high contrast.
 *   - A single smooth horizontal gradient band across the very top
 *     (gold -> sunset -> night), rendered via Satori's linear-gradient support.
 *   - Gold (#F2C94C) as the signature accent: the "Day N" title, the favorite's
 *     win percentage, and the 45analytics.com link.
 *   - Circular flag badges; the favorite team's badge gets a gold ring, the
 *     other a light ring.
 *   - An original square-cluster + quarter-circle motif in the header.
 *
 * Framing is strictly calibration-led: the 1X2 bar, the modal scorelines and
 * the calibration notes are model output, never market lines or betting edges.
 * The market column is intentionally pending and absent here.
 *
 * Satori supports a flexbox subset of CSS only; colors must be literal hex
 * (no CSS variables, oklch, or color-mix). Gradients use `backgroundImage`.
 */
import type { DailyVariant, ScorelineChip } from "@/lib/data/dailyShareCard";
import { favorite } from "@/lib/data/dailyShareCard";

// ── Design tokens (deep-navy premium canvas). ────────────────────────────────

export const DAILY_C = {
  bg:      "#0A1730", // deep navy premium canvas
  panel:   "#0F2347", // row card, a step up from the canvas for contrast
  panel2:  "#0C1C3C", // scoreline mini-card, a shade under the row panel
  border:  "#274069", // panel border (navy, visible on the canvas)
  ink:     "#EEF2F8", // primary text
  soft:    "#9FB2CE", // secondary text
  quiet:   "#6E80A0", // tertiary / labels
  gold:    "#F2C94C", // signature accent
  ringFav: "#F2C94C", // favorite flag ring
  ringAlt: "#cfd9e8", // other flag ring
  // 1X2 bar, mirroring the live MatchesBrowser ProbabilityBar:
  home:    "#F9B88A", // --prism-peach
  draw:    "#F5D76E", // --prism-sun
  away:    "#7ED0E8", // --prism-cyan
  // Top-3 scoreline strip (preview only):
  green:       "#88E0B6", // #1 scoreline emphasis
  slInk:       "#D7DEE5", // neutral scoreline number (#2 and #3)
  slBorderTop: "#2E5A47", // green-tinted border on the #1 mini-card
} as const;

// The top band gradient: one smooth sweep, gold into sunset into night.
const TOP_GRADIENT =
  "linear-gradient(90deg, #F2C94C, #FF7A59, #E5468A, #7C5CFF, #2E6BFF)";

// Header eyebrow label under the day number. Recap is always "Results". Preview
// only claims "Playing today" when the subject day is the audience-local today
// (isToday, decided by the route in America/Bogota). A preview pulled forward to
// a later day (e.g. a rest-day roll-forward) reads "Upcoming" instead, with its
// real date already shown alongside, so it never mislabels a future fixture as
// today's.
function variantLabel(variant: DailyVariant, isToday: boolean): string {
  if (variant === "recap") return "Results";
  return isToday ? "Playing today" : "Upcoming";
}

// ── Per-row model ────────────────────────────────────────────────────────────

export interface DailyRow {
  homeName: string;
  awayName: string;
  /** FIFA 3-letter codes, used for the gold favorite chip. */
  homeCode: string;
  awayCode: string;
  /** Flag data URIs (data:image/svg+xml;base64,...), or null on load failure. */
  homeFlag: string | null;
  awayFlag: string | null;
  p: { H: number; D: number; A: number };
  /** Centre value: "2-0" for a final score; "vs" when absent (recap only). */
  center: string;
  /** Sublabel under the centre value (recap only). */
  centerLabel: string;
  /** One-line calibration note, or null when undeterminable. */
  note: string | null;
  /**
   * Top-3 modal scorelines for preview rows. Non-empty switches the row to the
   * preview layout (gold favorite chip in the centre, a scoreline strip under
   * the bar); empty keeps the recap layout (large gold final score). Always
   * empty on recap rows.
   */
  scorelines: ScorelineChip[];
}

export interface DailyCardProps {
  variant: DailyVariant;
  dayNumber: number;
  dateLabel: string;
  /** Whether the subject day is the audience-local today (drives the preview
   * "Playing today" vs "Upcoming" eyebrow). Ignored on recap. */
  isToday: boolean;
  rows: DailyRow[];
  /** Champion calibration metrics, recap only. */
  metrics: { brier: string; rps: string; n: number } | null;
  /** Shown when the subject day has no matches for the variant. */
  emptyNote: string | null;
}

// ── Row density ──────────────────────────────────────────────────────────────
// The card holds 1 to 6 fixtures on the fixed 1350px canvas. The per-match
// block scales with the count so the canvas always fills cleanly: large and
// spacious at 1 to 2, comfortable at 3 to 4, compact at 5, ultra-compact at 6.
// Rows also flex to share the available height (see DailyCard), so a light day
// has no dead space and a heavy day never overflows.

interface RowSizes {
  pad: string;
  gap: number;
  rowGap: number;
  flag: number; // circular badge diameter
  name: number;
  bar: number;
  pct: number;
  note: number;
  score: number; // recap final score (serif, gold)
  chipCode: number; // preview favorite chip code
  chipPct: number; // preview favorite chip percentage
  // Top-3 scoreline strip (preview rows):
  slLabel: number;
  slLabelMb: number;
  slScore: number;
  slPct: number;
  slGap: number;
  slPad: string;
}

// Five presets, largest to smallest. Indexed by `pickTier`.
const XL: RowSizes = {
  pad: "26px 30px", gap: 16, rowGap: 18,
  flag: 80, name: 32, bar: 16, pct: 20, note: 22,
  score: 92, chipCode: 30, chipPct: 23,
  slLabel: 14, slLabelMb: 8, slScore: 36, slPct: 17, slGap: 14, slPad: "13px 0",
};

const L: RowSizes = {
  pad: "20px 26px", gap: 13, rowGap: 14,
  flag: 70, name: 32, bar: 15, pct: 18, note: 20,
  score: 84, chipCode: 28, chipPct: 21,
  slLabel: 13, slLabelMb: 7, slScore: 32, slPct: 15, slGap: 12, slPad: "11px 0",
};

const M: RowSizes = {
  pad: "15px 24px", gap: 10, rowGap: 12,
  flag: 54, name: 27, bar: 12, pct: 15, note: 16,
  score: 54, chipCode: 23, chipPct: 18,
  slLabel: 12, slLabelMb: 6, slScore: 27, slPct: 14, slGap: 10, slPad: "9px 0",
};

const COMPACT: RowSizes = {
  pad: "11px 24px", gap: 7, rowGap: 9,
  flag: 44, name: 23, bar: 10, pct: 13, note: 14,
  score: 42, chipCode: 20, chipPct: 15,
  slLabel: 11, slLabelMb: 5, slScore: 22, slPct: 12, slGap: 8, slPad: "6px 0",
};

const ULTRA: RowSizes = {
  pad: "6px 22px", gap: 4, rowGap: 6,
  flag: 34, name: 20, bar: 8, pct: 11, note: 12,
  score: 30, chipCode: 17, chipPct: 13,
  slLabel: 9, slLabelMb: 3, slScore: 17, slPct: 10, slGap: 6, slPad: "3px 0",
};

const PRESETS: readonly RowSizes[] = [XL, L, M, COMPACT, ULTRA];

/**
 * Density tier for the row count. Both variants scale the same way; preview
 * never uses the single-fixture XL tier because its taller scoreline strip
 * reads better one notch down, so a lone preview fixture uses L.
 */
function pickTier(variant: DailyVariant, n: number): RowSizes {
  let idx: number;
  if (n <= 2) idx = 0;
  else if (n === 3) idx = 1;
  else if (n === 4) idx = 2;
  else if (n === 5) idx = 3;
  else idx = 4;
  if (variant === "preview" && idx === 0) idx = 1;
  return PRESETS[idx];
}

// ── Sub-components ───────────────────────────────────────────────────────────

// Circular flag badge: the square flag image clipped to a disc, with a 2px
// ring. The favorite team's ring is gold; the other is light. A flag-load
// failure renders an empty disc so the visual rhythm survives.
function FlagBadge({ uri, d, ring }: { uri: string | null; d: number; ring: string }) {
  return (
    <div
      style={{
        display: "flex",
        width: d,
        height: d,
        flexShrink: 0,
        borderRadius: d,
        border: `2px solid ${ring}`,
        backgroundColor: DAILY_C.panel2,
        overflow: "hidden",
      }}
    >
      {uri ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={uri}
          width={d}
          height={d}
          alt=""
          style={{ width: d, height: d, borderRadius: d, objectFit: "cover" }}
        />
      ) : null}
    </div>
  );
}

// Gold favorite chip (preview centre): the favored side's code over its win
// percentage, both in gold, inside a gold-outlined pill.
function FavoriteChip({ code, pct, s }: { code: string; pct: string; s: RowSizes }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        flexShrink: 0,
        padding: "6px 16px",
        borderRadius: 10,
        border: `1px solid ${DAILY_C.gold}`,
        backgroundColor: "rgba(242,201,76,0.07)",
      }}
    >
      <span
        style={{
          fontFamily: "'JetBrains Mono'",
          fontSize: Math.round(s.chipCode * 0.46),
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: DAILY_C.quiet,
        }}
      >
        favorite
      </span>
      <span
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "baseline",
          gap: 8,
          marginTop: 3,
        }}
      >
        <span style={{ fontFamily: "'JetBrains Mono'", fontSize: s.chipCode, color: DAILY_C.gold }}>
          {code}
        </span>
        <span style={{ fontFamily: "'Source Serif 4'", fontSize: s.chipPct, color: DAILY_C.gold }}>
          {pct}
        </span>
      </span>
    </div>
  );
}

// Large gold final score (recap centre).
function FinalScore({ value, label, s }: { value: string; label: string; s: RowSizes }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        flexShrink: 0,
        paddingLeft: 12,
        paddingRight: 12,
      }}
    >
      <span style={{ fontFamily: "'Source Serif 4'", fontSize: s.score, lineHeight: 1, color: DAILY_C.gold }}>
        {value}
      </span>
      <span
        style={{
          fontFamily: "'JetBrains Mono'",
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: DAILY_C.quiet,
          marginTop: 6,
        }}
      >
        {label}
      </span>
    </div>
  );
}

// Top-3 modal scorelines: a mono label over three equal-width mini-cards. The
// #1 scoreline is emphasised in green with a green-tinted border; the other two
// use the neutral ink and the normal border. Preview rows only.
function ScorelineStrip({ chips, s }: { chips: ScorelineChip[]; s: RowSizes }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span
        style={{
          display: "flex",
          fontFamily: "'JetBrains Mono'",
          fontSize: s.slLabel,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: DAILY_C.quiet,
          marginBottom: s.slLabelMb,
        }}
      >
        most likely scorelines
      </span>
      <div style={{ display: "flex", flexDirection: "row", gap: s.slGap }}>
        {chips.map((c, i) => {
          const top = i === 0;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                flex: 1,
                backgroundColor: DAILY_C.panel2,
                border: `1px solid ${top ? DAILY_C.slBorderTop : DAILY_C.border}`,
                borderRadius: 8,
                padding: s.slPad,
              }}
            >
              <span
                style={{
                  fontFamily: "'Source Serif 4'",
                  fontSize: s.slScore,
                  lineHeight: 1,
                  color: top ? DAILY_C.green : DAILY_C.slInk,
                }}
              >
                {c.score}
              </span>
              <span
                style={{
                  display: "flex",
                  fontFamily: "'JetBrains Mono'",
                  fontSize: s.slPct,
                  color: DAILY_C.soft,
                  marginTop: 4,
                }}
              >
                {c.pct}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MatchRow({ row, s, grow }: { row: DailyRow; s: RowSizes; grow: boolean }) {
  const { p } = row;
  const total = p.H + p.D + p.A || 1;
  // Preview rows carry a top-3 strip and a gold favorite chip; recap keeps the
  // large gold final score and the calibration note.
  const showStrip = row.scorelines.length > 0;
  const fav = favorite(p, row.homeCode, row.awayCode);
  const homeRing = fav.side === "home" ? DAILY_C.ringFav : DAILY_C.ringAlt;
  const awayRing = fav.side === "away" ? DAILY_C.ringFav : DAILY_C.ringAlt;
  return (
    <div
      style={{
        display: "flex",
        // Satori's Yoga layout defaults flex items' min-height to 0 (unlike a
        // browser's min-height:auto), so a grown row will shrink below its
        // content and collide at high density. Grow rows only when their share
        // of the canvas comfortably exceeds the content (few-fixture days);
        // busy days use natural content height, which fits the canvas.
        flex: grow ? 1 : "0 0 auto",
        flexDirection: "column",
        justifyContent: "center",
        backgroundColor: DAILY_C.panel,
        border: `1px solid ${DAILY_C.border}`,
        borderRadius: 12,
        padding: s.pad,
        gap: s.gap,
      }}
    >
      {/* Teams + centre (favorite chip on preview, final score on recap) */}
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
        {/* Home */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            flex: 1,
            minWidth: 0,
          }}
        >
          <FlagBadge uri={row.homeFlag} d={s.flag} ring={homeRing} />
          <span style={{ fontFamily: "'JetBrains Mono'", fontSize: s.name, color: DAILY_C.ink, overflow: "hidden" }}>
            {row.homeName}
          </span>
        </div>

        {/* Centre */}
        {showStrip ? (
          <FavoriteChip code={fav.code} pct={fav.pct} s={s} />
        ) : (
          <FinalScore value={row.center} label={row.centerLabel} s={s} />
        )}

        {/* Away */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 14,
            flex: 1,
            minWidth: 0,
          }}
        >
          <span
            style={{ fontFamily: "'JetBrains Mono'", fontSize: s.name, color: DAILY_C.ink, overflow: "hidden", textAlign: "right" }}
          >
            {row.awayName}
          </span>
          <FlagBadge uri={row.awayFlag} d={s.flag} ring={awayRing} />
        </div>
      </div>

      {/* 1X2 bar */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          height: s.bar,
          borderRadius: 6,
          overflow: "hidden",
          border: `1px solid ${DAILY_C.border}`,
        }}
      >
        <div style={{ display: "flex", width: `${(p.H / total) * 100}%`, backgroundColor: DAILY_C.home }} />
        <div style={{ display: "flex", width: `${(p.D / total) * 100}%`, backgroundColor: DAILY_C.draw }} />
        <div style={{ display: "flex", width: `${(p.A / total) * 100}%`, backgroundColor: DAILY_C.away }} />
      </div>

      {/* Percentages */}
      <span style={{ display: "flex", fontFamily: "'JetBrains Mono'", fontSize: s.pct, color: DAILY_C.soft }}>
        {`Home ${Math.round((p.H / total) * 100)}%  ·  Draw ${Math.round((p.D / total) * 100)}%  ·  Away ${Math.round((p.A / total) * 100)}%`}
      </span>

      {/* Preview: top-3 scoreline strip. Recap: calibration note. */}
      {showStrip ? (
        <ScorelineStrip chips={row.scorelines} s={s} />
      ) : row.note ? (
        <span style={{ display: "flex", fontFamily: "'JetBrains Mono'", fontSize: s.note, color: DAILY_C.soft }}>
          {row.note}
        </span>
      ) : null}
    </div>
  );
}

// Original header motif: a small cluster of squares in the gradient palette
// plus a quarter-circle. Drawn entirely with divs; no FIFA mark of any kind.
function HeaderMotif() {
  return (
    <div style={{ display: "flex", position: "relative", width: 132, height: 96 }}>
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: 0,
          right: 0,
          width: 66,
          height: 66,
          borderTopLeftRadius: 66,
          backgroundImage: "linear-gradient(135deg, #F2C94C, #FF7A59)",
        }}
      />
      <div
        style={{ display: "flex", position: "absolute", top: 6, right: 80, width: 28, height: 28, backgroundColor: "#E5468A" }}
      />
      <div
        style={{ display: "flex", position: "absolute", top: 44, right: 74, width: 18, height: 18, backgroundColor: "#7C5CFF" }}
      />
      <div
        style={{ display: "flex", position: "absolute", top: 72, right: 16, width: 14, height: 14, backgroundColor: "#2E6BFF" }}
      />
    </div>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────

export function DailyCard({
  variant,
  dayNumber,
  dateLabel,
  isToday,
  rows,
  metrics,
  emptyNote,
}: DailyCardProps) {
  const s = pickTier(variant, rows.length);
  // Rows grow to fill the canvas when their share comfortably exceeds the
  // content. Recap rows are short (a one-line note), so they always fit and
  // always grow. Preview rows carry the taller top-3 strip, so on busy days
  // (5 to 6) they keep natural content height to never collide (see MatchRow).
  // A lone fixture (a late-stage day such as a final) would grow into one tall
  // card with a content island, so instead it stays a dense hero card and the
  // rows column centres it.
  const n = rows.length;
  const grow = n >= 2 && (variant === "recap" || n <= 4);
  const rowsJustify = n === 1 ? "center" : "flex-start";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: DAILY_C.bg,
        fontFamily: "'JetBrains Mono'",
      }}
    >
      {/* Top gradient band: one smooth sweep, gold into sunset into night. */}
      <div style={{ display: "flex", height: 14, backgroundImage: TOP_GRADIENT }} />

      {/* Header */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "44px 64px 0 64px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontFamily: "'JetBrains Mono'",
              fontSize: 23,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: DAILY_C.quiet,
            }}
          >
            45ANALYTICS.COM · WORLD CUP 2026
          </span>
          <span
            style={{
              fontFamily: "'Source Serif 4'",
              fontSize: 80,
              lineHeight: 1,
              color: DAILY_C.gold,
              marginTop: 14,
            }}
          >
            {`Day ${dayNumber}`}
          </span>
          <span
            style={{
              fontFamily: "'JetBrains Mono'",
              fontSize: 22,
              color: DAILY_C.soft,
              marginTop: 12,
            }}
          >
            {`${dateLabel} · ${variantLabel(variant, isToday)}`}
          </span>
        </div>
        <HeaderMotif />
      </div>

      {/* Match rows. Each row flexes to share the available height, so light
          days fill the canvas and heavy days never overflow. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          justifyContent: rowsJustify,
          gap: s.rowGap,
          padding: "30px 64px 0 64px",
        }}
      >
        {emptyNote ? (
          <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 22, color: DAILY_C.soft }}>
            {emptyNote}
          </span>
        ) : (
          rows.map((row, i) => <MatchRow key={i} row={row} s={s} grow={grow} />)
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          padding: "22px 64px 44px 64px",
          marginTop: 22,
          borderTop: `1px solid ${DAILY_C.border}`,
        }}
      >
        {variant === "recap" && metrics ? (
          <span style={{ display: "flex", fontFamily: "'JetBrains Mono'", fontSize: 19, color: DAILY_C.ink }}>
            {`Champion public record · RPS ${metrics.rps} · Brier ${metrics.brier} · ${metrics.n} matches`}
          </span>
        ) : null}
        <span style={{ display: "flex", fontFamily: "'JetBrains Mono'", fontSize: 15, color: DAILY_C.quiet }}>
          Model probabilities · market pending
        </span>
        <span style={{ display: "flex", fontFamily: "'JetBrains Mono'", fontSize: 17, color: DAILY_C.gold }}>
          probability, not prediction · 45analytics.com
        </span>
      </div>
    </div>
  );
}
