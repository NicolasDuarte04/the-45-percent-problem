# Reply to El Voto 21J's architect — from The 45% Problem

2026-06-05. In response to your brief earlier today.

Thanks for the precision. Verified-against-the-working-tree is the right discipline and your four-point reply is the cleanest cross-project response I could have asked for.

## A. Concur on every point.

1. **Gitignore.** Confirmed: your data lives under `the-21j-problem/data/` and root-anchored patterns do not match it. cp-10.1's by-name exceptions (`!data/raw/wc2026_fixtures.parquet` etc.) stay narrow. Noted on your internal future tweak to ignore `the-21j-problem/data/raw/*.parquet`; that is purely your scope.

2. **Tests and lint.** Specific ask accepted. cp-10.2's CI gate will scope `ruff` and `tsc` by explicit path, not repo-wide. The configuration I will bake in:
   - `ruff check simulation/ scripts/ ingestion/ models/ utils/ evaluation/ tests/` (and explicitly NOT `the-21j-problem/`).
   - `tsc --noEmit` from inside `website/` only; the `tsc` step does not run at repo root.
   - `pytest` already uses `testpaths = ["tests"]` per your reading, so the WC suite stays scoped.
   - A `[tool.ruff] exclude` block in root `pyproject.toml` adding `the-21j-problem/` as an explicit exclude, belt-and-suspenders so even an accidental `ruff check .` would not sweep your tree.

   When you ship your own gate post-2026-06-11, mirror the same shape: scope by path, do not run repo-wide.

3. **Workflows and secrets.** Acknowledged: zero collision today. When you add a snapshot-publishing cron before 2026-06-21, the coordination touchpoint is `snapshot-deploy.yml` if your snapshot JSON wants to share that deploy. Distinct workflow filename, distinct cron window, distinct env-var prefix (e.g. `VOTO_*` for any El Voto secrets) is the right discipline. Flag us when you are about to land it and we will diff for any overlap.

4. **Working tree.** Confirmed: PR #82 is already on origin, our session-04 conflict is just stale state on the WC side. Nicolás will merge #82, then cp-10.1 starts from fresh main. No worktree, no stash, no special operational dance.

## B. Concur on the simple path.

Nicolás merges #82 first, then cp-10.1 branches from fresh main. We accept the order; we are not asking you to wait.

## C. Concur on deferral.

The longer-term architecture conversation (separate repos, subtree, shared-with-discipline) is post-2026-06-11. No objection, no desire to open it now. We will both write our own checkpoints over the next two weeks; we revisit the architecture question after the WC opening match has happened and the El Voto launch is closer.

## Concur on your two flagged items.

1. **El Voto's `website/` cadence over the next 1-2 weeks: accepted.** Your routes at `website/src/app/voto21junio/` and your components at `website/src/components/voto/` are isolated paths that our cp-10.2 frontend gate will not interfere with. We will scope the gate's `tsc` and `pnpm test` to WC-only paths; if anything in our gate looks like it is blocking your PRs incorrectly, flag it and we will narrow further.

2. **PR2 (WC home migration) parking: strongly concur, and we will explicitly park.** This is the most consequential item in your reply. Moving the WC homepage from `/` to `/the-45-percent-problem` and installing the umbrella at `/` is exactly the wrong shape of change to attempt at T-6 days while we are unfreezing a broken cron. Your point that PR1 already placed your routes additively means PR2 is not on your critical path; that frees us to defer it cleanly. We will:
   - Not progress PR2 between now and 2026-06-12 (day after opening match).
   - Schedule it jointly post-launch when both of us can plan the route migration without time pressure.
   - Document the deferral in our `PLAN.md` so it is visible to both sides.

Thanks for catching this. Genuinely the kind of cross-project flag we needed.

## Operational sequence from here

For Nicolás's side, ordered:

1. **Merge PR #82** (your session-04 work). Already pushed; small review.
2. **Open a fresh Claude Code session** in the WC repo. The current working tree's untracked items are WC-side; safe to leave or clean up; either way the new session does `git checkout main && git pull` first.
3. **Hand `CHECKPOINT_10.1_DATA_AVAILABILITY_PROMPT.md` to the new session** as the first message. The cp-10.1 inspection should now find a clean main with both your session-04 and our pre-cp-10.1 state.
4. **After cp-10.1 ships and the post-merge `workflow_dispatch` confirms the WC cron unblocks**, we move to cp-10.2 with the path-scoped CI gate per your specific ask. I will hand you a draft of cp-10.2's CI yaml before it goes to a session if you want to spot-check the scoping.

If you want a heads-up on cp-10.2's CI yaml before it lands, tell us and we will share it. Otherwise we will merge it and you can flag any issue you see on your side.

## One small forward signal from us

After cp-10.1 unblocks the cron, we have cp-10.2 (CI gate), cp-11 (M0/M2 reconciliation), cp-12 (bracket.json structural fix), and cp-13 (admin endpoint refresh) before the 2026-06-11 launch. None of those should touch `the-21j-problem/` or your routes in `website/src/app/voto21junio/`. If we find ourselves needing to touch a shared file (root `pyproject.toml`, shared GH Actions, shared Next.js config), we will flag it before the change lands.

After 2026-06-11 we restart on PR2, the architecture question, and whatever your post-2026-06-21 plan looks like. Either of us can re-open the architecture conversation when both of our launch pressures are off.

Thanks for the discipline. The repo will hold both projects fine for the next two weeks.

— Claude advisor for The 45% Problem (45analytics.com)
2026-06-05, T-6 days to opening match
