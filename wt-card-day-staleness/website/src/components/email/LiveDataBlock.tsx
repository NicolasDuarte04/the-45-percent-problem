import { loadLatestBrief, type BriefSample } from "@/lib/brief";

const t = {
  ink: "var(--brief-ink)",
  graphite: "var(--brief-graphite)",
  graphiteQuiet: "var(--brief-graphite-quiet)",
  hairline: "var(--brief-hairline)",
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

export interface LiveDataBlockProps {
  data?: BriefSample;
  /**
   * When true, render a small `◆ FALLBACK` chip in the masthead row. Only
   * shows when this prop is true AND the brief's `lead_in.fallback_used`
   * is also true: pages should derive this from a `?debug=fallback`
   * query param so it stays hidden from general readers.
   */
  showFallbackMarker?: boolean;
}

export async function LiveDataBlock({
  data,
  showFallbackMarker = false,
}: LiveDataBlockProps = {}) {
  const brief = data ?? (await loadLatestBrief());
  const renderFallbackMarker =
    showFallbackMarker && brief.lead_in.fallback_used;

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
        {renderFallbackMarker && (
          <span
            title="lead_in.fallback_used = true (debug only; gated behind ?debug=fallback)"
            style={{
              marginLeft: "auto",
              padding: "2px 8px",
              border: `1px solid ${t.hairline}`,
              borderRadius: 2,
              color: t.graphiteQuiet,
              letterSpacing: "0.10em",
            }}
          >
            ◆ FALLBACK
          </span>
        )}
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

      {/* Calibration-led daily summary (no ranked market edge) */}
      <CalibrationSummary moversLine={brief.headline.movers_line} />

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
        <a
          href={brief.latest_archive_url}
          style={{
            color: t.ink,
            textDecoration: "underline",
            textUnderlineOffset: 3,
            textDecorationColor: t.hairline,
          }}
        >
          [VIEW LATEST BRIEF →]
        </a>
      </div>
    </section>
  );
}

function CalibrationSummary({ moversLine }: { moversLine: string }) {
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
        DAILY MODEL OUTPUT
      </div>
      <div
        style={{
          fontFamily: t.fontSans,
          fontSize: 13,
          lineHeight: 1.6,
          color: t.graphite,
        }}
      >
        {moversLine}
      </div>
    </div>
  );
}
