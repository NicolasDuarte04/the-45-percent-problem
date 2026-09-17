# Checkpoint cp-07 — Pre-launch audit and simulator footer fix

Read `GO_TO_LAUNCH.md` at the repo root first for project context. The prior shipped checkpoints are cp-04 (frontend narrative hotfix), cp-05 (nightly pipeline rewire), cp-05a (drop the PAT dependency), and cp-06 (nav-perf fix). The next planned work is the onboarding flow implementation, but before that lands, Nicolás wants three things verified or fixed.

## Goal

Three items, two of which are audits (you confirm or refute hypotheses and write up findings), one of which is investigate-then-stop-then-fix (you find the cause, surface options, wait for direction, then implement).

1. **Data freshness audit.** Prove that the live snapshot at `https://45analytics.com/data/latest/snapshot_meta.json` is the OSF-locked M2 batch with timestamp refresh only, not a fabricated value or a regression from a different model.
2. **Historical snapshots picker audit.** Diagnose why the bracket page shows `[ HISTORICAL SNAPSHOTS UNAVAILABLE ]`. The strong hypothesis is the 7-day window is empty because the cron was disabled from 2026-05-12 to 2026-05-27. Confirm or refute.
3. **Scenario Simulator UI investigation and fix.** Two visible symptoms: a sticky bottom footer with `[ STEP X OF 4 : FINAL FOUR ] ... [ ARM ALERT ]` overlaps the actual app footer, and the "see how the model reacts" call-to-action that Nicolás remembers from an earlier version of the simulator appears to be gone or moved. Find out what changed, surface options, get sign-off, then fix.

This is one branch, one PR, all three items.

## Why now

T-14 days to WC kickoff. Onboarding implementation is the next big surface to ship, and it's a bad idea to layer new UX on top of a foundation we can't fully verify. The data audits are quick (30 to 60 minutes); the simulator investigation might be longer depending on what cp-03 actually did. Worth doing before the bigger work starts so we know what we're building on.

## Branch

`cp-07-prelaunch-audit-and-fix`

Pre-work: `git fetch && git checkout main && git pull`. Confirm HEAD includes the cp-06 merge (commit hash matches what's on origin/main). Working tree clean. Branch off main.

---

## Item 1 — Data freshness audit

### Hypothesis to confirm

The cp-05 rewire pointed the nightly at `scripts/regenerate_snapshot_from_batch.py`, which reads from `data/calibration/active_batch.json` (currently `batch_20260512_013228Z`) and re-aggregates the SAME locked M2 probabilities every night. The timestamp updates daily; the underlying Monte Carlo output is frozen until either a new batch is generated or match outcomes come in once the tournament starts. This is by design per the OSF preregistration; the question is whether the live site faithfully reflects this design.

### Steps

1. Fetch the current live snapshot meta:

   ```bash
   curl -sS https://45analytics.com/data/latest/snapshot_meta.json | jq .
   ```

   Record what you see. Specifically inspect: `snapshot_id`, `generated_at_utc`, `champion_model`, `mc_runs`, `tournament_phase`, `matches_settled`, `kill_criteria_active`, `active_batch_id`.

2. Compare `active_batch_id` from the live meta against `data/calibration/active_batch.json` in the local repo. They MUST match exactly. If they don't, the script is not pointing at the locked batch and we have a real problem; stop and report.

3. Fetch the current live tournament data:

   ```bash
   curl -sS https://45analytics.com/data/latest/tournament.json | jq '.teams[] | {fifa_code, display_name, p_champion}' | head -50
   ```

   Confirm the top-of-table teams match what cp-05's local dry-run produced: Spain ~18.2%, France ~14.9%, Argentina ~13.7%, England ~8.3% (within ±0.1% rounding). If they don't, something has drifted and we need to know what.

4. Fetch yesterday's snapshot from the snapshots directory and diff it against today's:

   ```bash
   curl -sS https://45analytics.com/data/snapshots/<yesterday-id>/tournament.json -o /tmp/y.json
   curl -sS https://45analytics.com/data/latest/tournament.json -o /tmp/t.json
   diff <(jq -S . /tmp/y.json) <(jq -S . /tmp/t.json) | head -50
   ```

   (You'll need to discover yesterday's snapshot ID from `https://45analytics.com/data/manifest.json` first.)

   Expected: ONLY `snapshot_id` and `generated_at_utc` differ between the two days. Per-team `p_champion`, `p_final`, `p_semifinal`, etc. should be byte-identical because we're not re-running Monte Carlo.

5. Same diff against `freshness.json`. Expected: only `snapshot_id`, `generated_at_utc`, and `current_staleness_hours` differ.

6. Same diff against `evaluation_metrics.json`. Expected: ONLY `snapshot_id` differs. The cp-04 dual-SE fields (`marginal_gap_se: 6.22`, `status: "pre_tournament_locked"`, `tripped: false`) should be present and unchanged.

### Deliverable

A section in `docs/audit/prelaunch-audit-2026-05-28.md` titled "Data freshness" that records: the live snapshot meta verbatim, confirmation that `active_batch_id` matches the locked batch, the day-over-day diffs showing only timestamps change, and a one-sentence summary in plain language for Nicolás: "The data IS the OSF-locked M2 output, and the daily nightly is correctly refreshing only the timestamps. The probabilities won't change until either a new Monte Carlo batch is generated or match outcomes start flowing in on June 11."

If any of the comparisons fail, the section instead explains what failed and proposes a follow-up.

---

## Item 2 — Historical snapshots picker audit

### Hypothesis to confirm

The bracket page renders `[ HISTORICAL SNAPSHOTS UNAVAILABLE ]` because `src/lib/data/snapshotPicker.ts` looks for a snapshot 7 days old with ±2 days tolerance (5 to 9 days). The cron was disabled from 2026-05-12 to 2026-05-27, so today (2026-05-28) the picker is looking in the 2026-05-19 to 2026-05-23 window and finding nothing. By 2026-06-04 (seven days after cp-05a's first successful nightly), the picker will find a snapshot in its window and the message will go away on its own.

### Steps

1. List what snapshots exist on the live site:

   ```bash
   curl -sS https://45analytics.com/data/manifest.json | jq '.[] | {snapshot_id, generated_at_utc}' | tail -30
   ```

   Confirm: there are no snapshots in the 2026-05-19 to 2026-05-23 window. The next-most-recent snapshot before today is from 2026-05-12 (the last successful nightly before the cron was disabled, plus the probe-run snapshot from 2026-05-27).

2. Read `website/src/lib/data/snapshotPicker.ts` end to end. Confirm the constants: `WEEK_DAYS = 7`, `WEEK_TOLERANCE_DAYS = 2`. Confirm the logic in `resolveSnapshotPickerState` correctly returns `weekAgo = null` when no snapshot falls in the window.

3. Compute by hand: given today (2026-05-28) and the available snapshots, what is the picker's resolution? `current` should be today's snapshot; `weekAgo` should be `null`; `selected` should equal `current` because the requested `?snapshot=` query param is absent on a fresh visit.

4. Confirm that as soon as a snapshot exists in the 2026-06-02 to 2026-06-06 window (i.e. one of the upcoming nightlies between June 2 and June 6), the picker will start returning a non-null `weekAgo` and the bracket page's "historical snapshots" UI will start working again.

### Deliverable

A section in the same audit doc titled "Historical snapshots picker" that records: the list of available snapshots, the diagnosis (cron gap), the date by which the picker will self-heal (2026-06-04 at the earliest), and a one-sentence summary for Nicolás: "This is not a bug; it's a known consequence of the cron gap. By June 4 it heals itself. No action needed unless you want to backfill a synthetic 7-day-ago snapshot, which is risky and not recommended."

### Optional (only if you have time and the rest of the audit is clean)

Synthesize a 7-day-ago snapshot purely as a sanity check that the picker works correctly when its data is present. Steps: (a) copy `website/public/data/snapshots/2026-05-12T12:44Z/` to a new directory `website/public/data/snapshots/2026-05-21T00:00Z/` with the `snapshot_meta.json` `snapshot_id` and `generated_at_utc` fields edited to match, (b) verify the picker now returns a non-null `weekAgo` in dev, (c) DELETE the synthetic snapshot before commit. Do not push the synthetic snapshot to main; it would pollute the historical record.

This is genuinely optional. The diagnosis is solid enough without it.

---

## Item 3 — Scenario Simulator UI investigation and fix

This is the item with unknowns. Investigate first, surface options, stop and wait for direction, then fix.

### What Nicolás is observing

- A sticky bottom footer on every scenario page (e.g. `/scenario/final-four`) with `[ STEP X OF 4 : FINAL FOUR ]` on the left and `[ ARM ALERT ]` on the right.
- This sticky footer visually overlaps the actual app footer (the `ABOUT / PROVENANCE / CITE` block).
- An earlier version of the simulator had a button called "see how the model reacts" (or similar) that triggered the user-bracket-vs-model-call comparison. Nicolás believes this button is gone or moved; the only way to trigger the comparison now appears to be through the `[ ARM ALERT ]` button.

### Investigation steps

1. **Find what cp-03 shipped.**

   ```bash
   git log --oneline --all | grep cp-03
   git show --stat <cp-03-commit-hash>
   ```

   The branch name from the Vercel deployment history was `cp-03-sticky-progress-meter`. Find the merge commit on main, read the diff, and read the PR description if accessible via `gh pr list --search "cp-03"`.

2. **Find the sticky footer component.** Search the codebase for `STEP.*OF.*FINAL FOUR`, `ARM ALERT`, and `StickyProgressMeter` (the branch name suggests a component with that name). Identify:

   - Which file renders it.
   - Which routes mount it (the `(simulator)` group, the `/scenario/*` routes, or a more specific set).
   - What CSS positioning it uses (`position: fixed`, `position: sticky`, z-index).
   - Whether the overlap with the app footer is intentional (e.g. the footer is meant to slide above the app footer at scroll-bottom) or accidental (z-index conflict, missing bottom padding on the page body).

3. **Find the historical "see how the model reacts" button.**

   ```bash
   git log --all --oneline -S "see how the model"
   git log --all --oneline -S "model reacts"
   git log --all --oneline -S "model agrees"
   ```

   Look for the string in deleted code. If the button was removed by cp-03, find the diff that removed it. If it was moved, find where it moved to. If it was renamed, find the new name. If Nicolás's memory is from a much earlier version (pre-cp-00) it might not exist in the recent history.

4. **Walk the simulator flow end to end in dev.**

   ```bash
   cd website && pnpm dev
   ```

   Open `http://localhost:3000/scenario`, pick Final Four mode, walk through the picker, observe what the actual current submit-and-compare flow looks like. Document: how does a user trigger the comparison today? Is `[ ARM ALERT ]` the only path? Is there a separate "Submit" button hidden somewhere (e.g. visible only when 4 teams are picked)?

   Hint: looking at the screenshot Nicolás shared, the page reads `Pick 4 more teams to submit.` at the bottom of the team picker. That suggests a submit happens automatically when 4 teams are picked, not via the sticky footer's `[ ARM ALERT ]`. If so, `[ ARM ALERT ]` may be a different feature entirely (e.g. opting into match-outcome notification emails for the picked teams).

### Stop and report

After steps 1 through 4, **STOP**. Do not implement any fix. Write a section in the audit doc titled "Scenario simulator UI" that includes:

- A summary of what cp-03 shipped (one paragraph).
- The exact component name and file path of the sticky footer.
- A clear explanation of what `[ ARM ALERT ]` does (read the click handler and any associated API call).
- Whether the "see how the model reacts" button was: removed (with commit hash), moved (with old and new location), renamed (with old and new name), or never existed in the cp-XX-era code.
- A description of the current submit-and-compare flow.
- The cause of the footer overlap (z-index, positioning, missing page bottom-padding, etc.).
- Three to five proposed options for fixing this, each with effort estimate and reasoning. Examples of options Nicolás will want to see:
  - **Option A**: Keep the sticky footer, fix only the overlap (add bottom padding to the page body equal to the footer's height; or lower the footer's z-index below the app footer; or make the footer hide at scroll-bottom).
  - **Option B**: Remove the sticky footer entirely; restore whatever the prior submit-and-compare CTA was; explain what `[ ARM ALERT ]` is and propose where it should live instead.
  - **Option C**: Keep both, redesign the layout so they don't conflict (e.g. make the sticky footer narrower, anchor it to the right edge only, etc.).

Once Nicolás picks an option (or describes a different one), implement that. The implementation should be a single follow-up commit on the same branch.

### What NOT to do for Item 3

- Do not revert cp-03 wholesale. It was shipped intentionally and there may be UX considerations we don't see.
- Do not redesign the simulator. The brief is to fix the visible regression, not to rethink the flow.
- Do not touch the Surface B onboarding work (the design package is sitting separately and the implementation is a separate checkpoint).

---

## Out of scope (do not do this)

- The deferred perf fixes from the nav-perf investigation (`/scenario` `force-static`, `/brief` ISR, masthead caching). Those are separate checkpoints.
- The onboarding flow implementation. That's the next checkpoint after this one.
- Any change to the simulation engine, the OSF artifacts, the model code, or the data pipeline.
- Backfilling missing snapshots (except the optional dev-only synthetic snapshot in Item 2, which gets deleted before commit).
- Any change to `evaluation_metrics.json`, `snapshot_meta.json`, or other live data files. Audits are read-only.
- Adding email captures or signup prompts to the simulator. That's part of the onboarding implementation.

## Conventions

- No em dashes or en dashes in any new code or copy.
- Save audit findings under `docs/audit/` (create the directory if it doesn't exist). Use the filename `prelaunch-audit-2026-05-28.md`.
- Verify test conventions before writing tests (`tests/**/*.test.ts`, per cp-04's discovery).
- All bash blocks are absolute paths from the repo root.

## Verification

Before marking the checkpoint ready:

- [ ] `docs/audit/prelaunch-audit-2026-05-28.md` exists with all three sections (Data freshness, Historical snapshots picker, Scenario simulator UI).
- [ ] Item 1: live `active_batch_id` matches local `active_batch.json` and the diff outputs are captured in the doc.
- [ ] Item 2: list of available snapshots is recorded, the cron-gap diagnosis is explicit, the self-heal date is named.
- [ ] Item 3: investigation findings are recorded AND the agent has stopped before implementing the fix. Three to five options are proposed.
- [ ] No production data files modified.
- [ ] No code changes yet for Item 3 (waiting on Nicolás to pick an option).
- [ ] Audit doc is the only new file in `git diff --stat origin/main..HEAD` (plus possibly a tiny test or debug helper that's gitignored or reverted).

## Merge-readiness checklist (Phase 1: audit only)

Answer each with `Y` or `N`. If every item is `Y`, push as draft PR for Nicolás to read the findings. Do not merge yet; the simulator fix is Phase 2 of this same branch.

```
Y/N — Item 1 audit complete: live snapshot meta captured, active_batch_id matches, day-over-day diffs show timestamps-only.
Y/N — Item 1 doc includes the one-sentence plain-language summary for Nicolás.
Y/N — Item 2 audit complete: available snapshots listed, cron-gap diagnosis explicit, self-heal date named.
Y/N — Item 2 (optional synthetic snapshot test) was either done and the synthetic snapshot deleted before commit, OR was skipped (state which).
Y/N — Item 3 investigation complete: cp-03 diff read, sticky footer component identified, "see how the model reacts" history traced, current submit flow documented.
Y/N — Item 3 proposes 3 to 5 options with effort estimates. Stopped before implementing.
Y/N — Audit doc is the only material file added; no production code changes; no production data file changes.
Y/N — Branch is cp-07-prelaunch-audit-and-fix, off latest main, ready to PR (draft).
```

After Nicolás reads the audit doc and picks an option for Item 3, you implement that option as a second commit on the same branch and the merge-readiness checklist gets a Phase 2 addition:

```
Y/N — Phase 2: Item 3 fix implemented per Nicolás's chosen option.
Y/N — Phase 2: dev verification of the fix (no overlap, submit flow works, no console errors).
Y/N — Phase 2: pnpm test / pnpm lint / pnpm tsc --noEmit clean.
Y/N — Phase 2: cp-04 and cp-06 fixes still preserved (Ledger pill still reads "AWAITING TOURNAMENT KICKOFF"; loading.tsx skeletons still fire).
Y/N — Phase 2: screenshot of the fixed simulator attached to the PR.
```

## A note on judgement

Items 1 and 2 are likely to confirm what we already strongly suspect. The value is in capturing the evidence so future-Nicolás (and future-Claude) can refer back to it instead of re-investigating. Don't skimp on the doc just because the findings are unsurprising.

Item 3 has real unknowns. Specifically: we don't know what `[ ARM ALERT ]` actually does (might be valuable; might be vestigial), we don't know whether the "see how the model reacts" button is a real memory or a confabulation across versions, and we don't know whether cp-03 had a good reason for the sticky footer that isn't obvious from the diff. Resist the urge to fix before understanding. The stop-and-report point exists because picking the wrong fix here is more expensive than waiting 30 minutes for Nicolás to decide.
