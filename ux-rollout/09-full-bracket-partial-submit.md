# Checkpoint 9: Full Bracket partial submit

## Context

You are working on the 45 Analytics codebase (`the-45-percent-problem` repo). The attached file `APP_UX_EVALUATION_2026-05-13.md` is the evaluation that motivates this work. This task implements recommendation **P1.1 (Make Full Bracket submit at any completion stage)** from that evaluation.

All eight P0 checkpoints have shipped plus the brand-cleanup sweep. The codebase is brand-disciplined and the cold-to-converted funnel is wired end-to-end. This is the first P1 checkpoint.

This is the largest functional change in the rollout so far. The Full Bracket submission flow currently assumes a fully-committed 31-element knockout bracket. Loosening that assumption touches the scenario type, the scoring helper, the submission API, the rendering on the permalink, and the ModelCallPanel. Plan accordingly.

## Why this matters

Behavioural pattern: completion drive done with mercy (the eval's framing). The current Full Bracket mode requires the user to rank all 12 groups before knockouts unlock, then commit to all 31 knockout outcomes before submission. The evaluation flagged this as a Pattern 3 risk: a hard gate on a mode that already carries the highest abandonment cost. A user who picks 10 of 12 groups, gets distracted, and bounces leaves nothing behind.

Removing the gate lets users submit at any natural stage boundary: groups-only, groups + R32, groups + R32 + R16, and so on up to the full bracket. Each level of commitment produces an honest Reality Score that scales with the depth of the claim. The Champion's Path mode already does this for stage-by-stage outcomes; Full Bracket adopts the same mercy.

## What to build

Five coupled pieces. They should land in one PR because the scenario shape change cascades through all five.

### 1. Partial scenarios in the schema

The current `FullBracketScenario` (`website/src/lib/sim/types.ts` and wherever the Zod schema lives) assumes:
- `groups`: 12 group entries with W / RU / optional 3rd place picks.
- `koAdvancers`: a 31-element `TeamCode[]` with fixed positional semantics:
  - indices 0 to 15: R32 winners (16 teams advancing to R16)
  - indices 16 to 23: R16 winners (8 teams advancing to QF)
  - indices 24 to 27: QF winners (4 teams advancing to SF)
  - indices 28 to 29: SF winners (2 teams advancing to F)
  - index 30: champion (1 team)

Loosen this. The valid submission stages are:

| Stage | Group picks | KO advancers count |
|---|---|---|
| `groups` | 12 | 0 |
| `r32` | 12 | 16 |
| `r16` | 12 | 24 |
| `qf` | 12 | 28 |
| `sf` | 12 | 30 |
| `final` | 12 | 31 |

Implementation options:

**Option A: variable-length `koAdvancers`**. The array length encodes the stage. Length 0 = groups-only, length 16 = R32, ..., length 31 = full. The Zod schema validates that the length is one of the six valid values.

**Option B: explicit `stage` field**. Add a `stage: "groups" | "r32" | "r16" | "qf" | "sf" | "final"` discriminator. `koAdvancers` is variable-length and must match the stage. Slightly more verbose but more self-documenting.

Pick the option that produces the cleanest schema + view changes. Document the choice in the report. Either way, existing complete-bracket records (`koAdvancers.length === 31`) must continue to deserialize and render correctly with zero migration. Add a one-line note in the schema's docstring confirming backward compatibility.

The `PublicPredictionView` and `OwnerPredictionView` shapes need to surface the stage so downstream code (permalink, ModelCallPanel, Forecast Desk) can render appropriately.

### 2. Partial-bracket Reality Score

The current scoring for `full_bracket` is at `website/src/lib/sim/computeRealityScore.ts:140-154`. It reads `koAdvancers[30]` (the champion), multiplies `P(champion) × BRACKET_SCALE` where `BRACKET_SCALE = 0.0025`, and returns the count.

For partial scenarios this hard-coded champion lookup fails (the index is empty when the user did not pick a champion). Replace the scoring with a stage-aware approach:

For each submission, identify the **deepest stage with picks** (groups, r32, r16, qf, sf, or final). Compute the joint probability of the user's picks at that stage using the per-team marginal for "reaches the next stage." Multiply marginals together for the joint, then apply a per-stage depth scale to reflect commitment.

The depth-scale tuning is your call. Start with values that satisfy these constraints:

- Picking the 12 favourites for groups (all top group winners) should land somewhere in **Plausible** band (not Common, since picking the favourites is not actually guaranteed; not Uncommon, since it is the modal outcome).
- Picking the full 31-element favourite bracket (today's max-commitment) should land in **Rare** or **Vanishingly rare** band. The existing `BRACKET_SCALE = 0.0025` for the full bracket already produces this; preserve the production rarity for full brackets (within ~10% of today's count for the same picks).
- Each intermediate stage should produce a rarity strictly between groups-only and full-bracket for the same set of teams.

Document the chosen depth scales in a comment block at the top of the scoring helper with the resulting bands at each stage for a favourites-only bracket. Future maintainers should be able to read the comment and understand the tuning rationale without re-deriving it.

Per-stage marginals to use:
- `groups`: P(team reaches R32) = `pR16` lookup in `snapshotProbs.ts` (the field is named `pR16` because in WC 2026 the post-group stage is the Round of 32, but the snapshot's "R16" field semantically means "first knockout").
- `r32`: P(team reaches R16) = `pQF` (next-round marginal)
- `r16`: P(team reaches QF) = `pSF`
- `qf`: P(team reaches SF) = `pF`
- `sf`: P(team reaches F)
- `final`: P(team is champion) = `pC`

Use the same `TEAM_PROBS` lookup the existing scoring uses.

### 3. UX: gate removal and stage-boundary submission

In `website/src/components/simulator/modes/ModeFullBracket.tsx`:

- Remove the "Complete all 12 groups to unlock Step 2" gate copy and the conditional that locks Step 2.
- Make the knockout pickers visible after 12 groups regardless of whether the user has continued picking.
- The submit button is **enabled at stage boundaries only**. Below 12 groups it is disabled (the minimum coherent bracket commitment is 12 group winners). At 12 / 28 / 36 / 40 / 42 / 43 picks (the stage milestones), submit becomes enabled.
- Mid-stage states (12 + 5 R32 picks, 28 + 3 R16, etc.) keep submit disabled. The picker focuses the user on completing the current stage.

Copy at each state:

- 0 to 11 groups: `Pick X more group winners.` (submit disabled)
- 12 groups, no KO: `[ Submit groups ]` enabled. Below: `Or continue: pick R32 winners.`
- 12 + 1 to 15 R32: `Pick X more R32 winners. Or step back to submit groups only.` Submit disabled.
- 12 + 16 R32: `[ Submit R32 ]` enabled. Below: `Or continue: pick R16 winners.`
- ... and so on through SF.
- 42 + champion: `[ Submit full bracket ]` enabled.

The submit button copy adapts to the current stage. Use exactly the pattern `[ Submit groups ]`, `[ Submit R32 ]`, `[ Submit R16 ]`, `[ Submit QF ]`, `[ Submit SF ]`, `[ Submit full bracket ]`. No "now", no "your", no exclamation marks. Mono uppercase, square-bracketed.

Reset behaviour: a top-right `[ Reset ]` link clears everything (matches the existing pattern in Final Four and Champion's Path).

### 4. Permalink rendering for partial scenarios

The permalink page at `/scenario/p/[id]` currently renders the full bracket via `TradeTicket` (`website/src/components/simulator/TradeTicket.tsx`) and the comparison via `ModelCallPanel` (added in checkpoint 4).

For partial scenarios:
- The story line should reflect the stage. Update `renderStoryLine.ts` (or wherever the storyLine is generated) to produce stage-appropriate copy. Examples:
  - groups: `12 group winners called. Top of the table belongs to {champion or first team}.` Or simpler: `12 group winners called.`
  - r32: `R32 advancers called. {N} match the model.`
  - ... and so on.
- The `TradeTicket` should render only the stages the user picked. For groups-only, show the 12 group winners and omit the knockout section.
- The OG image (`api/og/scenario/[id]/route.tsx`) currently leans on the champion for the hero flag tile. For partial scenarios, fall back to a representative team (e.g., the first group winner alphabetically) or a generic placeholder. Whichever lands cleanly; the OG image should not 500 on a missing champion.

### 5. ModelCallPanel for partial scenarios

`website/src/components/simulator/ModelCallPanel.tsx` currently renders the Full Bracket comparison as: champion comparison + 5-row per-round overlap strip.

For partial scenarios, render only the rounds the user picked. Examples:
- groups: show "GROUPS" with `N OF 12 GROUP WINNERS MATCH THE MODEL'S MODAL CALL` and the column comparison.
- r32: show "GROUPS" plus "R32" rows; omit R16, QF, SF, F, champion.
- ... and so on.

The header total adjusts: the existing full-bracket header reads `N OF 31 ADVANCEMENTS MATCH THE MODEL'S MODAL BRACKET`. For partial scenarios, use `N OF {M} ADVANCEMENTS MATCH THE MODEL'S MODAL CALL` where `M` is the number of picks actually made.

Champion comparison is shown only when the user picked a champion.

## Acceptance criteria

- `FullBracketScenario` accepts any of the six valid stages: groups, r32, r16, qf, sf, final.
- Existing complete-bracket records (31 koAdvancers) continue to render correctly with zero migration.
- Submit button is enabled only at the six stage boundaries; disabled mid-stage and below 12 groups.
- Submit button copy adapts to the current stage exactly as specified above.
- The "Complete all 12 groups to unlock Step 2" gate is removed; knockout pickers are visible after 12 groups.
- Reality Score for partial bracket renders a sensible rarity number with rationale documented in the scoring helper.
- Production rarity for the existing complete-bracket case is preserved (within ~10% of today's count for the same picks).
- Permalink page renders partial scenarios without errors: story line, TradeTicket, ModelCallPanel all handle the partial case.
- OG image route does not 500 on a partial scenario.
- ModelCallPanel shows only the rounds the user picked; header total adjusts to the user's pick count.
- Plausible event: `submit_success` still fires with `rarity_band`; consider extending to include `stage` (e.g., `stage: "groups" | "r32" | "r16" | "qf" | "sf" | "final"`) so we can measure where users actually submit. Document the choice.
- TypeScript build clean.
- Existing tests pass.
- No SSR or hydration warnings.
- Verify end-to-end at each stage: submit at groups, at R32, at R16, at QF, at SF, at full. Each lands on the permalink and renders correctly.

## Brand-discipline guardrails (non-negotiable)

- No em-dashes or en-dashes in any new or modified file, including code comments. Use periods, semicolons, colons, parentheses.
- No betting language anywhere.
- Submit button copy uses exactly the locked phrases above. Do not introduce "Submit your bracket", "Lock in", "Confirm", "Place", "Wager".
- No celebratory copy on the milestone unlocks. The new affordances appear quietly; do not add a "Stage unlocked!" toast.
- Reality Score language remains descriptive. Partial scenarios are still scored against the same rarity bands (Common / Plausible / Uncommon / Rare / Vanishingly rare); do not invent stage-specific vocabulary.
- ModelCallPanel header is `N OF M ADVANCEMENTS MATCH THE MODEL'S MODAL CALL` regardless of stage; do not switch to "N OF M GROUP WINNERS" or "N OF M ROUNDS" forms.

## Workflow conventions (from CLAUDE.md)

- Work on a feature branch named `ux/checkpoint-09-full-bracket-partial-submit`.
- Open a pull request when complete. Do not push directly to main.
- Run `scripts/install-hooks.sh` once if you have not already; the pre-push hook blocks conflict markers.
- If a merge conflict appears during rebase, use `git fetch origin && git reset --hard origin/main` then re-apply your work; do not use `git stash pop`.
- Verify end-to-end on the dev server: submit at each of the six stage boundaries and confirm the permalink renders correctly for each.

## End-of-task report

When the work is complete, produce a report in exactly this format:

```
## Checkpoint 9 Report: Full Bracket partial submit

### Branch
ux/checkpoint-09-full-bracket-partial-submit

### Files changed
- path/to/file (added | modified): one-line summary
- ...

### Diff size
Lines added: N
Lines removed: M
Files touched: K

### Schema decision
- Option A (variable-length koAdvancers) or Option B (explicit stage field), and why.

### Scoring tuning
- Per-stage depth scales chosen.
- Resulting rarity bands at each stage for a favourites-only bracket. Paste the actual count and band per stage.
- Confirmation that production complete-bracket rarity is preserved within ~10% of pre-checkpoint behaviour. Paste the before and after counts for a representative pick.

### Plausible event extension
- Whether submit_success was extended with a stage prop, and why.

### Manual verification
- [ ] Submit at groups stage produces a valid prediction and renders permalink
- [ ] Submit at R32 stage produces a valid prediction and renders permalink
- [ ] Submit at R16 stage produces a valid prediction and renders permalink
- [ ] Submit at QF stage produces a valid prediction and renders permalink
- [ ] Submit at SF stage produces a valid prediction and renders permalink
- [ ] Submit at full bracket stage produces a valid prediction and renders permalink
- [ ] Existing complete-bracket records still render correctly (post-migration check)
- [ ] Submit button disabled mid-stage and below 12 groups
- [ ] Submit button copy matches the locked stage-specific phrases
- [ ] ModelCallPanel shows only the rounds the user picked
- [ ] OG image renders for each stage without 500
- [ ] TypeScript build clean
- [ ] Existing tests pass
- [ ] No SSR or hydration warnings

### Stage-by-stage screenshots
- Paste or describe the permalink rendering at each of the six stages (groups, r32, r16, qf, sf, final).

### Follow-ups / open questions
- Anything you flagged but did not implement, with one-line rationale.

### Ready for review
Y / N. If N, state what is blocking.
```

Do not push to main. Wait for the user to review the report and approve.
