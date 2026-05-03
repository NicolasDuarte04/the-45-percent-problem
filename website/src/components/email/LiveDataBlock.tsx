import { loadSampleBrief, type BriefSample } from "@/lib/brief";

const t = {
  ink: "var(--brief-ink)",
  graphite: "var(--brief-graphite)",
  graphiteQuiet: "var(--brief-graphite-quiet)",
  hairline: "var(--brief-hairline)",
  edgePos: "var(--brief-edge-positive)",
  edgeNeg: "var(--brief-edge-negative)",
  fontMono: "var(--brief-font-mono)",
  fontSans: "var(--brief-font-sans)",
  fontSerif: "var(--brief-font-serif)",
};

function formatNextBrief(iso: string): string {
  const d = new Date(iso);
  const date = d.toISOString().slice(0, 10);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${date}  ${hh}:${mm} UTC`;
}

function pct(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}

function edgeText(bps: number, direction: "positive" | "negative"): string {
  const sign = direction === "positive" ? "+" : "-";
  const glyph = direction === "positive" ? "▲" : "▼";
  return `${sign}${Math.abs(bps)} bps  ${glyph}`;
}

export interface LiveDataBlockProps {
  data?: BriefSample;
}

export function LiveDataBlock({ data }: LiveDataBlockProps = {}) {
  const brief = data ?? loadSampleBrief();
  const hasDivergence = brief.teaser.has_divergence;

  return (
    <section
      aria-label="Today's brief at a glance"
      style={{
        maxWidth: 560,
        margin: "0 0 20px",
        borderTop: `1px solid ${t.hairline}`,
        borderBottom: `1px solid ${t.hairline}`,
        padding: "16px 0",
      }}
    >
      {/* Masthead row */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "baseline",
          flexWrap: "wrap",
          fontFamily: t.fontMono,
          fontSize: 11,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: t.graphite,
          paddingBottom: 14,
          borderBottom: `1px solid ${t.hairline}`,
        }}
      >
        <span>TODAY</span>
        <span style={{ color: t.graphiteQuiet }}>|</span>
        <span style={{ color: t.ink }}>{brief.brief_date} UTC</span>
        <span style={{ color: t.graphiteQuiet }}>|</span>
        <span>
          ISSUE {String(brief.issue_number).padStart(3, "0")}
        </span>
      </div>

      {/* Serif lead-in panel (Addendum v2, Addition 2) */}
      <div style={{ padding: "16px 0 18px" }}>
        <p
          style={{
            fontFamily: t.fontSerif,
            fontSize: 16,
            lineHeight: 1.5,
            color: t.ink,
            margin: "0 0 8px",
          }}
        >
          {brief.lead_in.tournament_sentence}
        </p>
        <p
          style={{
            fontFamily: t.fontSerif,
            fontSize: 16,
            lineHeight: 1.5,
            color: t.ink,
            margin: 0,
          }}
        >
          {brief.lead_in.match_sentence}
        </p>
      </div>

      {/* Mid divider */}
      <div
        aria-hidden
        style={{
          fontFamily: t.fontMono,
          fontSize: 11,
          color: t.graphiteQuiet,
          letterSpacing: "0.20em",
          margin: "0 0 14px",
        }}
      >
        ────
      </div>

      {/* Monospace data block */}
      {hasDivergence ? (
        <DivergencePanel teaser={brief.teaser} />
      ) : (
        <EmptyPanel />
      )}

      {/* Footer row */}
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginTop: 16,
          fontFamily: t.fontMono,
          fontSize: 11,
          letterSpacing: "0.06em",
          color: t.graphite,
        }}
      >
        <span>
          NEXT BRIEF&nbsp;&nbsp;
          <span style={{ color: t.ink }}>
            {formatNextBrief(brief.next_brief_utc)}
          </span>
        </span>
        <span
          aria-disabled="true"
          title="Coming soon"
          style={{
            color: t.graphite,
            textDecoration: "none",
            cursor: "not-allowed",
          }}
        >
          [VIEW LATEST BRIEF →]
        </span>
      </div>
    </section>
  );
}

function DivergencePanel({
  teaser,
}: {
  teaser: Extract<BriefSample["teaser"], { has_divergence: true }>;
}) {
  const isPositive = teaser.edge_direction === "positive";
  const edgeColor = isPositive ? t.edgePos : t.edgeNeg;

  return (
    <div
      style={{
        fontFamily: t.fontMono,
        fontSize: 13,
        lineHeight: 1.7,
        color: t.ink,
        fontFeatureSettings: '"tnum", "cv11"',
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: t.graphite,
          marginBottom: 6,
        }}
      >
        LARGEST DIVERGENCE
      </div>
      <div style={{ marginBottom: 8 }}>
        {teaser.match_label}{" "}
        <span style={{ color: t.graphite }}>{teaser.side}</span>
      </div>
      <DataRow label="MODEL" value={pct(teaser.model_prob)} />
      <DataRow label="MARKET" value={pct(teaser.market_prob)} />
      <DataRow
        label="EDGE"
        value={edgeText(teaser.edge_bps, teaser.edge_direction)}
        valueColor={edgeColor}
      />
      <ProbBars
        modelProb={teaser.model_prob}
        marketProb={teaser.market_prob}
        leadColor={edgeColor}
        modelLeads={isPositive}
      />
    </div>
  );
}

function ProbBars({
  modelProb,
  marketProb,
  leadColor,
  modelLeads,
}: {
  modelProb: number;
  marketProb: number;
  leadColor: string;
  modelLeads: boolean;
}) {
  return (
    <div
      role="presentation"
      aria-hidden
      style={{ display: "grid", gap: 6, marginTop: 12 }}
    >
      <BarRow
        label="MODEL"
        value={modelProb}
        showLead={modelLeads}
        leadFrom={marketProb}
        leadColor={leadColor}
      />
      <BarRow
        label="MARKET"
        value={marketProb}
        showLead={!modelLeads}
        leadFrom={modelProb}
        leadColor={leadColor}
      />
    </div>
  );
}

function BarRow({
  label,
  value,
  showLead,
  leadFrom,
  leadColor,
}: {
  label: string;
  value: number;
  showLead: boolean;
  leadFrom: number;
  leadColor: string;
}) {
  const valuePct = Math.max(0, Math.min(1, value)) * 100;
  const leadStartPct = Math.max(0, Math.min(value, leadFrom)) * 100;
  const leadWidthPct = Math.max(0, value - leadFrom) * 100;
  const showFill = showLead && leadWidthPct > 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span
        style={{
          width: 72,
          fontSize: 11,
          letterSpacing: "0.06em",
          color: t.graphite,
        }}
      >
        {label}
      </span>
      <div
        style={{
          position: "relative",
          flex: 1,
          maxWidth: 320,
          height: 10,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${valuePct}%`,
            border: `1px solid ${t.hairline}`,
            boxSizing: "border-box",
          }}
        />
        {showFill && (
          <div
            style={{
              position: "absolute",
              left: `${leadStartPct}%`,
              width: `${leadWidthPct}%`,
              top: 0,
              bottom: 0,
              background: leadColor,
            }}
          />
        )}
      </div>
    </div>
  );
}

function DataRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <span style={{ width: 72, color: t.graphite }}>{label}</span>
      <span style={{ color: valueColor ?? t.ink }}>{value}</span>
    </div>
  );
}

function EmptyPanel() {
  return (
    <div
      style={{
        fontFamily: t.fontMono,
        fontSize: 13,
        lineHeight: 1.7,
        color: t.ink,
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: t.graphite,
          marginBottom: 6,
        }}
      >
        NO DIVERGENCES EXCEEDED THRESHOLD TODAY
      </div>
      <div style={{ color: t.graphite }}>
        All 1X2 markets within ±300 bps of model.
      </div>
    </div>
  );
}
