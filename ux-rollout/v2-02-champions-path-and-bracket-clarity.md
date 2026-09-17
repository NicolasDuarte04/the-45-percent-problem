# V2 Checkpoint 2: Champion's Path progressive disclosure + Full Bracket clarity

## Context

V2 Checkpoint 1 shipped: the 48-team flag wall is gone from `/scenario`, the trailer is replaced with a three-step static diagram, and the Final Four picker has a probability-descending default sort with search and region toggles. The simulator landing and the Final Four mode are now noticeably less hostile to cold visitors.

This is V2 Checkpoint 2 (priority A3, A5, A6 from `APP_UX_EVALUATION_V2_2026-05-17.md`). Two surfaces still carry significant UX debt:

- **Champion's Path** currently renders all 4 stage rows (R16, QF, SF, F) with empty opponent slots and W/L buttons before the user has even picked their team. Visual overwhelm pre-action.
- **Full Bracket** group ranking uses drag-to-reorder with implicit position semantics. Users have to infer "position 1 = winner, position 3 = 3rd-place finisher." The operator was confused about whether 3rd-place teams were chosen by them or by the model.

This checkpoint fixes both. Read `APP_UX_EVALUATION_V2_2026-05-17.md` (specifically the walkthrough sections on `/scenario/champions-path` and `/scenario/full-bracket`, and the Design Principles section) before implementing.

## Why this matters

Behavioral grounding:

- **Hick's Law**: response time scales logarithmically with visible choices. Currently Champion's Path shows 4 empty stage rows plus the team picker grid, forcing the user to mentally model 4 future decisions before making the first one. Hiding stages until they're relevant reduces apparent choice load to 1 at a time.
- **Gestalt closure**: partially-filled visual loops create cognitive tension to close. A stage appearing after the previous one completes leverages this: the user feels pulled to fill the new stage just as they did the last.
- **Endowed progress (Nunes and Dreze)**: each completed stage produces visible progress. The growing list of completed stages is itself a reward.
- **Choice architecture (Sunstein and Thaler)**: making implicit position semantics explicit reduces user error. Labeling each group slot 1st / 2nd / 3rd / 4th means the user understands what their drag actions actually commit to.

Strategic case: the marketing campaign starting in the next two weeks lands social-media traffic on these surfaces. Champion's Path is the "tell your team's story" hook for nationally-aligned content; the current empty-form-of-doom presentation will hurt that funnel.

## What to build

Three pieces. The first is substantial (real state machine work). The second is moderate. The third is a single line of copy.

### 1. Champion's Path progressive disclosure (A3, the big one)

Open `website/src/components/simulator/modes/ModeChampionsPath.tsx`. Current behavior renders all 4 stage rows (R16, QF, SF, F) regardless of whether the user has picked their team or filled prior stages.

New behavior: stages reveal sequentially.

**State machine**:

| State | Visible | Hidden |
|---|---|---|
| No team picked | YOUR TEAM slot, picker grid | All 4 stage rows |
| Team picked | YOUR TEAM (filled), R16 stage (empty), picker | QF, SF, F |
| R16 stage complete (opponent + result both chosen) | + QF stage (empty) | SF, F |
| QF stage complete | + SF stage (empty) | F |
| SF stage complete | + F stage (empty) | nothing |
| F stage complete | All 5 visible (team + 4 stages) | nothing |

**A "stage complete" means BOTH the opponent slot is filled AND a W/L result is selected**. Either one alone does not trigger the next stage.

**Going back / clearing a stage**: if a stage's opponent is cleared OR its W/L result is cleared, hide all subsequent stages and clear their data. The user sees a clean state matching where they're at in the chain.

**Clearing the team**: hides all stages, clears all stage data. User starts over.

**Animation**: stages appear via CSS keyframes (opacity 0 to 1, translateY 8px to 0, 280ms ease-out). Stages disappear via opacity 1 to 0 plus translateY 0 to -4px, 200ms. Reduced-motion: no transition, instant show/hide. Use the brand pattern from V1 Checkpoint 17 (`ck17-*` classes for CSS keyframes); no Framer Motion.

**Submit availability**: the existing partial-submit logic in Champion's Path stays. The user can submit at any "alive" point, not only after all 4 stages. The progressive disclosure does NOT block submission of partial paths.

**Headline copy update**: the existing "First, pick the team you are tracing. Click or drag from the grid." subhead works as-is for the initial state. After team is picked, change the subhead dynamically:

- No team: "First, pick the team you are tracing. Click or drag from the grid."
- Team picked, R16 not complete: "Now tell us what happens in the Round of 16."
- R16 complete, QF not: "Now the Quarterfinal."
- QF complete, SF not: "Now the Semifinal."
- SF complete, F not: "Now the Final."
- All complete: "Your team's full story. Submit when ready."

Mono / serif / sans choices: match the existing subhead (currently a sans-serif paragraph). Same color and size.

**Stage row design**: keep the existing layout (VS OPPONENT slot + W/L buttons). Do not redesign. The change is purely about WHEN each row appears, not WHAT each row looks like.

### 2. Full Bracket group ranking: explicit position labels (A5)

Open `website/src/components/simulator/modes/ModeFullBracket.tsx`. The group ranking interface lets the user drag teams to reorder within a group. Positions are implicit in drag order: position 0 = 1st (winner), position 1 = 2nd (runner-up), position 2 = 3rd, position 3 = 4th (eliminated).

Add explicit position labels to each row.

**Visual spec**:

For each of the 4 rows in a group's ranking display, add a left-aligned position label. Layout:

```
GROUP A
  [pos label]  [flag] MEX
  [pos label]  [flag] RSA
  [pos label]  [flag] KOR
  [pos label]  [flag] CZE
```

Labels (locked copy):
- Row 0: `1st (winner)`
- Row 1: `2nd (runner-up)`
- Row 2: `3rd`
- Row 3: `4th (out)`

Styling:
- Mono uppercase
- Font size: roughly 10px on mobile, 11px on desktop
- Color: `--text-tertiary` (quiet but visible)
- Letter spacing: 0.10em (matches the other small mono labels on the site)
- Min-width: enough to fit "4th (out)" comfortably (about 88px), so columns align

Labels are visually attached to the slot (the position), not the team. When the user drags a team, the team moves; the label stays. This is the whole point: it makes the implicit drag-order semantics explicit.

**Accessibility**: the labels also help screen-reader users understand position. Add `aria-label` to each row that includes both the team code and the position (e.g., "Mexico, 1st (winner)").

### 3. Full Bracket 3rd-place picker contextualization (A6)

Open `website/src/components/simulator/modes/ModeFullBracket.tsx`. After all 12 groups are ranked, a section appears titled "Pick the eight 3rd-place teams that move on." This section auto-fills 12 flags (one per group's 3rd-place finisher) and asks the user to choose 8 of 12.

The operator's confusion: "who said those were the 3rd place teams?" Answer: the user did, implicitly, when ranking the groups. But this connection isn't visible.

Add a single line of explanatory copy IMMEDIATELY before the "Pick the eight 3rd-place teams that move on." heading.

**Locked copy** (do not rephrase):

```
The 12 teams below are the 3rd-place finishers from your group rankings.
8 of them advance to the Round of 32. Pick which 8.
```

Styling:
- Sans-serif (matches the rest of the explanatory copy in Full Bracket)
- Font size: 13 or 14px
- Color: `--text-tertiary`
- Line height: 1.6
- Spacing: roughly `mt-4 mb-3` above the section heading

### Edge cases and gotchas

**Champion's Path**:
- The `ChampionsPathScenario` schema accepts partial paths (some stages can be unfilled). The progressive disclosure must not change submission validation; users can still submit at any "alive" point.
- The inflight buffer (the localStorage state that survives reloads) must respect the new disclosure rule. If a returning user has a team + R16 complete + QF in progress, the page should render: team filled, R16 filled, QF visible (in-progress state).
- The `simulator_opened` analytics event fires once per session as today.
- The `first_pick` event fires when the team is first selected (not when subsequent stages start).

**Full Bracket position labels**:
- The labels are visual-only; they do not change submission data. The underlying scenario schema (groups, koAdvancers) is unchanged.
- Drag-and-drop still works. Test that dragging a team between positions preserves the label layout (labels stay fixed; team chips move).
- Mobile layout: labels may need to be smaller or abbreviated (`1st`, `2nd`, `3rd`, `4th` only). Pick what fits at 375px viewport.

**3rd-place explainer**:
- This copy block should NOT appear before the user has finished ranking all 12 groups. The contextualization is for the moment the 3rd-place picker section enters the DOM.

## Acceptance criteria

- Champion's Path renders only YOUR TEAM slot + picker on initial load (no stage rows visible).
- After team selection, R16 stage appears. After R16 complete, QF appears. Sequential through F.
- Going back / clearing a stage hides subsequent stages and clears their data.
- Clearing the team hides all stages and clears all stage data.
- Stages animate in via CSS keyframes (250 to 300ms fade + slide). Reduced-motion users see no animation.
- Subhead copy updates dynamically per state.
- Full Bracket group ranking shows explicit position labels (1st (winner), 2nd (runner-up), 3rd, 4th (out)).
- Position labels stay fixed to slots; team chips move when dragged.
- 3rd-place picker section is preceded by the locked one-line explainer.
- Submission flow works at every state in Champion's Path (partial submits still produce permalinks).
- Full Bracket submission flow unchanged.
- Drag-and-drop in Full Bracket group ranking still works (test on touch and mouse).
- TypeScript build clean.
- All existing tests pass.
- No em-dashes or en-dashes in any new or modified file.
- No betting language in any new copy.
- `node scripts/check-forbidden-words.mjs` passes.

## Brand-discipline guardrails (non-negotiable)

- Brutalist quant aesthetic preserved. Brand palette only.
- CSS keyframes for animations, not Framer Motion. Use the `ck17-*` class pattern established in V1 Checkpoint 17.
- Position labels are exactly: `1st (winner)`, `2nd (runner-up)`, `3rd`, `4th (out)`. Do not rephrase. Mobile may abbreviate to `1st`, `2nd`, `3rd`, `4th` with parentheticals dropped if space is tight; flag the choice in the report.
- Subhead dynamic copy is exactly as locked above. Do not paraphrase.
- The 3rd-place explainer copy is exactly: "The 12 teams below are the 3rd-place finishers from your group rankings. 8 of them advance to the Round of 32. Pick which 8." Do not rephrase.
- No celebratory copy when a stage completes ("Great pick!", "Nice!", etc.). The stage appearing IS the reward; no additional text.

## Workflow

- Plan first. Same pattern as V2 Checkpoint 1: locate the relevant files, identify trade-offs, surface ambiguities for confirmation, then implement.
- Branch: `ux/v2-02-champions-path-and-bracket-clarity`.
- Branch off latest `origin/main` (V2-01 should be merged by the time you start).
- Open a pull request when complete. Do not push directly.
- Verify end-to-end on the dev server before opening the PR:
  - Champion's Path: pick a team, see R16 appear, fill R16, see QF appear, clear R16's W result, confirm QF disappears.
  - Champion's Path: submit at the R16 stage (partial path). Confirm permalink renders.
  - Champion's Path: submit a full path. Confirm permalink renders.
  - Full Bracket: rank Group A. Confirm position labels are visible and stay fixed when teams are dragged.
  - Full Bracket: rank all 12 groups. Confirm the 3rd-place explainer appears before the section.
  - Full Bracket: pick 8 best thirds. Submit. Confirm flow still works.

## End-of-task report

```
## V2 Checkpoint 2 Report: Champion's Path + Full Bracket clarity

### Branch
ux/v2-02-champions-path-and-bracket-clarity

### Files changed
- path/to/file (added | modified): one-line summary
- ...

### Diff size
Lines added: N
Lines removed: M
Files touched: K

### Champion's Path implementation
- State machine summary (where the "stage complete" check lives, how the inflight buffer rehydrates correctly)
- Animation approach (CSS keyframe names, transition timings)
- Subhead dynamic copy implementation (which state to which string)

### Full Bracket implementation
- Position label rendering (per-row spans, mobile abbreviation handling)
- 3rd-place explainer placement

### Manual verification
- [ ] Champion's Path: only YOUR TEAM + picker on initial load
- [ ] Team picked: R16 stage appears
- [ ] R16 complete: QF appears
- [ ] Clearing R16's W result: QF disappears (and SF/F if visible)
- [ ] Clearing team: all stages disappear
- [ ] Reduced-motion: no animation, instant show/hide
- [ ] Inflight buffer rehydration: returning user with team + R16 complete sees correct state
- [ ] Submit at R16 stage produces a valid permalink
- [ ] Submit at full path produces a valid permalink
- [ ] Full Bracket: position labels visible in each group
- [ ] Position labels stay fixed when teams are dragged
- [ ] 3rd-place explainer appears before the section when all 12 groups are ranked
- [ ] Submission flow end-to-end still works
- [ ] TypeScript build clean
- [ ] All existing tests pass
- [ ] em-dash grep returns zero
- [ ] check-forbidden-words.mjs passes

### Visual diff
- Champion's Path: before/after screenshots showing initial state, after-team-picked, after-R16-complete
- Full Bracket: before/after screenshots of group ranking showing position labels
- Full Bracket: screenshot of 3rd-place picker section with the new explainer line

### Spec ambiguities resolved
- Anything you flagged in the planning phase and how you resolved it.

### Follow-ups
- Anything you noticed but did not fix (e.g., the existing Champion's Path mode could benefit from a stage-by-stage rarity indicator, but that's C-priority polish from the V2 evaluation, not in scope here).

### Ready for review
Y / N
```

Do not push to main. Wait for review.

## What this delivers and how to test it

### What changes for the user

**Champion's Path** becomes a guided, calm experience. A cold visitor opens it and sees only one input: pick your team. They pick. The R16 stage appears with a brief animation. They pick the opponent and W/L. The QF appears. They proceed naturally. At no point do they see 4 empty stage rows demanding their attention before they've made the first decision.

**Full Bracket** group ranking becomes clearer. When the user drags MEX to the top of Group A, the row is labeled "1st (winner)" in mono uppercase next to the team. They immediately understand: the top position is the group winner. The 3rd-place row is labeled "3rd". When the 3rd-place picker section appears later, it's preceded by a single line explaining where the 12 flags came from. No mystery.

### How to test it as the operator (Nicolas)

Pre-merge on the Vercel preview deploy:

1. Open `/scenario/champions-path` in an incognito tab. The page should show YOUR TEAM slot + picker only. No R16/QF/SF/F rows.
2. Click any team (e.g., Argentina). The R16 stage should appear with a brief 250ms fade-in.
3. Pick an R16 opponent. Pick W. Confirm QF appears.
4. Go back, click the R16 W button to deselect (or however the existing UI clears it). QF should disappear.
5. Click the R16 W button again. QF should reappear.
6. Fill QF, then SF, then F. Watch each stage appear sequentially. Confirm subhead copy changes appropriately at each step.
7. Hit Reset. All stages should disappear.
8. Open `/scenario/full-bracket`. Click Group A. Look for position labels: each row should show 1st (winner) / 2nd (runner-up) / 3rd / 4th (out).
9. Drag a team between positions. Confirm labels stay fixed and only the team chip moves.
10. Auto-fill all groups. Submit groups. The 3rd-place picker section should appear with the one-line explainer above it.
11. Pick 8 thirds, submit. Reveal page should still work.

### How to test as a returning user

If you have a Champion's Path prediction in your `/me` Forecast Desk from before this PR, the permalink for that prediction should still render correctly. The inflight buffer should also rehydrate correctly: if your buffer has a team + R16 complete + QF in progress, the page should show the team filled, R16 filled, and QF visible (in-progress, not complete).

### What still does not change

The reveal page, the ModelCallPanel, the share strip, the alert configurator, the Forecast Desk, the Bracket page, the Terminal, the Vault: all unchanged. V2 Checkpoint 3 (polish + bracket/heatmap contrast) is the next thing.

### If something feels wrong

If the progressive disclosure feels too aggressive (users miss the existing stages because they're hidden), the toggle between "show all stages" and "progressive disclosure" is a single state flag in the component; we can adjust the default in a one-line follow-up. If the Full Bracket position labels feel too verbose on mobile, the abbreviation drop (parentheticals removed) is a CSS media query change. If the 3rd-place explainer feels wrong tonally, the copy is locked at the prompt level and changes need to come from product (you), not the agent.
