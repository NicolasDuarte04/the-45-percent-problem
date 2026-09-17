# Design Brief Addendum v2: Dual-Audience Conversion

## Context

Both prior documents (`email-capture-design-brief.md` and `email-capture-design-brief-addendum.md`) framed the audience too narrowly. The product serves two readers:

- **Audience A**: analysts, traders, researchers (quant register, technical fluency)
- **Audience B**: World Cup fans who want to watch probabilities move (general register, narrative fluency)

Both read the same data. The form has to convert both, and so does every public surface that leads to it. The job is translation without dumbing down. The aesthetic stays. The copy gets a second layer.

This v2 supersedes v1 only where explicitly noted. Everything in the original brief and everything in v1 not touched here remains in force.

## Addition 1: New audience line (replaces v1 Addition 2)

Drop the prior line entirely:

> ~~For analysts, traders, and researchers studying market efficiency in sports betting markets.~~

Use a two-line treatment that addresses both readers in the same gesture. Two options. Pick the one that lays out best in the form module.

Option A (preferred):
> How likely is your team to win? How likely does the market think?
> Track both, every day, with the methodology in plain view.

Option B:
> Daily probabilities for the 2026 World Cup.
> Built for fans who want the numbers and for analysts who want the methodology.

Both welcome fans without losing analysts. The quant register survives because the data block underneath does not change. The welcome line does not need to carry the technical signaling.

Type spec: sans, 14px, ink (not graphite). Two lines, tight leading, left-aligned. Sits immediately above the eyebrow label `DAILY RESEARCH DISPATCH`.

## Addition 2: Serif lead-in panel inside the live data block (modifies v1 Addition 1)

The v1 live data block was monospace from top to bottom. That reads as terminal output to analysts and as opaque to everyone else. Add a two-sentence serif lead-in above the monospace table. This is the bridge.

Reference shape (light theme):

```
─────────────────────────────────────────────
TODAY  |  2026-06-12 UTC  |  ISSUE 014
─────────────────────────────────────────────

Brazil is still the title favorite at 14.2%,
down 240 bps overnight after Argentina's win.
Today's largest match-day gap is USA vs Mexico,
where the model gives the US a 6.3-point edge
over bookmaker odds.

────

LARGEST DIVERGENCE
United States vs Mexico  HOME
MODEL    42.3%
MARKET   36.0%
EDGE     +630 bps  ▲

NEXT DISPATCH    2026-06-13 12:00 UTC

[VIEW LATEST →]
─────────────────────────────────────────────
```

Type spec for the lead-in: serif (Source Serif 4), 16px, ink, two to four sentences max. Tight leading, prose paragraph form. The serif voice is the one a non-quant reader hears first.

The lead-in is server-rendered from the same JSON the rest of the block uses. It is templated text, not LLM-generated, so it is deterministic and snapshot-hashable. The Python pipeline writes the strings directly.

### Updated JSON contract for the live data block

```json
{
  "brief_date": "2026-06-12",
  "issue_number": 14,
  "next_dispatch_utc": "2026-06-13T12:00:00Z",
  "latest_archive_url": "https://45analytics.com/briefs/2026-06-12",
  "lead_in": {
    "tournament_sentence": "Brazil is still the title favorite at 14.2%, down 240 bps overnight after Argentina's win.",
    "match_sentence": "Today's largest match-day gap is USA vs Mexico, where the model gives the US a 6.3-point edge over bookmaker odds.",
    "fallback_used": false
  },
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

### Lead-in fallback states

Both sentences must always render. If the underlying data does not support a real sentence, the pipeline writes a credible fallback:

- No tournament mover above 1% delta: `"No team's title chances changed by more than 1% overnight."`
- No match divergence above threshold: `"No matches today have model probabilities outside the market's ±3% mainline range."`
- No matches scheduled today: `"No matches today. The next kickoff is [date] at [time] UTC."`

The fallbacks are stronger than the table going empty. They tell the visitor the model is on duty and quiet, not absent.

## Addition 3: Featured team callout (new)

Below the live data block, one monospace row:

> Following a specific team?  [BRAZIL]  [ARGENTINA]  [USA]  [GERMANY]  [SPAIN]  [SHOW ALL →]

Each chip is a hairline-bordered text link. Clicking routes to `/teams/[country]`, a future page showing that team's tournament probability over time. In v1, before that page exists, the chips can route to `/briefs` filtered to issues that mentioned that team in the headline; the route can be wired up later without changing the form.

The five default teams rotate daily, populated by the same cron:

- Top 3 by current title probability
- Top 2 by 24-hour probability delta (positive or negative magnitude)

This single row is the highest-leverage move for fan conversion. It tells a Brazil fan or a USA fan the product covers their team specifically. Without it, the form is generic; with it, every fan finds themselves on the page.

Type spec: monospace, 12px, hairline borders, no fill. Hover state: ink-colored border, no other change.

## Addition 4: Subject line variants

The original brief asked for three subject line proposals in quant register. Expand to six, half quant register, half fan register, all in the same monospace bracket format. The dispatch system rotates among them based on which audience the subscriber's signal pattern leans toward (open rate by subject style; this is a v2 product feature, but the subject inventory needs to exist first).

Required register split:

Quant register (3):
1. `[45A | 2026-06-12] 3 divergences > 300 bps | USA vs MEX leads at +630 bps`
2. `[45A | 2026-06-12] M★ vs market: 3 gaps exceed threshold | 1 gate tripped`
3. `[45A | 2026-06-12] Issue 014 | Brazil title prob -240 bps | daily model output`

Fan register (3):
4. `[45A | 2026-06-12] Brazil's title chances drop overnight after Argentina win`
5. `[45A | 2026-06-12] USA vs MEX: our model thinks the US is more likely than the bookies do`
6. `[45A | 2026-06-12] 3 teams' World Cup chances moved meaningfully today`

Both registers stay in the bracketed monospace masthead format. The fan register does not relax the aesthetic; it only relaxes the vocabulary.

## Addition 5: Microcopy revision (small)

Current line below the form input:

> Double opt-in. Unsubscribe one click. Methodology open source.

Replace with:

> Daily, 12:00 UTC. Methodology open. Unsubscribe one click.

Reads as informational to both audiences. The cadence ("Daily, 12:00 UTC") tells a fan what to expect. "Methodology open" tells an analyst the work is inspectable. "Unsubscribe one click" reassures everyone.

## Note on the word "Dispatch"

Flagging for the implementation pass: the product owner has indicated "dispatch" carries the wrong tone for the broader audience. Likely replacement candidates: `Brief`, `Issue`, `Update`, `Report`. Do not change wording in this design pass; the existing copy uses "dispatch" consistently and changing it now will fragment the deliverables. The implementation spec will run a global rename. Design with that flexibility in mind: avoid making "dispatch" a load-bearing visual element (e.g., do not set it in display serif at 32px). Treat it as replaceable string.

## What stays unchanged

Everything from the original brief and from v1 of the addendum not explicitly replaced above. Specifically: the masthead, the reproducibility block, the top divergences table, the tournament movers panel, the volatility gate panel, the disclaimer copy verbatim, the verification flow, the unsubscribe flow, all forbidden vocabulary, all forbidden visual patterns.

## What you must NOT do (additions to the prior list)

- Do not add team flags or logos. ASCII text labels only.
- Do not let the serif lead-in turn chatty. It should read like the lede of a Reuters or FT story, not the opening of a Substack newsletter. No exclamation points anywhere on any surface.
- Do not split the form into "fan version" and "analyst version." One form, one aesthetic, two readable layers.
- Do not add a "favorite team" field to the signup form itself. Personalization is post-signup, post-v1.
- Do not introduce a second illustration style or a friendlier color for the fan-facing copy. The whole point is one aesthetic that serves both registers.
- Do not soften the volatility gate panel or the suppression notes. Those land for both audiences once they see them: analysts read them as discipline, fans read them as honesty.

## Updated deliverables

In addition to all prior deliverables:

1. Surface 1 with the serif lead-in panel inside the live data block, both themes, desktop and mobile, populated and fallback states (no mover, no divergence, no matches)
2. New audience line treatment (Option A or B), both themes
3. Featured team callout row, both themes, populated and rotating-default variants
4. Six subject line proposals as listed above, rendered in the masthead monospace style
5. Updated microcopy under the form input
6. Confirmed JSON contract for the new `lead_in` field
7. One low-fidelity mock of the future `/teams/[country]` page (one frame, light theme only) so the chip link target is plausible. Do not over-design this; placeholder is fine.

## One-line summary

The form now welcomes the fan and respects the analyst. The data does not change. The voice gains a layer.
