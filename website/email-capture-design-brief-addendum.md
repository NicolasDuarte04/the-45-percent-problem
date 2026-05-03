# Design Brief Addendum: Conversion Mechanics for Surface 1

## Context

The original brief (`email-capture-design-brief.md`) defined the visual identity correctly. You delivered against it. The capture form, however, underspecifies the conversion mechanism: it tells the visitor what the product is (mechanism) without showing them why they would want it (outcome) or what they would actually receive (proof).

This is an additive addendum. The original brief stays in force. Every constraint still applies: no em dashes, no betting advice language, no social proof, no newsletter framing, no SVG icon sets, hairline borders only, three font families, light and dark themes, RFC 8058 unsubscribe, verbatim disclaimer.

Five additions follow. They are specific. Do not redesign the existing surfaces.

## Addition 1: Live data block above the form (Surface 1)

A monospace panel rendered server-side from the same daily brief JSON the email template consumes. Updates daily when the Vercel cron writes the new brief. Reads as terminal output, not as marketing copy.

Reference shape (light theme; mobile compresses naturally):

```
─────────────────────────────────────────────
TODAY  |  2026-06-12 UTC  |  ISSUE 014
─────────────────────────────────────────────

LARGEST DIVERGENCE
United States vs Mexico  HOME
MODEL    42.3%
MARKET   36.0%
EDGE     +630 bps  ▲

NEXT DISPATCH    2026-06-13 12:00 UTC

[VIEW LATEST DISPATCH →]
─────────────────────────────────────────────
```

Empty state (no divergences exceeded threshold today):

```
─────────────────────────────────────────────
TODAY  |  2026-06-12 UTC  |  ISSUE 014
─────────────────────────────────────────────

NO DIVERGENCES EXCEEDED THRESHOLD TODAY
All 1X2 markets within ±300 bps of model.

NEXT DISPATCH    2026-06-13 12:00 UTC

[VIEW LATEST DISPATCH →]
─────────────────────────────────────────────
```

The empty state is a feature, not a fallback. A model that publishes nothing on quiet days reads as more credible than one that manufactures urgency.

JSON contract for the live data block (subset of the daily brief contract, written by the same cron output):

```json
{
  "brief_date": "2026-06-12",
  "issue_number": 14,
  "next_dispatch_utc": "2026-06-13T12:00:00Z",
  "latest_archive_url": "https://45analytics.com/briefs/2026-06-12",
  "teaser": {
    "has_divergence": true,
    "match_label": "United States vs Mexico",
    "side": "HOME",
    "model_prob": 0.423,
    "market_prob": 0.360,
    "edge_bps": 630,
    "edge_direction": "positive"
  }
}
```

Visual treatment: same hairline rules, monospace, tabular figures, edge color rules (forest positive, oxblood negative), and `▲ ▼` glyphs as the email template. Block sits as the topmost element of the capture module on every page where the form appears.

## Addition 2: Audience-defining line (Surface 1)

One line of sans, 12px, graphite, immediately above the eyebrow label `DAILY RESEARCH DISPATCH`:

> For analysts, traders, and researchers studying market efficiency in sports betting markets.

This is the only place on the form where the word "betting" is permitted, and only because it describes the markets being studied, not the activity being recommended. The line filters for the right reader and signals seriousness.

## Addition 3: CTA wording change (Surface 1)

Current button copy: `REQUEST ACCESS`. Implies a gated waitlist that does not exist.

New copy: `RECEIVE DISPATCH`.

Same monospace caps treatment, same button geometry, same hairline border. Lower implied friction. Reads as a verb of receiving, not of applying. The validating state (`VERIFYING ▮▯▯`) and pending state copy stay unchanged.

## Addition 4: Surface 6, Public archive page (`/briefs`)

A new full route. Public list of every past dispatch, fully readable without signup. Reverse chronological. Same masthead structure as the email template. This becomes the trust artifact and the SEO surface.

Reference layout:

```
─────────────────────────────────────────────
45ANALYTICS                  RESEARCH DISPATCH
DISPATCH ARCHIVE                  2026-06-12 UTC
─────────────────────────────────────────────

ISSUE 014   2026-06-12   3 divergences > 300 bps  |  USA vs MEX leads at +630 bps
                                                                       [READ →]
ISSUE 013   2026-06-11   No divergences exceeded threshold.
                                                                       [READ →]
ISSUE 012   2026-06-10   2 divergences > 300 bps  |  BRA vs ARG draw at +410 bps
                                                                       [READ →]
...
```

Each row links to `/briefs/YYYY-MM-DD`, which renders the same `react-email` component as a Next.js route. One issue per day; no pagination in v1; render all rows. Re-evaluate above 200 issues.

The archive index needs no new pipeline work. The data already exists: each dispatch's JSON is written nightly, and `methodology_links.this_brief_archive` (in the existing daily brief contract) points at the rendered page. The index simply lists the directory.

Spec deliverables for Surface 6:

- Index page layout, light and dark, desktop and mobile
- Empty state for the pre-launch period: `No dispatches published yet. First issue lands 2026-06-11 12:00 UTC.`
- Individual issue page reuses the email template; no new design required

## Addition 5: Inline preview link (Surface 1)

The live data block (Addition 1) ends with `[VIEW LATEST DISPATCH →]` linking to the most recent issue at `/briefs/[latest]`. This is the primary lower-commitment CTA for visitors not yet ready to subscribe. The expected path: visitor reads a real sample issue, returns to the form, subscribes.

This link must render even when the form is in `pending verification` state, so a visitor who just signed up can immediately read what they have signed up for.

## What stays unchanged

Every aesthetic rule from the original brief. Every state machine. Every error variant. Every disclaimer placement. The masthead, reproducibility block, top divergences table, tournament movers panel, and volatility gate panel in the email template. The verification flow. The unsubscribe flow. The disclaimer copy verbatim.

## What you must NOT add

Holding the line on the original constraints, with five additional explicit forbids specific to conversion theatre:

- No urgency timers ("Sign up before next dispatch") or countdown clocks
- No subscriber count display ("Join 5,000 readers"), even framed as a fact
- No "as featured in" logo strips or press citations
- No testimonials, even anonymous ones
- No popup, modal, or scroll-triggered overlay versions of the form
- No exit-intent capture
- No "limited beta" framing, invite codes, or referral mechanics
- No animation on the live data block beyond the validating-state bar glyphs already specified

The conversion lift comes from showing the product, not from manufacturing scarcity around it.

## Updated deliverables

In addition to the original deliverables, return:

1. Surface 1 redesigned with all four module additions (live data block, audience line, new CTA wording, inline preview link), light and dark, desktop and mobile, all four form states
2. Live data block empty state variant (no divergences today)
3. Surface 6 (`/briefs` archive index), light and dark, desktop and mobile, populated and empty states
4. Updated copy deck rows for the audience line, the new CTA, and any archive-page strings
5. Confirmation that the live data block JSON contract above renders cleanly in your component

## One-line summary

The form was telling. Now it shows.
