# Checkpoint cp-08 — Revert (Path A)

This is an operational cleanup, not a feature checkpoint. The cp-08 onboarding implementation introduced two structural problems that aren't fixable with a small tweak:

1. The Block 2 mode-preview mockups render fake data ("Argentina is most likely to lift the trophy / 21%") that contradicts the actual model output (Spain leads at 18.2%). A research publication built on pre-registration discipline cannot ship a landing page that misrepresents what the model says.
2. The implementation hides the Monte Carlo trophy graphic on first visit. That graphic was the project's strongest brand element; removing it on first contact strips visual identity from new visitors.

Both problems trace back to flaws in the original onboarding brief, not to the implementation. The Claude Code agent built faithfully to the design package, which was built faithfully to the brief. Fixing the brief is a separate effort (a new design session with corrected constraints). For now: undo cp-08 cleanly so the homepage returns to the cp-07-merge state.

Critically: **the cp-08 branch was never pushed or merged.** All work is local to Nicolás's machine. This is not a revert PR; it is a branch deletion plus working-tree verification.

## Goal

Delete the local `cp-08-onboarding-surface-a` branch. Confirm `main` is at the cp-07 merge. Confirm no cp-08 files leak into the working tree. Confirm production at `45analytics.com` is unaffected (because cp-08 was never deployed; this should be verifiable without action).

## Branch

No new branch. This work is on `main`.

## Procedure

1. **Verify current state.**

   ```bash
   git fetch origin
   git status
   git branch | grep cp-08
   git log --oneline -5
   ```

   Confirm:
   - `cp-08-onboarding-surface-a` exists locally (`git branch` shows it).
   - The branch has two commits ahead of main: `ecefb9d` (docs import) and `76b5ae7` (implementation). Verify with `git log cp-08-onboarding-surface-a --oneline -5`.
   - `origin/cp-08-onboarding-surface-a` does NOT exist (`git branch -r | grep cp-08` returns nothing).

   If `origin/cp-08-onboarding-surface-a` exists, stop. The branch was pushed and we need a real revert PR. Report.

2. **Make sure you are not currently on the cp-08 branch.**

   ```bash
   git checkout main
   git pull origin main
   git log --oneline -3
   ```

   Confirm the top commit is the cp-07 merge commit (`127fcb2` per the agent's earlier output; verify against your local state).

3. **Delete the local cp-08 branch.**

   ```bash
   git branch -D cp-08-onboarding-surface-a
   ```

   Use `-D` (force delete) rather than `-d` because cp-08 has commits ahead of main that aren't merged anywhere. That's intentional.

4. **Verify the working tree is free of cp-08 artifacts.**

   ```bash
   git status
   ls website/src/components/onboarding/ 2>/dev/null && echo "PROBLEM: leftover onboarding components" || echo "OK: no onboarding components"
   ls website/design-output/ 2>/dev/null && echo "PROBLEM: leftover design-output" || echo "OK: no design-output"
   ls docs/onboarding/ 2>/dev/null && echo "PROBLEM: leftover onboarding docs" || echo "OK: no onboarding docs"
   ls GO_TO_LAUNCH.md 2>/dev/null && echo "INFO: GO_TO_LAUNCH.md present in main (unexpected; verify)" || echo "OK: GO_TO_LAUNCH.md absent (was only in cp-08)"
   ls website/onboarding-design-brief.md 2>/dev/null && echo "INFO: onboarding-design-brief.md present in main (unexpected; verify)" || echo "OK: brief absent (was only in cp-08)"
   ```

   Expected: all four "OK" lines. The "INFO" lines should report absence because those files were imported by cp-08's commit 1 (`ecefb9d`) and that commit is being thrown away with the branch deletion.

   If any "PROBLEM" appears, those are untracked leftovers from the cp-08 working tree. Leave them alone for now and report; we'll decide whether to delete them based on what they are.

5. **Verify the dev server matches the expected pre-cp-08 state.**

   ```bash
   cd website
   pnpm dev
   ```

   Open `http://localhost:3000` in an incognito window (clean localStorage). Confirm:
   - The Monte Carlo trophy graphic renders prominently in the hero
   - "The 45% Problem" headline is visible
   - The "Receive the daily brief" CTA is in the hero
   - Below the hero: leaderboard with team flags, bracket preview, divergences, etc.
   - No "FOR FANS / FOR QUANTS" cards anywhere
   - No "Argentina is most likely to lift the trophy / 21%" anywhere

   If any of those checks fail, the cleanup didn't fully take. Report.

6. **Verify production is unchanged (sanity check; should be a no-op).**

   ```bash
   curl -sS https://45analytics.com/data/latest/snapshot_meta.json | jq '.snapshot_id, .champion_model, .kill_criteria_active'
   ```

   Expected: the same values the cp-07 audit confirmed (today's snapshot_id from the nightly, `champion_model: "M_STAR"`, `kill_criteria_active: false`). Production was never touched by cp-08 because cp-08 was never deployed; this is just confirming the world is as it should be.

## Out of scope

- Do not open a PR. There is nothing to PR.
- Do not push anything to origin.
- Do not delete or modify any file in the working tree that wasn't part of cp-08.
- Do not touch the cp-09 plan (Surface B simulator overlay). That work proceeds independently after a new design brief is produced.
- Do not preserve any cp-08 artifact "just in case." The design package is in Nicolás's Desktop and the design agent will produce a new package; nothing here is load-bearing.

## Readiness checklist

```
Y/N — origin/cp-08-onboarding-surface-a confirmed absent (branch was never pushed).
Y/N — main is at the cp-07 merge commit; git log confirms.
Y/N — Local cp-08-onboarding-surface-a branch deleted (git branch | grep cp-08 returns nothing).
Y/N — No leftover cp-08 files in working tree (all four "OK" checks pass).
Y/N — Dev server renders the original homepage: trophy graphic visible, leaderboard with flags visible, no FOR FANS / FOR QUANTS, no Argentina 21% mockup.
Y/N — Production snapshot_meta.json shows the expected nightly values (unchanged by this work).
```

If every line is `Y`, report back. No commit, no push, no PR. Just confirm the cleanup landed.

If any line is `N`, explain what's outstanding and stop.

## A note on what comes next

After this revert lands, Nicolás will start a fresh design session with the design agent using a new brief that fixes the structural mistakes (does not replace the hero, does not use mocked data, follows established onboarding patterns from successful apps). Once that brief produces a new design package, a new implementation checkpoint will pick it up. The cp-09 simulator overlay work is unaffected by all of this and can proceed in parallel once its own dependencies are clear.
