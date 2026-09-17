# Checkpoint cp-09 — Snapshot integrity (live-readiness wave 1)

Before reading this prompt, read these in order:

1. `DIAGNOSTIC_2026-06-01_T-10.md` (the architectural diagnostic; Nicolás uploaded it). Sections 3.2, 3.4, and 3.5 are the ones this checkpoint addresses. Sections 3.1, 3.3, 3.6 are different checkpoints (cp-10 through cp-13).
2. `GO_TO_LAUNCH.md` for project context. The original plan is being interrupted; the next several checkpoints are live-readiness fixes, not the planned cp-09 Surface B onboarding (which is deferred until the foundation is correct).

Prior shipped checkpoints on main: cp-04 (frontend narrative hotfix), cp-05 + cp-05a (nightly pipeline rewire + drop PAT), cp-06 (nav-perf fix), cp-07 (audit + simulator footer fix), cp-08 (additive onboarding Surface A). T-10 days to opening match (2026-06-11).

## Goal

Ship three small, related fixes that together resolve the most visible structural lies in the live snapshot pipeline:

1. **Bracket slots backfill (one-shot).** `bracket.json` currently has empty slot arrays for all seven rounds (`GRP`, `R32`, `R16`, `QF`, `SF`, `3P`, `FIN`). The draw is resolved in `data/raw/wc2026_fixtures.parquet`. A one-shot script reads the fixtures and writes the slot mapping into `bracket.json`. This surfaces the `slotsPopulated=true` branch in `BracketBoard.tsx` for the first time, so we know whether the rendering path even works before kickoff.

2. **Snapshot metadata derivation (Fix 2 from the diagnostic).** `scripts/regenerate_snapshot_from_batch.py:304-306` currently hardcodes `tournament_phase: "pre_tournament"`, `matches_settled: 0`, `matches_remaining: 104`. Replace these with values derived at runtime from a count of `match_outcomes` (settled count) and `wc2026_fixtures` (total). Phase derivation table:
   - `pre_tournament` if `settled == 0`
   - `group_stage` if `1 <= settled <= 71`
   - `round_of_16` if `72 <= settled <= 87` (R32 doesn't exist in WC 2026 — group stage of 12 teams of 4 goes to R32 then R16; check the actual phase enum)
   - `quarter_final` if `88 <= settled <= 95`
   - `semi_final` if `96 <= settled <= 99`
   - `final` if `100 <= settled <= 103`
   - `completed` if `settled == 104`
   The phase enum is in `website/src/lib/data/schemas.ts:29-38`. Use the exact strings from that enum; don't introduce new values.

3. **Model variant provenance (Fix 4 from the diagnostic).** `tournament.json` currently carries no `model_variant` field, so the served probabilities lose their model identity by the time they reach the React layer. Stamp `model_variant: "M2_fifa"` on every `tournament.json` write inside the regenerate script. Then expand the tournament schema in `website/src/lib/data/schemas.ts` to require `model_variant` and accept the locked-variant identifier. Add a Zod validation gate that rejects loads with mismatched provenance.

These are the cheap wins from the diagnostic. Total estimated agent work: ~3 hours. They land together because they all touch the snapshot pipeline and provenance, and shipping them in one PR is more reviewable than three sequential micro-PRs.

**Out of scope for this checkpoint:** Fix 1 (settled-result conditioning in the Monte Carlo), Fix 3 (M0/M2 reconciliation), Fix 5 (structural bracket.json population from the snapshot pipeline; the backfill here is a one-shot, not a structural fix), Fix 6 (admin endpoint refresh). Those each get their own checkpoints (cp-10 through cp-13) after this lands.

## Why this matters

Without Fix 2, the public bracket page on June 11 will assert "pre-tournament, 0 matches settled" while the actual tournament is underway. That contradicts the model's purpose and is press-quotable embarrassment. Without Fix 4, served probabilities lose model identity at the boundary; a future batch swap could silently change what "the model" means without any validation catching it. Without the backfill, the bracket page will render the slots-unresolved matrix indefinitely, even though the draw is resolved.

These three fixes are individually small but together they remove the most visible structural lies. They also unblock Fix 1 (cp-10) by establishing the metadata derivation pattern that Fix 1 will extend.

## Branch

`cp-09-snapshot-integrity`

Pre-work: `git fetch && git checkout main && git pull`. Confirm HEAD includes the cp-08 merge. Working tree clean. Branch off main.

## Stage 1 — Bracket.json backfill

This is the cheapest, most reversible change. Land it first.

### Step 1: Inspect the fixtures parquet.

```bash
cd "/Users/nicolasduarte/Documents/Claude/Projects/The 45 Percent Problem/the-45-percent-problem"
python -c "import pandas as pd; df = pd.read_parquet('data/raw/wc2026_fixtures.parquet'); print(df.columns.tolist()); print(df.head(10)); print('rows:', len(df))"
```

Capture: the column names, a sample of rows, and the total row count. The expected total is 104 matches (72 group stage + 32 knockout: 16 R32 + 8 R16 + 4 QF + 2 SF + 1 3P + 1 FIN — verify against the actual schema, the WC 2026 format may differ).

### Step 2: Read BracketBoard.tsx to understand the slots-populated branch.

Specifically read:
- `website/src/components/compositions/BracketBoard.tsx:40` (the slotsPopulated branch decision)
- `BracketBoard.tsx:92-94` (the draw-resolved branch)
- `BracketBoard.tsx:141-142` (the "Once the draw resolves" copy)

Determine the expected shape of each slot object inside `bracket.json[round].slots[]`. Specifically: what fields does each slot need (slot_id, home_team_code, away_team_code, match_date, venue, etc.)? Read the JSON deserialization in BracketBoard or wherever bracket.json is consumed to find the expected schema.

### Step 3: Write a one-shot backfill script.

Location: `scripts/backfill_bracket_slots.py` (new file).

The script:
1. Reads `data/raw/wc2026_fixtures.parquet`.
2. Groups rows by tournament round / phase column (probably `phase` or `round`).
3. Builds the slot objects for each round in the shape `BracketBoard.tsx` expects.
4. Reads `website/public/data/latest/bracket.json`.
5. Replaces each round's empty `slots: []` with the populated slot list.
6. Writes the updated `bracket.json` back to disk.

The script must:
- Be idempotent (running it twice produces the same output, not duplicated).
- Be re-runnable (no destructive ordering; reads-then-writes only).
- Preserve the existing `snapshot_id` field at the top of `bracket.json`.
- Use existing logger / hasher utilities (`utils/logger.py`, `utils/hasher.py`) per the project conventions in `CLAUDE.md`.

Run it:

```bash
python scripts/backfill_bracket_slots.py
```

Verify the result:

```bash
cat website/public/data/latest/bracket.json | jq '.rounds[] | {round, slot_count: (.slots | length)}'
```

Expected output (matching whatever the actual WC 2026 format is — verify):

```
{"round": "GRP", "slot_count": 72}
{"round": "R32", "slot_count": 16}
{"round": "R16", "slot_count": 8}
{"round": "QF", "slot_count": 4}
{"round": "SF", "slot_count": 2}
{"round": "3P", "slot_count": 1}
{"round": "FIN", "slot_count": 1}
```

Total slots should equal 104.

### Step 4: Confirm BracketBoard renders the populated view.

Start dev server, visit `/bracket`, confirm the page no longer shows the "pre-tournament, slots unresolved" empty state. Take a screenshot of the new rendering for the PR.

If the populated rendering looks broken (missing teams, layout collapse, etc.), STOP and report. We may need to fix `BracketBoard.tsx` before the backfill lands (which is the structural part of Fix 5 that we're explicitly deferring). In that case, revert the bracket.json change and leave a note for cp-12.

### Commit 1.

```bash
git add scripts/backfill_bracket_slots.py website/public/data/latest/bracket.json
git commit -m "cp-09 part 1: backfill bracket.json slots from wc2026_fixtures"
```

## Stage 2 — Snapshot metadata derivation (Fix 2)

### Step 1: Understand the match_outcomes data source.

The website's database schema for `match_outcomes` is in `website/src/lib/db/schema.ts` or similar. The Python pipeline needs to read settled counts, but the source-of-truth lives in the database (populated by the live ingest path and the admin endpoint).

Two options for the regenerate script:
- **Option A:** Read from a Parquet snapshot of `match_outcomes` that gets exported periodically.
- **Option B:** Query the database directly via psql / Python's database driver.

Read `website/src/lib/db/` end to end to determine which option is feasible. If there's already a `match_outcomes.parquet` or similar in the data pipeline, use Option A. If not, use Option B with the database connection string from the env. Prefer Option A for repeatability; Option B is acceptable if needed.

If neither is feasible from the Python script's runtime context (e.g. the script runs in CI without database access), STOP and report. Fix 2 may need a small ingestion shim before it can derive the count.

### Step 2: Modify regenerate_snapshot_from_batch.py.

Specifically lines 304-306. Replace:

```python
"tournament_phase":     "pre_tournament",
"matches_settled":      0,
"matches_remaining":    104,
```

With derived values:

```python
settled_count = _count_settled_matches()  # new helper
total_matches = _count_total_matches()    # new helper (probably 104)
phase = _derive_phase(settled_count, total_matches)
"tournament_phase":     phase,
"matches_settled":      settled_count,
"matches_remaining":    total_matches - settled_count,
```

Phase derivation (use the exact strings from `schemas.ts:29-38`):

```python
def _derive_phase(settled: int, total: int) -> str:
    if settled == 0:
        return "pre_tournament"
    if settled >= total:
        return "completed"
    if settled <= 71:
        return "group_stage"
    if settled <= 87:
        return "round_of_16"  # Verify the actual transition points against the fixture data
    if settled <= 95:
        return "quarter_final"
    if settled <= 99:
        return "semi_final"
    return "final"
```

**Important:** the phase transition points (71, 87, 95, 99, 103) are guesses based on a standard 48-team tournament structure. Verify against the actual `wc2026_fixtures.parquet` row counts per phase before hardcoding. If the format differs from the standard, adjust accordingly.

### Step 3: Test with a dry run.

```bash
python scripts/regenerate_snapshot_from_batch.py
cat website/public/data/latest/snapshot_meta.json | jq '{tournament_phase, matches_settled, matches_remaining}'
```

Today (June 1, no matches settled yet), the expected output is:

```json
{
  "tournament_phase": "pre_tournament",
  "matches_settled": 0,
  "matches_remaining": 104
}
```

That matches the current values (because no matches are settled), which is correct. The fix isn't visible today; it becomes visible on June 11.

To verify the derivation works for the future, write a small unit test in `tests/scripts/test_snapshot_metadata.py` (create the directory if it doesn't exist):

```python
def test_phase_derivation():
    assert _derive_phase(0, 104) == "pre_tournament"
    assert _derive_phase(1, 104) == "group_stage"
    assert _derive_phase(71, 104) == "group_stage"
    assert _derive_phase(72, 104) == "round_of_16"
    assert _derive_phase(95, 104) == "quarter_final"
    assert _derive_phase(99, 104) == "semi_final"
    assert _derive_phase(103, 104) == "final"
    assert _derive_phase(104, 104) == "completed"
```

Run `pytest tests/scripts/`.

## Stage 3 — Model variant provenance (Fix 4)

### Step 1: Add model_variant to the tournament.json output.

In `regenerate_snapshot_from_batch.py`, find the section that builds the tournament dict (around line 280, where the keys like `teams`, `mc_runs`, etc. are assembled). Add:

```python
"model_variant": "M2_fifa",
```

The string `"M2_fifa"` matches `data/calibration/champion_model.json::m_star_model_id`. To avoid drift, read it from the calibration file rather than hardcoding:

```python
champion_internal = champion.get("m_star_model_id", "M2_fifa")
# ... later in the tournament dict:
"model_variant": champion_internal,
```

This is the same `champion_internal` variable already defined earlier in the script.

### Step 2: Update the tournament schema.

In `website/src/lib/data/schemas.ts`, find `TournamentSnapshotSchema` (or whatever schema validates `tournament.json`'s top level). Add a `model_variant` field with a Zod enum that accepts the known locked-variant identifiers:

```typescript
model_variant: z.enum(["M2_fifa", "M0", "M1", "M2", "M3", "M_STAR"]),
```

Make it required (not optional). The fix is meant to fail validation if a tournament.json is loaded without this field.

### Step 3: Verify validation fires.

Write a small test in `tests/unit/snapshotProvenance.test.ts` (or wherever the schema tests live; grep for `TournamentSnapshotSchema` in the test directory):

```typescript
it("rejects tournament.json without model_variant", () => {
  const sample = { snapshot_id: "...", generated_at_utc: "...", mc_runs: 10000, teams: [] };
  expect(() => TournamentSnapshotSchema.parse(sample)).toThrow();
});

it("accepts M2_fifa as the model variant", () => {
  const sample = { snapshot_id: "...", generated_at_utc: "...", mc_runs: 10000, teams: [], model_variant: "M2_fifa" };
  expect(() => TournamentSnapshotSchema.parse(sample)).not.toThrow();
});
```

Run `pnpm test` to confirm.

### Commit 2.

```bash
git add scripts/regenerate_snapshot_from_batch.py website/src/lib/data/schemas.ts tests/
git commit -m "cp-09 part 2: derive snapshot metadata, add model_variant provenance"
```

## Verification (before pushing)

- [ ] `bracket.json` shows populated slots for all seven rounds (counts match the WC 2026 format; total = 104).
- [ ] `pnpm dev` and visit `/bracket`: the page renders the slots-populated view, not the pre-tournament matrix.
- [ ] Screenshot of the new bracket page rendering is captured for the PR.
- [ ] `scripts/regenerate_snapshot_from_batch.py` runs cleanly with no new errors.
- [ ] `snapshot_meta.json` after a dry run shows derived values (today: identical to before because no matches settled; the derivation logic is in place but invisible until June 11).
- [ ] `tournament.json` after the dry run includes `"model_variant": "M2_fifa"`.
- [ ] `pnpm test` passes; the new schema test confirms validation rejects missing `model_variant`.
- [ ] `pytest tests/scripts/` passes; the new phase derivation test covers all transitions.
- [ ] `pnpm lint`, `pnpm tsc --noEmit` clean.
- [ ] `pnpm build` succeeds; `/bracket` still renders correctly in production build.
- [ ] cp-04, cp-06, cp-07, cp-08 fixes all preserved.
- [ ] Diff stat: two commits, probably 4-6 files touched, on the order of 150-300 lines added.

## Merge-readiness checklist

Answer each with `Y` or `N` (or `N*` with substantive rationale).

```
Y/N — bracket.json slots are populated; counts match fixture data; total 104.
Y/N — Dev /bracket page renders the slots-populated view without crashing or visible layout breakage.
Y/N — Screenshot of the new bracket page is captured.
Y/N — regenerate_snapshot_from_batch.py derives tournament_phase from settled count using the canonical enum.
Y/N — Phase derivation test covers all transition points (pre_tournament → group_stage → ... → completed).
Y/N — tournament.json output includes model_variant: "M2_fifa", sourced from champion_model.json.
Y/N — TournamentSnapshotSchema now requires model_variant; validation test rejects payloads without it.
Y/N — pnpm test / pnpm lint / pnpm tsc --noEmit clean.
Y/N — pytest tests/scripts/ passes.
Y/N — pnpm build clean; /bracket still renders in production build.
Y/N — cp-04, cp-06, cp-07, cp-08 fixes preserved.
Y/N — No em or en dashes in any new code or copy.
Y/N — Two commits on branch (part 1 = backfill, part 2 = derivation + provenance).
Y/N — Branch is cp-09-snapshot-integrity, off latest main, ready to PR.
```

If every item is `Y`, push and open the PR. PR description should:

- Name the three fixes (backfill, Fix 2, Fix 4) and link them to the diagnostic sections (3.2, 3.4, 3.5).
- Include the before/after screenshot of `/bracket`.
- Note that this is wave 1 of live-readiness; waves 2-4 (Fix 1, Fix 3, Fix 5 structural, Fix 6) follow as cp-10 through cp-13.
- Confirm the original cp-09 Surface B onboarding work is deferred to a later checkpoint number (cp-14+) once the foundation is correct.

If any item is `N`, explain the blocker and stop.

## Out of scope (do not implement)

- **Fix 1 (settled-result conditioning in Monte Carlo).** That's cp-10. Don't touch `simulation/monte_carlo_runner.py`, `batch_runner.py`, or `bracket_encoder.py`.
- **Fix 3 (M0/M2 reconciliation).** That's cp-11. Don't regenerate `snapshotProbs.ts` or modify the evaluator.
- **Fix 5 structural (bracket.json populated by every snapshot run).** This checkpoint does a one-shot backfill only. The structural fix (regenerate script also populates slots on every run) is cp-12. After kickoff, the draw is fixed and slots don't change, so the one-shot is sufficient for the public surface; the structural fix is for the snapshot pipeline's completeness.
- **Fix 6 (admin endpoint refresh).** That's cp-13. Don't modify `route.ts`.
- **Volatility Gate.** Deferred to post-launch per the architectural decisions.
- **Surface B onboarding.** Deferred until live-readiness is shipped.

## Decision tree if things don't match

- **Fixture parquet has a different schema than expected.** Read it, document the actual columns and row counts in the PR description, adapt the backfill script accordingly.
- **BracketBoard.tsx slots-populated branch crashes or renders nothing useful.** Revert the bracket.json change before commit. Report the rendering bug as a blocker for cp-09 part 1; cp-09 part 2 can still ship. We'd need a separate component fix before populating bracket.json on production.
- **The phase transition row counts in the fixture parquet differ from the standard 48-team format.** Adjust the `_derive_phase` function to match actual counts; document the per-phase row counts in the test file's docstring.
- **`match_outcomes` count isn't accessible from the Python script's runtime.** Stop and report. Fix 2 may need a small data export step before it can run; we can either (a) export `match_outcomes` to parquet nightly from the website's database, or (b) wire the Python script to read from the DB. The choice depends on what's already plumbed.
- **Schema validation breaks something downstream when `model_variant` becomes required.** This is intentional — if anything else loads `tournament.json` (the homepage, the simulator, the bracket page), the validation should accept the new field. If something fails, the consumer needs to update to accept the field, OR we need to add a backward-compat path. Surface the failure with the file path so it's fixable.

## A note on judgement

This checkpoint is small in scope but high in impact. The three fixes individually are 30-minute to 2-hour tasks; together they're a half-day of focused work that removes the most embarrassing structural lies from the live snapshot. None of them are load-bearing for the bigger Fix 1 in cp-10 — that work is independent. But shipping cp-09 first establishes the patterns (metadata derivation, model_variant provenance, slot population) that Fix 1's snapshot output will reuse, so the cp-10 work has less invention to do.

After cp-09 ships, cp-10 is the real work: making the Monte Carlo condition on settled results. That's the load-bearing fix. Everything else is editorial integrity.

Next checkpoints in sequence:
- cp-10: Fix 1 (settled-result conditioning in MC). The big one.
- cp-11: Fix 3 (regenerate snapshotProbs.ts from M2, wire into nightly).
- cp-12: Fix 5 (structural — regenerate script also populates bracket.json on every run).
- cp-13: Fix 6 (admin endpoint triggers snapshot refresh).
- cp-14+: Surface B onboarding (deferred from cp-09).
