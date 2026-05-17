/**
 * Daily Brief: react-email template (Surface 5 in the design briefs).
 *
 * Renders a full daily-brief artifact (BriefSample) into both an HTML
 * payload and a plain-text payload for Resend dispatch. Same component is
 * also re-rendered as a Next.js page at `/briefs/[date]` (the web view of
 * a past issue): that is why the masthead, divergence table, etc. live
 * here rather than in the page route.
 *
 * Layout (top to bottom, mirrors the original brief):
 *   1. Masthead (45ANALYTICS / RESEARCH BRIEF, issue + date)
 *   2. Reproducibility block (model_variant, code_sha, data_sha, mc_runs)
 *   3. Headline (serif summary line + graphite movers line)
 *   4. Top divergences (data table, stacked cards on mobile)
 *   5. Tournament probability movers
 *   6. Volatility gate panel (renders only if suppressions are non-empty)
 *   7. Methodology footer (three columns)
 *   8. Disclaimer (verbatim, italic serif)
 *   9. Unsubscribe footer
 *
 * Aesthetic constraints honored from the original brief:
 * - three font families only (JetBrains Mono, Source Serif 4, Inter)
 * - hairline borders, no shadows, radius cap of 2px
 * - tabular numerals on every probability and bps cell
 * - ASCII / Unicode glyphs only (▲ ▼ ✓ ⚠ ◆ →); no SVG icons
 * - pipes (`|`) as separators, never em or en dashes
 * - verbatim disclaimer
 */

import {
  Body,
  Column,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import type { BriefSample, BriefDivergence, BriefMover } from "@/lib/brief";
import { COUNTRY_NAMES } from "@/lib/flags/countries";
import { LEGAL_DISCLAIMER } from "./_disclaimer";

const NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  (Object.entries(COUNTRY_NAMES) as [string, string][]).map(([code, name]) => [
    name,
    code,
  ]),
);

function teamCode(name: string): string {
  return NAME_TO_CODE[name] ?? name.toUpperCase().slice(0, 3);
}

function pct(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}

function formatEdge(bps: number, direction: "positive" | "negative"): string {
  const sign = direction === "positive" ? "+" : "-";
  return `${sign}${Math.abs(bps)} bps`;
}

function formatKickoffUtc(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

function formatDelta(bps: number): string {
  const sign = bps >= 0 ? "+" : "-";
  const glyph = bps >= 0 ? "▲" : "▼";
  return `${glyph} ${sign}${Math.abs(bps)} bps`;
}

// ─── Tokens (light theme: the design-canvas v2 brief palette) ──────────────

const PALETTE = {
  bg: "#F4F1EA",
  bgElev: "#FCFAF4",
  ink: "#0A0A0A",
  graphite: "#5A5A5A",
  graphiteQuiet: "#9A968A",
  hairline: "#C4BEB0",
  edgePositive: "#0F5F4E",
  edgeNegative: "#7A1F1F",
  suppression: "#8A6A1F",
} as const;

const FONTS = {
  mono: "JetBrains Mono, IBM Plex Mono, ui-monospace, Menlo, Consolas, monospace",
  serif: "Source Serif 4, Source Serif Pro, Georgia, ui-serif, serif",
  sans: "Inter, IBM Plex Sans, system-ui, -apple-system, sans-serif",
} as const;

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = {
  body: {
    backgroundColor: PALETTE.bg,
    color: PALETTE.ink,
    fontFamily: FONTS.sans,
    margin: 0,
    padding: 0,
  } as const,
  container: {
    backgroundColor: PALETTE.bg,
    margin: "0 auto",
    maxWidth: "600px",
    padding: "32px 24px",
  } as const,
  rule: {
    borderColor: PALETTE.hairline,
    borderStyle: "solid",
    borderWidth: "0 0 1px 0",
    margin: "16px 0",
  } as const,
  ruleThick: {
    borderColor: PALETTE.hairline,
    borderStyle: "solid",
    borderWidth: "0 0 1px 0",
    margin: "0 0 8px",
  } as const,

  mastheadWordmark: {
    fontFamily: FONTS.serif,
    fontSize: "20px",
    letterSpacing: "0.02em",
    color: PALETTE.ink,
    margin: 0,
  } as const,
  mastheadLabel: {
    fontFamily: FONTS.mono,
    fontSize: "11px",
    letterSpacing: "0.10em",
    textTransform: "uppercase" as const,
    color: PALETTE.graphite,
    margin: 0,
    textAlign: "right" as const,
  } as const,
  mastheadIssue: {
    fontFamily: FONTS.mono,
    fontSize: "11px",
    letterSpacing: "0.06em",
    color: PALETTE.graphite,
    margin: "6px 0 0",
  } as const,
  mastheadDate: {
    fontFamily: FONTS.mono,
    fontSize: "11px",
    letterSpacing: "0.06em",
    color: PALETTE.ink,
    margin: "6px 0 0",
    textAlign: "right" as const,
  } as const,

  reproRow: {
    fontFamily: FONTS.mono,
    fontSize: "11px",
    color: PALETTE.graphite,
    margin: "2px 0",
    fontVariantNumeric: "tabular-nums" as const,
  } as const,
  reproKey: {
    color: PALETTE.graphite,
    width: "140px",
  } as const,
  reproValue: {
    color: PALETTE.ink,
  } as const,

  headlineSerif: {
    fontFamily: FONTS.serif,
    fontSize: "18px",
    lineHeight: 1.45,
    color: PALETTE.ink,
    margin: "0 0 8px",
  } as const,
  headlineMovers: {
    fontFamily: FONTS.sans,
    fontSize: "13px",
    lineHeight: 1.5,
    color: PALETTE.graphite,
    margin: 0,
  } as const,

  sectionHead: {
    fontFamily: FONTS.mono,
    fontSize: "11px",
    letterSpacing: "0.10em",
    textTransform: "uppercase" as const,
    color: PALETTE.graphite,
    margin: "0 0 8px",
  } as const,

  tableHead: {
    fontFamily: FONTS.mono,
    fontSize: "10px",
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
    color: PALETTE.graphite,
    padding: "6px 4px",
    borderBottom: `1px solid ${PALETTE.hairline}`,
    fontVariantNumeric: "tabular-nums" as const,
  } as const,
  tableCell: {
    fontFamily: FONTS.mono,
    fontSize: "12px",
    color: PALETTE.ink,
    padding: "6px 4px",
    borderBottom: `1px solid ${PALETTE.hairline}`,
    fontVariantNumeric: "tabular-nums" as const,
  } as const,
  tableCellRight: {
    fontFamily: FONTS.mono,
    fontSize: "12px",
    color: PALETTE.ink,
    padding: "6px 4px",
    borderBottom: `1px solid ${PALETTE.hairline}`,
    textAlign: "right" as const,
    fontVariantNumeric: "tabular-nums" as const,
  } as const,

  moverRow: {
    fontFamily: FONTS.mono,
    fontSize: "12px",
    color: PALETTE.ink,
    margin: "2px 0 0",
    fontVariantNumeric: "tabular-nums" as const,
  } as const,
  moverDriver: {
    fontFamily: FONTS.sans,
    fontSize: "11px",
    color: PALETTE.graphite,
    margin: "0 0 12px",
    lineHeight: 1.5,
  } as const,

  gatePanel: {
    border: `1px solid ${PALETTE.hairline}`,
    padding: "12px",
    margin: "0 0 24px",
    backgroundColor: PALETTE.bgElev,
  } as const,
  gateHeader: {
    fontFamily: FONTS.mono,
    fontSize: "11px",
    letterSpacing: "0.10em",
    textTransform: "uppercase" as const,
    color: PALETTE.suppression,
    margin: "0 0 8px",
  } as const,
  gateRow: {
    fontFamily: FONTS.mono,
    fontSize: "11px",
    color: PALETTE.graphite,
    margin: "2px 0",
    fontVariantNumeric: "tabular-nums" as const,
  } as const,

  methodologyHeader: {
    fontFamily: FONTS.mono,
    fontSize: "11px",
    letterSpacing: "0.10em",
    textTransform: "uppercase" as const,
    color: PALETTE.graphite,
    margin: "0 0 4px",
  } as const,
  methodologyLink: {
    fontFamily: FONTS.mono,
    fontSize: "11px",
    color: PALETTE.ink,
    textDecoration: "underline",
    textUnderlineOffset: "2px",
    textDecorationColor: PALETTE.hairline,
  } as const,

  disclaimerWrap: {
    border: `1px solid ${PALETTE.hairline}`,
    borderTop: "none",
    padding: "12px 16px",
    margin: "16px 0",
  } as const,
  disclaimerText: {
    fontFamily: FONTS.serif,
    fontStyle: "italic" as const,
    fontSize: "11px",
    lineHeight: 1.6,
    color: PALETTE.graphite,
    margin: 0,
  } as const,

  footer: {
    fontFamily: FONTS.mono,
    fontSize: "10px",
    color: PALETTE.graphite,
    textAlign: "center" as const,
    margin: "8px 0",
    fontVariantNumeric: "tabular-nums" as const,
  } as const,
  footerLink: {
    color: PALETTE.graphite,
    textDecoration: "underline",
    textUnderlineOffset: "2px",
  } as const,

  belowTableCount: {
    fontFamily: FONTS.sans,
    fontSize: "11px",
    color: PALETTE.graphite,
    margin: "8px 0 24px",
    lineHeight: 1.5,
  } as const,
} as const;

// ─── Mobile @media overrides: collapse table to stacked cards under 500px ──

const MOBILE_CSS = `
@media only screen and (max-width: 500px) {
  .brief-table-row,
  .brief-table-cell {
    display: block !important;
    width: 100% !important;
    box-sizing: border-box !important;
  }
  .brief-table-row {
    border-bottom: 1px solid ${PALETTE.hairline} !important;
    padding: 12px 0 !important;
  }
  .brief-table-cell {
    border-bottom: none !important;
    padding: 2px 0 !important;
    text-align: left !important;
  }
  .brief-table-cell::before {
    content: attr(data-label) " ";
    color: ${PALETTE.graphite};
    font-size: 10px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding-right: 6px;
  }
  .brief-table-head {
    display: none !important;
  }
  .brief-repro-cell {
    display: inline-block !important;
    margin-right: 8px !important;
  }
  .brief-methodology-col {
    display: block !important;
    width: 100% !important;
    margin-bottom: 12px !important;
  }
}
`;

// ─── Component ──────────────────────────────────────────────────────────────

export interface DailyBriefEmailProps {
  brief: BriefSample;
  /**
   * Subscriber-side envelope. Omitted when the template is rendered as a
   * standalone web page at `/briefs/[date]`; the unsubscribe footer falls
   * back to a "subscribe at /brief" prompt in that case.
   */
  subscriber?: {
    email: string;
    unsubscribe_url: string;
  };
  /**
   * Absolute origin used to build links in the email (logo, methodology,
   * archive). When omitted the links go to relative paths, which Apple Mail
   * and Gmail will silently break; supply this for production sends.
   */
  siteUrl?: string;
}

export function DailyBriefEmail({
  brief,
  subscriber,
  siteUrl,
}: DailyBriefEmailProps) {
  const issueLabel = String(brief.issue_number).padStart(3, "0");
  const previewText = `${brief.headline.summary_line} | ${brief.headline.movers_line}`;

  const aboveThreshold = brief.top_divergences.filter(
    (d) => Math.abs(d.edge_bps) >= 300,
  );
  const suppressedCount = brief.top_divergences.filter(
    (d) => d.volatility_gate.triggered,
  ).length;
  const hasSuppressions = brief.suppressed_today.length > 0;

  const buildLink = (href: string): string => {
    if (!href) return "#";
    if (/^https?:\/\//i.test(href)) return href;
    if (!siteUrl) return href;
    return `${siteUrl.replace(/\/$/, "")}${href.startsWith("/") ? href : `/${href}`}`;
  };

  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <style>{MOBILE_CSS}</style>
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* ── Section 1: Masthead ───────────────────────────────────── */}
          <Hr style={styles.ruleThick} />
          <Section>
            <Row>
              <Column>
                <Text style={styles.mastheadWordmark}>45ANALYTICS</Text>
              </Column>
              <Column>
                <Text style={styles.mastheadLabel}>RESEARCH BRIEF</Text>
              </Column>
            </Row>
            <Row>
              <Column>
                <Text style={styles.mastheadIssue}>
                  ISSUE No. {issueLabel}
                </Text>
              </Column>
              <Column>
                <Text style={styles.mastheadDate}>
                  {brief.brief_date} UTC
                </Text>
              </Column>
            </Row>
          </Section>
          <Hr style={styles.rule} />

          {/* ── Section 2: Reproducibility block ───────────────────────── */}
          <Section>
            <ReproRow label="MODEL_VARIANT" value={brief.model_variant} />
            <ReproRow label="CODE_SHA" value={brief.code_sha.slice(0, 7)} />
            <ReproRow
              label="DATA_SHA"
              value={brief.data_snapshot_sha.slice(0, 7)}
            />
            <ReproRow
              label="MC_RUNS"
              value={brief.mc_runs.toLocaleString("en-US")}
            />
          </Section>
          <Hr style={styles.rule} />

          {/* ── Section 3: Headline ────────────────────────────────────── */}
          <Section>
            <Text style={styles.headlineSerif}>
              {brief.headline.summary_line}
            </Text>
            <Text style={styles.headlineMovers}>
              {brief.headline.movers_line}
            </Text>
          </Section>
          <Hr style={styles.rule} />

          {/* ── Section 4: Top divergences ─────────────────────────────── */}
          <Section>
            <Text style={styles.sectionHead}>TOP DIVERGENCES</Text>
            {brief.top_divergences.length === 0 ? (
              <EmptyDivergencesPanel />
            ) : (
              <DivergenceTable divergences={brief.top_divergences} />
            )}
            <Text style={styles.belowTableCount}>
              {aboveThreshold.length} divergence
              {aboveThreshold.length === 1 ? "" : "s"} exceeded threshold
              today. {suppressedCount} market
              {suppressedCount === 1 ? "" : "s"} suppressed.{" "}
              <Link
                href={buildLink(brief.methodology_links.this_brief_archive)}
                style={styles.methodologyLink}
              >
                [VIEW ALL ON SITE →]
              </Link>
            </Text>
          </Section>
          <Hr style={styles.rule} />

          {/* ── Section 5: Tournament probability movers ───────────────── */}
          <Section>
            <Text style={styles.sectionHead}>TOURNAMENT MOVERS</Text>
            {brief.tournament_movers.length === 0 ? (
              <Text style={styles.moverDriver}>
                No team probability moved by more than 1% overnight.
              </Text>
            ) : (
              brief.tournament_movers.map((mover) => (
                <MoverBlock key={`${mover.team}-${mover.metric}`} mover={mover} />
              ))
            )}
          </Section>
          <Hr style={styles.rule} />

          {/* ── Section 6: Volatility gate panel (conditional) ─────────── */}
          {hasSuppressions && (
            <Section style={styles.gatePanel}>
              <Text style={styles.gateHeader}>
                ⚠ GATE TRIGGERED | {brief.suppressed_today.length} MARKET
                {brief.suppressed_today.length === 1 ? "" : "S"} SUPPRESSED
              </Text>
              {brief.suppressed_today.map((s) => (
                <Text key={s.match_id + s.rule} style={styles.gateRow}>
                  {brief.brief_date} &nbsp; {s.match_label} &nbsp;{" "}
                  <span style={{ color: PALETTE.suppression }}>
                    {s.rule.toUpperCase()}
                  </span>{" "}
                  &nbsp; {s.reason}
                </Text>
              ))}
            </Section>
          )}

          {/* ── Section 7: Methodology footer ──────────────────────────── */}
          <Section>
            <Row>
              <Column className="brief-methodology-col" style={{ width: "33%" }}>
                <Text style={styles.methodologyHeader}>MODEL CARD</Text>
                <Link
                  href={buildLink(brief.methodology_links.model_card)}
                  style={styles.methodologyLink}
                >
                  /methodology/m-star
                </Link>
              </Column>
              <Column className="brief-methodology-col" style={{ width: "33%" }}>
                <Text style={styles.methodologyHeader}>DEVIG METHOD</Text>
                <Link
                  href={buildLink(brief.methodology_links.devig_method)}
                  style={styles.methodologyLink}
                >
                  /methodology/power-devig
                </Link>
              </Column>
              <Column className="brief-methodology-col" style={{ width: "33%" }}>
                <Text style={styles.methodologyHeader}>ARCHIVE</Text>
                <Link
                  href={buildLink(brief.methodology_links.this_brief_archive)}
                  style={styles.methodologyLink}
                >
                  /briefs/{brief.brief_date}
                </Link>
              </Column>
            </Row>
          </Section>

          {/* ── Section 8: Disclaimer (verbatim) ───────────────────────── */}
          <Section style={styles.disclaimerWrap}>
            <Text style={styles.disclaimerText}>{LEGAL_DISCLAIMER}</Text>
          </Section>

          {/* ── Section 9: Unsubscribe footer ──────────────────────────── */}
          <Section>
            <Text style={styles.footer}>
              {subscriber ? (
                <>
                  Sent to {subscriber.email} &nbsp;|&nbsp;{" "}
                  <Link
                    href={subscriber.unsubscribe_url}
                    style={styles.footerLink}
                  >
                    [UNSUBSCRIBE]
                  </Link>{" "}
                  &nbsp;|&nbsp;{" "}
                  <Link
                    href={buildLink(brief.methodology_links.this_brief_archive)}
                    style={styles.footerLink}
                  >
                    [WEB VERSION]
                  </Link>
                </>
              ) : (
                <>
                  Reading the web version. &nbsp;|&nbsp;{" "}
                  <Link href={buildLink("/brief")} style={styles.footerLink}>
                    [SUBSCRIBE TO THE DAILY BRIEF]
                  </Link>
                </>
              )}
            </Text>
            <Text style={styles.footer}>
              45analytics &nbsp;|&nbsp; Research Brief &nbsp;|&nbsp; Issue{" "}
              {issueLabel} &nbsp;|&nbsp; {brief.brief_date}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default DailyBriefEmail;

// ─── Subcomponents ──────────────────────────────────────────────────────────

function ReproRow({ label, value }: { label: string; value: string }) {
  return (
    <Row className="brief-repro-cell">
      <Column style={styles.reproKey}>
        <Text style={{ ...styles.reproRow, color: PALETTE.graphite }}>
          {label}
        </Text>
      </Column>
      <Column>
        <Text style={{ ...styles.reproRow, color: PALETTE.ink }}>{value}</Text>
      </Column>
    </Row>
  );
}

function MoverBlock({ mover }: { mover: BriefMover }) {
  const metricLabel =
    mover.metric === "title_probability"
      ? "TITLE PROB"
      : mover.metric === "r16_probability"
        ? "R16 PROB"
        : mover.metric.replace(/_/g, " ").toUpperCase();
  const arrowColor =
    mover.delta_bps >= 0 ? PALETTE.edgePositive : PALETTE.edgeNegative;
  return (
    <>
      <Text style={styles.moverRow}>
        <span style={{ color: PALETTE.ink }}>
          {mover.team.toUpperCase().padEnd(14, " ")}
        </span>
        <span style={{ color: PALETTE.graphite }}>{metricLabel} &nbsp; </span>
        <span style={{ color: PALETTE.ink }}>
          {pct(mover.yesterday)} → {pct(mover.today)}
        </span>
        &nbsp;&nbsp;
        <span style={{ color: arrowColor }}>{formatDelta(mover.delta_bps)}</span>
      </Text>
      <Text style={styles.moverDriver}>{mover.driver}</Text>
    </>
  );
}

function DivergenceTable({ divergences }: { divergences: BriefDivergence[] }) {
  return (
    <table
      cellPadding={0}
      cellSpacing={0}
      width="100%"
      style={{
        borderCollapse: "collapse",
        marginBottom: "8px",
        fontVariantNumeric: "tabular-nums" as const,
      }}
    >
      <thead className="brief-table-head">
        <tr>
          <th style={{ ...styles.tableHead, textAlign: "left" as const }}>
            KICKOFF
          </th>
          <th style={{ ...styles.tableHead, textAlign: "left" as const }}>
            MATCH
          </th>
          <th style={{ ...styles.tableHead, textAlign: "left" as const }}>
            SIDE
          </th>
          <th style={{ ...styles.tableHead, textAlign: "right" as const }}>
            MODEL
          </th>
          <th style={{ ...styles.tableHead, textAlign: "right" as const }}>
            MARKET
          </th>
          <th style={{ ...styles.tableHead, textAlign: "right" as const }}>
            EDGE
          </th>
          <th style={{ ...styles.tableHead, textAlign: "center" as const }}>
            GATE
          </th>
        </tr>
      </thead>
      <tbody>
        {divergences.map((d) => (
          <DivergenceRow key={d.match_id + d.side} d={d} />
        ))}
      </tbody>
    </table>
  );
}

function DivergenceRow({ d }: { d: BriefDivergence }) {
  const triggered = d.volatility_gate.triggered;
  const rowOpacity = triggered ? 0.7 : 1;
  const edgeColor =
    d.edge_direction === "positive"
      ? PALETTE.edgePositive
      : PALETTE.edgeNegative;
  const edgeText = formatEdge(d.edge_bps, d.edge_direction);
  const sideLabel = d.side.toUpperCase();
  const matchLabel = `${teamCode(d.home)} vs ${teamCode(d.away)}`;

  return (
    <tr className="brief-table-row" style={{ opacity: rowOpacity }}>
      <td
        className="brief-table-cell"
        data-label="KICKOFF"
        style={{ ...styles.tableCell, textAlign: "left" }}
      >
        {formatKickoffUtc(d.kickoff_utc)}
      </td>
      <td
        className="brief-table-cell"
        data-label="MATCH"
        style={{ ...styles.tableCell, textAlign: "left" }}
      >
        {matchLabel}
      </td>
      <td
        className="brief-table-cell"
        data-label="SIDE"
        style={{ ...styles.tableCell, color: PALETTE.graphite, textAlign: "left" }}
      >
        {sideLabel}
      </td>
      <td
        className="brief-table-cell"
        data-label="MODEL"
        style={styles.tableCellRight}
      >
        {pct(d.model_prob)}
      </td>
      <td
        className="brief-table-cell"
        data-label="MARKET"
        style={styles.tableCellRight}
      >
        {pct(d.market_prob_devigged)}
      </td>
      <td
        className="brief-table-cell"
        data-label="EDGE"
        style={{ ...styles.tableCellRight, color: edgeColor }}
      >
        {edgeText}
      </td>
      <td
        className="brief-table-cell"
        data-label="GATE"
        style={{
          ...styles.tableCell,
          textAlign: "center",
          color: triggered ? PALETTE.suppression : PALETTE.graphite,
        }}
      >
        {triggered ? "⚠" : "✓"}
      </td>
    </tr>
  );
}

function EmptyDivergencesPanel() {
  return (
    <Section
      style={{
        border: `1px solid ${PALETTE.hairline}`,
        padding: "16px",
        margin: "0 0 12px",
        backgroundColor: PALETTE.bgElev,
      }}
    >
      <Text
        style={{
          fontFamily: FONTS.mono,
          fontSize: "12px",
          letterSpacing: "0.04em",
          color: PALETTE.graphite,
          margin: "0 0 6px",
        }}
      >
        NO DIVERGENCES EXCEEDED THRESHOLD TODAY.
      </Text>
      <Text
        style={{
          fontFamily: FONTS.serif,
          fontSize: "13px",
          lineHeight: 1.5,
          color: PALETTE.ink,
          margin: 0,
        }}
      >
        All 1X2 markets are within ±300 bps of model probability. The next
        nightly run dispatches at 12:00 UTC.
      </Text>
    </Section>
  );
}
