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

export interface PredictionVerificationEmailProps {
  verifyUrl: string;
  predictionId: string; // e.g. "45A-2026-KZ8X"
  rarityBand: string;   // "Common" | "Plausible" | ...; kept loose to avoid type drift
  storyLine: string;    // server-rendered serif sentence
  expiresInHours?: number;
}

// Inline styles mirror VerificationEmail.tsx for cross-client consistency.
// React-email renders these into <style> tags AND inline; either way the
// look matches the daily-brief verification.
const styles = {
  body: {
    backgroundColor: "#F4F1EA",
    color: "#0E0E0E",
    fontFamily:
      "JetBrains Mono, ui-monospace, Menlo, Consolas, monospace",
    margin: 0,
    padding: 0,
  },
  container: {
    backgroundColor: "#F4F1EA",
    margin: "0 auto",
    maxWidth: "560px",
    padding: "32px 24px",
  },
  masthead: {
    color: "#0E0E0E",
    fontSize: "11px",
    letterSpacing: "0.10em",
    textTransform: "uppercase" as const,
    margin: "0 0 24px",
  },
  rule: {
    borderColor: "#C4BEB0",
    borderStyle: "solid",
    borderWidth: "0 0 1px 0",
    margin: "0 0 24px",
  },
  lead: {
    fontFamily: "Source Serif 4, Georgia, ui-serif, serif",
    fontSize: "18px",
    lineHeight: 1.45,
    color: "#0E0E0E",
    margin: "0 0 24px",
  },
  body_text: {
    fontSize: "13px",
    lineHeight: 1.7,
    color: "#5A5A5A",
    margin: "0 0 16px",
  },
  context_block: {
    backgroundColor: "#FCFAF4",
    border: "1px solid #C4BEB0",
    padding: "12px 14px",
    margin: "0 0 24px",
  },
  context_label: {
    fontSize: "10px",
    letterSpacing: "0.10em",
    textTransform: "uppercase" as const,
    color: "#9A968A",
    margin: "0 0 6px",
  },
  context_value_mono: {
    fontFamily:
      "JetBrains Mono, ui-monospace, Menlo, Consolas, monospace",
    fontSize: "13px",
    color: "#0E0E0E",
    margin: "0 0 8px",
  },
  context_value_serif: {
    fontFamily: "Source Serif 4, Georgia, ui-serif, serif",
    fontSize: "15px",
    lineHeight: 1.45,
    color: "#0E0E0E",
    margin: 0,
  },
  cta_wrap: { margin: "24px 0" },
  cta_link: {
    color: "#0E0E0E",
    fontFamily:
      "JetBrains Mono, ui-monospace, Menlo, Consolas, monospace",
    fontSize: "13px",
    fontWeight: 600,
    textDecoration: "underline",
    textUnderlineOffset: "3px",
  },
  raw_url_wrap: {
    backgroundColor: "#FCFAF4",
    border: "1px solid #C4BEB0",
    fontFamily:
      "JetBrains Mono, ui-monospace, Menlo, Consolas, monospace",
    fontSize: "11px",
    lineHeight: 1.5,
    color: "#5A5A5A",
    padding: "10px 12px",
    margin: "0 0 24px",
    wordBreak: "break-all" as const,
  },
  meta: {
    fontSize: "11px",
    color: "#9A968A",
    margin: "8px 0 0",
  },
  disclaimer: {
    fontFamily: "Source Serif 4, Georgia, ui-serif, serif",
    fontStyle: "italic" as const,
    fontSize: "11px",
    color: "#5A5A5A",
    lineHeight: 1.6,
    margin: "16px 0 0",
  },
};

export function PredictionVerificationEmail({
  verifyUrl,
  predictionId,
  rarityBand,
  storyLine,
  expiresInHours = 24,
}: PredictionVerificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Confirm tracking for prediction {predictionId}.
      </Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.masthead}>
            [45A] SCENARIO SIMULATOR
          </Text>
          <Hr style={styles.rule} />

          <Text style={styles.lead}>
            One step to start tracking your prediction.
          </Text>

          <Text style={styles.body_text}>
            You built a prediction in the Tournament Scenario Simulator. Confirm
            this email and we will send you a single notification when the
            scenario becomes impossible, or when the model says it has become
            more likely. No daily brief. No marketing.
          </Text>

          <Section style={styles.context_block}>
            <Text style={styles.context_label}>PREDICTION</Text>
            <Text style={styles.context_value_mono}>{predictionId}</Text>
            {rarityBand ? (
              <>
                <Text style={styles.context_label}>RARITY</Text>
                <Text style={styles.context_value_mono}>{rarityBand}</Text>
              </>
            ) : null}
            {storyLine ? (
              <>
                <Text style={styles.context_label}>SCENARIO</Text>
                <Text style={styles.context_value_serif}>{storyLine}</Text>
              </>
            ) : null}
          </Section>

          <Section style={styles.cta_wrap}>
            <Link href={verifyUrl} style={styles.cta_link}>
              CONFIRM TRACKING &rarr;
            </Link>
          </Section>

          <Text style={styles.body_text}>
            If the link does not open, paste this URL into your browser:
          </Text>
          <Text style={styles.raw_url_wrap}>{verifyUrl}</Text>

          <Text style={styles.meta}>
            This link expires in {expiresInHours} hours. If you did not request
            this, you can ignore this email and no account will be created.
          </Text>

          <Hr style={{ ...styles.rule, margin: "24px 0 16px" }} />

          <Text style={styles.disclaimer}>
            45analytics publishes probabilistic estimates and model-versus-market
            divergences. Nothing in this email is advice of any kind.
            Probabilities are subject to revision as new data arrives.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default PredictionVerificationEmail;
