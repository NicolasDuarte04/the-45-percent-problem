# Checkpoint 1 — Frontend narrative hotfix

You are taking the first checkpoint in `GO_TO_LAUNCH.md`. Read that file first; it explains the broader plan and the operating model.

## Goal

Eliminate the false "KILL CRITERIA TRIPPED" red badge from every live surface on `45analytics.com`. Replace it with a state-aware status pill that reflects the canonical narrative the project has already shipped at `/vault/kill-criteria`: M2_fifa is the locked champion under the marginal SE reading (6.22 SE, well above the 2.0 threshold); the paired-difference SE (1.75) is a logged procedural warning, not a kill-criterion firing; and the criterion itself only makes sense to evaluate once `matches_settled > 0`, which is not true today.

You are not relitigating the vault narrative. You are making the rest of the site consistent with it.

## Why this matters

The site is publicly visible. Today it claims to have failed its own kill criterion. That contradicts the OSF pre-registration lockfile (M2 won by 6.22 marginal SE) and the dual-badge block already rendered on `/vault/kill-criteria`. Every day the contradiction stays live, the project's credibility erodes. WC kickoff is in 16 days. Fix it now.

## Branch

`cp-04-narrative-hotfix`

(Yes, "cp-04" not "cp-01". The repo's branch numbering started at 00 and the last shipped checkpoint was `cp-03-sticky-progress-meter`. This is the next one.)

## What's actually wrong (verified file-by-file)

1. `website/public/data/latest/evaluation_metrics.json` has `kill_criteria_check.tripped: true` even though `matches_settled: 0`. The boolean is structurally meaningless pre-tournament (you can't fail a kill criterion before any matches have been played) but it's encoded that way because the script that wrote it computed `gap_se (1.75) < threshold_se (2.0)`. That comparison conflates the paired-difference SE with the marginal SE.

2. `website/src/components/compositions/LedgerSummaryPanel.tsx` line 52 reads `metrics.kill_criteria_check.tripped` and lines 81 to 96 render a red `KILL CRITERIA TRIPPED` pill from it. This is the badge in the screenshot.

3. `website/src/components/compositions/TournamentCalibrationStrip.tsx` lines 111 to 116 do the same thing on a different surface.

4. `website/src/components/primitives/KillCriteriaBanner.tsx` exists as a global banner primitive; its body copy ("Model framing has changed to null-result") is also wrong under the marginal-locked reading. It is currently only used on the dev primitives page, so it's not rendering in production, but you should fix the copy so it can't render the wrong story if someone wires it up.

5. The canonical correct rendering already exists at `website/src/components/editorial/KillCriteriaStatusBlock.tsx`. It shows both SE readings side by side, hardcodes the marginal `6.22 SE` from `data/calibration/champion_model.json`, and explains that the marginal reading is the locked criterion. Read this file end to end before writing anything else; it is your spec.

## Scope (do this)

1. Update `website/public/data/latest/evaluation_metrics.json`:
   - Set `kill_criteria_check.tripped` to `false`.
   - Add a new field `kill_criteria_check.marginal_gap_se: 6.22` (the locked value from `data/calibration/champion_model.json`).
   - Add a new field `kill_criteria_check.status: "pre_tournament_locked"`. (Allowed values for the field, document inline in `website/src/lib/data/schemas.ts`: `"pre_tournament_locked" | "in_tournament_clear" | "in_tournament_warning" | "in_tournament_tripped"`. Only `"in_tournament_tripped"` should ever produce a red badge.)
   - Leave the paired `gap_se: 1.75` and `threshold_se: 2.0` untouched. They are historically accurate; the bug is in how they're surfaced, not in what they are.

2. Update `website/src/lib/data/schemas.ts` to add the two new fields to the Zod schema for `kill_criteria_check`. Make `marginal_gap_se` optional for backward compat; treat absence as "missing, render the neutral pre-tournament pill."

3. Rewrite the kill-criteria pill in `LedgerSummaryPanel.tsx`:
   - When `metrics.matches_settled === 0`, render a calm neutral pill: `● AWAITING TOURNAMENT KICKOFF` with tertiary text colour and no border accent. Title attribute / aria-label: `"Pre-tournament. Locked champion: M2_fifa at 6.22 marginal SE. Sanity gate logged at 1.75 paired SE; see /vault/kill-criteria."`
   - When `metrics.kill_criteria_check.status === "in_tournament_clear"`, render `● KILL CRITERION: CLEARED` in mint.
   - When `metrics.kill_criteria_check.status === "in_tournament_warning"`, render `● KILL CRITERION: WARNING` in amber (not red).
   - When `metrics.kill_criteria_check.status === "in_tournament_tripped"`, keep the existing red `◆ KILL CRITERIA TRIPPED` rendering. (We're not removing the capability, just gating it correctly.)
   - The kill-criteria condition detail block (lines 209 to 228 of the existing file) should also gate on `matches_settled > 0`. Pre-tournament, replace it with a one-line link: `See /vault/kill-criteria for the dual-SE reading and the locked-champion artifact.`

4. Apply the same gate to `TournamentCalibrationStrip.tsx` lines 111 to 116. Same status-derived rendering; share logic via a small helper in `website/src/components/primitives/` if the duplication starts to smell. A `KillCriteriaPill.tsx` primitive that takes `{ status, matchesSettled }` and returns the correct pill is the right shape.

5. Fix the body copy in `KillCriteriaBanner.tsx`. Change `"Model framing has changed to null-result"` to `"Kill criterion tripped. See dual-SE reading for context."` and link to `/vault/kill-criteria`. The component is only mounted in dev today, but the wrong copy is a landmine.

6. Update tests:
   - Find any vitest spec that snapshots `LedgerSummaryPanel` or `TournamentCalibrationStrip`. Run `grep -r "kill_criteria" website/src/**/*.test.{ts,tsx}` to locate.
   - Update fixtures to exercise all four `status` values plus the `matches_settled === 0` pre-tournament case.
   - If no tests cover the pill, write one. The pill rendering is the entire point of this checkpoint; it must be tested.

## Out of scope (do not do this)

- Do not touch `website/src/components/editorial/KillCriteriaStatusBlock.tsx`. It is correct.
- Do not touch the nightly pipeline workflow file. That is Checkpoint 2.
- Do not regenerate `snapshot_meta.json` or any other file in `website/public/data/latest/` beyond the targeted edit to `evaluation_metrics.json`. The snapshot is stale; we're acknowledging it, not fixing it in this checkpoint.
- Do not change colour tokens in `globals.css`. Use the existing tokens (`--data-neutral`, `--text-tertiary`, `--edge-positive` for mint-equivalent if it exists, otherwise read the token set and pick the closest match).
- Do not change any vault page content.
- Do not add a new dependency. Everything you need is already in the repo.

## Conventions to respect

- No em dashes or en dashes anywhere. Use periods, semicolons, colons, parentheses. This is a Nicolás-wide style rule; the existing copy honours it, you should too.
- The `KillCriteriaPill` primitive (if you create it) follows the existing `primitives/*.tsx` patterns: pure presentational, no data-fetching, accepts a single typed props object, exports a named function component.
- aria-label every status pill so screen readers get the full context (e.g. "Kill criterion: cleared in tournament. Marginal SE 6.22 of 2.0 required.").
- Tests live next to the source under the same directory with a `.test.tsx` extension (this repo's convention; verify by inspection if uncertain).

## Verification

Before you mark this checkpoint ready:

- [ ] Run `pnpm dev` in `website/` and visit `/ledger`. Confirm the red "KILL CRITERIA TRIPPED" badge is gone and replaced with the calm "AWAITING TOURNAMENT KICKOFF" pill.
- [ ] Visit `/` and `/match/<any-match-id>`. Confirm no other surface still claims "TRIPPED."
- [ ] Visit `/vault/kill-criteria`. Confirm the dual-SE block still renders unchanged with the 6.22 SE marginal badge and the 1.75 SE paired badge.
- [ ] Open the browser console on `/ledger`. Confirm no new errors. The two existing 404s on `/match/2026-06-13_GER_JAP` and `/match/2026-06-12_ARG_CAN` are pre-existing and will be fixed in Checkpoint 5; you do not own them.
- [ ] Run `pnpm test` in `website/`. All tests pass. The new pill rendering is covered by at least one test per status value.
- [ ] Run `pnpm lint` and `pnpm tsc --noEmit`. Both clean.
- [ ] Diff `website/public/data/latest/evaluation_metrics.json` against `main`. The diff shows only the three field changes named above. No drift in unrelated fields.
- [ ] Git log on this branch: clean, one commit per logical change, no merge commits.

## Merge-readiness checklist

Answer each item with `Y` or `N`. Do not mark the checkpoint ready unless every item is `Y`. If any item is `N`, explain what's outstanding and stop.

```
Y/N — The Ledger page no longer displays "KILL CRITERIA TRIPPED" pre-tournament.
Y/N — The pill copy and colour are state-aware via the new `status` field, with all four states implemented.
Y/N — TournamentCalibrationStrip applies the same gate, sharing logic via a primitive helper.
Y/N — KillCriteriaBanner copy is fixed (even though it's only mounted on the dev primitives page).
Y/N — evaluation_metrics.json has the new `marginal_gap_se: 6.22` and `status: "pre_tournament_locked"` fields, `tripped: false`.
Y/N — Zod schema in schemas.ts is updated; new fields are optional and validated.
Y/N — Vitest covers all four status values plus the pre-tournament case.
Y/N — pnpm test, pnpm lint, pnpm tsc --noEmit all pass clean.
Y/N — No em or en dashes in any new copy.
Y/N — Vault kill-criteria block is unchanged and still renders both SE readings.
Y/N — No files outside the in-scope list were modified.
Y/N — Branch is `cp-04-narrative-hotfix`, off latest `main`, ready to PR.
```

If every line is `Y`, write a short PR description (1 paragraph, the goal sentence + the four files touched + the test count) and stop. Nicolás will review the diff and merge.

If any line is `N`, do not push. Explain the blocker and what you tried.

## A note on judgement

This checkpoint has a deliberately narrow scope. It is possible you will see other things you want to fix: the 404s on the Ledger, the stale snapshot timestamp, the terminal-aesthetic friction. Resist. Each of those has its own checkpoint already scoped. Bundling them into this PR makes it slower to review and harder to revert. One badge, four files, ship.
