# Architecture Diagnostic: Live-Operation Readiness

**Date:** 2026-06-01
**T-minus:** 10 days to opening match (2026-06-11)
**Source:** Static audit of `main` (no code executed)
**Severity:** Critical. The site is not yet a live model. Without changes 1 and 2 below, the public bracket will show pre-tournament probabilities throughout the entire tournament window and assign non-zero champion probability to eliminated teams.
**Owner ask:** Decisions on items in section 7. Remediation in section 5 is sequenced and ready to execute.

---

## 1. Executive Summary

The bracket page is correctly served by M2_fifa, the locked champion model. The nightly snapshot cron is rewired and running (memory was stale). Those are the two things the prior open questions resolved positively.

Everything else needed for the site to behave as a live model during the 2026 World Cup is missing. Specifically:

1. The Monte Carlo simulator does not condition on settled results. Eliminated teams will not collapse to 0%.
2. Three snapshot metadata fields are hardcoded to pre-tournament values. The page will claim the tournament has not started even after it ends.
3. A baked-in M0 probability table grades user predictions, while the front page shows M2. Two model regimes are live in production simultaneously.
4. The `bracket.json` slots are empty, so the bracket page falls back to the pre-tournament marginal matrix regardless of whether the draw has resolved or matches have been played.
5. The manual admin endpoint upserts match outcomes for the predictions evaluator but does not trigger snapshot regeneration or cache invalidation, so manually-entered results never appear on the bracket page.

Item 1 is the only load-bearing fix. The rest are required for editorial integrity and academic defensibility, but they do not by themselves prevent the page from looking frozen on June 12. Item 1 does.

---

## 2. What Is Verified Working

| Component | Evidence | Status |
|---|---|---|
| Champion model is M2_fifa | `data/calibration/champion_model.json:2` (`CHAMPION_LOCKED: true`) | OK |
| Active batch is post-amendment M2 | `data/calibration/active_batch.json:3` (`batch_20260512_013228Z`) | OK |
| Bracket page reads M2 numbers | `scripts/regenerate_snapshot_from_batch.py:247` reads `team_runs_M2.parquet` | OK |
| Nightly cron is rewired | `.github/workflows/nightly_pipeline.yml:57` invokes `regenerate_snapshot_from_batch.py` | OK |
| Snapshot is fresh (not stuck) | `website/public/data/latest/snapshot_meta.json:3` shows `snapshot_id: "2026-05-31T02:09Z"` | OK |
| Live-ingestion path posts to API | `ingestion/fetch_match_outcomes.py` and GitHub Action confirmed | OK |

---

## 3. Critical Findings

### 3.1 Monte Carlo does not condition on settled results

**Severity:** P0. Credibility-killer.
**Evidence:** `simulation/monte_carlo_runner.py:247-272` iterates `self._group_fixtures` and calls `self._mm.sample_scoreline(lam_h, lam_a)` for every group match on every run. `batch_runner.py` and `bracket_encoder.py` contain zero references to `match_outcomes`, `settled`, or `fixed_result`.
**Impact:** Every nightly regeneration re-rolls the entire tournament from pre-tournament strengths. If Mexico loses 0-3 on June 11, the snapshot dated June 12 will still show Mexico at 92% group survival. Mathematically eliminated teams will retain visible champion probability throughout the tournament.
**This is the headline product failure.** Every other finding below is amplified by this one.

### 3.2 Three snapshot metadata fields are hardcoded

**Severity:** P0. Cosmetic but visible.
**Evidence:** `scripts/regenerate_snapshot_from_batch.py:304-306` hardcodes `tournament_phase: "pre_tournament"`, `matches_settled: 0`, `matches_remaining: 104`.
**Impact:** On any date during the tournament window, the public snapshot will assert that no matches have been settled and the tournament has not begun. This contradicts the very data the model is supposed to be reacting to. Trivial fix, embarrassing if shipped.

### 3.3 Split-brain: M2 on bracket, M0 on prediction grading

**Severity:** P1. Academic integrity.
**Evidence:** `website/src/lib/sim/snapshotProbs.ts:1` opens with the comment "Auto-generated from M0 snapshot 2026-05-04T00:00Z". This table drives `runEvaluatorAcrossPredictions`, which is called by both the admin endpoint and the live-ingest endpoint to grade user predictions against "the model."
**Impact:** Two model regimes are simultaneously live. A user reading the bracket page sees M2 probabilities; the same user's predictions are graded against M0. The paper cannot honestly describe "the model" without picking one. The Reality-Score feature is currently incoherent.

### 3.4 `tournament.json` has no `model_variant` field, schema disallows the locked value

**Severity:** P1. Provenance.
**Evidence:** `website/public/data/latest/tournament.json:1-22` carries no `model_variant`. `website/src/lib/data/schemas.ts:27` enum permits only `M0 | M1 | M2 | M3 | M_STAR`. The locked champion identifier `M2_fifa` is not a legal schema value. Provenance only survives in `snapshot_meta.json`.
**Impact:** Every served probability has lost its model identity by the time it reaches the React layer. If a future batch silently swaps variants, no schema validation will catch it.

### 3.5 `bracket.json` slots are empty; "draw resolved" branch is dead code

**Severity:** P1. Feature promise unmet.
**Evidence:** `website/public/data/latest/bracket.json:1-30` shows empty slots. `BracketBoard.tsx:40` takes the `slotsPopulated=false` branch and renders only the marginal matrix from `tournament.json`. The string "Once the draw resolves, this view augments..." lives inside the `!slotsPopulated` empty-state at `BracketBoard.tsx:141-142`. The draw-resolved branch at `:92-93` only changes the header subtitle; no conditional probabilities are computed.
**Impact:** Marketing copy promises a feature that does not exist. The draw has already resolved, but the page will continue serving the pre-draw view.

### 3.6 Admin endpoint does not refresh the public snapshot

**Severity:** P1. Operational safety net is missing.
**Evidence:** `website/src/app/api/admin/match-outcomes/route.ts:111-139` upserts the outcome row and calls `runEvaluatorAcrossPredictions` at `:147`. Nothing in that route or in `runEvaluator.ts` triggers `regenerate_snapshot_from_batch.py`, mutates `bracket.json` or `tournament.json`, or calls `revalidatePath`. The bracket page is `dynamic = "force-static"` at `website/src/app/(quant)/bracket/page.tsx:31`.
**Impact:** The fallback mechanism described in `website/CLAUDE.md:38-40` protects user predictions but not the public bracket. If Football-Data.org lags, the public page lags with it.

---

## 4. Risk Timeline

| Date | What breaks if nothing changes |
|---|---|
| 2026-06-11 (opening match) | Snapshot still says `pre_tournament`, `matches_settled: 0`. Public bracket still shows pre-tournament marginals. |
| 2026-06-12 (after first day) | First eliminated underdogs hold positive champion probability on the page. First press-quotable error. |
| 2026-06-23 (end of group stage) | 16 mathematically-eliminated teams visible with positive R16 probability. Press packets become untenable. |
| 2026-06-29 (R16 begins) | Bracket page still shows the slots-unresolved matrix despite a fully-determined bracket. |
| 2026-07-19 (Final) | Final-day snapshot still reports zero settled matches. Reality-Score leaderboard reflects M0 grading against an M2 front page. |

---

## 5. Remediation Plan (Sequenced)

### Fix 1. Settled-result conditioning in the Monte Carlo

- **Files:** `simulation/monte_carlo_runner.py`, `simulation/batch_runner.py`, `scripts/regenerate_snapshot_from_batch.py`
- **Scope:** `MonteCarloRunner.__init__` accepts a `settled_results: dict[str, MatchResult]` parameter keyed by `match_id`. Inside the per-run loop, replace `sample_scoreline` calls with the realized scoreline when the match_id is present in the settled dict. `batch_runner.py` reads `match_outcomes` (Parquet snapshot or DB pull) before each run and passes the dict in. `regenerate_snapshot_from_batch.py` reads from a batch produced with the current `match_outcomes` set.
- **Acceptance:** After manually inserting a 0-3 Mexico loss into `match_outcomes` and running a 1k-batch dev pipeline, Mexico's `p_champion` in the produced `tournament.json` is less than 0.005, and Mexico's group A `p_r16` reflects the conditional state correctly.
- **Effort:** 1 to 2 days. Load-bearing.

### Fix 2. Derive snapshot metadata from match_outcomes

- **Files:** `scripts/regenerate_snapshot_from_batch.py:304-306`
- **Scope:** Replace the three hardcoded fields with values computed from a count of rows in `match_outcomes` (settled count) and `wc2026_fixtures` (total). Derive `tournament_phase` from a phase table: pre_tournament if 0 settled, group_stage if <72 settled, knockout if 72 to 103 settled, complete if 104 settled.
- **Acceptance:** Snapshot metadata reflects current settled count to within 1 hour of cron run.
- **Effort:** Half a day. Hard requirement before opening match.

### Fix 3. Reconcile the M0 / M2 split

- **Files:** `website/src/lib/sim/snapshotProbs.ts`, the producer that generated it, and any consumer of `runEvaluatorAcrossPredictions`
- **Scope:** Two options. (a) Regenerate `snapshotProbs.ts` from the active M2 batch and re-run on every nightly snapshot, with provenance comments. (b) Remove the static table entirely and have the evaluator read live M2 probabilities from `tournament.json` at evaluation time. Option (b) is cleaner and removes a class of drift bug.
- **Acceptance:** A single grep for `snapshotProbs` shows one model variant. The evaluator and the bracket page agree on a sample of 10 match probabilities to within numerical tolerance.
- **Effort:** 1 day for option (b).

### Fix 4. Add model_variant to tournament.json and tighten the schema

- **Files:** `scripts/regenerate_snapshot_from_batch.py`, `website/src/lib/data/schemas.ts`
- **Scope:** Stamp `model_variant: "M2_fifa"` on every `tournament.json` write. Expand the schema enum to include `M2_fifa` (and other locked variant identifiers). Add a Zod validation gate that rejects loads with mismatched provenance.
- **Acceptance:** A `tournament.json` lacking `model_variant` fails schema validation in CI.
- **Effort:** 2 hours.

### Fix 5. Populate bracket.json once the draw is resolved

- **Files:** `scripts/regenerate_snapshot_from_batch.py` (or a new `scripts/build_bracket_slots.py`)
- **Scope:** When the draw is resolved (or backfilled now, since it already is), populate `bracket.json` with the slot-to-team mapping from `wc2026_fixtures`. Then verify `BracketBoard.tsx:92-93` takes the draw-resolved branch and that the page renders conditional probabilities, not the same marginal matrix.
- **Acceptance:** The bracket page renders the slots-populated view with a non-trivial visual diff from the current pre-draw view.
- **Effort:** Half a day for slot population. The conditional-probability rendering may already exist or may need new component work; check before estimating.

### Fix 6. Wire snapshot refresh into the admin endpoint

- **Files:** `website/src/app/api/admin/match-outcomes/route.ts`, `website/src/app/api/ingest/match-outcomes/route.ts`
- **Scope:** After a successful upsert, both routes invoke a snapshot-regeneration step (either triggering the GitHub Action, calling `regenerate_snapshot_from_batch.py` directly, or at minimum invoking `revalidatePath("/bracket")` against a server-rendered version of the page). The "force-static" mode on the bracket page must be revisited if the page is expected to update intra-day.
- **Acceptance:** Manually entering a settled outcome via `/api/admin/match-outcomes` produces a visible change on `/bracket` within 10 minutes.
- **Effort:** 1 day, including the static-vs-dynamic decision on the bracket route.

---

## 6. Acceptance Criteria for "Live-Ready"

The site is live-ready when all of the following hold simultaneously:

1. A scripted test inserts a fictional 0-3 Brazil loss into `match_outcomes`, triggers regeneration, and the bracket page shows Brazil with `p_champion` reduced (and the other group-mates' probabilities increased) in a sign-correct way.
2. After 5 fictional matches are inserted, `snapshot_meta.json` reports `matches_settled: 5` and `tournament_phase: "group_stage"`.
3. A grep across the website finds exactly one model variant referenced for probability serving.
4. `tournament.json` schema validation in CI rejects payloads missing `model_variant`.
5. `bracket.json` slots are populated and `BracketBoard` renders the slots-populated branch.
6. `/api/admin/match-outcomes` integration test confirms a manual entry propagates to a visible bracket-page change within 10 minutes.

A pre-tournament dry run executing all six checks against a staging environment is the recommended go / no-go gate for 2026-06-11.

---

## 7. Open Architectural Questions

These require judgment from the architect before remediation can be finalized.

1. **Conditional re-batching vs. live MC.** Fix 1 can be implemented two ways. Option A: re-run the full 10k batch every time `match_outcomes` changes (slow, expensive, fully deterministic). Option B: keep a single batch but post-process at snapshot-build time by reweighting paths that match the realized results (fast, requires sufficient path coverage, may produce zero coverage in extreme upset trees). The blueprint specifies 10k for the website. Which is the production approach?
2. **Static vs. dynamic bracket page.** The page is `force-static`. With live updates required during the tournament, options are (a) revalidate on a fixed interval, (b) revalidate on snapshot write, (c) switch the page to `dynamic = "force-dynamic"`. Each has performance implications. Pick one and document it.
3. **Backfill of `bracket.json` slots.** The draw has resolved. Do we backfill bracket.json from the existing fixtures parquet now, or wait for the snapshot-build path in Fix 5 to do it? Backfilling now lets us see the slots-populated view before kickoff, which is useful for stakeholder review.
4. **M0 deprecation timing.** If Fix 3 chooses option (b), the M0 dependency disappears from the evaluator. Should M0 still be kept as a CV-baseline artifact for the paper, or removed from the production tree entirely? Recommendation: keep in calibration data, remove from the website tree.
5. **Volatility Gate scope.** The blueprint defines 5 suppression rules for M★ recommendations. None of those rules appear to be enforced in the snapshot path. Is the Volatility Gate in scope for live launch, or deferred to a post-launch milestone?

---

## 8. Appendix: File Reference Index

Quick-jump list for the architect.

**Simulation core**
- `simulation/monte_carlo_runner.py:247-272`. Group-match sampling loop with no settled-result check.
- `simulation/batch_runner.py`. Batch orchestrator, no `match_outcomes` reference.
- `simulation/bracket_encoder.py`. Bracket structure, no settled-result reference.

**Snapshot regeneration**
- `scripts/regenerate_snapshot_from_batch.py:247`. Reads `team_runs_M2.parquet`.
- `scripts/regenerate_snapshot_from_batch.py:262`. Stamps `champion_model: "M_STAR"`.
- `scripts/regenerate_snapshot_from_batch.py:304-306`. Hardcoded `tournament_phase`, `matches_settled`, `matches_remaining`.
- `scripts/regenerate_snapshot_from_batch.py:356-364`. Flags `divergence.json` as M0-derived.

**Website data layer**
- `website/public/data/latest/tournament.json:1-22`. No `model_variant` field.
- `website/public/data/latest/bracket.json:1-30`. Empty slots.
- `website/public/data/latest/snapshot_meta.json:3`. Current snapshot id.
- `website/src/lib/data/schemas.ts:27`. Schema enum lacking `M2_fifa`.
- `website/src/lib/sim/snapshotProbs.ts:1`. M0 baked-in table.

**Website components**
- `website/src/components/compositions/BracketBoard.tsx:40`. `slotsPopulated` branch decision.
- `website/src/components/compositions/BracketBoard.tsx:92-94`. Draw-resolved branch (currently dead).
- `website/src/components/compositions/BracketBoard.tsx:141-142`. "Once the draw resolves" copy.

**Website API**
- `website/src/app/api/admin/match-outcomes/route.ts:111-139`. Upsert logic.
- `website/src/app/api/admin/match-outcomes/route.ts:147`. Evaluator invocation.
- `website/src/app/api/admin/match-outcomes/route.ts:140-163`. Confirmed: no snapshot trigger.
- `website/src/app/(quant)/bracket/page.tsx:31`. `dynamic = "force-static"`.

**Calibration provenance**
- `data/calibration/champion_model.json:2`. Champion lock record.
- `data/calibration/active_batch.json:3`. Active batch ID.

**Operations**
- `.github/workflows/nightly_pipeline.yml:57`. Cron entrypoint.
- `website/CLAUDE.md:38-40`. Operator-as-safety-net claim.

---

*End of diagnostic. Open questions in section 7 are blocking. Remediation in section 5 can begin on items 2, 4, and 5 in parallel with the architect's decisions on items 1, 3, and 6.*
