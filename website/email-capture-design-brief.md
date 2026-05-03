# Design Brief: 45analytics Email Capture and Daily Brief Email Template

## Brief metadata

- **Audience**: UI/UX Design Agent (you)
- **Output**: Component designs ready for a Next.js engineer to build directly
- **Stack constraints**: Next.js App Router, react-email, Tailwind, Vercel, Resend
- **Tone constraint**: Research dispatch (legally and methodologically) presented through a Quant Desk / Financial Terminal aesthetic
- **Forbidden**: betting advice language, profit claims, "newsletter" framing, rounded-friendly UI

## What 45analytics is (read before designing)

45analytics is a probabilistic pricing framework for the 2026 FIFA World Cup. Each night, a Python pipeline runs 10,000 Monte Carlo simulations on a Bivariate Poisson match model with Dixon-Coles correction, then compares the resulting probability distributions against bookmaker odds (de-vigged via the power method) to surface mispricings called "divergences" or "edges." It is a research artifact, not a betting product. The website surfaces the daily output. The email surface (your job) lets readers receive the daily output in their inbox.

The product position is deliberate: legally and methodologically a research dispatch; visually and tonally a Bloomberg-style quant terminal. Your job is to bridge those two without breaking either.

## Aesthetic mandate: Terminal / Quant Desk

Visual reference points, in order of priority:

1. **Bloomberg Terminal** (monospaced data density, status colors)
2. **Reuters Eikon** (sectioned panels, alphanumeric headers)
3. **Polymarket pre-2024** (probability rendering, sparse chrome)
4. **Stripe documentation** (typographic precision in dense content)
5. **Berkshire Hathaway annual reports** (information seriousness, paper feel)

### Visual rules

**Type system.** A monospace family (JetBrains Mono, IBM Plex Mono, or Berkeley Mono) as the primary face for all data. A high-quality serif (Source Serif Pro, IBM Plex Serif) for the headline section and disclaimers. A grotesk sans (Inter, IBM Plex Sans) for body and UI labels. Use these three only.

**Color palette (two themes, both must ship).**

Light theme:
- Background: `#F4F1EA` (paper)
- Ink: `#0A0A0A`
- Graphite (secondary): `#5A5A5A`
- Hairline: `#C4BEB0`
- Edge positive: `#0F5F4E` (forest)
- Edge negative: `#7A1F1F` (oxblood)
- Suppression: `#8A6A1F` (amber)

Dark theme:
- Background: `#0E0E0E` (charcoal)
- Ink: `#E8E4D8` (parchment)
- Graphite: `#9A968A`
- Hairline: `#3A3833`
- Edge positive: `#3FBC8E`
- Edge negative: `#E0584F`
- Suppression: `#D4A845`

Respect `prefers-color-scheme`. No theme toggle in v1.

**Density.** Pack information. The user should feel they are looking at the output of an institution, not a startup landing page. Whitespace exists for hierarchy, not for breathing room.

**Numerals.** Tabular figures everywhere. Probabilities to one decimal (42.3%) or basis points for edges (`+630 bps`). Right-justified in tables.

**Borders.** 1px hairlines in graphite. No box-shadows. No border radius above 2px on any element.

**Iconography.** ASCII or Unicode glyphs only: `▲ ▼ ◆ → ✕ ⚠ ✓ ▮ ▯`. No SVG icon sets. No Lucide. No Heroicons. No phosphor. The brand voice is "rendered in 1987 with 2024 typography."

**Separators.** Use the pipe character `|` between data fields, not slashes, hyphens, or dashes. The pipe is the native terminal separator and reads as institutional.

### What you must NOT design

- Gradient backgrounds
- Hero illustrations or 3D renders
- Friendly mascots or character art
- Emoji decorations
- Social proof carousels ("Join 5,000 traders")
- Trust badges or "as seen in" logo strips
- Anything that says "Subscribe to our newsletter"
- Any animation longer than 400ms

## Surface 1: Email capture form (component)

Lives on the Next.js homepage above the fold, and as a footer module on `/methodology` and `/divergence/[match_id]` pages. Single email field, single submit button, single line of context.

### Component states

**State 1: Idle**

Provide both layouts. Desktop primary is inline horizontal; mobile primary is vertical stack.

Copy and hierarchy:

- Eyebrow label (small caps, monospace, 11px, graphite): `DAILY RESEARCH DISPATCH`
- Sublabel (sans, 14px, ink): `Probabilistic divergences from the nightly Monte Carlo run. One issue per UTC day.`
- Input placeholder: `you@firm.com`
- Submit button text: `REQUEST ACCESS`
- Microcopy below (sans, 11px, graphite): `Double opt-in. Unsubscribe one click. Methodology open source.`

Visuals: input field with hairline border, no rounded corners (2px max), monospace input text, submit button as outlined rectangle with monospace caps. On focus, the border becomes ink-colored. No glow, no shadow.

Cloudflare Turnstile widget renders below the input in idle state, styled with `theme=light` or `theme=dark` to match.

**State 2: Validating** (between submit click and server response, expected 100ms to 2s)

Submit button text changes to `VERIFYING ▮▯▯`. Animate the bar glyphs every 250ms (`▮▯▯` to `▮▮▯` to `▮▮▮`). Disable the input. No spinners, no loading dots.

**State 3: Pending verification** (success state, server returned 202)

Replace the form with a panel:

- Status header (monospace caps, 12px): `STATUS: PENDING VERIFICATION`
- Body (serif, 16px): `Confirmation link sent to <user@email.com>. Click within 24 hours to activate.`
- Footer line (sans, 11px, graphite): `Did not arrive? Check spam, or [resend] (60s cooldown).`

Persist this state in `sessionStorage` so the user does not see the form again on the next page they navigate to within the session. Reset on next visit.

**State 4: Error**

Inline below the input. No toast notifications.

Variants and exact copy:

- Invalid email: `✕ INVALID FORMAT. Use a deliverable address.`
- Already subscribed and verified: `✕ ADDRESS ALREADY ACTIVE. Check inbox for next dispatch.`
- Already subscribed pending: `✕ VERIFICATION ALREADY SENT. Check inbox or [resend].`
- Rate limited: `✕ RATE LIMIT. Try again in 60 seconds.`
- Turnstile failed: `✕ VERIFICATION CHALLENGE FAILED. Reload and retry.`
- Server error: `✕ DISPATCH UNAVAILABLE. Retry shortly.`

All errors render in oxblood text, monospace.

### Spec deliverables for Surface 1

- Frames for all 4 in-form states (idle, validating, pending, error variants)
- Desktop horizontal and mobile vertical for each
- Light and dark theme

## Surface 2: Verification page (`/verify?token=...`)

Full page route hit by clicking the verification link in the activation email.

### States

**State 1: Verifying** (during async token check, max 1.5s)

Centered panel:

- Header (monospace caps, 14px): `45ANALYTICS | VERIFICATION`
- Body (serif): `Verifying token...`
- Animated bar: progresses `▮▯▯▯▯` to `▮▮▮▮▮`

**State 2: Confirmed** (server returns valid)

Server-side redirect to `/confirmed` (Surface 3) on success. Do not render success state on `/verify` itself; the user should land on a permanent, bookmarkable URL.

**State 3: Expired or invalid**

- Header: `VERIFICATION FAILED`
- Body line 1 (serif): `Token expired or invalid.`
- Body line 2 (sans, graphite): `Tokens are valid for 24 hours.`
- CTA: `[REQUEST NEW LINK]` button. If the original email is recoverable from URL state, prefill it; otherwise link back to the homepage form.

## Surface 3: Confirmed page (`/confirmed`)

The bookmarkable success page. Single state, outbound links only.

Content blocks (top to bottom):

1. Status header (monospace caps): `STATUS: ACTIVE | DAILY DISPATCH 12:00 UTC`
2. Subscription metadata block (monospace, 12px, two-column key-value):
   ```
   ISSUE FREQUENCY    DAILY (UTC)
   FIRST DISPATCH     [tomorrow's date, ISO format]
   FORMAT             RESEARCH DISPATCH (HTML + plain text)
   UNSUBSCRIBE        ONE CLICK FOOTER
   ```
3. Sample brief preview: a 60% scale embedded preview of the daily brief email template (Surface 5) with that day's actual data if available, otherwise the most recent issue
4. Methodology callout (sans): `Read the model card before the first dispatch arrives. [METHODOLOGY →]`
5. Disclaimer (small italicized serif, see Disclaimer section)

## Surface 4: Unsubscribe page (`/unsubscribe?u=...&s=...`)

One click unsubscribe per RFC 8058. Process the unsubscribe immediately on GET, no confirmation click. Show the result.

### States

**State 1: Processing** (200ms max)

`PROCESSING UNSUBSCRIBE...`

**State 2: Success**

- Header: `STATUS: UNSUBSCRIBED`
- Body (serif): `<email> removed from the dispatch list.`
- Optional feedback prompt (sans, graphite, fully optional): `If you have a moment, why are you leaving? [Optional, anonymous]`
  - Single radio group: too frequent | not relevant | unclear methodology | no longer interested | other
  - Submit button: `[SUBMIT FEEDBACK]`. Skipping has no consequence.
- Resubscribe link in footer: `Changed your mind? [Resubscribe →]`

**State 3: Invalid signature**

- Header: `LINK INVALID`
- Body: `This unsubscribe link is malformed or has been tampered with.`
- CTA: `[CONTACT SUPPORT]` mailto link

## Surface 5: Daily brief email template (react-email)

The centerpiece. The visual identity is set here. Render this as if you are typesetting a one-page institutional research note.

### Email layout grid

- Container: 600px wide, centered
- Mobile: full width with 16px gutter
- Optional left rail: 8px monospace data column on desktop only (issue number running vertically)
- Main column: stacked sections separated by hairline rules

### Sections (top to bottom)

**Section 1: Masthead**

```
─────────────────────────────────────────────
45ANALYTICS                  RESEARCH DISPATCH
ISSUE No. 014                   2026-06-12 UTC
─────────────────────────────────────────────
```

Two-column row, monospace, hairline rules above and below. Brand wordmark in serif caps; everything else monospace.

**Section 2: Reproducibility block**

```
MODEL_VARIANT      M0
CODE_SHA           a3f2c1d  →  [github.com/...]
DATA_SHA           9b7e2f4  →  [snapshot registry]
MC_RUNS            10,000
```

Tabular monospace, 11px, graphite. Each SHA is hyperlinked. **This block is non-negotiable**: it is the credibility commitment, and the part that makes the email feel different from any newsletter.

**Section 3: Headline**

Single sentence in serif, 18px, ink. Pulled from `headline.summary_line`. Below it, a 13px graphite line from `headline.movers_line`.

Example render:

> Largest divergence today: USA vs MEX home side, model 42.3%, market 36.0%, edge +630 bps.
>
> Three teams shifted >2% in title probability overnight.

**Section 4: Top Divergences (data table)**

| KICKOFF UTC | MATCH | SIDE | MODEL | MARKET | EDGE | GATE |
|-------------|-------|------|-------|--------|------|------|
| 20:00 | USA vs MEX | HOME | 42.3% | 36.0% | +630 bps | ✓ |
| 17:00 | BRA vs SRB | DRAW | 28.1% | 24.5% | +360 bps | ✓ |
| 14:00 | FRA vs DEN | AWAY | 31.0% | 33.5% | -250 bps | ⚠ |

Column rules:

- Edge positive: forest green text, prefix `+`
- Edge negative: oxblood red, prefix `-`
- Below threshold (`|edge| < 3% mainline, 5% derivative`): graphite, no prefix. These rows should not appear in this section anyway since they are filtered upstream.
- Gate column: `✓` glyph in graphite when no suppression, `⚠` glyph in amber when any suppression triggered. Rows with `⚠` are dimmed to 70% opacity, with a footnote below the table listing the rule.

Below the table, in 11px sans graphite: `N divergences exceeded threshold today. M markets suppressed. [VIEW ALL ON SITE →]`

**Section 5: Tournament Probability Movers**

Three to five rows. Each row is one line of monospace:

```
BRAZIL          TITLE PROB   14.2% → 11.8%   ▼ -240 bps
ARGENTINA       TITLE PROB   12.1% → 13.6%   ▲ +150 bps
GERMANY         R16 PROB     78.0% → 81.5%   ▲ +350 bps
```

Below each row, in 11px graphite sans, the `driver` field as a one-line attribution.

**Section 6: Volatility Gate notes**

Renders only if `suppressed_today` is non-empty. Hairline-bordered panel:

```
GATE TRIGGERED | N MARKETS SUPPRESSED
```

Followed by a small monospace list:

```
2026-06-15  ESP vs GER   POLYMARKET_VOLUME_FLOOR   $42,300 < $50,000
2026-06-16  NED vs POR   PINNACLE_STALE_LINE       4h 12m elapsed
```

This is a feature, not a footnote. It earns trust.

**Section 7: Methodology Footer**

Three columns (stacked on mobile):

```
MODEL CARD          DEVIG METHOD          ARCHIVE
[methodology/m]     [methodology/devig]   [briefs/2026-06-12]
```

**Section 8: Disclaimer**

See Disclaimer section. Italic serif, 11px, graphite. Boxed with hairline border on three sides (open at top), positioned just above the unsubscribe footer.

**Section 9: Unsubscribe footer**

Plain monospace, 10px, graphite, centered:

```
Sent to user@firm.com  |  [UNSUBSCRIBE]  |  [WEB VERSION]
45analytics  |  Research Dispatch  |  Issue 014  |  2026-06-12
```

### Plain text version (required)

Provide an explicit plain text template. Same content, monospace ASCII tables using `|` and `-`. No images, no inline URLs (use bracketed format: `link text [https://url]`).

### Mobile rendering

- Tables collapse to stacked cards on screens under 500px
- Each divergence row becomes a 4-line card with the same data fields
- Reproducibility block becomes one line: `M0  |  a3f2c1d  |  9b7e2f4  |  10k MC`
- Movers panel keeps the single-line format; allow horizontal scroll on overflow

### Dark mode in email clients

Apple Mail and Outlook desktop respect `prefers-color-scheme`; design both palettes. Gmail forces its own dark mode with limited support. Design the light theme so when Gmail inverts colors it lands on a readable graphite, not pure black. Test against:

- Gmail (web, iOS, Android) light and forced dark
- Apple Mail (macOS, iOS) light and dark
- Outlook (Windows desktop, web) light and dark
- Superhuman, Hey, ProtonMail (web)

### Empty states

If `top_divergences` is empty for the day, render this panel in place of the table:

> NO DIVERGENCES EXCEEDED THRESHOLD TODAY.
>
> All 1X2 markets within ±300 bps of model probability. The next nightly run dispatches at 12:00 UTC.

Same monospace style. This is also a feature, not a failure.

## JSON contract (the email template renders against this exact shape)

```json
{
  "brief_date": "2026-06-12",
  "issue_number": 14,
  "model_variant": "M0",
  "code_sha": "a3f2c1d",
  "data_snapshot_sha": "9b7e2f4",
  "mc_runs": 10000,

  "headline": {
    "summary_line": "Largest divergence today: USA vs MEX home side, model 42.3%, market 36.0%, edge +630 bps.",
    "movers_line": "Three teams shifted >2% in title probability overnight."
  },

  "top_divergences": [
    {
      "match_id": "2026-06-12_USA_MEX",
      "kickoff_utc": "2026-06-12T20:00:00Z",
      "home": "United States",
      "away": "Mexico",
      "market": "1X2",
      "model_probs": {"home": 0.423, "draw": 0.270, "away": 0.307},
      "market_probs_devigged": {"home": 0.360, "draw": 0.280, "away": 0.360},
      "edge": {"home": 0.063, "draw": -0.010, "away": -0.053},
      "max_edge_side": "home",
      "max_edge_value": 0.063,
      "edge_threshold_applied": 0.03,
      "ci_95": {"home": [0.39, 0.45]},
      "volatility_gate": {
        "triggered": false,
        "suppressions": []
      }
    }
  ],

  "tournament_movers": [
    {
      "team": "Brazil",
      "metric": "title_probability",
      "yesterday": 0.142,
      "today": 0.118,
      "delta": -0.024,
      "driver": "Argentina win raised conditional bracket strength."
    }
  ],

  "suppressed_today": [
    {
      "match_id": "2026-06-15_ESP_GER",
      "rule": "polymarket_volume_floor",
      "reason": "24h volume $42,300 < $50,000 threshold."
    }
  ],

  "methodology_links": {
    "model_card": "https://45analytics.com/methodology/m-star",
    "devig_method": "https://45analytics.com/methodology/power-devig",
    "this_brief_archive": "https://45analytics.com/briefs/2026-06-12"
  },

  "subscriber": {
    "email": "user@firm.com",
    "unsubscribe_url": "https://45analytics.com/unsubscribe?u=...&s=..."
  }
}
```

The template must handle missing or empty arrays gracefully.

## Design tokens (final, hand back as JSON to engineering)

```json
{
  "color": {
    "light": {
      "bg": "#F4F1EA",
      "ink": "#0A0A0A",
      "graphite": "#5A5A5A",
      "hairline": "#C4BEB0",
      "edge_positive": "#0F5F4E",
      "edge_negative": "#7A1F1F",
      "suppression": "#8A6A1F"
    },
    "dark": {
      "bg": "#0E0E0E",
      "ink": "#E8E4D8",
      "graphite": "#9A968A",
      "hairline": "#3A3833",
      "edge_positive": "#3FBC8E",
      "edge_negative": "#E0584F",
      "suppression": "#D4A845"
    }
  },
  "type": {
    "mono": "JetBrains Mono, IBM Plex Mono, ui-monospace",
    "serif": "Source Serif Pro, IBM Plex Serif, Georgia",
    "sans": "Inter, IBM Plex Sans, system-ui"
  },
  "size": {
    "data_xs": "10px",
    "data_sm": "11px",
    "data_md": "12px",
    "body_sm": "13px",
    "body_md": "14px",
    "body_lg": "16px",
    "headline": "18px",
    "masthead": "20px"
  },
  "radius": {
    "none": "0",
    "subtle": "2px"
  },
  "border": {
    "hairline": "1px solid var(--hairline)"
  }
}
```

You may adjust any token within the aesthetic constraints (no shadows, no large radii, no introduced color hues). Document any change with a one-line rationale.

## Required disclaimer copy (verbatim, do not modify)

Place this on the `/confirmed` page footer and in every email dispatch directly above the unsubscribe footer:

> *45analytics is a research project investigating market efficiency in the 2026 FIFA World Cup. The probabilities, divergences, and edges presented here are model outputs published for academic and research purposes. They are not financial advice, betting tips, or recommendations to place wagers. The model is described in full at /methodology, including its known limitations. Past divergences do not imply future divergences will be priced.*

Italic serif, 11px, graphite. Do not abbreviate. Do not hide behind "click to expand."

## What you must NOT do

- Do not write copy that promises returns, profits, or beating the market
- Do not use the words "tip," "pick," "play," "lock," or "predict"
- Do not show fake user testimonials or social proof counts
- Do not add a "premium tier" upsell anywhere
- Do not use emoji in subject lines or copy
- Do not include animated GIFs in the email
- Do not pad the email with whitespace; density is the brand
- Do not use Lucide, Heroicons, phosphor, or any SVG icon set; ASCII glyphs only
- Do not use em dashes or en dashes anywhere; use pipes (`|`), colons, periods, or parentheses

## Deliverables (return to architect)

1. Figma file with frames for:
   - All 4 form states (idle, validating, pending, error variants), light and dark, desktop and mobile
   - Verification page (verifying, expired)
   - Confirmed page
   - Unsubscribe page (success, invalid)
   - Daily brief email template: full layout, light and dark, desktop and mobile
   - Volatility Gate triggered variant (`suppressed_today` populated)
   - Empty divergences variant (no divergences today)
2. Finalized design tokens JSON
3. A copy deck (markdown table) listing every string with its location, max length, and any variable interpolation
4. A short rationale doc (max 1 page) explaining any departures from this brief and why
5. Three sample subject lines for the daily dispatch, monospace-rendered, that fit the aesthetic without crossing into clickbait. Example shape: `[45A | 2026-06-12] 3 divergences > 300 bps`

## Constraints summary (one line each)

- Aesthetic: Bloomberg Terminal meets institutional research note
- Type: monospace, serif, sans, three faces only
- Color: hairlines and tabular figures, no gradients, no shadows
- Glyphs: ASCII and Unicode only, no SVG icon sets
- Density: pack the data, whitespace for hierarchy only
- Tone: research dispatch (legally), Quant Desk (visually)
- Forbidden vocabulary: betting, tip, pick, play, lock, predict, profit, returns
- Disclaimer: verbatim, every dispatch, every page
- Mobile: tables collapse to cards, masthead compresses to one line
- Both themes: light and dark, respect `prefers-color-scheme`
- Separators: pipes (`|`), never em dashes or en dashes

When in doubt: imagine you are designing the email Renaissance Technologies would send to the Federal Reserve. Then make it about football.
