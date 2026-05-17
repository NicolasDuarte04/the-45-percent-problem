# Checkpoint 11: Reverse rarity lookup (Final Four exploration)

## Context

You are working on the 45 Analytics codebase (`the-45-percent-problem` repo). The attached file `APP_UX_EVALUATION_2026-05-13.md` is the evaluation that motivates this work. This task implements recommendation **P2.2 ("show me a scenario with N agreement %", reverse rarity lookup)** from that evaluation.

All eight P0 checkpoints have shipped, the brand-cleanup sweep is done, and two of three P1s have landed (Full Bracket partial submit, snapshot toggle). The remaining P1 (calibration emails) depends on real match outcomes which do not exist yet, so we are pulling P2 work forward.

This is a small checkpoint. Expect under 400 lines of net new code.

## Why this matters

The existing simulator and promo cards are forward-direction: the user picks a scenario, the system scores its rarity. The promo cards in particular are hand-curated examples at four specific rarities.

The reverse direction is different and useful: the user picks a target rarity band, the system generates 5 fresh example scenarios at that band. This is low-commitment exploration, a way for curious visitors to engage without committing four picks of their own. It also produces evergreen content for paid social: "Here are 5 scenarios at 1-in-100 rarity. Which would you call?"

The two should feel complementary, not redundant. The promo cards are 4 curated narratives. The explore page is the full rarity space, server-generated each request, snapshot-aware.

## What to build

Five small pieces. Total PR around 200 to 400 lines.

### 1. New page: /scenario/explore

Add `website/src/app/(simulator)/scenario/explore/page.tsx`. Server component, `force-dynamic` (per-request scenario generation), `robots: { index: false, follow: false }`.

Layout (top to bottom):

1. Page heading: `Browse rarities` in the same serif used by the other simulator-section headings.
2. Subhead: `Pick a rarity band. Five example scenarios appear below.` in mono `--text-tertiary`.
3. Band picker: 5 buttons in a horizontal row, brutalist mono uppercase:
   - `[ COMMON ]`
   - `[ PLAUSIBLE ]`
   - `[ UNCOMMON ]`
   - `[ RARE ]`
   - `[ VANISHINGLY RARE ]`
4. Below the picker, 5 scenario cards (rendered server-side for the selected band).
5. Provenance footer: `Model state · snapshot {snapshot_id} · code {code_sha_8}` in 11px mono `--text-quiet`. Same pattern as `ModelCallPanel`.

Read `searchParams.band` to determine which band is selected. Default to `plausible` if absent or invalid (Plausible has the widest user-mass appeal; Common is too obvious, Vanishingly rare is too rare to feel real).

When the user clicks a band button, navigate via `router.push("/scenario/explore?band=" + band)`. The selected band's button has `--accent-warm` border; the others have `--border-default`.

### 2. Scenario generation algorithm

Add `website/src/lib/sim/rarityExplorer.ts` exporting:

```ts
export interface ExploreScenario {
  semifinalists: TeamCode[];      // 4 teams, sorted alphabetically
  count: number;                  // computed Reality Score count
  total: number;                  // typically MC_RUNS = 10_000
  oneInN: number;                 // derived for display
  storyLine: string;              // descriptive sentence
}

export function generateExploreScenarios(
  tournament: TournamentSnapshot,
  band: RarityBand,
  k: number = 5,
): ExploreScenario[];
```

Algorithm:

- Build a 48-team list with `p_semifinal` per team from the snapshot.
- Sample combinations of 4 teams. Two acceptable approaches:
  1. **Full enumeration**: iterate `48 choose 4` (194,580 combinations), compute joint probability for each, partition by band, pick 5 stratified within the band.
  2. **Random sampling**: sample 5,000 random 4-combinations, score them, partition by band, pick 5 from the target band.

Approach 1 is exhaustive and produces deterministic output per snapshot. Approach 2 is faster and produces snapshot-stable randomness with a fixed seed. Pick the simpler one; document the choice. Brute force at 195K iterations runs in well under 100ms in Node, so approach 1 is probably fine.

For the joint probability, use the same independence approximation the existing `computeRealityScore("final_four", ...)` uses: `joint = ∏ p_semifinal[team_i]`. Apply the same FNV-1a jitter so identical-probability combinations do not collide.

Stratified pick of 5 from the matching combinations:
- Sort matches by joint probability ascending within the band.
- Pick 5 evenly-spaced positions across the sorted list (so the user sees a spread across the band, not just the highest 5 or lowest 5).
- If fewer than 5 combinations match the band, return all of them. If zero match, return an empty array and let the page render an empty-state.

Each returned scenario has its `semifinalists` sorted alphabetically (deterministic order across requests).

The `storyLine` is generated using the existing `renderStoryLine.ts` for Final Four mode, or inlined as `"{Team1, Team2, Team3, and Team4} reach the semifinals."` if `renderStoryLine` is awkward to reach.

### 3. The scenario card

Each scenario renders as a brutalist card with:

- Flag row at the top: 4 flags side-by-side (use the existing `Flag` primitive at size 24 or 32).
- Story line in serif below the flags.
- Reality Score line: `1 in N · {pct}%` in mono. Example: `1 in 88 · 1.14%`.
- Rarity band chip: small `--accent-warm` pill with the band label.
- One action: `[ Try this scenario → ]` link to `/scenario/final-four?teams=ESP,FRA,ARG,BRA` (comma-separated team codes).

Card chrome: 1px `--border-default`, `--bg-panel-elev` background (matches `ModelCallPanel`). Sharp corners, no shadow. Hover state: `--accent-warm` left border accent (matching the row-hover pattern on `/me`).

The 5 cards render as a vertical stack on mobile, 2-column grid on `sm+`, with the 5th card wrapping to a third row on `md+`. Or 3-column grid on `md+` if it lays out cleaner; pick the natural layout.

### 4. Extend Final Four pre-fill to accept ?teams=

The existing Final Four page (`website/src/app/(simulator)/scenario/final-four/page.tsx`) reads `?card=<slug>` and pre-fills via `getPromoCard`. Extend it to also accept `?teams=<comma-separated codes>`:

- If `?card=<slug>` is present and valid: use that (existing behaviour, takes priority).
- Else if `?teams=<codes>` is present and parses to exactly 4 valid `TeamCode`s: pre-fill with those teams.
- Else: render the empty Final Four picker as today.

The `?teams=` pre-fill produces the same `initialScenario` prop that `?card=` does. `hasInteracted` stays `false` so the ghost-fill button rules continue to apply (since slots are full, the button auto-hides).

The OG metadata for `?teams=` should set `og:image` to a generic Final Four card (the existing scenario OG with the placeholder champion) rather than rendering a custom OG. Building a third OG variant is out of scope for this checkpoint. Document this trade-off in the report.

### 5. Discovery: link from /scenario landing

Add a quiet link on the `/scenario` landing page that points to `/scenario/explore`. Mount it below the three mode cards and above the trailer, in a single bordered strip. Label: `[ Browse rarities → ]` plus a one-line subhead: `Pick a rarity band; see five example scenarios.`.

Do not add a new section heading. The strip is a compact discovery affordance, not a fourth mode card.

### 6. Plausible events

Add two new events:

```ts
explore_band_selected: { band: RarityBand };
explore_card_clicked: { band: RarityBand; teams: string };  // teams = "ESP,FRA,ARG,BRA"
```

- `explore_band_selected` fires on band picker click. Each click counts; no dedup (this is the exploration depth signal).
- `explore_card_clicked` fires when the user clicks a card's `[ Try this scenario → ]` link. Includes the teams as a comma-separated string for downstream analytics.

The existing `simulator_opened` event still fires on the Final Four page mount as today, regardless of whether the page arrived via `?card=`, `?teams=`, or empty.

## Acceptance criteria

- New page at `/scenario/explore` renders the band picker and 5 cards for the selected band.
- Default band is `plausible` when no `?band=` query param is present.
- Each card shows flags, codes, story line, 1-in-N, band chip, and a `[ Try this scenario → ]` link.
- Clicking the link navigates to `/scenario/final-four?teams=...` with the slots pre-filled.
- The Final Four page correctly parses `?teams=` and pre-fills.
- `?card=` takes priority over `?teams=` when both are present.
- Algorithm produces deterministic output per snapshot (stratified sample of 5 from the matching band).
- Empty band (no combinations match) shows a quiet empty-state, not an error.
- Discovery link `[ Browse rarities → ]` mounts on `/scenario` between the mode cards and the trailer.
- Plausible events fire correctly (`explore_band_selected` on band click, `explore_card_clicked` on card link click).
- TypeScript build clean.
- Existing tests pass.
- No SSR or hydration warnings.

## Brand-discipline guardrails (non-negotiable)

- No em-dashes or en-dashes in any new or modified file, including code comments. Use periods, semicolons, colons, parentheses.
- No betting language anywhere.
- No celebratory copy on the explore page. No "Wow!", no "Cool", no "Try it!", no "Get started!".
- Band picker labels are exactly the locked phrases above (`COMMON`, `PLAUSIBLE`, `UNCOMMON`, `RARE`, `VANISHINGLY RARE`). These match the existing rarity vocabulary from `RealityScorePanel`.
- Card action label is exactly `[ Try this scenario → ]`. Not `Use this`, not `See full reveal`, not `Predict this`.
- Discovery link label is exactly `[ Browse rarities → ]`. Not `Explore`, not `Reverse lookup`, not `Try something`.
- The 1-in-N number on each card is the actual computed value from the current snapshot. Never hardcode; never round to mislead.

## Workflow conventions (from CLAUDE.md)

- Work on a feature branch named `ux/checkpoint-11-reverse-rarity-lookup`.
- Open a pull request when complete. Do not push directly to main.
- Run `scripts/install-hooks.sh` once if you have not already; the pre-push hook blocks conflict markers.
- If a merge conflict appears during rebase, use `git fetch origin && git reset --hard origin/main` then re-apply your work; do not use `git stash pop`.
- Verify end-to-end on the dev server: open /scenario/explore, click each band, click a card, land on Final Four pre-filled, submit, reach the permalink.

## End-of-task report

When the work is complete, produce a report in exactly this format:

```
## Checkpoint 11 Report: Reverse rarity lookup

### Branch
ux/checkpoint-11-reverse-rarity-lookup

### Files changed
- path/to/file (added | modified): one-line summary
- ...

### Diff size
Lines added: N
Lines removed: M
Files touched: K

### Algorithm choice
- Approach 1 (full enumeration) or Approach 2 (random sampling), and why.
- Wall-clock time for one band selection (development machine; not production).
- How the stratified pick of 5 works.

### Per-band counts (at current snapshot)
- COMMON: X combinations match (out of 194,580). Top 5 by joint p (or stratified spread).
- PLAUSIBLE: X combinations match.
- UNCOMMON: X combinations match.
- RARE: X combinations match.
- VANISHINGLY RARE: X combinations match.

Paste one example scenario per band for the report.

### Example outputs
Paste 1-2 actual scenario cards from the live dev server for sanity-check.

### Manual verification
- [ ] /scenario/explore renders the band picker and 5 cards for the default band
- [ ] Clicking a band updates the URL and re-renders the cards
- [ ] Each card link pre-fills Final Four correctly
- [ ] ?teams= and ?card= both work; ?card= takes priority
- [ ] Discovery link mounts on /scenario between mode cards and trailer
- [ ] Plausible events fire correctly
- [ ] Empty-band fallback renders cleanly (test by code path inspection)
- [ ] TypeScript build clean
- [ ] Existing tests pass
- [ ] No SSR or hydration warnings

### Follow-ups / open questions
- The ?teams= path does not produce a custom OG image; falls back to the generic. Document this and note it as a P2 polish for a future checkpoint.
- Anything else you flagged.

### Ready for review
Y / N. If N, state what is blocking.
```

Do not push to main. Wait for the user to review the report and approve.
