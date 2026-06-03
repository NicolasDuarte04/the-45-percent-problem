# Architecture Diagnostic: Live-Operation Readiness, 2026-06-03

**Date:** 2026-06-03
**T-minus:** 8 days to opening match (2026-06-11)
**Source:** Static audit of `main` at `1edd971` (cp-10 merge, #76). No code executed; production endpoints curled read-only; GH Actions run logs read.
**Severity:** Critical — and for a different reason than the 2026-06-01 diagnostic. That audit found the model *would* look frozen during the tournament because the MC didn't condition. cp-10 fixed the conditioning logic. But the audit below finds that **the nightly pipeline that runs that logic is already failing in CI (since 2026-06-03), and the cp-10 re-batch path cannot run in the cron environment at all** because the data inputs it depends on are gitignored and absent from the clean checkout. The model will look frozen during the tournament — not because the math is wrong, but because the pipeline that would refresh it crashes before it starts.
**Owner ask:** Decisions on §7. The two P0s in §3 block cp-11; they must be fixed first. Recommendation: insert a `cp-10.1` data-availability hotfix before cp-11.

---

## 1. Executive Summary

The cp-09 and cp-10 *code* largely shipped what it claimed. The Monte Carlo conditions on settled group-stage results (`simulation/monte_carlo_runner.py:286-320`); snapshot metadata is derived rather than hardcoded (`scripts/regenerate_snapshot_from_batch.py:618-664`); `tournament.json` carries `model_variant: "M2_fifa"` on disk and in production; `bracket.json` has all 104 slots populated with concrete teams; the `_resolve_pg_url()` precedence prefers `DIRECT_URL`; `psycopg[binary]>=3.1` is a default dependency; and the cron workflow provisions the DB secrets. The cp-04/06/07/08 UI surfaces are all present and wired. On a developer's machine, where every Parquet input exists, the whole thing works — the cp-10 acceptance test confirms Mexico's `p_champion` collapses to exactly 0 under a fully-conditioned elimination.

**The problem is the production environment, not the code.** Two findings, both P0, both invisible to the test suite and both already biting or about to:

1. **The nightly pipeline has been failing since 2026-06-03.** Run `26860278471` (2026-06-03T02:36Z, the first scheduled run after cp-09 merged) exited 1 with `FileNotFoundError: wc2026 fixtures parquet not found`. cp-09's new `_count_total_matches()` hard-requires `data/raw/wc2026_fixtures.parquet`, which is gitignored (`.gitignore:26`) and therefore absent from the cron's clean checkout of `main`. Pre-cp-09 nightlies survived only because the metadata was hardcoded and nothing read that file. Production has been frozen at snapshot `2026-06-02T16:24Z` ever since, and every future nightly will fail identically until the input is provided.

2. **cp-10's conditioning cannot fire in the cron even after #1 is fixed.** The re-batch path (`simulation/batch_runner.py:213-233`, reached via `run_batch` on a settled-count delta) reconstructs the runner through `DataLoader.get_elo/get_matches/get_recent_form/get_fifa_rankings/get_macro`, every one of which reads a `data/raw/*.parquet` file. **Zero** `data/raw/*.parquet` files are git-tracked (`git ls-files 'data/raw/*.parquet'` → 0). So the moment the first group match settles during the tournament and the settled-count delta triggers a re-batch, `run_batch` will crash in CI exactly the way the metadata read crashes today. The load-bearing live-readiness fix is architecturally unable to run in the environment that is supposed to run it. Consistent with this, `data/calibration/active_batch.json` is still `schema_version: "1.0"` with no `settled_count_at_batch_time` — the cp-10 code path has never executed in production.

The shared root cause is an environment/data-availability gap that no CI gate could catch, because **there is no CI gate**: no workflow runs `pytest`, `ruff`, `mypy`, or `tsc` (§3.3). cp-09's tests mock the settled counts and never run the real `regenerate_snapshot_from_batch.py` against a clean tree, so the regression sailed onto `main` green.

Net: the conditioning math is correct and well-tested locally, but the live model is currently not live — it is a static page frozen on June 2, and the mechanism intended to un-freeze it is broken in two independent places. This must be resolved before cp-11 (Fix 3) adds more work to the same pipeline.

---

## 2. What Is Verified Working

Every row here was checked against file:line evidence and, where a production surface exists, curled live. "Verified" means observed, not trusted.

| Component | Evidence | Status |
|---|---|---|
| MC conditions on settled group results | `simulation/monte_carlo_runner.py:286-320` branches on `self._settled_results.get(match_id)`; uses realized scoreline, skips sampling | OK (code) |
| Conditioning is sign-correct & load-bearing | `tests/scripts/test_settled_conditioning.py:232-320`: full elimination → `p_champion == 0.0` exactly; single 0-3 → ≥20% relative drop; group-mates' `p_r16` rises | OK (local test) |
| Snapshot metadata derived, not hardcoded | `scripts/regenerate_snapshot_from_batch.py:618-664` computes `tournament_phase`/`matches_settled`/`matches_remaining` via `_derive_phase` + `_count_settled_matches` | OK (code) |
| `model_variant: "M2_fifa"` stamped | `tournament.json:4` on disk **and** `curl https://45analytics.com/data/latest/tournament.json` → `"model_variant": "M2_fifa"` | OK (prod) |
| Schema requires `model_variant`, accepts `M2_fifa` | `website/src/lib/data/schemas.ts:75-88` (`ModelVariantSchema` enum incl. `"M2_fifa"`; required at `:88`) | OK |
| `bracket.json` has 104 populated slots | Disk + prod curl: `GRP 72, R32 16, R16 8, QF 4, SF 2, 3P 1, FIN 1` = 104; slot 1 = `MEX`/`RSA`, `placeholder: false` | OK (prod) |
| `_resolve_pg_url()` prefers `DIRECT_URL` | `simulation/load_settled.py:66-78` and `scripts/regenerate_snapshot_from_batch.py:250-268` — identical `DIRECT_URL → DATABASE_URL → POSTGRES_URL` order | OK |
| `psycopg[binary]>=3` is a dependency | `pyproject.toml:51` (`"psycopg[binary]>=3.1"`, default deps) | OK |
| Cron provisions DB env vars | `.github/workflows/nightly_pipeline.yml` regen step sets `DIRECT_URL`/`DATABASE_URL`; `gh secret list` confirms both exist at repo level (since 2026-05-03) | OK (but see §3.1 — unreachable) |
| Active-batch missing-field handling | `regenerate…py:358,368-372` defaults `prior_count=0` and back-fills `settled_count_at_batch_time`/`settled_source` without a spurious re-batch | OK |
| Bracket page statically prerendered | `bracket/page.tsx:31` `dynamic = "force-static"`; prod headers: `x-nextjs-prerender: 1`, `x-vercel-cache: PRERENDER` | OK |
| cp-04 dual-SE pill (calm) | `components/editorial/KillCriteriaStatusBlock.tsx:116-195` on `/vault/kill-criteria`; mint/rose, no alarm-red | OK |
| cp-06 route-group skeletons | `app/(editorial)/loading.tsx`, `app/(simulator)/loading.tsx`, `app/(quant)/loading.tsx` — all non-empty, layout-matched | OK |
| cp-07 sticky meter label | `components/simulator/ui/StickyProgressMeter.tsx:116` → `"[ See how the model reacts ]"`; imported by all 3 scenario modes | OK |
| cp-08 onboarding chip/modal/masthead | `OnboardingController.tsx:155,158` mounts chip+modal; `EditorialMasthead.tsx:103-169` pill; gated on `localStorage["45a.onboarding.seen"]` | OK |

**Caveat that downgrades three of these:** the first three rows ("MC conditions", "metadata derived", "missing-field handling") are verified *as code* and *locally*. None has ever executed in the cron — see §3.1/§3.2. "Works on disk" ≠ "works in production" here, and that gap is the whole story.

---

## 3. Critical Findings

### 3.1 The nightly pipeline is failing in CI (production frozen since 2026-06-02)

**Severity:** P0. The live model is not live.
**Evidence:**
- `gh run list --workflow nightly_pipeline.yml`: run `26860278471` (2026-06-03T02:36Z) = **failure**; the four prior runs (2026-05-29 … 2026-06-02) all succeeded.
- `gh run view 26860278471 --log-failed`: `FileNotFoundError: wc2026 fixtures parquet not found at .../data/raw/wc2026_fixtures.parquet; cannot derive matches_remaining.` → `##[error]Process completed with exit code 1`.
- Source of the raise: `scripts/regenerate_snapshot_from_batch.py:224-233` (`_count_total_matches()`), introduced by cp-09 (#75) to replace the hardcoded `104`.
- `git check-ignore -v data/raw/wc2026_fixtures.parquet` → ignored by `.gitignore:26` (`data/raw/*.parquet`). `git ls-files 'data/raw/*.parquet'` → 0 tracked files.
- Production confirms the freeze: `curl https://45analytics.com/data/latest/snapshot_meta.json` → `snapshot_id: "2026-06-02T16:24Z"`, identical to disk; no nightly commit has landed since `a306cf6` (2026-06-02T02:30Z).

**Why it shipped:** pre-cp-09, the metadata block was three literals (`tournament_phase: "pre_tournament"`, `matches_settled: 0`, `matches_remaining: 104`), so the regen never touched `data/raw`. The active *batch* Parquets it does read (`outputs/phase5/batches/.../team_runs_M2.parquet`) **are** git-tracked, which is why every pre-cp-09 nightly succeeded. cp-09 added a read of a gitignored file and, by design ("surface loudly rather than silently defaulting to a hardcoded 104", `:228`), made its absence fatal. The intent was correct; the file's absence in CI was not anticipated, and the cp-10 inspection notes (§6.1-6.2) flagged the *match_outcomes* parquet and the DB credentials as risks but never flagged that the *fixtures* parquet is gitignored and absent in CI.

**Impact:** Every nightly from 2026-06-03 onward fails at the regen step before committing. The public site is a static snapshot dated June 2 and will stay that way through the opening match unless fixed. During the tournament this is the exact failure the 2026-06-01 diagnostic warned about (frozen page, eliminated teams retaining probability) — re-introduced through the back door.
**Recommendation:** Make the fixtures Parquet available in CI — simplest is to force-track it (it is a static 104-row schedule, fixed once the draw resolved, and mirrors how the batch Parquets are already committed): `git add -f data/raw/wc2026_fixtures.parquet` + an exception in `.gitignore`. See §3.2 — fix both inputs together.

### 3.2 cp-10 conditioning cannot run in the cron (re-batch path depends on gitignored inputs)

**Severity:** P0. The headline live-readiness fix is architecturally inert in production.
**Evidence:**
- `_maybe_rebatch_for_settled_delta` (`regenerate…py:339-437`) calls `run_batch(variants=["M2"], n_runs_per_variant=10_000)` whenever the current settled count differs from `active_batch.json::settled_count_at_batch_time`.
- `run_batch` → `_build_runner` (`simulation/batch_runner.py:213-234`) constructs a `DataLoader()` and calls `get_elo()`, `get_matches()`, `get_recent_form()`, `get_fifa_rankings()`, `get_macro()`.
- `ingestion/data_loader.py:57-65` resolves every one of those to a `data/raw/*.parquet` path (via `config.yaml` `output_file`s). All are covered by `.gitignore:26`; `git ls-files 'data/raw/*.parquet'` → 0.
- `simulation/load_settled.py:92-96` and `simulation/monte_carlo_runner.py:_load_wc2026_fixtures` also raise `FileNotFoundError` on the same missing fixtures Parquet.
- Corroborating state: `data/calibration/active_batch.json` is still `schema_version: "1.0"` with no `settled_count_at_batch_time`/`settled_source` — proof the cp-10 path has never executed in the cron (it would bump to `1.1` on first run, per `:368-372`).

**Impact:** Even after §3.1 is fixed (which only un-blocks the zero-delta re-aggregation and the metadata read), the *first settled group result* during the tournament triggers a re-batch that immediately crashes on `DataLoader.get_elo()`. The conditioning logic — correct and tested locally — never gets to run against real results. Worse, it fails *during* the tournament rather than now, so the failure mode is "the page was updating, then stopped the day matches started."
**Recommendation:** The cron's re-batch needs the full M2 input set in the checkout: `elo_ratings.parquet`, `historical_matches.parquet`, `recent_form.parquet`, `fifa_rankings.parquet`, `macro_data.parquet`, `wc2026_fixtures.parquet`. Either (a) force-track the locked input set used to produce `batch_20260512` (they are pre-registration artifacts and should arguably be in-tree for reproducibility anyway), or (b) add a workflow step that regenerates/fetches them before the regen runs, or (c) decouple by exporting `data/processed/match_outcomes.parquet` and pre-building batches off-CI. Option (a) is the smallest and most defensible. Decide in §7 Q1.

### 3.3 No CI gate runs tests, lint, or typecheck

**Severity:** P1. This is the enabler for 3.1 and will enable the next one too.
**Evidence:** `grep -rln "pytest\|ruff\|mypy\|tsc\|test" .github/workflows/` → no matches. The repo has exactly three workflows: `nightly_pipeline.yml`, `ingest_match_outcomes.yml`, `snapshot-deploy.yml`. None runs the Python suite, the website unit tests (`website/tests/unit/snapshotProvenance.test.ts`, added by cp-09), `ruff`, `mypy`, or `tsc`.
**Impact:** cp-09 added `tests/scripts/test_snapshot_metadata.py` (which mocks counts and never invokes the real script against a clean tree) and shipped a fatal regression to `main` that a single end-to-end CI run on a clean checkout would have caught. With cp-11/12/13 about to touch the same pipeline, the team is flying blind on every merge.
**Recommendation:** Add a minimal `ci.yml` that, on PR and push to `main`, runs `pip install -e ".[dev]"`, `pytest -q`, `ruff check`, and (in `website/`) `tsc --noEmit`. Critically, add one smoke test that runs `regenerate_snapshot_from_batch.py` end-to-end against the checked-out tree — that single test is what would have caught 3.1.

### 3.4 `bracket.json` is populated, but BracketBoard over-claims and still renders the marginal matrix

**Severity:** P1. Editorial integrity — and it is already on production.
**Evidence:** `BracketBoard.tsx:40` now computes `slotsPopulated = bracket.rounds.some(r => r.slots.length > 0)` → `true` (cp-09 backfilled 104 slots). The only effects of that branch: the subtitle at `:92-94` flips to **"draw-resolved bracket with per-round conditional probabilities"**, and the `!slotsPopulated` empty-state note at `:111-145` hides. The grid rendered below (`:150+`, `aria-label="Bracket board: per-round marginal probabilities"`) is unchanged — it is still the per-round *marginal* `P(reach round)` matrix from `tournament.json`. No slot-by-slot tree is drawn and no conditional (reach-given-survival) probabilities are computed. The deployed snapshot already serves 104 slots, so production's `/bracket` currently shows a subtitle promising conditional probabilities over a matrix that contains none.
**Impact:** This is the 2026-06-01 Fix 5 "draw-resolved branch is dead code" finding, now half-shipped: cp-09 lit up the branch's *copy* without its *content*. A careful reader (or a journalist) comparing the subtitle to the numbers will catch the mismatch.
**Recommendation:** This is exactly what cp-12 (structural Fix 5) is for. Until cp-12 lands, either soften the `slotsPopulated` subtitle to not claim conditional probabilities, or gate the new subtitle on an actual conditional-rendering flag. Low effort; worth doing before June 11 even if cp-12 slips.

### 3.5 M0/M2 split-brain persists (Fix 3 not started)

**Severity:** P1. Academic integrity. Unchanged from 2026-06-01 §3.3.
**Evidence:** `git log --since=2026-06-01 -- website/src/lib/sim/snapshotProbs.ts` → no commits. `snapshotProbs.ts:1` still reads `// Auto-generated from M0 snapshot 2026-05-04T00:00Z`. The evaluator still grades user predictions against M0 while the bracket shows M2.
**Impact:** Two model regimes live simultaneously, as before. This is cp-11's assigned scope and nothing has changed about the approach (Q4 resolution: keep the static table, regenerate from M2 nightly). Note the dependency: regenerating it nightly rides on the very pipeline that is currently broken (3.1/3.2).
**Recommendation:** Proceed with cp-11 as planned — **but only after 3.1/3.2 are fixed**, since the chosen approach (regenerate from M2 on every nightly) is meaningless while the nightly fails.

### 3.6 Admin endpoint still does not refresh the public bracket (Fix 6 not started)

**Severity:** P1. Operational safety net missing. Unchanged from 2026-06-01 §3.6.
**Evidence:** `git log --since=2026-06-01 -- website/src/app/api/admin/match-outcomes/route.ts` → no commits. The route still upserts + runs the evaluator with no `revalidatePath`/regen trigger. `bracket/page.tsx:31` is still `force-static`, so even a correct snapshot only reaches the page on the next Vercel deploy.
**Impact:** Manual admin entries propagate to prediction grading but not to the public bracket. Combined with 3.1/3.2, there is currently *no* path — automatic or manual — by which a settled result reaches `/bracket`.
**Recommendation:** cp-13 scope intact. Sequence it after the pipeline is healthy.

### 3.7 Knockout-stage conditioning: not started, correctly deferred

**Severity:** P2 (informational; correctly out of cp-10 scope).
**Evidence:** All knockout `match_rows` carry `"settled": False` (`monte_carlo_runner.py:441-442,508,568`); `load_settled.py:152` filters to `stage == "group"`. No `match_outcomes` R32+ rows exist anywhere (pre-tournament; `ingestion/fetch_match_outcomes.py` short-circuits outside 2026-06-11…07-19 per `website/CLAUDE.md`). The hourly `ingest_match_outcomes.yml` runs are succeeding but are no-ops today.
**Impact:** None until the group stage completes (~2026-06-27). The follow-up checkpoint that extends the loader to M73-M104 is genuinely a post-launch concern, *provided* 3.1/3.2 are fixed first (the knockout extension inherits the same data-availability requirement).
**Recommendation:** Leave deferred. Fold the knockout loader into whatever fix resolves 3.2, since both need the same inputs in CI.

---

## 4. Risk Timeline

| Date | What breaks if nothing else ships |
|---|---|
| **Now (2026-06-03)** | Already broken. Nightly fails every run; production frozen at `2026-06-02T16:24Z`. No new snapshot can land. |
| 2026-06-11 (opening match) | Page still shows the June 2 pre-tournament snapshot. `matches_settled: 0` happens to be correct, but for the wrong reason (pipeline dead, not "no matches yet"). |
| 2026-06-11, ~21:00Z (first result settles) | Even if 3.1 is patched, the first settled-count delta triggers a re-batch that crashes on `DataLoader.get_elo()` (3.2). Page stays frozen; eliminated/winning teams' probabilities do not move. |
| 2026-06-12 | First press-quotable "the model didn't react" error. The `/bracket` subtitle still claims "conditional probabilities" over a static matrix (3.4). |
| 2026-06-27 (group stage ends) | 16 eliminated teams still carry positive R16 probability — the exact 2026-06-01 failure, now caused by infra rather than missing math. |
| 2026-07-19 (Final) | Final-day snapshot still dated June 2. Reality-Score still grading against M0 (3.5). |

The headline change from 2026-06-01: the cliff is no longer June 11. **It is today.** The pipeline is down now.

---

## 5. Remediation Plan (Sequenced)

### cp-10.1 (NEW, P0). Restore CI data availability for the snapshot + re-batch path
- **Files:** `.gitignore`, `data/raw/*.parquet` (force-add), optionally `.github/workflows/nightly_pipeline.yml`.
- **Scope:** Make the M2 input set present in the cron's clean checkout. Recommended: force-track the locked inputs that produced `batch_20260512_013228Z` — `wc2026_fixtures.parquet`, `elo_ratings.parquet`, `historical_matches.parquet`, `recent_form.parquet`, `fifa_rankings.parquet`, `macro_data.parquet` — with explicit `!data/raw/<file>` exceptions in `.gitignore`. These are pre-registration artifacts; in-tree storage aids reproducibility. Alternative: a workflow step that regenerates them before the regen step.
- **Acceptance:** (1) A clean checkout + `python scripts/regenerate_snapshot_from_batch.py` succeeds with no Parquet in the working dir beyond what git provides. (2) A manual `workflow_dispatch` of `nightly_pipeline.yml` goes green and commits a fresh snapshot. (3) A dev run with a hand-written `data/processed/match_outcomes.parquet` containing one settled M01 row triggers a re-batch that completes (not crashes) and bumps `active_batch.json` to `schema_version: "1.1"`.
- **Effort:** 0.5 day. **Blocks cp-11/12/13.**

### cp-10.2 (NEW, P1). Minimal CI gate
- **Files:** new `.github/workflows/ci.yml`.
- **Scope:** On PR + push to `main`: `pip install -e ".[dev]"`, `pytest -q`, `ruff check`, `tsc --noEmit` (in `website/`), and one end-to-end smoke test that runs `regenerate_snapshot_from_batch.py` against the checked-out tree.
- **Acceptance:** The PR for cp-10.1 is gated by this workflow and the smoke test fails on a tree without the fixtures Parquet (proving it would have caught 3.1).
- **Effort:** 0.5 day.

### Fix 3 — Reconcile M0/M2 split (this is cp-11)
- **Files:** `website/src/lib/sim/snapshotProbs.ts` + its generator + evaluator consumers.
- **Scope:** Per Q4, regenerate `snapshotProbs.ts` from the active M2 batch on every nightly, with provenance comments. **Hard dependency on cp-10.1** (the nightly must work first).
- **Acceptance:** `grep snapshotProbs` shows one variant; evaluator and bracket agree on 10 sample probabilities within tolerance.
- **Effort:** 1 day after cp-10.1.

### Fix 5 structural — pipeline populates `bracket.json` + BracketBoard renders slots (cp-12)
- **Files:** `scripts/regenerate_snapshot_from_batch.py` (currently carries `bracket.json` forward verbatim, only updating `snapshot_id` at `:688-691`), `website/src/components/compositions/BracketBoard.tsx`.
- **Scope:** Have the regen rebuild slots every run (not rely on cp-09's one-shot backfill), and make BracketBoard's `slotsPopulated` branch render an actual slot view with conditional probabilities — closing the 3.4 over-claim.
- **Acceptance:** Pipeline writes 104 slots from `wc2026_fixtures` on a fresh run; `/bracket` renders a slot view visually distinct from the marginal matrix; subtitle and content agree.
- **Effort:** 1 day (slot population is small; the conditional-rendering component is the bulk).
- **Interim:** soften the 3.4 subtitle now (15 min).

### Fix 6 — Admin endpoint refresh (cp-13)
- **Files:** `website/src/app/api/admin/match-outcomes/route.ts`, `…/api/ingest/match-outcomes/route.ts`, `bracket/page.tsx`.
- **Scope:** After a successful upsert, trigger regeneration or `revalidatePath("/bracket")`; revisit `force-static`.
- **Acceptance:** A manual admin entry produces a visible `/bracket` change within 10 minutes.
- **Effort:** 1 day, including the static-vs-dynamic decision.

### Knockout conditioning (post-launch follow-up)
- **Files:** `simulation/load_settled.py` (drop the `stage == "group"` filter, extend name map), `monte_carlo_runner.py` (condition the KO loop).
- **Scope:** Extend cp-10's pattern to M73-M104. Inherits cp-10.1's data requirement.
- **Acceptance:** A settled R32 result conditions the knockout tree; eliminated teams collapse.
- **Effort:** 1 day. Not needed before ~2026-06-27.

---

## 6. Acceptance Criteria for "Live-Ready"

Updated from the 2026-06-01 six. Criteria 1-6 are the originals re-evaluated; 0 is new and gates all of them.

0. **(NEW, gating)** A `workflow_dispatch` of `nightly_pipeline.yml` against `main` succeeds end-to-end and commits a fresh snapshot, **and** a dev run with one hand-inserted settled group result completes a re-batch (no `FileNotFoundError`), bumping `active_batch.json` to `schema_version: "1.1"`. *Status: FAILING (§3.1, §3.2).*
1. A scripted test inserts a fictional Brazil group loss, triggers regeneration **in a CI-equivalent clean checkout**, and the bracket page shows Brazil's `p_champion` reduced sign-correctly. *Status: passes locally (`test_settled_conditioning.py`); FAILS in CI-equivalent env until criterion 0.*
2. After 5 fictional matches, `snapshot_meta.json` reports `matches_settled: 5` and the right phase, **with `source` showing `postgres:match_outcomes` or `parquet:…`, not `default:pre_tournament`.** *Status: derivation coded; never observed against a real DB (prod snapshot reads `default:pre_tournament`).*
3. A grep across the website finds exactly one model variant for probability serving. *Status: FAILS — M0 table still live (§3.5).*
4. `tournament.json` schema validation rejects payloads missing `model_variant`. *Status: PASSES (`schemas.ts:88`).*
5. `bracket.json` slots are populated **and `BracketBoard` renders a slot view with matching copy.** *Status: slots populated (PASS); rendering still the marginal matrix with over-claiming copy (FAILS, §3.4).*
6. `/api/admin/match-outcomes` integration test confirms a manual entry reaches `/bracket` within 10 minutes. *Status: FAILS — Fix 6 not started (§3.6).*

Go/no-go gate for 2026-06-11: **criterion 0 first.** Nothing else is meaningful while the pipeline is down.

---

## 7. Open Architectural Questions

1. **How should `data/raw` inputs reach the cron?** (a) Force-track the locked M2 input Parquets in git (smallest diff, aids pre-registration reproducibility, ~MB-scale files); (b) add a fetch/regenerate step to the workflow (keeps git clean but re-introduces network dependency and non-determinism into the nightly); (c) export `data/processed/match_outcomes.parquet` from ingestion and pre-build batches off-CI (biggest change). **Recommendation: (a).** The active *batch* Parquets are already committed; the *inputs* that produced them should be too, and it makes the cron deterministic. Decide before cp-10.1.
2. **Should the re-batch even run inside the GH Actions cron?** A 10k MC re-batch on every settled-count delta runs the full DataLoader + model fit on a hosted runner — never exercised there. If runtime/flakiness is a concern, the alternative is pre-building batches off-CI and having the cron only re-aggregate. **Recommendation:** keep re-batch in the cron for launch (simplest), but time the first real re-batch (cp-10.1 acceptance #3) and revisit if it exceeds a few minutes.
3. **Static vs. dynamic bracket page.** Unchanged from 2026-06-01 Q2. With the cron as the only refresh path and that path currently broken, the `force-static` + nightly-deploy model means intra-day updates are impossible without Fix 6. **Recommendation:** keep `force-static`, fix the cron (cp-10.1), and add admin-triggered `revalidatePath` in cp-13 for the lag case.
4. **CI scope.** Minimal gate now (cp-10.2: pytest + ruff + tsc + one end-to-end smoke), or a fuller matrix? **Recommendation:** minimal now; the end-to-end smoke test is the single highest-value check and the one that would have caught §3.1.
5. **3.4 interim copy.** Soften the `slotsPopulated` subtitle before June 11, or wait for cp-12 to render real slots? **Recommendation:** soften now (15 min); it is a live editorial over-claim.

---

## 8. Appendix: File Reference Index

**Pipeline (the two P0s)**
- `scripts/regenerate_snapshot_from_batch.py:224-233` — `_count_total_matches()`, raises on missing fixtures Parquet (cause of §3.1).
- `scripts/regenerate_snapshot_from_batch.py:339-437` — `_maybe_rebatch_for_settled_delta`; `:399` calls `run_batch`.
- `scripts/regenerate_snapshot_from_batch.py:618-664` — cp-09 metadata derivation block.
- `simulation/batch_runner.py:213-234` — `_build_runner` DataLoader calls (cause of §3.2).
- `ingestion/data_loader.py:57-65` — source paths resolve to `data/raw/*.parquet`.
- `.gitignore:26` — `data/raw/*.parquet` (the gitignore rule behind both P0s).
- `data/calibration/active_batch.json` — still `schema_version: "1.0"`; proof cp-10 never ran in cron.

**Conditioning (verified correct, locally)**
- `simulation/monte_carlo_runner.py:286-320` — group-stage settled branch.
- `simulation/monte_carlo_runner.py:441-442,508,568` — knockout rows always `settled: False`.
- `simulation/load_settled.py:66-78` (`_resolve_pg_url`), `:152` (`stage == "group"` filter), `:195-226` (`load_settled_results`).
- `tests/scripts/test_settled_conditioning.py:232-320` — elimination + directional assertions.

**Website data layer**
- `website/public/data/latest/tournament.json:4` — `model_variant: "M2_fifa"`.
- `website/src/lib/data/schemas.ts:75-88` — `ModelVariantSchema`, required.
- `website/public/data/latest/bracket.json` — 104 slots, concrete teams.
- `website/public/data/latest/snapshot_meta.json` — `source: default:pre_tournament` (DB never consulted).

**Website components / surfaces**
- `website/src/components/compositions/BracketBoard.tsx:40,92-94,111-145,150+` — slotsPopulated branch (§3.4).
- `website/src/lib/sim/snapshotProbs.ts:1` — M0 table, unchanged (§3.5).
- `website/src/app/api/admin/match-outcomes/route.ts` — no refresh trigger, unchanged (§3.6).
- `website/src/app/(quant)/bracket/page.tsx:31` — `force-static`.
- `components/editorial/KillCriteriaStatusBlock.tsx:116-195` (cp-04); `app/*/loading.tsx` (cp-06); `components/simulator/ui/StickyProgressMeter.tsx:116` (cp-07); `components/onboarding/*` + `EditorialMasthead.tsx:103-169` (cp-08).

**Operations**
- `.github/workflows/nightly_pipeline.yml` — cron (`0 0 * * *`), provisions `DIRECT_URL`/`DATABASE_URL`; no fixtures fetch, no test gate.
- GH run `26860278471` (2026-06-03T02:36Z) — the failing nightly.
- `gh secret list` — `DIRECT_URL`, `DATABASE_URL` present since 2026-05-03.
- No `.github/workflows/*` runs `pytest`/`ruff`/`mypy`/`tsc` (§3.3).

---

*End of diagnostic. The 2026-06-01 audit found the math was missing; cp-09/cp-10 added it correctly. This audit finds the pipeline that runs that math is broken in the production environment, in two independent places, both invisible to the (absent) CI. §5 cp-10.1 and cp-10.2 are P0/P1 and block cp-11. Do not start cp-11 until the nightly is green end-to-end.*
