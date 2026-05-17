import { describe, expect, it } from "vitest";
import { render } from "@react-email/render";
import {
  CalibrationDigestEmail,
  type CalibrationDigestTransition,
} from "@/emails/CalibrationDigestEmail";

const TRANSITIONS: CalibrationDigestTransition[] = [
  {
    predictionId: "45A-2026-AAAA",
    mode: "final_four",
    storyLine: "Spain, France, Argentina, Morocco in the semifinals.",
    previousState: "alive",
    newState: "dead",
    reason: "GER eliminated in R32 vs ITA (0-2). Scenario contradicted.",
    permalinkUrl: "https://45analytics.com/scenario/p/45A-2026-AAAA",
  },
  {
    predictionId: "45A-2026-BBBB",
    mode: "champions_path",
    storyLine: "Argentina's path to the final.",
    previousState: "alive",
    newState: "promoted",
    reason: "ARG R16 W confirmed. Scenario promoted.",
    permalinkUrl: "https://45analytics.com/scenario/p/45A-2026-BBBB",
  },
  {
    predictionId: "45A-2026-CCCC",
    mode: "full_bracket",
    storyLine: "A full bracket call submitted on 2026-06-10.",
    previousState: "promoted",
    newState: "dead",
    reason: "POR lost in QF (1-2). Scenario contradicted.",
    permalinkUrl: "https://45analytics.com/scenario/p/45A-2026-CCCC",
  },
];

const SAMPLE_PROPS = {
  digestDate: "2026-06-15",
  subscriberEmail: "operator@example.test",
  transitions: TRANSITIONS,
  deskUrl: "https://45analytics.com/me",
  methodologyUrl: "https://45analytics.com/methodology",
  unsubscribeUrl:
    "https://45analytics.com/api/unsubscribe?u=fixture-u-not-a-real-token&s=fixture-s-not-a-real-sig",
};

describe("<CalibrationDigestEmail />: snapshot", () => {
  it("renders an HTML output that matches the committed snapshot", async () => {
    const html = await render(CalibrationDigestEmail(SAMPLE_PROPS));
    expect(html).toMatchSnapshot();
  });

  it("renders a plain-text output that matches the committed snapshot", async () => {
    const text = await render(CalibrationDigestEmail(SAMPLE_PROPS), {
      plainText: true,
    });
    expect(text).toMatchSnapshot();
  });
});

describe("<CalibrationDigestEmail />: content invariants", () => {
  it("contains no exclamation marks in user-visible copy", async () => {
    const text = await render(CalibrationDigestEmail(SAMPLE_PROPS), {
      plainText: true,
    });
    expect(text).not.toContain("!");
  });

  it("contains no betting or sentiment vocabulary", async () => {
    const text = await render(CalibrationDigestEmail(SAMPLE_PROPS), {
      plainText: true,
    });
    const lower = text.toLowerCase();
    // Spot-check forbidden surface vocabulary. The reason strings come
    // verbatim from prediction_state_log, which already passed the
    // checkpoint-13 vocabulary self-check; this guards the template
    // chrome (eyebrow, headline, CTAs, footer copy) against drift.
    const banned = [
      "great",
      "nice",
      "tough",
      "luck",
      "sorry",
      "congrats",
      "moneyline",
      "parlay",
      "value bet",
    ];
    for (const word of banned) {
      expect(lower).not.toContain(word);
    }
  });

  it("uses the locked email design system tokens", async () => {
    const html = await render(CalibrationDigestEmail(SAMPLE_PROPS));
    expect(html).toContain("#F4F1EA"); // cream body / container background
    expect(html).toContain("#0E0E0E"); // ink primary text
    expect(html).toContain("#C4BEB0"); // hairline rule
    expect(html).toContain("JetBrains Mono");
    expect(html).toContain("Source Serif 4");
  });

  it("renders the LEGAL_DISCLAIMER verbatim (load-bearing fragments)", async () => {
    const text = await render(CalibrationDigestEmail(SAMPLE_PROPS), {
      plainText: true,
    });
    expect(text).toContain("45analytics is a research project");
    expect(text).toContain("Past divergences do");
    expect(text).toContain("model outputs published for academic");
  });

  it("includes a transition arrow between previous and new state", async () => {
    const text = await render(CalibrationDigestEmail(SAMPLE_PROPS), {
      plainText: true,
    });
    // The →-glyph survives plain-text rendering as the literal arrow.
    expect(text).toContain("ALIVE");
    expect(text).toContain("DEAD");
    expect(text).toContain("PROMOTED");
    expect(text).toContain("→"); // RIGHTWARDS ARROW (→)
    expect(text).toContain("ALIVE → DEAD");
    expect(text).toContain("ALIVE → PROMOTED");
    expect(text).toContain("PROMOTED → DEAD");
  });

  it("renders mode labels in uppercase", async () => {
    const text = await render(CalibrationDigestEmail(SAMPLE_PROPS), {
      plainText: true,
    });
    expect(text).toContain("FINAL FOUR");
    expect(text).toContain("CHAMPION'S PATH");
    expect(text).toContain("FULL BRACKET");
  });

  it("renders state labels uppercase around the transition arrow", async () => {
    // Reason strings (sourced verbatim from prediction_state_log) may
    // legitimately contain the lowercase words "promoted", "dead", etc.
    // The constraint is that the LABELS adjacent to the arrow are
    // uppercase, not that the words never appear lowercase.
    const text = await render(CalibrationDigestEmail(SAMPLE_PROPS), {
      plainText: true,
    });
    expect(text).not.toMatch(/\balive\s*→/);
    expect(text).not.toMatch(/→\s*dead\b/);
    expect(text).not.toMatch(/→\s*promoted\b/);
  });

  it("includes a permalink URL per transition", async () => {
    const text = await render(CalibrationDigestEmail(SAMPLE_PROPS), {
      plainText: true,
    });
    for (const t of TRANSITIONS) {
      expect(text).toContain(t.permalinkUrl);
    }
  });

  it("includes the forecast-desk URL", async () => {
    const text = await render(CalibrationDigestEmail(SAMPLE_PROPS), {
      plainText: true,
    });
    expect(text).toContain(SAMPLE_PROPS.deskUrl);
  });

  it("includes the methodology URL", async () => {
    const text = await render(CalibrationDigestEmail(SAMPLE_PROPS), {
      plainText: true,
    });
    expect(text).toContain(SAMPLE_PROPS.methodologyUrl);
  });

  it("includes the masthead [45A] FORECAST DESK eyebrow", async () => {
    const text = await render(CalibrationDigestEmail(SAMPLE_PROPS), {
      plainText: true,
    });
    expect(text).toContain("[45A] FORECAST DESK");
    expect(text).toContain("DAILY UPDATE");
    expect(text).toContain(SAMPLE_PROPS.digestDate);
  });

  it("includes the locked one-click unsubscribe affordance", async () => {
    const text = await render(CalibrationDigestEmail(SAMPLE_PROPS), {
      plainText: true,
    });
    expect(text).toContain("[ Unsubscribe in one click ]");
    expect(text).toContain(SAMPLE_PROPS.unsubscribeUrl);
  });

  it("includes the per-transition [ View this forecast ] CTA", async () => {
    const text = await render(CalibrationDigestEmail(SAMPLE_PROPS), {
      plainText: true,
    });
    // One occurrence per transition.
    const matches = text.match(/\[ View this forecast/g) ?? [];
    expect(matches.length).toBe(TRANSITIONS.length);
  });

  it("uses no em-dashes or en-dashes anywhere in the rendered output", async () => {
    const text = await render(CalibrationDigestEmail(SAMPLE_PROPS), {
      plainText: true,
    });
    expect(text).not.toContain("—"); // EM DASH
    expect(text).not.toContain("–"); // EN DASH
  });

  it("uses the singular subject pattern for one transition and plural for many", async () => {
    // Tested via the body's lead line, which mirrors the subject builder.
    const single = await render(
      CalibrationDigestEmail({
        ...SAMPLE_PROPS,
        transitions: [TRANSITIONS[0]],
      }),
      { plainText: true },
    );
    expect(single).toContain("1 forecast on your desk changed state");

    const many = await render(CalibrationDigestEmail(SAMPLE_PROPS), {
      plainText: true,
    });
    expect(many).toContain(
      `${TRANSITIONS.length} forecasts on your desk changed state`,
    );
  });
});
