/**
 * Daily Instagram share card (1080x1350, feed 4:5).
 *
 * Rendered by /api/og/daily via `next/og` ImageResponse (Satori). This
 * module owns the JSX and the design tokens so the route stays a thin
 * data-loading shell. It reuses the dark token set, the font loader, and
 * the flag loader from scenarioOG.tsx, so the daily card cannot drift from
 * the rest of the site's social artifacts.
 *
 * Two variants share one layout:
 *   - "recap"   : real final scores plus the probability the model gave the
 *                 result, with a champion calibration strip in the footer.
 *   - "preview" : the model's modal scoreline and top 1X2 outcome.
 *
 * Framing is strictly calibration-led: the 1X2 bar, the modal scoreline and
 * the calibration notes are model output, never market lines or betting
 * edges. The market column is intentionally pending and absent here.
 *
 * Satori supports a flexbox subset of CSS only; colors must be literal hex
 * (no CSS variables, oklch, or color-mix). The hex values mirror the dark
 * canvas tokens in globals.css and the live MatchesBrowser 1X2 bar.
 */
import type { DailyVariant, ScorelineChip } from "@/lib/data/dailyShareCard";

// ── Design tokens (mirror the dark canvas in globals.css). ───────────────────

export const DAILY_C = {
  bg:     "#0F1216", // --bg-root (dark)
  panel:  "#151A21", // --bg-panel (dark)
  border: "#262D37", // --border-subtle (dark)
  ink:    "#EEE8DD", // --text-primary (dark)
  soft:   "#A8AFBC", // --text-tertiary (dark)
  quiet:  "#6D7585", // --text-quiet (dark)
  // 1X2 bar, mirroring the live MatchesBrowser ProbabilityBar:
  home:   "#F9B88A", // --prism-peach
  draw:   "#F5D76E", // --prism-sun
  away:   "#7ED0E8", // --prism-cyan
  // Top-3 scoreline strip (preview only):
  slPanel:     "#11161D", // mini-card panel, a shade under the row panel
  slInk:       "#D7DEE5", // neutral scoreline number (#2 and #3)
  green:       "#88E0B6", // #1 scoreline emphasis
  slBorderTop: "#24332A", // green-tinted border on the #1 mini-card
} as const;

const VARIANT_LABEL: Record<DailyVariant, string> = {
  recap:   "Resultados",
  preview: "Por jugar hoy",
};

// ── Per-row model ────────────────────────────────────────────────────────────

export interface DailyRow {
  homeName: string;
  awayName: string;
  /** Flag data URIs (data:image/svg+xml;base64,...), or null on load failure. */
  homeFlag: string | null;
  awayFlag: string | null;
  p: { H: number; D: number; A: number };
  /** Centre value: "2-0" for a final score; "vs" when absent (recap only). */
  center: string;
  /** Sublabel under the centre value (recap only). */
  centerLabel: string;
  /** One-line calibration note (Spanish), or null when undeterminable. */
  note: string | null;
  /**
   * Top-3 modal scorelines for preview rows. Non-empty switches the row to the
   * preview layout (no centre value, no note, a scoreline strip under the bar);
   * empty keeps the recap layout. Always empty on recap rows.
   */
  scorelines: ScorelineChip[];
}

export interface DailyCardProps {
  variant: DailyVariant;
  dayNumber: number;
  dateLabel: string;
  rows: DailyRow[];
  /** Champion calibration metrics, recap only. */
  metrics: { brier: string; rps: string; n: number } | null;
  /** Shown when the subject day has no matches for the variant. */
  emptyNote: string | null;
}

// ── Row density ────────────────────────────────────────────────────────────────
// The card holds 1 to 6 fixtures on the 1350px canvas. Up to 4 rows use a
// comfortable layout; 5 to 6 (the busiest WC days) switch to a compact one so
// the rows never collide with the footer.

interface RowSizes {
  pad: string;
  gap: number;
  flag: number;
  name: number;
  score: number;
  bar: number;
  pct: number;
  note: number;
  rowGap: number;
  // Top-3 scoreline strip (preview rows):
  slLabel: number; // "marcadores más probables" label
  slLabelMb: number; // label-to-cards gap
  slScore: number; // scoreline number (serif)
  slPct: number; // probability under it (mono)
  slGap: number; // gap between the three mini-cards
  slPad: string; // mini-card vertical padding
}

const COMFORTABLE: RowSizes = {
  pad: "16px 22px",
  gap: 10,
  flag: 46,
  name: 26,
  score: 38,
  bar: 12,
  pct: 14,
  note: 15,
  rowGap: 12,
  slLabel: 12,
  slLabelMb: 7,
  slScore: 26,
  slPct: 14,
  slGap: 10,
  slPad: "8px 0",
};

const COMPACT: RowSizes = {
  pad: "11px 22px",
  gap: 6,
  flag: 38,
  name: 23,
  score: 30,
  bar: 10,
  pct: 13,
  note: 14,
  rowGap: 10,
  slLabel: 11,
  slLabelMb: 5,
  slScore: 22,
  slPct: 12,
  slGap: 8,
  slPad: "5px 0",
};

// The busiest preview days carry 6 fixtures, and each preview row also holds
// the top-3 scoreline strip. A third, tighter tier keeps those rows clear of
// the footer. Recap tops out at 4 played fixtures, so it never reaches here.
const ULTRA: RowSizes = {
  pad: "8px 22px",
  gap: 5,
  flag: 32,
  name: 21,
  score: 28,
  bar: 9,
  pct: 12,
  note: 13,
  rowGap: 8,
  slLabel: 10,
  slLabelMb: 4,
  slScore: 19,
  slPct: 11,
  slGap: 7,
  slPad: "4px 0",
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function FlagTile({ uri, w = 46 }: { uri: string | null; w?: number }) {
  const h = Math.round((w * 3) / 4);
  if (!uri) {
    return (
      <div
        style={{
          display: "flex",
          width: w,
          height: h,
          flexShrink: 0,
          border: `1px solid ${DAILY_C.border}`,
          backgroundColor: DAILY_C.bg,
        }}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={uri}
      width={w}
      height={h}
      alt=""
      style={{
        flexShrink: 0,
        border: `1px solid ${DAILY_C.border}`,
        objectFit: "cover",
      }}
    />
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
        marcadores más probables
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
                backgroundColor: DAILY_C.slPanel,
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

function MatchRow({ row, s }: { row: DailyRow; s: RowSizes }) {
  const { p } = row;
  const total = p.H + p.D + p.A || 1;
  // Preview rows carry a top-3 strip and drop the centre value and the note;
  // recap (and any unpriced preview) keeps the original centre-value layout.
  const showStrip = row.scorelines.length > 0;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: DAILY_C.panel,
        border: `1px solid ${DAILY_C.border}`,
        borderRadius: 8,
        padding: s.pad,
        gap: s.gap,
      }}
    >
      {/* Teams + centre value */}
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
        {/* Home */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            flex: 1,
            minWidth: 0,
          }}
        >
          <FlagTile uri={row.homeFlag} w={s.flag} />
          <span style={{ fontFamily: "'JetBrains Mono'", fontSize: s.name, color: DAILY_C.ink, overflow: "hidden" }}>
            {row.homeName}
          </span>
        </div>

        {/* Centre (recap only; preview drops it for the scoreline strip) */}
        {!showStrip && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: 150,
              flexShrink: 0,
            }}
          >
            <span style={{ fontFamily: "'JetBrains Mono'", fontSize: s.score, lineHeight: 1, color: DAILY_C.ink }}>
              {row.center}
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono'",
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: DAILY_C.quiet,
                marginTop: 5,
              }}
            >
              {row.centerLabel}
            </span>
          </div>
        )}

        {/* Away */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 12,
            flex: 1,
            minWidth: 0,
          }}
        >
          <span
            style={{ fontFamily: "'JetBrains Mono'", fontSize: s.name, color: DAILY_C.ink, overflow: "hidden", textAlign: "right" }}
          >
            {row.awayName}
          </span>
          <FlagTile uri={row.awayFlag} w={s.flag} />
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
        {`L ${Math.round((p.H / total) * 100)}%  ·  E ${Math.round((p.D / total) * 100)}%  ·  V ${Math.round((p.A / total) * 100)}%`}
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

// ── Card ───────────────────────────────────────────────────────────────────────

export function DailyCard({
  variant,
  dayNumber,
  dateLabel,
  rows,
  metrics,
  emptyNote,
}: DailyCardProps) {
  // Up to 4 fixtures use the comfortable layout; 5 switches to compact. A 6-row
  // PREVIEW day also carries the taller scoreline strips, so it drops to the
  // ultra-compact tier to stay above the footer. Recap keeps its original
  // compact tier at 5 to 6 rows so its output never changes.
  const s =
    variant === "preview" && rows.length >= 6
      ? ULTRA
      : rows.length >= 5
        ? COMPACT
        : COMFORTABLE;
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
      {/* Three-colour accent bar (home / draw / away). */}
      <div style={{ display: "flex", flexDirection: "row", height: 16 }}>
        <div style={{ display: "flex", flex: 1, backgroundColor: DAILY_C.home }} />
        <div style={{ display: "flex", flex: 1, backgroundColor: DAILY_C.draw }} />
        <div style={{ display: "flex", flex: 1, backgroundColor: DAILY_C.away }} />
      </div>

      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", padding: "48px 64px 0 64px" }}>
        <span
          style={{
            fontFamily: "'JetBrains Mono'",
            fontSize: 23,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: DAILY_C.quiet,
          }}
        >
          45ANALYTICS.COM · MUNDIAL 2026
        </span>
        <span
          style={{
            fontFamily: "'Source Serif 4'",
            fontSize: 78,
            lineHeight: 1,
            color: DAILY_C.ink,
            marginTop: 14,
          }}
        >
          {`Día ${dayNumber}`}
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono'",
            fontSize: 22,
            color: DAILY_C.soft,
            marginTop: 12,
          }}
        >
          {`${dateLabel} · ${VARIANT_LABEL[variant]}`}
        </span>
      </div>

      {/* Match rows */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          gap: s.rowGap,
          padding: "32px 64px 0 64px",
        }}
      >
        {emptyNote ? (
          <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 22, color: DAILY_C.soft }}>
            {emptyNote}
          </span>
        ) : (
          rows.map((row, i) => <MatchRow key={i} row={row} s={s} />)
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          padding: "24px 64px 44px 64px",
          marginTop: 24,
          borderTop: `1px solid ${DAILY_C.border}`,
        }}
      >
        {variant === "recap" && metrics ? (
          <span style={{ display: "flex", fontFamily: "'JetBrains Mono'", fontSize: 19, color: DAILY_C.ink }}>
            {`Calibración del campeón · Brier ${metrics.brier} · RPS ${metrics.rps} · n ${metrics.n}`}
          </span>
        ) : null}
        <span style={{ display: "flex", fontFamily: "'JetBrains Mono'", fontSize: 15, color: DAILY_C.quiet }}>
          Probabilidades del modelo, calibradas contra resultados reales. La columna de mercado está pendiente.
        </span>
        <span style={{ display: "flex", fontFamily: "'JetBrains Mono'", fontSize: 17, color: DAILY_C.home }}>
          probabilidad, no predicción · 45analytics.com
        </span>
      </div>
    </div>
  );
}
