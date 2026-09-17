# Preflight checkpoint — verify state and commit foundation docs (immediately before cp-10.1)

This is a small operational checkpoint that runs in a fresh Claude Code session before cp-10.1. It does two things:

1. Verifies the production state matches what the 2026-06-03 diagnostic claimed (so we are not starting cp-10.1 against assumptions that have already drifted).
2. Commits the two foundation documents (`WORKFLOW.md` and `PLAN.md`) to main so cp-10.1's "Read first" instructions point at files that actually exist on the branch the next session will check out.

It does NOT fix any of the P0 production issues. That is cp-10.1's job. This preflight just confirms the picture and lays the foundation so cp-10.1 has the context it needs.

Estimated effort: 15 to 30 minutes. One small docs PR. No code changes.

## Read first

1. `WORKFLOW.md` at the repo root (currently uncommitted in the working tree; you will commit it as part of this checkpoint).
2. `PLAN.md` at the repo root (same — currently uncommitted; you will commit it).
3. `docs/audit/architecture-diagnostic-2026-06-03.md` on main. Particularly §1 (Executive Summary), §3.1 (the nightly cron failure), and §3.2 (cp-10's re-batch path crash). The verification steps below check the claims in §3.1 and §3.2.

## Goal

After this checkpoint ships:

- `WORKFLOW.md` and `PLAN.md` are on main, committed, ready to be read by the cp-10.1 agent.
- The production cron failure is verified empirically (`gh run list`) and the production snapshot freeze is verified empirically (`curl`). If the diagnostic's claims have drifted (e.g., a manual workflow_dispatch happened to unfreeze the snapshot), that is documented and Nicolás knows before cp-10.1 starts.
- The cp-10.1 prompt is confirmed present and readable at the repo root. (Nicolás will hand its content to the next Claude Code session as the first message; this preflight just confirms the file is where it should be.)

## Branch

`docs/foundation-2026-06-03`

Pre-work: `git fetch && git checkout main && git pull`. Confirm HEAD includes the diagnostic merge (PR #77). Working tree contains the three uncommitted docs (`WORKFLOW.md`, `PLAN.md`, `CHECKPOINT_10.1_DATA_AVAILABILITY_PROMPT.md`) plus the usual untracked checkpoint prompts.

Branch off main.

## Stage 1 — Verify production state

These commands are read-only. Run them and capture the output in your inspection notes. Do not proceed to Stage 2 if any of them surfaces something contradicting the 2026-06-03 diagnostic.

### Step 1: Verify the nightly cron failure.

```bash
gh run list --workflow nightly_pipeline.yml --limit 10
```

Expected based on the diagnostic:
- The most recent runs include at least one failure dated `2026-06-03T02:36Z` (run id `26860278471` per the diagnostic).
- The four prior runs (2026-05-29 through 2026-06-02) succeeded.
- Either no scheduled runs after 2026-06-03 (GitHub Actions sometimes pauses scheduling after consecutive failures) or a string of failures.

If you see all-green runs in the last week, the cron may have been manually fixed since the diagnostic was written. Document the actual state and STOP. Ping Nicolás before proceeding.

### Step 2: Inspect the most recent failure log.

```bash
# Replace <run-id> with the latest failed run id from step 1.
gh run view <run-id> --log-failed | tail -50
```

Expected: `FileNotFoundError: wc2026 fixtures parquet not found at .../data/raw/wc2026_fixtures.parquet; cannot derive matches_remaining.`

If the failure mode is different (e.g., a network error, a different missing file), the diagnostic's diagnosis is incomplete. Document the actual error and surface it; cp-10.1's scope may need to widen.

### Step 3: Verify production is frozen.

```bash
curl -sS https://45analytics.com/data/latest/snapshot_meta.json | jq '{snapshot_id, generated_at_utc, champion_model, kill_criteria_active, active_batch_id}'
```

Expected:
- `snapshot_id` matches `"2026-06-02T16:24Z"` (the diagnostic's stated frozen state).
- `generated_at_utc` is 2026-06-02 (around 16:24 UTC), not today.
- `champion_model: "M_STAR"`.
- `kill_criteria_active: false`.
- `active_batch_id: "batch_20260512_013228Z"`.

If `snapshot_id` is more recent than 2026-06-02, production has unfrozen somehow — document and ping Nicolás. cp-10.1 may already be unnecessary, or there is something else producing snapshots that we don't know about.

### Step 4: Confirm the gitignore state.

```bash
cd "/Users/nicolasduarte/Documents/Claude/Projects/The 45 Percent Problem/the-45-percent-problem"
git check-ignore -v data/raw/wc2026_fixtures.parquet
git ls-files 'data/raw/*.parquet' | wc -l
ls -la data/raw/*.parquet 2>/dev/null | head -10
```

Expected:
- The check-ignore output cites `.gitignore:26` (or thereabouts) with the pattern `data/raw/*.parquet`.
- `git ls-files` returns `0` (no tracked Parquets in `data/raw/`).
- The `ls -la` output shows the actual Parquet files present on Nicolás's disk (so we know they exist locally; cp-10.1 commits them).

### Step 5: Confirm the foundation docs are present in the working tree.

```bash
ls -la WORKFLOW.md PLAN.md CHECKPOINT_10.1_DATA_AVAILABILITY_PROMPT.md
git status WORKFLOW.md PLAN.md CHECKPOINT_10.1_DATA_AVAILABILITY_PROMPT.md
```

Expected:
- All three files exist on disk.
- All three are untracked (per `git status`).

If any are missing, STOP and ping Nicolás; Claude advisor wrote them and they should be on disk.

## Stage 2 — Commit the foundation docs

Only the two reference docs (`WORKFLOW.md` and `PLAN.md`) go on main via this PR. The `CHECKPOINT_10.1_DATA_AVAILABILITY_PROMPT.md` does NOT get committed here; Nicolás hands its content directly to the next Claude Code session as the message body.

### Step 1: Stage and commit.

```bash
git add WORKFLOW.md PLAN.md
git status
git diff --cached --stat
```

Confirm the diff stat shows only two files added. If anything else is staged (e.g., a stray edit to a tracked file), unstage it.

```bash
git commit -m "docs: add WORKFLOW.md and PLAN.md as canonical workflow and plan references" \
  -m "WORKFLOW.md describes the three-actor operating model (Nicolás, Claude advisor, Claude Code), the eight-section prompt template, the Stage 1 / Stage 2 hard-stop pattern, and the readiness-checklist discipline. PLAN.md replaces the now-stale GO_TO_LAUNCH.md as the authoritative plan: shipped checkpoints (cp-04 through cp-10), pending live-readiness sequence (cp-10.1, cp-10.2, cp-11, cp-12, cp-13), post-launch backlog, eight live-readiness acceptance criteria, decision log. Both files are read by every new Claude Code session before any work begins."
```

### Step 2: Push and open the PR.

```bash
git push -u origin docs/foundation-2026-06-03
gh pr create --title "docs: add WORKFLOW.md and PLAN.md (foundation references)" --body "$(cat <<'EOF'
Adds two canonical reference documents at the repo root:

- WORKFLOW.md: the operating model. Three-actor structure (Nicolás, Claude advisor, Claude Code). Eight-section prompt template. Stage 1 inspection + Stage 2 implementation with hard stop. Y / N* / N readiness-checklist discipline. Two-commit PR structure. Decision-making via structured options. Periodic audit cadence. Pitfalls and counter-patterns earned across cp-04 through cp-10.

- PLAN.md: the current authoritative plan, replacing the stale GO_TO_LAUNCH.md (which described a 7-checkpoint product plan that was superseded by the live-readiness sequence emerging from the 2026-06-01 architecture diagnostic). Lists shipped checkpoints, pending checkpoints (cp-10.1 through cp-13 plus knockout follow-up), post-launch backlog (Surface B, GTM, Volatility Gate, original product items), eight live-readiness acceptance criteria, decision log capturing every Nicolás architectural call with rationale, and the T-8 timeline.

These are not code. They are reference material that every future Claude Code session reads before starting. Committing now so the upcoming cp-10.1 session (which references both in its "Read first" list) finds them on main.

The cp-10.1 prompt itself (CHECKPOINT_10.1_DATA_AVAILABILITY_PROMPT.md) is intentionally NOT in this PR; it stays in the working tree and gets handed directly to the next session as the message body.

Verification: see docs/onboarding/preflight-2026-06-03-inspection-notes.md for the empirical confirmation that the 2026-06-03 diagnostic's production claims still hold (nightly cron failing, production snapshot frozen at 2026-06-02T16:24Z).

Next: cp-10.1 (force-track gitignored input parquets) follows immediately to restore the nightly cron.
EOF
)" --draft
```

### Step 3: Capture the inspection notes.

Write `docs/onboarding/preflight-2026-06-03-inspection-notes.md` with the captured outputs from Stage 1:

- The `gh run list` output verbatim.
- The `gh run view --log-failed` output (last 50 lines).
- The production `curl` output.
- The `git check-ignore` and `git ls-files` outputs.
- A one-sentence summary at the bottom: "Production state verified to match 2026-06-03 diagnostic. Foundation docs committed. cp-10.1 is ready to hand off."

Commit this file to the same `docs/foundation-2026-06-03` branch as a second commit:

```bash
git add docs/onboarding/preflight-2026-06-03-inspection-notes.md
git commit -m "docs: preflight inspection notes confirming 2026-06-03 diagnostic claims hold"
git push
```

The PR now has two commits. Mark it ready for review.

```bash
gh pr ready
```

Stop here. Nicolás reviews the PR (small; <5 minute review), merges, and then hands the cp-10.1 prompt to a fresh Claude Code session.

## Verification

Before marking ready:

- [ ] `gh run list --workflow nightly_pipeline.yml --limit 10` captured; the failure on 2026-06-03 confirmed.
- [ ] `gh run view --log-failed` for the latest failure shows the `FileNotFoundError: wc2026 fixtures parquet` error.
- [ ] Production `snapshot_id` is `"2026-06-02T16:24Z"`.
- [ ] `git ls-files 'data/raw/*.parquet'` returns 0.
- [ ] `data/raw/*.parquet` files exist on Nicolás's local disk (ready for cp-10.1 to commit).
- [ ] `WORKFLOW.md` and `PLAN.md` are present in the working tree and uncommitted before this PR.
- [ ] Inspection notes at `docs/onboarding/preflight-2026-06-03-inspection-notes.md` capture the verbatim outputs.
- [ ] PR contains exactly two commits: (1) the two foundation docs, (2) the inspection notes.
- [ ] No code, data, or workflow files modified.

## Merge-readiness checklist

```
Y/N — Production cron failure verified empirically.
Y/N — Production snapshot freeze (at 2026-06-02T16:24Z) verified empirically.
Y/N — Foundation docs (WORKFLOW.md, PLAN.md) committed to main via this PR.
Y/N — Preflight inspection notes captured in docs/onboarding/.
Y/N — No production code or data modified.
Y/N — cp-10.1 prompt present in working tree, ready to hand to next session.
Y/N — Branch is docs/foundation-2026-06-03, ready to PR.
```

If every item is `Y`, push and request review. The PR should merge in under 10 minutes (it is two docs + inspection notes; nothing to argue about).

If any item surfaces something different from what the 2026-06-03 diagnostic claimed, mark that item `N*` with substantive rationale, and ping Nicolás before merging. The whole point of this preflight is to catch drift between assumed state and actual state.

## Out of scope

- **cp-10.1 itself.** Force-tracking the parquets and verifying the cron unblocks is cp-10.1's scope, not this preflight.
- **Any change to `.gitignore`.** That's cp-10.1.
- **Any change to workflow files, scripts, or simulation code.** None of those is being touched here.
- **Any change to data files in `website/public/data/`.** Production state is verified, not modified.

## What to do after this ships

After the PR merges:

1. Nicolás opens a fresh Claude Code session.
2. Pastes the content of `CHECKPOINT_10.1_DATA_AVAILABILITY_PROMPT.md` as the first message.
3. Claude Code's first action will be reading `WORKFLOW.md` and `PLAN.md` (now on main), then the cp-10.1 prompt body, then proceeding with the Stage 1 inspection per the prompt.

Nothing else changes. This preflight is the small operational step that gets cp-10.1 ready to start cleanly.
