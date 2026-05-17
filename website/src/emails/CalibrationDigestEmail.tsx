/**
 * Calibration Digest: react-email template (Checkpoint 14, P1.2).
 *
 * One email per match-day when at least one of a subscriber's predictions
 * changed state since the last cutoff. The dispatcher decides who gets
 * one; this template renders the payload. Design system matches the two
 * production templates already in this folder (cream background, serif
 * lead, mono structure, hairline borders).
 *
 * The body is descriptive, not evaluative: the reason strings are passed
 * through verbatim from prediction_state_log (already brand-compliant per
 * the checkpoint 13 vocabulary self-check). There is no sentiment around
 * a transition; the arrow is the surface.
 */

import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { LEGAL_DISCLAIMER } from "./_disclaimer";

export type CalibrationDigestMode =
  | "final_four"
  | "champions_path"
  | "full_bracket";

export type CalibrationDigestState = "alive" | "dead" | "promoted";

export interface CalibrationDigestTransition {
  predictionId: string;
  mode: CalibrationDigestMode;
  /** Server-rendered serif sentence describing the user's scenario. */
  storyLine: string;
  previousState: CalibrationDigestState;
  newState: CalibrationDigestState;
  /** Descriptive reason from prediction_state_log. Rendered verbatim. */
  reason: string;
  /** Absolute https URL to the permalink page. */
  permalinkUrl: string;
}

export interface CalibrationDigestEmailProps {
  /** YYYY-MM-DD, the digest's nominal date. */
  digestDate: string;
  subscriberEmail: string;
  transitions: CalibrationDigestTransition[];
  /** Absolute https URL to the forecast desk (/me). */
  deskUrl: string;
  /** Absolute https URL to the methodology page. */
  methodologyUrl: string;
  /** Pre-built HMAC-signed unsubscribe URL. */
  unsubscribeUrl: string;
}

// ─── Palette + fonts (mirror DailyBriefEmail / PredictionVerificationEmail) ──

const PALETTE = {
  bg: "#F4F1EA",
  bgElev: "#FCFAF4",
  ink: "#0E0E0E",
  graphite: "#5A5A5A",
  graphiteQuiet: "#9A968A",
  hairline: "#C4BEB0",
  /** Peach used in the OG cards and live gauge: applied to PROMOTED. */
  promoted: "#F9B88A",
} as const;

const FONTS = {
  mono: "JetBrains Mono, IBM Plex Mono, ui-monospace, Menlo, Consolas, monospace",
  serif: "Source Serif 4, Source Serif Pro, Georgia, ui-serif, serif",
  sans: "Inter, IBM Plex Sans, system-ui, -apple-system, sans-serif",
} as const;

const styles = {
  body: {
    backgroundColor: PALETTE.bg,
    color: PALETTE.ink,
    fontFamily: FONTS.mono,
    margin: 0,
    padding: 0,
  } as const,
  container: {
    backgroundColor: PALETTE.bg,
    margin: "0 auto",
    maxWidth: "560px",
    padding: "32px 24px",
  } as const,
  masthead: {
    fontFamily: FONTS.mono,
    color: PALETTE.ink,
    fontSize: "11px",
    letterSpacing: "0.10em",
    textTransform: "uppercase" as const,
    margin: "0 0 8px",
  } as const,
  mastheadDate: {
    fontFamily: FONTS.mono,
    fontSize: "11px",
    letterSpacing: "0.06em",
    color: PALETTE.graphite,
    margin: "0 0 24px",
  } as const,
  rule: {
    borderColor: PALETTE.hairline,
    borderStyle: "solid",
    borderWidth: "0 0 1px 0",
    margin: "0 0 24px",
  } as const,
  lead: {
    fontFamily: FONTS.serif,
    fontSize: "18px",
    lineHeight: 1.45,
    color: PALETTE.ink,
    margin: "0 0 24px",
  } as const,
  transitionWrap: {
    margin: "0 0 24px",
  } as const,
  transitionIndex: {
    fontFamily: FONTS.mono,
    fontSize: "11px",
    letterSpacing: "0.10em",
    textTransform: "uppercase" as const,
    color: PALETTE.graphiteQuiet,
    margin: "0 0 4px",
  } as const,
  transitionMode: {
    fontFamily: FONTS.mono,
    fontSize: "11px",
    letterSpacing: "0.10em",
    textTransform: "uppercase" as const,
    color: PALETTE.ink,
    margin: "0 0 8px",
  } as const,
  transitionStory: {
    fontFamily: FONTS.serif,
    fontSize: "15px",
    lineHeight: 1.45,
    color: PALETTE.ink,
    margin: "0 0 10px",
  } as const,
  transitionArrow: {
    fontFamily: FONTS.mono,
    fontSize: "12px",
    letterSpacing: "0.06em",
    color: PALETTE.ink,
    margin: "0 0 10px",
  } as const,
  transitionReason: {
    fontFamily: FONTS.sans,
    fontSize: "13px",
    lineHeight: 1.6,
    color: PALETTE.graphite,
    margin: "0 0 12px",
  } as const,
  ctaLink: {
    color: PALETTE.ink,
    fontFamily: FONTS.mono,
    fontSize: "13px",
    fontWeight: 600,
    textDecoration: "underline",
    textUnderlineOffset: "3px",
  } as const,
  ctaSecondary: {
    color: PALETTE.graphite,
    fontFamily: FONTS.mono,
    fontSize: "12px",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
  } as const,
  footerRow: {
    margin: "16px 0 0",
  } as const,
  footerMeta: {
    fontFamily: FONTS.mono,
    fontSize: "11px",
    color: PALETTE.graphiteQuiet,
    margin: "0 0 8px",
  } as const,
  methodologyLine: {
    fontFamily: FONTS.mono,
    fontSize: "11px",
    color: PALETTE.graphite,
    margin: "8px 0 0",
  } as const,
  disclaimerWrap: {
    border: `1px solid ${PALETTE.hairline}`,
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
  unsubscribeNote: {
    fontFamily: FONTS.mono,
    fontSize: "11px",
    color: PALETTE.graphiteQuiet,
    lineHeight: 1.6,
    margin: "16px 0 8px",
  } as const,
} as const;

const MODE_LABELS: Record<CalibrationDigestMode, string> = {
  final_four: "FINAL FOUR",
  champions_path: "CHAMPION'S PATH",
  full_bracket: "FULL BRACKET",
};

const STATE_LABELS: Record<CalibrationDigestState, string> = {
  alive: "ALIVE",
  dead: "DEAD",
  promoted: "PROMOTED",
};

function stateColor(state: CalibrationDigestState): string {
  if (state === "dead") return PALETTE.graphiteQuiet;
  if (state === "promoted") return PALETTE.promoted;
  return PALETTE.ink;
}

export function CalibrationDigestEmail({
  digestDate,
  transitions,
  deskUrl,
  methodologyUrl,
  unsubscribeUrl,
}: CalibrationDigestEmailProps) {
  const count = transitions.length;
  const noun = count === 1 ? "forecast" : "forecasts";
  const previewText = `${count} ${noun} on your desk changed state today.`;

  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.masthead}>
            [45A] FORECAST DESK &middot; DAILY UPDATE
          </Text>
          <Text style={styles.mastheadDate}>{digestDate}</Text>
          <Hr style={styles.rule} />

          <Text style={styles.lead}>
            {count} {noun} on your desk changed state.
          </Text>

          {transitions.map((t, idx) => (
            <Section key={t.predictionId} style={styles.transitionWrap}>
              <Hr style={styles.rule} />
              <Text style={styles.transitionIndex}>
                #{idx + 1}
              </Text>
              <Text style={styles.transitionMode}>{MODE_LABELS[t.mode]}</Text>
              <Text style={styles.transitionStory}>{t.storyLine}</Text>
              <Text style={styles.transitionArrow}>
                <span style={{ color: stateColor(t.previousState) }}>
                  {STATE_LABELS[t.previousState]}
                </span>
                {" "}
                &rarr;
                {" "}
                <span style={{ color: stateColor(t.newState) }}>
                  {STATE_LABELS[t.newState]}
                </span>
              </Text>
              <Text style={styles.transitionReason}>{t.reason}</Text>
              <Link href={t.permalinkUrl} style={styles.ctaLink}>
                [ View this forecast &rarr; ]
              </Link>
            </Section>
          ))}

          <Hr style={styles.rule} />

          <Section style={styles.footerRow}>
            <Link href={deskUrl} style={styles.ctaLink}>
              [ View all forecasts &rarr; ]
            </Link>
            <Text style={styles.methodologyLine}>
              View methodology:{" "}
              <Link href={methodologyUrl} style={styles.ctaSecondary}>
                {methodologyUrl}
              </Link>
            </Text>
          </Section>

          <Hr style={{ ...styles.rule, margin: "24px 0 16px" }} />

          <Section style={styles.disclaimerWrap}>
            <Text style={styles.disclaimerText}>{LEGAL_DISCLAIMER}</Text>
          </Section>

          <Hr style={{ ...styles.rule, margin: "16px 0" }} />

          <Text style={styles.unsubscribeNote}>
            You are receiving this email because you armed an alert on a
            forecast at 45analytics.com.
          </Text>
          <Link href={unsubscribeUrl} style={styles.ctaLink}>
            [ Unsubscribe in one click ]
          </Link>
        </Container>
      </Body>
    </Html>
  );
}

export default CalibrationDigestEmail;
