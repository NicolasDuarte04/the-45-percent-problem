# Checkpoint cp-12 — Structural Fix 5 + tournament.json roster corruption

Before reading this prompt, read these in order:

1. `WORKFLOW.md` at the repo root. The operating model.
2. `PLAN.md` at the repo root. Particularly the "Pending checkpoints" section's cp-12 entry (which now includes the expanded scope from cp-11's Stage 1 finding) and acceptance criterion #7.
3. `docs/audit/architecture-diagnostic-2026-06-03.md` §3.4 (BracketBoard over-claim) and §5 Fix 5.
4. `docs/audit/architecture-diagnostic-2026-06-01.md` §3.5 (the original "draw-resolved branch is dead code" finding that prompted Fix 5).
5. `docs/onboarding/cp-11-inspection-notes.md` (if present on main, otherwise on cp-11's branch). The cp-11 inspection surfaced the roster corruption that cp-12 now fixes.
6. The cross-project briefs (`BRIEF_FOR_EL_VOTO_ARCHITECT_2026-06-05.md` + reply). Cross-project constraints still apply.

Prior shipped checkpoints on main: cp-04 through cp-11. CI gate is active per cp-10.2 — your PR will run pytest + smoke + tsc + vitest, with ruff in advisory mode.

This checkpoint is meatier than cp-11 because it has four related sub-deliverables. The work is bounded but multi-surface (Python pipeline, contract test, TypeScript component). The Stage 1 inspection is more important than usual because the four pieces interact.

## Goal

After this checkpoint ships:

1. **`tournament.json` roster is correct.** All 48 WC 2026 teams present, no duplicates. Congo DR appears once. Tunisia is present. The root cause (a team_id → FIFA code mapping bug in the regen path) is fixed.
2. **The contract test catches roster corruption going forward.** The existing subset check ("tournament.json codes are a subset of `teams/` files") is tightened to a full bidirectional check ("the set of tournament.json codes equals the set of `teams/` files"). This is the test that would have caught the current bug at PR time; cp-12 makes it actually catch the class.
3. **`bracket.json` is populated by the snapshot pipeline on every run.** Currently cp-09's one-shot backfill is the only thing that put slots there; the regen script doesn't write `bracket.json`. cp-12 makes the regen produce `bracket.json` with populated slots every nightly, so the bracket page never reverts to the unpopulated state.
4. **`BracketBoard.tsx` renders the slots-populated branch faithfully.** Currently the subtitle flips to "draw-resolved bracket with per-round conditional probabilities" but the grid below stays the marginal matrix. Either implement the per-round conditional rendering OR drop the over-claim in the subtitle. Either is acceptable; the goal is the page's claim matches what's actually rendered.

Acceptance criterion #7 from PLAN.md closes when this checkpoint ships.

## Why this matters

The roster corruption is a live production defect right now. The bracket page renders 47 teams instead of 48, with Congo DR shown twice. This is visible to any visitor. A journalist or academic reviewer comparing the listed teams to the OSF preregistered roster sees an obvious mismatch. It's not a subtle bug; it's a counting error.

The contract-test subset check is what allowed it to ship. CI passed because the corrupted roster IS a subset of the `teams/` files (every team in the corrupted set exists in teams/, but not every team in teams/ is in the set). The test was symmetric in intent but asymmetric in implementation. Tightening it prevents the next mapping bug from slipping past.

The BracketBoard over-claim is editorial. The page says "draw-resolved with per-round conditional probabilities" over a grid that contains only marginals. A reader who takes the subtitle at face value will be confused or will silently lose trust. Even if cp-12 only does the copy fix (not the conditional rendering), the integrity of the claim improves.

The `bracket.json` structural population is the cleanup of cp-09's one-shot work. cp-09 backfilled `bracket.json` once; without cp-12, a future regen run (or a fresh clone followed by a regen) would produce an unpopulated `bracket.json`. The current state on production is "happens to be populated because cp-09 wrote it"; the desired state is "always populated because the pipeline produces it."

## Branch

`cp-12-structural-fix5`

Pre-work: `git fetch && git checkout main && git pull`. Confirm HEAD includes cp-11's merge. Working tree clean. Branch off main.

If your primary worktree is on a `session-*` branch with uncommitted El Voto work (likely given recent cadence), use a dedicated worktree as cp-10.1/cp-10.2/cp-11 did:

```bash
git worktree add ../wt-cp-12-structural-fix5 origin/main
cd ../wt-cp-12-structural-fix5
git checkout -b cp-12-structural-fix5
```

## Stage 1 — Inspection

Read-only investigation. Write inspection notes to `docs/onboarding/cp-12-inspection-notes.md`.

### Step 1: Trace the team_id → FIFA code mapping bug.

This is the highest-impact finding. The bug causes Congo DR to be duplicated and Tunisia to be missing.

```bash
# Find the mapping code in the regen script
grep -n "team_id\|fifa_code\|tournament_team" scripts/regenerate_snapshot_from_batch.py
grep -rn "CGO\|COD\|TUN" scripts/ ingestion/ models/ utils/ data/
```

The map probably lives in:
- `scripts/regenerate_snapshot_from_batch.py` (in the `aggregate_team_progression` function or its caller)
- `data/raw/*.parquet` (the fixtures parquet might use one identifier; the batch outputs might use another)
- A separate lookup helper

Trace the data flow:
1. The batch's `team_runs_M2.parquet` uses what team identifier? (probably an internal id from the calibration phase)
2. The fixtures parquet uses what identifier? (FIFA code probably)
3. How does the regen script translate batch identifiers to FIFA codes for writing into `tournament.json`?

Find the bug. Most likely causes:
- A `dict` lookup that conflates two countries (e.g., `"Congo"` maps to both Congo DR and Congo Republic, only one ends up in the output)
- A typo in a constants file
- A pre-cp-11 hardcoded mapping that's incomplete (missing Tunisia)

Capture the exact bug location and the proposed fix in inspection notes.

### Step 2: Read the current contract test.

```bash
find tests/ -name '*contract*'
grep -rln "tournament.json\|teams/" tests/
```

Read the test that checks "tournament.json codes match teams/ files." Identify:
- What the assertion currently checks (probably `set(tournament_codes).issubset(set(teams_files_codes))` — one-directional).
- The proposed tightening: `set(tournament_codes) == set(teams_files_codes)` — bidirectional.
- Whether the test currently passes against the live (corrupted) state. If yes, that confirms the subset gap.

### Step 3: Inspect `bracket.json` regeneration in the snapshot pipeline.

```bash
grep -n "bracket.json" scripts/regenerate_snapshot_from_batch.py
grep -rln "bracket.json" scripts/ ingestion/
```

cp-09's one-shot backfill probably lives in `scripts/backfill_bracket_slots.py` or similar. Read it to understand the shape the live `bracket.json` has (seven rounds, slot lists per round, slot fields).

Then check: does `regenerate_snapshot_from_batch.py` produce `bracket.json` on every run, or only the cp-09 one-shot script does? Most likely the latter. cp-12 must move the slot-population logic from the one-shot into the regen.

Design decision to capture in inspection notes: should the slot population be a function call inside `regenerate_snapshot_from_batch.py`, or a separate script `scripts/regenerate_bracket_slots.py` that the workflow runs as a step? Recommend the function-call-inside-regen approach (one regen step, one commit, one consistent timestamp), but flag both options.

### Step 4: Read `BracketBoard.tsx` and decide content vs copy.

```bash
cat website/src/components/compositions/BracketBoard.tsx | head -200
```

Find:
- Line ~40: where `slotsPopulated` is computed.
- Lines ~92-94: where the subtitle flips to "draw-resolved bracket with per-round conditional probabilities."
- Lines ~150+: where the grid renders the marginal matrix.
- Lines ~141-142: the empty-state text (currently hidden when slotsPopulated is true).

Two design decisions to evaluate in inspection notes:

**Option A — Content fix.** Render slot-by-slot per-round conditional probabilities when `slotsPopulated` is true. This requires:
- Computing conditional probabilities (P(team X reaches round Y | team X is in slot S of round Y-1) etc.) — likely already in the batch outputs but maybe needs aggregation.
- Drawing a slot-tree visualization, which is a non-trivial UI build.
- Estimated effort: 1-2 days of dedicated work.

**Option B — Copy fix.** Change the subtitle to "draw-resolved bracket; showing per-round marginal probabilities" or similar. The grid stays as-is (it's already correct as a marginal matrix; the subtitle just over-claimed). This is a one-line edit.
- Estimated effort: 30 minutes.

Recommend Option B for cp-12. Reasons:
1. The content fix is its own substantial UI work; conflating it with the structural pipeline and the roster fix dilutes review focus.
2. The marginal matrix IS correct data; we're not lying about the numbers, just about the framing.
3. The conditional-probability rendering can be its own post-launch checkpoint when there's bandwidth.
4. We're at T-3 to T-4 days from launch; option A's 1-2 days eats too much of the buffer.

State the recommendation in inspection notes. Nicolás confirms before Stage 2.

### Step 5: Identify CI gate interactions.

This PR touches:
- `scripts/regenerate_snapshot_from_batch.py` — the cp-10.2 smoke test runs this end to end. Verify locally that the smoke still passes after the changes.
- The contract test — this is itself a test, so changing it must not break others.
- `BracketBoard.tsx` — `tsc --noEmit` runs on it; `pnpm test` may have component tests for it.

The CI gate from cp-10.2 will catch each of these. The inspection notes should flag specifically that the smoke test is the highest-risk failure mode (touching the regen script).

### Step 6: Stop and report.

Inspection notes include:
- The team_id → FIFA code mapping bug location and proposed fix.
- The contract test's current subset implementation and the proposed bidirectional tightening.
- The `bracket.json` regeneration approach (function-in-regen vs separate script; recommend function-in-regen).
- Option A vs Option B for `BracketBoard.tsx` (recommend Option B with reasoning).
- The list of CI gate touchpoints.
- Explicit STOP gate: "Awaiting Nicolás's review of the design before Stage 2."

## Stage 2 — Implementation (after Nicolás approves)

After approval, ship the four fixes in this order. Each is a separate commit so reviewers can read them independently.

### Commit 1: Fix the team_id → FIFA code mapping bug.

In `scripts/regenerate_snapshot_from_batch.py` (or wherever the bug lives per Stage 1's trace), correct the mapping so all 48 teams flow through with the right FIFA codes.

After this commit, run locally:
```bash
python scripts/regenerate_snapshot_from_batch.py
cat website/public/data/latest/tournament.json | jq '.teams | length'
cat website/public/data/latest/tournament.json | jq '.teams[] | .fifa_code' | sort | uniq -c | sort -rn | head
```

Expected: 48 teams; every FIFA code appears exactly once.

### Commit 2: Tighten the contract test.

Update the test from `set(tournament_codes).issubset(set(teams_files_codes))` to `set(tournament_codes) == set(teams_files_codes)`.

If the test had any other subset-style assertions on this surface, tighten them too.

Run locally:
```bash
pytest tests/<contract_test_file> -v
```

Expected: passes against the cp-12-fixed tournament.json (because all 48 are now present and unique). Would have failed against the pre-cp-12 state (proving the subset check was too loose).

For empirical proof of the tightening: temporarily revert Commit 1, run the test, observe failure, restore Commit 1. Capture the failed run for the PR description (similar to cp-10.2's proof-of-protection step).

### Commit 3: Snapshot pipeline populates `bracket.json` on every run.

Per Stage 1's recommendation (function-in-regen): add a function `populate_bracket_slots()` to `regenerate_snapshot_from_batch.py` that reads the fixtures parquet's resolved-draw mapping and writes `bracket.json` with the populated slot structure. Call it after `tournament.json` is written and before the script exits.

After this commit, run locally:
```bash
python scripts/regenerate_snapshot_from_batch.py
cat website/public/data/latest/bracket.json | jq '.rounds[] | {round: .round, slot_count: (.slots | length)}'
```

Expected: 7 rounds with slot counts matching cp-09's backfill (GRP 72, R32 16, R16 8, QF 4, SF 2, 3P 1, FIN 1, total 104).

If cp-09's one-shot backfill script (`scripts/backfill_bracket_slots.py` or similar) becomes redundant after this, leave it in place (it's documentation of how the slots were first populated; deleting it makes the history harder to follow). Add a comment at the top of the one-shot script noting cp-12 made the regen path produce the same output.

### Commit 4: BracketBoard.tsx copy fix (Option B, per Stage 1 recommendation).

In `website/src/components/compositions/BracketBoard.tsx`, change the subtitle text from "draw-resolved bracket with per-round conditional probabilities" to a copy that matches the actual rendered content. Suggested replacement: "draw-resolved bracket; showing per-round marginal probabilities."

If the empty-state text at lines 141-142 still references "Once the draw resolves," update it too — the draw IS resolved as of cp-09's backfill and cp-12's structural fix.

Run locally:
```bash
cd website
pnpm tsc --noEmit
pnpm test
cd ..
```

Expected: clean tsc, all tests pass. If a component test asserts against the old subtitle text, update it (the expectation is now the new copy).

### Commit 5: Update PLAN.md.

Mark acceptance criterion #7 as Done in the live-readiness scorecard. Add a brief note that cp-12 took Option B for the BracketBoard fix (copy not content); flag the conditional-probability rendering as a post-launch backlog item if you think it's worth shipping later.

### Final: open the draft PR.

CI will run on the PR. Expected results:
- `python`: ruff (advisory), pytest (including the tightened contract test) — green.
- `python-smoke`: regen smoke runs the new regen logic end to end — green.
- `website`: tsc clean on BracketBoard edit; vitest passes — green.

If the smoke test fails because cp-12 introduced a regen regression, that's the highest-priority bug to fix before continuing. The smoke is doing its job.

## Verification

Before marking ready:

- [ ] Inspection notes complete; Nicolás approved Option B for BracketBoard.
- [ ] tournament.json contains 48 unique FIFA codes (no Congo DR duplicate, Tunisia present).
- [ ] Contract test is bidirectional; passes against cp-12 state; would fail against pre-cp-12 state (proof captured in PR description).
- [ ] bracket.json is populated by regen on every run; counts match cp-09's backfill.
- [ ] BracketBoard subtitle no longer over-claims; tsc and tests clean.
- [ ] CI green on the PR (all three jobs).
- [ ] cp-04 through cp-11 fixes preserved.
- [ ] cp-10.1's gitignore exception preserved; six parquets still tracked.
- [ ] `the-21j-problem/` untouched; no shared-config changes beyond workflow steps (if any).
- [ ] No El Voto handoff needed (you only touched `scripts/`, `tests/`, `website/src/components/`, `website/public/data/`, PLAN.md — none of these overlap with El Voto).

## Merge-readiness checklist

```
Y/N — Inspection notes complete; Option B for BracketBoard approved.
Y/N — Commit 1: team_id mapping bug fixed; 48 unique FIFA codes in tournament.json.
Y/N — Commit 2: contract test tightened to bidirectional; proof-of-protection captured.
Y/N — Commit 3: bracket.json populated by regen on every run.
Y/N — Commit 4: BracketBoard subtitle matches actual rendered content.
Y/N — Commit 5: PLAN.md updated; acceptance criterion #7 marked Done.
Y/N — Local pnpm tsc --noEmit clean; pnpm test passes.
Y/N — Local smoke test (regen end to end) passes.
Y/N — CI green (python, python-smoke, website).
Y/N — cp-04 through cp-11 fixes preserved.
Y/N — cp-10.1 gitignore + six tracked parquets preserved.
Y/N — No code in the-21j-problem/ touched.
Y/N — Branch is cp-12-structural-fix5, off latest main, ready to PR.
```

If every item is `Y`, push and open draft PR. After CI goes green, mark ready-for-review and merge.

## Out of scope

- **Implementing per-round conditional-probability rendering (Option A).** Deferred to post-launch per Stage 1's recommendation. Track as a backlog item in PLAN.md.
- **Refactoring the snapshot pipeline's overall architecture.** cp-12 adds a function to the existing regen script; it doesn't restructure.
- **cp-13 (admin endpoint refresh).** Next checkpoint.
- **Roster corruption in other surfaces** (e.g., `teams/*.json`, the simulator's team list). If Stage 1 finds the bug propagated to other files, surface and decide scope. Most likely the bug is at one source point (the team_id map in the regen) and fixing it cleans up the propagation; if not, that's a follow-up.
- **El Voto's `website/src/app/voto21junio/`** or any of their components.

## Decision tree if things don't match

- **The team_id mapping bug is in a place that's hard to fix without touching the cp-10 conditioning code.** The conditioning code is recent and well-tested; minimize touches. If the fix requires changing data structures cp-10 depends on, surface to Nicolás before changing. Likely cleaner is to add a translation layer rather than restructure.

- **The contract test tightening surfaces OTHER mismatches** (e.g., teams/*.json has Tunisia but tournament.json doesn't, OR teams/*.json has the bug too and the subset-symmetric-against-each-other passes). This means the bug is on both sides. Fix the source (the regen mapping) and the propagation should clean up. Re-run the tightened test after Commit 1 to confirm.

- **The smoke test fails after Commit 3 (bracket.json regeneration).** Most likely the new `populate_bracket_slots` function has a side effect or ordering issue. Debug; the cp-10.2 smoke is the canary.

- **BracketBoard's component tests assert against specific subtitle text.** Update the assertion to match the new copy. Document the change in the PR.

- **A reviewer asks "shouldn't we do Option A and render the slot tree properly?"** Yes, eventually. Not in this PR. The post-launch backlog item is the right place; T-3 days is the wrong time.

## A note on judgement

cp-12 is the last meaty checkpoint in the live-readiness sequence. After this, only cp-13 (admin endpoint refresh) and the T-1 dry run remain. The work here is multi-surface but well-scoped because Stage 1 surfaces the mapping bug at its source. The contract test tightening is the part that protects future work; without it, the next regen mapping bug ships the same way.

The 2026-06-08 roster corruption finding is a small reminder of why the periodic audits and the inspection-first pattern matter. cp-11's Stage 1 caught a production defect we didn't know about, surfaced it cleanly, and routed it to the right checkpoint. cp-12 closes it.

After cp-12 ships, cp-13 (Fix 6: admin endpoint refresh) is the last checkpoint before T-1 dry run.
