# Checkpoint 2: Ghost-fill Final Four with the model's modal call

## Context

You are working on the 45 Analytics codebase (`the-45-percent-problem` repo). The attached file `APP_UX_EVALUATION_2026-05-13.md` is the evaluation that motivates this work. This task implements recommendation **P0.5 (Pre-fill Final Four with the model's modal call)** from that evaluation.

Checkpoint 1 (Plausible instrumentation) has already landed on main. The `track()` helper at `website/src/lib/analytics/track.ts` is available; you should fire one event from this checkpoint (details below).

## Why this matters

Behavioural pattern: endowed progress (Nunes & Dreze 2006). A cold visitor who lands on `/scenario/final-four` currently sees four empty slots and 48 team chips and has to commit four picks before they get any payoff. Ghost-fill gives them a one-click path to a complete scenario; they get the Reality Score reveal immediately and are then primed to edit and try their own picks. This is the lowest-friction first submission we can offer without compromising the meaning of the score.

## What to do

Add a button to `ModeFinalFour` that pre-fills the four slots with the model's modal semifinalists when clicked. The button is visible only on the initial empty state and disappears the moment the user engages.

### Behaviour

1. **Show the button** when no slots are filled and the user has not yet interacted with the mode in this session.
2. **On click**: fill all four slots with the model's modal Final Four. The team picker grid auto-collapses (existing `manuallyExpanded` / `pickerExpanded` behaviour, `ModeFinalFour.tsx:200-205`). The submit button enables. The live agreement gauge transitions to "complete".
3. **Hide the button permanently for the session** once any slot is filled (whether by ghost-fill click, manual pick, or drag-and-drop). If the user later clears all slots, the button does not reappear; they have already shown they know how to interact.
4. **Persist the "has interacted" flag** across page reloads via the existing inflight buffer (`readInflightForMode` / `writeInflight` at `website/src/lib/sim/inflightStore.ts`). A returning user who already engaged in a previous session-buffer state should not see the button.
5. **Fire `track("first_pick", { mode: "final_four" })` on ghost-fill click**. The existing `claimFirstPick("final_four")` helper handles dedup, so a subsequent manual pick will not double-fire. Reasoning: ghost-fill is a real engagement signal even though it is not a per-team pick.

### Visual design

- **Label**: `[ Start from the model's call ]`
- **Position**: between the slot row (`ModeFinalFour.tsx:358-375`) and the team picker grid (`ModeFinalFour.tsx:382-404`). It should read as a quiet alternative to manual picking, not as the primary CTA.
- **Style**: mono uppercase, square-bracketed terminal motif. Match the visual weight of the existing `[ Reset ]` button (`ModeFinalFour.tsx:344-350`) but slightly more prominent since it is a forward action, not a destructive one. Use existing tokens (`--text-tertiary` at rest, `--accent-warm` on hover, 1px border in `--border-default`, no fill at rest). Do not introduce new color tokens.
- **No icon, no emoji, no confetti, no celebration animation.** Brutalist quant.

### Source of the modal Final Four

The four teams that are simultaneously in the model's modal bracket at the semifinal stage. Two valid approaches:

1. **Read from the existing modal-chain data**. The home page's `MostLikelyBracket` component (`website/src/components/compositions/MostLikelyBracket.tsx`) already renders the modal chain through SF and final, so the data is already in the snapshot pipeline (`loadSnapshot()` and `mergeTournament()` in `website/src/lib/db/structuralMerge.ts`). Extract the four SF participants from that chain.

2. **Top 4 by P(reach SF)** if option 1 is awkward or the modal chain only encodes the upper-half winners. Use the `pS` marginal from `website/src/lib/sim/snapshotProbs.ts` and pick the four highest-probability teams.

Prefer option 1 if it is clean. If you take option 2, add a one-line code comment explaining why and flag it in the report. Either way, the button must label this as "the model's call" honestly; do not paint it as a guaranteed prediction.

### Wiring

- The page `website/src/app/(simulator)/scenario/final-four/page.tsx` currently passes `modelSha` and `snapshotSha` to `ModeFinalFour`. Add a third prop `modalSemifinalists: TeamCode[]` computed server-side from the snapshot.
- `ModeFinalFour` accepts the prop and renders the button only when it is non-empty (graceful degradation if the snapshot does not yet contain modal data).
- If `modalSemifinalists.length !== 4`, do not render the button. Log no errors; this is expected during certain snapshot states.

## Acceptance criteria

- Button labelled `[ Start from the model's call ]` renders below the slot row when slots are empty and the user has not interacted.
- Clicking it fills all four slots with the model's current modal SF.
- Button hides immediately after click and does not reappear in the same session.
- Manual pick or drag-and-drop also hides the button permanently for the session.
- Returning user with any inflight engagement state does not see the button.
- `track("first_pick", { mode: "final_four" })` fires on ghost-fill click (verified via DevTools Network tab).
- No new user-visible UI elements besides this one button.
- TypeScript build clean.
- Existing tests pass.
- No accessibility regression: button is keyboard-focusable, has a clear `aria-label`, and does not trap focus.

## Brand-discipline guardrails (non-negotiable)

- No em-dashes or en-dashes anywhere, including code comments. Use periods, semicolons, colons, parentheses.
- No betting language in any new string ("edge", "lock", "pick", "play", "value", "parlay", "tip", "expert", etc.). Note: "pick" specifically is fine as a verb in code (handlePick) but should not appear in user-facing copy on this button.
- The button copy is `[ Start from the model's call ]`. Do not rephrase it to "Use the model's pick" or "Show the favourites" or "Auto-fill".
- No celebratory animation on the slots filling. The fill should use the existing `AccentPulse` per-slot mechanism (`ModeFinalFour.tsx:120, 173-176, 239-246`) just like a manual pick would, nothing more.
- The Reality Score for the ghost-filled scenario will land in the Plausible or Common rarity band; this is correct and expected. Do not add any "you picked the favourites" overlay or commentary; let the existing Reality Score speak for itself.

## Workflow conventions (from CLAUDE.md)

- Work on a feature branch named `ux/checkpoint-02-ghost-fill-final-four`.
- Open a pull request when complete. Do not push directly to main.
- Run `scripts/install-hooks.sh` once if you have not already; the pre-push hook blocks conflict markers.
- If a merge conflict appears during rebase, use `git fetch origin && git reset --hard origin/main` then re-apply your work; do not use `git stash pop`.

## End-of-task report

When the work is complete, produce a report in exactly this format:

```
## Checkpoint 2 Report: Ghost-fill Final Four

### Branch
ux/checkpoint-02-ghost-fill-final-four

### Files changed
- path/to/file (added | modified): one-line summary
- ...

### Diff size
Lines added: N
Lines removed: M
Files touched: K

### What landed
- Source of the modal SF (option 1 or option 2, with one-line rationale)
- Where the button mounts and how visibility is gated
- How the "has interacted" flag persists across reloads

### Manual verification
- [ ] Button appears on first visit with empty slots
- [ ] Click fills all four slots with the model's modal SF
- [ ] Button disappears after click and stays gone for the session
- [ ] Manual pick or drop also hides the button
- [ ] Reload after engagement does not re-show the button
- [ ] first_pick fires once on ghost-fill click (per session)
- [ ] Submit flow works correctly with the ghost-filled scenario
- [ ] Reality Score reveal renders the expected band for the model's own call
- [ ] No SSR or hydration warnings
- [ ] TypeScript build clean
- [ ] Existing tests pass
- [ ] Keyboard-only navigation reaches and activates the button

### Follow-ups / open questions
- Anything you flagged but did not implement, with one-line rationale.

### Ready for review
Y / N. If N, state what is blocking.
```

Do not push to main. Wait for the user to review the report and approve.
