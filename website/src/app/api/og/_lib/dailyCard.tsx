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
import type { DailyVariant } from "@/lib/data/dailyShareCard";

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
  /** Centre value: "2-0" for a score or modal scoreline; "vs" when absent. */
  center: string;
  /** Sublabel under the centre value. */
  centerLabel: string;
  /** One-line calibration note (Spanish), or null when undeterminable. */
  note: string | null;
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

function MatchRow({ row, s }: { row: DailyRow; s: RowSizes }) {
  const { p } = row;
  const total = p.H + p.D + p.A || 1;
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

        {/* Centre */}
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

      {/* Calibration note */}
      {row.note ? (
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
  // Up to 4 fixtures use the comfortable layout; 5 to 6 switch to compact so
  // the busiest WC days still fit above the footer.
  const s = rows.length >= 5 ? COMPACT : COMFORTABLE;
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
