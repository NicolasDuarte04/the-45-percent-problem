# Checkpoint 4: "You vs the model" panel on the permalink

## Context

You are working on the 45 Analytics codebase (`the-45-percent-problem` repo). The attached file `APP_UX_EVALUATION_2026-05-13.md` is the evaluation that motivates this work. This task implements recommendation **P0.2 ("You vs the model" panel)** from that evaluation, and is constrained by **anti-recommendation A5** in the same document.

Checkpoints 1 through 3 have already landed on main:
- Plausible custom events are wired (`website/src/lib/analytics/track.ts`).
- Final Four mode has a `[ Start from the model's call ]` ghost-fill button.
- The Reality Score reveal has an anticipation beat (`website/src/components/simulator/reality/RealityScoreReveal.tsx`).

This task is the largest of the P0 set in terms of substance. Plan accordingly.

## Why this matters

Behavioural pattern: competence vs badge theater (Pattern 6 in the evaluation). The current reveal tells the user how rare their scenario is (the Reality Score) but does not tell them where their call diverges from the model. Without that surface, the simulator is one-shot: the user submits, sees a rarity band, and has no surface to learn from.

The "you vs the model" panel turns that one-shot into a comparison. The user sees, item-by-item, where their call matches the model's modal call and where it differs. This is the strongest in-brand engagement mechanic available to us: it uses the model's own published distributions as the reference, it never paints the user as right or wrong, and it invites the user back when the model updates.

## Anti-recommendation A5: read this before you write a single line

The evaluation explicitly flagged that the "you vs model" comparison must be **neutral**. From the evaluation:

> Do not paint the user's number red on disagreement; do not surface a "the model thinks you're wrong" line. The right framing is "the model and your call differ here; here is why the model lands where it does."

Specific constraints:

- **No red / green sentiment colours**. Matches and mismatches share the brand palette (terminal-green, terminal-amber, off-white, bone, `--accent-warm` for any accent). Use opacity, weight, or accent state to differentiate; do not use semantic colours.
- **No accuracy score**. Do not show "75% accuracy", "you scored 3 / 4", a star rating, or any framing where higher is better. Use a descriptive count: `3 OF 4 MATCH`.
- **No celebratory tone**. No "great call", "nice", "good guess", emoji, exclamation marks.
- **No judgmental tone**. No "the model disagrees", "you missed", "not quite". Reserve the word "miss" entirely. Reserve the word "wrong" entirely.
- **No anthropomorphism**. The model does not "agree" or "think". It produces marginal probabilities. Use neutral phrasing: "the model's modal call", "the model places this at [X]%", "where your call differs from the model".
- **No predictive certainty language**. Even for the model's side: never say "the model predicts X". Say "the model's modal call is X" or "the model's most likely value here is X".

If you find yourself reaching for a sentiment word, stop and use a set-theoretic word instead: `match`, `differ`, `overlap`, `set`, `count`, `share`.

## What to build

Add a new component `ModelCallPanel` and mount it on the permalink page between the hero (current `StaggeredRevealItem index={0}`) and the share strip (current `StaggeredRevealItem index={1}`).

### Files to add or modify

- **Add**: `website/src/components/simulator/ModelCallPanel.tsx` (server component preferred; if you need client interactivity for any reason, justify in the report).
- **Modify**: `website/src/app/(simulator)/scenario/p/[id]/page.tsx` (mount the new component, renumber the existing `StaggeredRevealItem` indices).

### Position on the permalink page

The current cascade is hero (index 0) -> share (index 1) -> alert (index 2). Insert `ModelCallPanel` as index 1 so the new order becomes hero (0) -> ModelCallPanel (1) -> share (2) -> alert (3). The agent should renumber the share and alert items accordingly. The 180ms cascade between items is preserved.

### Header copy pattern

Lock the header to this descriptive form:

```
[N] OF [M] [things] MATCH THE MODEL'S MODAL CALL
```

Examples:

- Final Four: `2 OF 4 SEMIFINALISTS MATCH THE MODEL'S MODAL CALL`
- Champion's Path: `3 OF 4 STAGES MATCH THE MODEL'S MODAL CALL`
- Full Bracket: `19 OF 31 ADVANCEMENTS MATCH THE MODEL'S MODAL BRACKET`

Mono uppercase, `--text-tertiary`, eyebrow weight. This is the header line of the panel; the body below is the per-item comparison.

### Mode-aware body

#### Final Four

- User's picks: `view.scenario.semifinalists` (4 TeamCodes).
- Model's modal four: top 4 teams by `p_semifinal` from `loadTournament()`. This is the same set checkpoint 2 uses for ghost-fill. Reuse the same helper if you can extract it cleanly.
- Match metric: set intersection between user's 4 and model's 4. Header shows `[N] OF 4`.
- Body layout: two labelled columns side-by-side, `YOUR CALL` and `MODEL'S CALL`. Each column lists 4 teams, code + flag, sorted alphabetically within each column. Teams that appear in both columns get a quiet accent (e.g., `--accent-warm` underline or 1px left border on the team chip); teams that appear in only one column have no accent.
- Mobile: stack the two columns vertically with the labels still mono uppercase.

#### Champion's Path

- User's path: `view.scenario` has `team` (the user's chosen team) and `r16` / `qf` / `sf` / `f` stage entries with `opponent` and `result` (W or L) fields.
- Model's modal opponent per stage: this is the harder bit. Two acceptable approaches:
  - **Approach A (preferred if reachable)**: read the model's modal bracket chain (the same data `MostLikelyBracket` consumes on the home page) and extract the modal opponent at each stage in the user's team's bracket path. The agent should investigate the home page composition pipeline (`loadTournament`, `mergeTournament` in `website/src/lib/db/structuralMerge.ts`) and `website/src/components/compositions/MostLikelyBracket.tsx` for the modal-chain data shape.
  - **Approach B (fallback if A is awkward)**: per stage, show the user's opponent and result alongside the model's marginal probability that the user's team is even at that stage (P(reach stage)). No opponent comparison; calibration comparison only.
- Use approach A if you can do it in under ~80 lines of new code. Use approach B otherwise, and flag in the report that opponent comparison was deferred.
- Match metric:
  - **Approach A**: count of stages where user's opponent equals the model's modal opponent at that stage. 0 to 4 matches.
  - **Approach B**: count of stages where the user's W/L result aligns with the sign of the model's marginal probability the team is at that stage (W if `P(reach) >= 0.5` is debatable; pick a simple rule and document it). Or just drop the header count entirely and rely on the per-stage probabilities to speak for themselves.
- Body layout: a 4-row table with columns: STAGE | YOUR OPPONENT | RESULT | MODEL'S CALL. Stage labels: R16 / QF / SF / F (use the same labels the user picked on the input page).

#### Full Bracket

- User's bracket: `view.scenario.koAdvancers` (array of 31 TeamCodes; index 30 is the champion).
- Model's modal bracket: the 31-element modal chain. Same data source as MostLikelyBracket on the home page.
- Match metric: count of indices where `user.koAdvancers[i] === model.koAdvancers[i]`. 0 to 31 matches.
- Body layout: this is the densest mode. Keep the MVP compact:
  - Top: champion comparison. Two flag+code chips side-by-side: `YOUR CHAMPION` vs `MODEL'S MODAL CHAMPION`. If they match, quiet `--accent-warm` underline.
  - Below: per-round summary count. A 5-row strip showing R32 / R16 / QF / SF / F with a `[N] / [M]` match count per round (e.g., `R16: 5 / 8 MATCH`).
  - Defer a full bracket-vs-bracket grid to a future checkpoint. Note this in the report.

### Visual chrome

- Outer panel: 1px `--border-default` border, `--bg-panel` fill (one tier darker than the dossier card, same as the alert configurator's nested terminal). Or a transparent panel with a 1px top and bottom rule; whichever lands cleaner against the dossier surface.
- Eyebrow row (above the header): `MODEL CALL · COMPARISON` in mono uppercase `--text-tertiary`.
- Header (the `[N] OF [M]` line): mono uppercase, `--text-primary`, larger than the eyebrow.
- Body content uses the existing typography tokens. No new font sizes.
- No icons in the body. No charts. The comparison is visual but it is set-theoretic, not graphical.
- All accents on matches use `--accent-warm` (same as the ghost-fill button hover state and the LiveAgreementGauge active segment). Do not introduce new colour tokens.

### Data sources

Reuse what is already in the snapshot pipeline. Do not add new database tables or new API routes for this checkpoint. The data exists in `loadTournament()` / `loadSnapshot()` / `mergeTournament()`. Surface it through composition.

If the modal bracket chain is not directly available in a shape that the panel can read, write a small helper (`website/src/lib/sim/modalBracket.ts` or similar) that derives it from the existing snapshot. The helper should be testable in isolation; you do not need to add tests in this checkpoint, but the helper should be structured so tests could be added later.

### Provenance footer

Below the body, a quiet 11px mono line in `--text-quiet`:

```
Model state · snapshot [YYYY-MM-DDTHH:MMZ] · code [SHA8]
```

The same provenance fields already appear elsewhere on the site (e.g., the homepage footer). Read them from the same place those surfaces read them.

## Acceptance criteria

- New `ModelCallPanel` component renders on `/scenario/p/[id]` between the hero and the share strip.
- StaggeredRevealItem indices have been correctly renumbered so the 180ms cascade still works.
- Final Four mode: header reads `N OF 4 SEMIFINALISTS MATCH THE MODEL'S MODAL CALL` with the correct count, two columns render correctly with matching teams accented.
- Champion's Path mode: 4-row table renders with stage labels, user's opponent + result, model's call (per approach A or B), and the correct header count.
- Full Bracket mode: champion comparison renders, per-round match counts render, header reads `N OF 31 ADVANCEMENTS MATCH THE MODEL'S MODAL BRACKET`.
- Provenance footer renders with snapshot timestamp and code SHA.
- No red / green sentiment colours anywhere in the new component.
- No celebratory or judgmental language anywhere in the new strings.
- No new user-facing UI strings use the words: "agree", "agrees", "predict", "predicts", "right", "wrong", "miss", "missed", "score", "scored", "accuracy", "win", "lose", "won", "lost" (except where genuinely set-theoretic, e.g., "WIN" as a stage result label inherited from the user's input).
- The panel is server-rendered. No new client-side hooks needed for the MVP.
- TypeScript build clean.
- Existing tests pass.
- Keyboard navigation reaches the panel content (none of it is interactive; tab order should pass through unchanged).
- Screen reader: each comparison row has a clear label. Use `aria-label` on the panel section.

## Brand-discipline guardrails (non-negotiable)

- No em-dashes or en-dashes in any new or modified file, including code comments. Use periods, semicolons, colons, parentheses.
- No betting language in any new string ("edge", "lock", "pick" as a noun, "play", "value", "parlay", "tip", "expert", "favourite" in a sentiment sense, etc.).
- The vocabulary discipline in the "no new user-facing UI strings use the words" list above is the most important guardrail in this checkpoint. Re-read it before writing copy.
- The panel is descriptive, not evaluative. If your copy could be read as a grade, a score, a critique, or a compliment, rewrite it.

## Workflow conventions (from CLAUDE.md)

- Work on a feature branch named `ux/checkpoint-04-model-call-panel`.
- Open a pull request when complete. Do not push directly to main.
- Run `scripts/install-hooks.sh` once if you have not already; the pre-push hook blocks conflict markers.
- If a merge conflict appears during rebase, use `git fetch origin && git reset --hard origin/main` then re-apply your work; do not use `git stash pop`.

## End-of-task report

When the work is complete, produce a report in exactly this format:

```
## Checkpoint 4 Report: ModelCallPanel

### Branch
ux/checkpoint-04-model-call-panel

### Files changed
- path/to/file (added | modified): one-line summary
- ...

### Diff size
Lines added: N
Lines removed: M
Files touched: K

### What landed
- Where the panel mounts and how the cascade was renumbered
- Per-mode body layout summary (one paragraph each)
- Data source: how the model's modal call is computed per mode
- For Champion's Path: which approach (A opponent-comparison, or B marginal-probability) and why
- For Full Bracket: what was deferred (e.g., full-grid diff) and why
- Provenance footer source

### Manual verification
- [ ] Final Four panel renders with correct match count and column layout
- [ ] Champion's Path panel renders with correct stage rows
- [ ] Full Bracket panel renders with correct champion + per-round counts
- [ ] No red / green sentiment colours anywhere
- [ ] No banned vocabulary words in any new string (see prompt)
- [ ] Cascade order: hero -> ModelCallPanel -> share -> alert; 180ms steps preserved
- [ ] Mobile layout: columns stack correctly on narrow viewports
- [ ] Screen reader announces each comparison row with a clear label
- [ ] No SSR or hydration warnings
- [ ] TypeScript build clean
- [ ] Existing tests pass

### Vocabulary self-check
Paste the output of grepping the new component for each banned word:
- agree / agrees: [count]
- predict / predicts: [count]
- right / wrong: [count]
- miss / missed: [count]
- score / scored / accuracy: [count]
All counts should be 0 except where a banned word appears inside the user's own input data (e.g., a "W" result label that gets rendered as "WIN").

### Follow-ups / open questions
- Anything you flagged but did not implement, with one-line rationale.

### Ready for review
Y / N. If N, state what is blocking.
```

Do not push to main. Wait for the user to review the report and approve.
