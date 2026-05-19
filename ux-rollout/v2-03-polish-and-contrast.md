# V2 Checkpoint 3: Polish + contrast fixes (final V2 checkpoint)

## Context

V2 Checkpoints 1 and 2 shipped. The simulator landing is clean, the Final Four picker has search and probability-sorted default, Champion's Path progressively discloses stages, Full Bracket group ranking has position labels and the 3rd-place picker has its explainer.

This is V2 Checkpoint 3, the last checkpoint in the V2 plan. It bundles the smaller polish items (Priority B from `APP_UX_EVALUATION_V2_2026-05-17.md`):

- B1: Mode card glyph upgrades
- B2: ModelCallPanel header reframing (away from grade-like "0 of 4 match")
- B3: "What this means" expandable on reveal page (OPTIONAL)
- B4: Bracket page contrast-aware text rendering
- B5: Goal matrix heatmap contrast + modal-cell indicators

After this lands, the V2 UX work is complete and the surfaces are ready for the marketing push.

Read `APP_UX_EVALUATION_V2_2026-05-17.md` (specifically the "Adjacent quant surfaces" subsection and Priority B in Recommendations) and the V2-02 checkpoint brief at `ux-rollout/v2-02-champions-path-and-bracket-clarity.md` (for the brand-discipline patterns already established) before implementing.

## Why this matters

Two structural and three polish items. The structural items (B4, B5) fix real legibility failures on the bracket and match-detail pages: white text on coral cells at mid-range probabilities is hard to read on cold load. These pages are the academic-credibility surfaces; unreadable data undermines the rigor the rest of the rollout earned.

The polish items (B1, B2, B3) are smaller in scope but each touches a moment where new users form their impression of the brand. Mode card glyphs help users parse choices faster (pattern recognition). The ModelCallPanel header reframing softens a moment that currently reads as a grade. The optional "What this means" gives new users an educational on-ramp without cluttering the surface for power users.

Brand discipline stays the same: brutalist quant aesthetic, mono and serif typography, no flashy graphics, no celebratory framing, no betting language.

## What to build

Five pieces. Four required, one optional. They are independent enough that the agent can phase them within the PR if useful.

### 1. Mode card glyph upgrades (B1)

The three mode cards on `/scenario` already render small icons in their corners via `ChampionsPathGlyph`, `FinalFourGlyph`, `FullBracketGlyph` from `website/src/components/simulator/icons/ModeGlyphs.tsx`. The icons are easy to miss because they're small and positioned in the top-right corner.

Two options:

**Option A: redesign the existing glyphs to be more distinctive and prominent**.
Move each glyph to a more visible position (e.g., top-left of the card body, larger size). Hand-drawn-feel geometric primitives. Suggested designs:

- **Final Four**: 2 by 2 grid of small squares (the 4 semifinalists). 24px square, mono `--text-tertiary` at rest, `--accent-warm` on hover.
- **Champion's Path**: 4 small dots connected by 3 short line segments (the path through R16, QF, SF, F). Same sizing and colors.
- **Full Bracket**: a minimal bracket tree with 4 leaves merging into 2 then 1. Same sizing and colors.

**Option B: keep existing glyphs but bump their size and prominence**.
If the existing icons are already visually distinct (which the agent should verify), increase their size from current (probably 16px) to 24-32px and move them to a more prominent position.

Pick whichever is cleaner given the actual current state. Document the choice in the report.

**Important**: no imported icon libraries. SVG inline or pure CSS only. Match the brutalist hand-drawn-feel aesthetic of the rest of the site.

### 2. ModelCallPanel header reframing (B2)

Open `website/src/components/simulator/ModelCallPanel.tsx`. The current header reads:

- Final Four: `N OF 4 SEMIFINALISTS MATCH THE MODEL'S MODAL CALL`
- Champion's Path: `N OF M STAGES MATCH THE MODEL'S MODAL CALL`
- Full Bracket: `N OF M ADVANCEMENTS MATCH THE MODEL'S MODAL CALL`

The word "MATCH" reads like a grade for new users ("you got 0 of 4 right"). The brand-intended meaning is set-theoretic ("0 teams in common between your call and the model's call"), which is interesting, not bad.

**Locked replacement** (universal pattern across all three modes):

- Final Four: `OVERLAP · N OF 4 SEMIFINALISTS`
- Champion's Path: `OVERLAP · N OF M STAGES`
- Full Bracket: `OVERLAP · N OF M ADVANCEMENTS`

The `OVERLAP · ` prefix is set-theoretic vocabulary that operators recognize. The count is preserved (N OF M) so users still get the at-a-glance numerical summary. The "WITH THE MODEL'S MODAL CALL" tail is dropped because the eyebrow above the header (`MODEL CALL · COMPARISON`) already establishes that context.

Side benefit of dropping the tail: the header line is shorter, which gives the side-by-side comparison columns below more visual weight.

**Do not change**:
- The eyebrow (`MODEL CALL · COMPARISON`).
- The two-column comparison body.
- The accent-border highlighting on matching items.
- The provenance footer.

### 3. "What this means" expandable on reveal page (B3, OPTIONAL)

If this can be implemented in under 60 lines of code and feels right against the brand, ship it. If it's complex (60+ lines, requires new state plumbing), defer to a future checkpoint and document the decision.

The expandable sits between the `RealityScoreReveal` and the `ModelCallPanel` on `/scenario/p/[id]`. Default state: collapsed, single mono line that says `WHAT THIS MEANS ›` (right-arrow chevron). Click expands.

**Locked expanded copy** (per mode):

Final Four:
```
WHAT THIS MEANS

Your scenario sits at 1 in {N} rarity. In 10,000 simulated tournaments,
[Team1, Team2, Team3, and Team4] reached the semifinals together in
{N} of them. The model computes this from each team's marginal
semifinal probability, assuming independence between bracket halves.

As matches settle in June, your scenario will transition to alive,
dead, or promoted. You'll receive a digest each morning if anything
changed overnight.
```

Champion's Path:
```
WHAT THIS MEANS

Your scenario sits at 1 in {N} rarity. The model places {Team}'s
journey through these stages at this probability. As matches settle,
the scenario evolves: each settled stage that matches your call
sharpens the rarity; each contradicted stage marks the scenario as
dead.
```

Full Bracket:
```
WHAT THIS MEANS

Your scenario sits at 1 in {N} rarity. This is the joint probability
of your bracket calls at the deepest stage you committed to. As
matches settle, the scenario sharpens or breaks. A digest fires each
morning if anything changed overnight.
```

Styling: same as the `RealityScorePanel` resolution-floor caveat (12pt italic sans, `--text-quiet`). Expand/collapse via simple CSS toggle or `<details>` element. Dismissible state persists in `localStorage` so the user only sees the expand affordance the first time per device (after expanding once, the panel stays expanded; after collapsing, it stays collapsed across sessions).

If shipping: add an analytics event `reveal_meaning_expanded` with no props, fires once per session.

If deferring: leave the reveal page unchanged and add a one-line note in the V2-03 report explaining the deferral.

### 4. Bracket page contrast-aware text (B4)

Open `website/src/app/(quant)/bracket/page.tsx` and the bracket rendering component (likely `BracketBoard` or similar). The 48 by 6 probability matrix renders cells with a prism ramp (purple at high probabilities, fading through coral, peach, and grey at low probabilities). White text overlays the cells.

At medium probabilities (roughly 14% to 30%), the cell background becomes peach or coral and white text loses contrast.

**Fix**: contrast-aware text color. Two implementation paths; pick the one that fits the existing code structure.

**Path A: CSS-based luminance check (preferred if the cell color is set via CSS)**.

If cell backgrounds are set via `style={{ background: ... }}` with hex/HSL values, add inline contrast-aware text:

```tsx
function getReadableTextColor(bgHex: string): string {
  // W3C luminance approximation
  const r = parseInt(bgHex.slice(1, 3), 16) / 255;
  const g = parseInt(bgHex.slice(3, 5), 16) / 255;
  const b = parseInt(bgHex.slice(5, 7), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.5 ? "var(--text-primary-dark)" : "var(--text-primary)";
}
```

Apply per cell. `--text-primary-dark` would be a new token (a dark color that works on light backgrounds, e.g., `#0F1216`, the same value as `--bg-root`). Add it to the global stylesheet if it doesn't exist.

**Path B: data-driven class (preferred if cell colors come from a finite set of ramp stops)**.

If the prism ramp has discrete stops (e.g., 7 color tiers), precompute which tiers need light text vs dark text. Add a CSS class per cell based on its tier. The class controls the text color.

Either way, the user-visible result is the same: text remains readable across the entire probability range.

**Verification**: open the bracket page after the change. Look at Spain's row: 30.1% (FIN column) should be clearly readable. Same for France's 28.5%, Argentina's 27.0%, Morocco's 29.4%, Brazil's 30.4%. None of these should be straining to read.

### 5. Goal matrix heatmap (B5)

Open the match detail page and the heatmap component. Same contrast issue as the bracket page; same fix. Plus two additional changes:

**Stronger selected-cell highlight**: the currently-selected cell is highlighted with a border. Make the border thicker (2px instead of 1px) and use `--accent-warm` (the simulator's accent peach) so it pops against the heatmap colors.

**Top-3 modal scoreline indicators**: the side panel lists the top three modal scorelines (e.g., 4-0 at 8.76%, 3-0 at 8.36%, 5-0 at 7.35%). The actual cells in the matrix aren't visually distinguished.

Add a small `#1`, `#2`, `#3` badge to the top-right corner of the three highest-probability cells. Mono uppercase, 9-10px, `--accent-warm` text on a 1px `--accent-warm` border background. The badge sits inside the cell without overlapping the probability value.

User flow: open match detail, immediately see which 3 scorelines are most likely, scan the matrix to find them, click any cell for details. Currently the user has to read the side panel and then visually search the matrix; the badges make this scan instant.

## Acceptance criteria

- Mode cards on `/scenario` show distinctive glyphs that visually suggest each mode (4-in-a-grid for Final Four, path/dots for Champion's Path, bracket tree for Full Bracket). Hover state transitions to `--accent-warm` for both glyph and label.
- ModelCallPanel header reads `OVERLAP · N OF M [things]` across all three modes.
- (Optional) Reveal page has a `WHAT THIS MEANS ›` expandable with locked copy per mode. If shipped, fires `reveal_meaning_expanded` analytics event. If deferred, documented in the report.
- Bracket page cells with medium-probability backgrounds (14% to 30%) render readable text. Specifically: Spain 30.1% / France 28.5% / Argentina 27.0% / Morocco 29.4% / Brazil 30.4% / Germany 17.7% / Belgium 16.6% all clearly readable.
- Goal matrix heatmap: same contrast fix on the match detail page. Plus stronger selected-cell highlight (2px `--accent-warm`) and `#1`/`#2`/`#3` badges on the top-3 modal scoreline cells.
- TypeScript build clean.
- All existing tests pass.
- No em-dashes or en-dashes in any new or modified file.
- `node scripts/check-forbidden-words.mjs` passes.
- No new third-party dependencies.
- No new color tokens beyond `--text-primary-dark` if needed for the contrast fix.

## Brand-discipline guardrails (non-negotiable)

- Brutalist quant aesthetic preserved.
- Mode card glyphs are hand-drawn-feel geometric primitives. No icon library imports (no lucide-react, no heroicons, no react-icons). SVG inline or CSS only.
- Header reframing is locked at `OVERLAP · N OF M [things]`. Do not rephrase to `DIVERGENCE`, `MATCHES`, `IN COMMON`, etc.
- "What this means" expanded copy is locked exactly as specified per mode. Do not paraphrase.
- The `#1` `#2` `#3` badges on the heatmap use only `--accent-warm` and existing brand tokens. No new colors.
- No celebratory copy anywhere. No "Nice!", "Great call!", "Well done!".

## Workflow

- Plan first. Same pattern as V2-01 and V2-02: locate the files, identify trade-offs, surface ambiguities, then implement.
- Branch: `ux/v2-03-polish-and-contrast`.
- Branch off latest `origin/main` (V2-02 should be merged by the time you start).
- Open a pull request when complete. Do not push directly.
- Verify end-to-end on the dev server before opening the PR:
  - Open `/scenario`: confirm the three mode cards have distinctive glyphs. Hover each card; glyph and label should transition to `--accent-warm`.
  - Open any permalink `/scenario/p/[id]`: confirm the ModelCallPanel header now reads `OVERLAP · N OF M [things]`.
  - If shipped: click `WHAT THIS MEANS ›`; confirm it expands with the locked copy. Refresh; confirm the expanded state persists.
  - Open `/bracket`: confirm Spain's 30.1% (FIN column) is clearly readable. Sample 3 more mid-range cells.
  - Open any match detail page: confirm contrast fix + selected-cell highlight + top-3 modal scoreline badges.

## End-of-task report

```
## V2 Checkpoint 3 Report: Polish + contrast fixes

### Branch
ux/v2-03-polish-and-contrast

### Files changed
- path/to/file (added | modified): one-line summary
- ...

### Diff size
Lines added: N
Lines removed: M
Files touched: K

### B1: Mode card glyphs
- Option A (new designs) or Option B (resize existing). Rationale.
- Glyph designs (one-line description each).

### B2: ModelCallPanel header
- Confirm locked copy applied to all three modes.

### B3: "What this means" expandable
- Shipped or deferred. If deferred, why.
- If shipped: where the localStorage flag lives, analytics event placement.

### B4: Bracket page contrast
- Path A (luminance computation) or Path B (data-driven class). Rationale.
- New tokens added if any (e.g., --text-primary-dark).

### B5: Goal matrix heatmap
- Contrast fix mechanism (same as B4 or different).
- Selected-cell highlight change.
- Top-3 modal badges placement, sizing, color.

### Manual verification
- [ ] /scenario mode cards have distinctive glyphs
- [ ] Hover transitions to accent-warm
- [ ] ModelCallPanel header reads OVERLAP · N OF M
- [ ] (Optional) WHAT THIS MEANS expandable works
- [ ] Bracket cells in 14-30% range are clearly readable
- [ ] Match detail heatmap cells are clearly readable
- [ ] Selected cell highlight is visible
- [ ] Top-3 modal scoreline badges visible in the heatmap
- [ ] TypeScript build clean
- [ ] All existing tests pass
- [ ] em-dash grep returns zero
- [ ] check-forbidden-words.mjs passes
- [ ] No new third-party deps

### Visual diff
- /scenario before/after (showing mode card glyphs)
- /scenario/p/[id] before/after (ModelCallPanel header)
- /bracket before/after (showing improved contrast on Spain row, etc.)
- Match detail before/after (heatmap + badges)

### Follow-ups
- Anything noticed but deferred (B3 if not shipped, any contrast edge cases).

### Ready for review
Y / N
```

Do not push to main. Wait for review.

## What this delivers and how to test it

### What changes for the user

**Cold visitor on /scenario**: the three mode cards now have distinctive visual glyphs that suggest their purpose. Pattern recognition kicks in faster; the user understands at a glance which mode they want.

**User submitting a prediction**: when they reach the permalink, the ModelCallPanel header no longer reads "0 OF 4 MATCH THE MODEL'S MODAL CALL" (which felt like a grade). Instead it reads `OVERLAP · 0 OF 4 SEMIFINALISTS`. Same information, set-theoretic framing, no grade implication.

**New user on the permalink**: if the "What this means" expandable shipped, a small `WHAT THIS MEANS ›` link sits between the reveal and the comparison. Clicking it explains what the 1-in-N number means and what happens during the tournament. Returning users who have already seen it have the panel collapsed by default.

**User on /bracket**: every cell in the 48 by 6 probability matrix is clearly readable. Spain's 30.1%, France's 28.5%, all the mid-range probabilities that were hard to read before are now legible.

**User on a match detail page**: the goal matrix heatmap is clearly readable, the selected cell pops, and the top-3 most likely scorelines have small `#1` `#2` `#3` badges so the user can find them at a glance.

### How to test it as the operator (Nicolas)

Pre-merge on the Vercel preview deploy:

1. Open `/scenario`. Confirm the three mode cards have distinctive glyphs. Hover each; both glyph and label should transition to `--accent-warm`.
2. Submit a Final Four prediction (or open an existing permalink). Confirm the ModelCallPanel header reads `OVERLAP · N OF 4 SEMIFINALISTS` (where N is your overlap count).
3. Open the Champion's Path mode, submit a partial path, check the header on its permalink: `OVERLAP · N OF M STAGES`.
4. Open Full Bracket, submit, check: `OVERLAP · N OF M ADVANCEMENTS`.
5. If "What this means" shipped: click the chevron; confirm it expands with the locked copy. Refresh the page; confirm the expanded state persists across reloads.
6. Open `/bracket`. Find Spain's row. Confirm 30.1% (the FIN column) is clearly readable. Same for France 28.5%, Argentina 27.0%, Morocco 29.4%, Brazil 30.4%. None should require squinting.
7. Open any match detail page (e.g., `/match/M01`). Confirm the heatmap text is readable on all cells. Click any cell; confirm the highlight pops (thicker, terminal-amber). Look for `#1` `#2` `#3` badges on the top-3 cells; confirm they match the side panel's modal scorelines list.

### How to test as a returning user

You should not notice anything breaking. Past predictions render correctly on permalinks. The Forecast Desk still works. The calibration emails still fire on the same schedule. The performance work from V1 Checkpoints 16 and 17 holds (static prerender on `/` and `/bracket`).

### What still does not change

V2 Checkpoint 3 is the LAST checkpoint in the V2 plan. After it lands, the simulator-side UX work is complete. The data pipeline, email infrastructure, live ingestion, performance optimization: all unchanged. The brand discipline holds across the entire surface.

### If results disappoint

If the mode glyphs feel weak, the icons are easy to swap in a one-line update. If the OVERLAP header reframing feels wrong tonally, the alternative `IN COMMON · N OF M [things]` is a one-line change away. If the bracket contrast fix introduces a regression on dark cells (white text becoming dark text where it shouldn't), the luminance threshold is a one-number tuning change.

If the heatmap badges feel cluttered, drop them and keep just the side-panel modal list. Trivial revert.

None of these changes are baked-in commitments. They are easy to refine post-launch based on real user feedback.

### After this lands

The full V2 rollout is shipped: simulator landing simplified (V2-01), Champion's Path progressive disclosure + Full Bracket clarity (V2-02), polish + contrast fixes (V2-03). The product is in its strongest pre-launch state.

What remains:
- Optional: implement the marketing strategy that the marketing agent produced (separate workflow, not a code checkpoint).
- Optional: address any feedback from real users once content starts hitting social media.
- Wait: tournament starts June 11. The system runs itself from there.

Take a moment.
