import { describe, expect, it } from "vitest";
import { render } from "@react-email/render";
import { PredictionVerificationEmail } from "@/emails/PredictionVerificationEmail";

const SAMPLE_PROPS = {
  verifyUrl:
    "https://45analytics.example/api/verify?token=fixture-token-not-a-real-secret&redirect=scenario",
  predictionId: "45A-2026-KZ8X",
  rarityBand: "Uncommon",
  storyLine: "Argentina, Brazil, France, and England in the semifinals.",
  expiresInHours: 24,
};

describe("<PredictionVerificationEmail />: IMPL_PROMPT §18 snapshot", () => {
  it("renders an HTML output that matches the committed snapshot", async () => {
    const html = await render(PredictionVerificationEmail(SAMPLE_PROPS));
    expect(html).toMatchSnapshot();
  });

  it("renders a plain-text output that matches the committed snapshot", async () => {
    const text = await render(
      PredictionVerificationEmail(SAMPLE_PROPS),
      { plainText: true },
    );
    expect(text).toMatchSnapshot();
  });
});

describe("<PredictionVerificationEmail />: content invariants", () => {
  // Content-text invariants are checked against the plain-text render.
  // Plain-text strips the DOCTYPE declaration (whose `<!` legitimately
  // contains `!`), the React-email server-rendering comments
  // (`<!-- -->` interleaved between text segments), and HTML entity
  // escapes (`&amp;` for `&`). Style-presence checks below use HTML.

  it("contains no exclamation marks in user-visible copy (§6.6)", async () => {
    const text = await render(
      PredictionVerificationEmail(SAMPLE_PROPS),
      { plainText: true },
    );
    expect(text).not.toContain("!");
  });

  it("includes the prediction ID, rarity band, and story line as context", async () => {
    const text = await render(
      PredictionVerificationEmail(SAMPLE_PROPS),
      { plainText: true },
    );
    expect(text).toContain(SAMPLE_PROPS.predictionId);
    expect(text).toContain(SAMPLE_PROPS.rarityBand);
    expect(text).toContain(SAMPLE_PROPS.storyLine);
  });

  it("renders the verify URL as both a CTA link and a paste-fallback raw URL", async () => {
    const html = await render(PredictionVerificationEmail(SAMPLE_PROPS));
    // Two occurrences: once in the <a href="..."> CTA, once in the
    // raw-URL block for users whose mail client suppresses links.
    // The raw `&` in the URL is HTML-escaped to `&amp;` in attribute
    // and text positions; count by a unique non-special substring.
    const unique = "token=fixture-token-not-a-real-secret";
    const occurrences = html.split(unique).length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });

  it("uses the existing email design system (cream background, JetBrains Mono, Source Serif 4)", async () => {
    const html = await render(PredictionVerificationEmail(SAMPLE_PROPS));
    // Brutalist palette anchors: same as <VerificationEmail />.
    expect(html).toContain("#F4F1EA"); // cream body / container background
    expect(html).toContain("#0E0E0E"); // ink primary text
    expect(html).toContain("#C4BEB0"); // hairline rule + context-block border
    expect(html).toContain("JetBrains Mono"); // mono masthead and CTA
    expect(html).toContain("Source Serif 4"); // serif lead + storyLine
  });

  it("carries the project's disclaimer copy verbatim", async () => {
    const text = await render(
      PredictionVerificationEmail(SAMPLE_PROPS),
      { plainText: true },
    );
    expect(text).toContain(
      "45analytics publishes probabilistic estimates and",
    );
    expect(text).toContain("Nothing in this email is");
    expect(text).toContain("Probabilities are subject to revision");
  });

  it("declares the 24-hour expiry on the verification link", async () => {
    const text = await render(
      PredictionVerificationEmail(SAMPLE_PROPS),
      { plainText: true },
    );
    // Plain-text rendering collapses React-email's interleaved comments,
    // so "24 hours" is contiguous here even though the HTML output
    // splits it as `<!-- -->24<!-- --> hours`.
    expect(text).toContain("24 hours");
  });

  it("uses the simulator-scoped masthead label, not the daily-brief one", async () => {
    const text = await render(
      PredictionVerificationEmail(SAMPLE_PROPS),
      { plainText: true },
    );
    expect(text).toContain("[45A] SCENARIO SIMULATOR");
    expect(text).not.toContain("[45A] DAILY BRIEF");
  });

  it("omits the rarity context block when rarityBand is empty", async () => {
    const text = await render(
      PredictionVerificationEmail({ ...SAMPLE_PROPS, rarityBand: "" }),
      { plainText: true },
    );
    // "RARITY" label appears only in the optional rarity sub-block.
    expect(text).not.toContain("RARITY");
    // Other context labels remain.
    expect(text).toContain("PREDICTION");
    expect(text).toContain("SCENARIO");
  });

  it("omits the story-line block when storyLine is empty", async () => {
    const text = await render(
      PredictionVerificationEmail({ ...SAMPLE_PROPS, storyLine: "" }),
      { plainText: true },
    );
    // The story-line text from the populated case must not appear.
    expect(text).not.toContain(SAMPLE_PROPS.storyLine);
    // The "SCENARIO" context label appears only inside the optional
    // story-line sub-block; the masthead "[45A] SCENARIO SIMULATOR"
    // also contains the substring "SCENARIO", so we count occurrences:
    // populated case has 2 (masthead + label), empty case has 1 (masthead only).
    const baseline = await render(
      PredictionVerificationEmail(SAMPLE_PROPS),
      { plainText: true },
    );
    const populatedHits = (baseline.match(/SCENARIO/g) ?? []).length;
    const emptyHits = (text.match(/SCENARIO/g) ?? []).length;
    expect(populatedHits).toBe(emptyHits + 1);
    // Prediction label remains regardless.
    expect(text).toContain("PREDICTION");
  });

  it("uses no betting language (sanity check; the prebuild grep is the canonical gate)", async () => {
    const text = await render(
      PredictionVerificationEmail(SAMPLE_PROPS),
      { plainText: true },
    );
    const lower = text.toLowerCase();
    // Spot-check a handful of the §15.2 forbidden surface terms.
    expect(lower).not.toContain("moneyline");
    expect(lower).not.toContain("parlay");
    expect(lower).not.toContain("wager");
    expect(lower).not.toContain("longshot");
  });
});
