# PLAN.md

The current plan for The 45% Problem. Authoritative. Replaces `GO_TO_LAUNCH.md` (which is acknowledged stale; the 7-checkpoint plan from 2026-05-26 was superseded by the live-readiness sequence that emerged from the 2026-06-01 architecture diagnostic).

**Last updated:** 2026-06-03, after the post-cp-10 diagnostic surfaced two P0 production failures.

**Today's date:** 2026-06-03. Opening match: 2026-06-11. **T-8 days.**

If you are a new agent reading this, also read `WORKFLOW.md` for the operating model. The two documents together are the foundation: `WORKFLOW.md` tells you how we work; `PLAN.md` tells you what we are working on right now.

## Project context

The 45% Problem is a probabilistic pricing framework for the 2026 FIFA World Cup, pre-registered at OSF (`osf.io/spmkg`). It publishes nightly Monte Carlo probabilities for tournament outcomes and compares them to bookmaker-implied probabilities (de-vigged via the power method) to surface mispricings called "divergences" or "edges."

The project is a research artifact, not a betting product. Two deliverables:

1. **Live MVP website at `45analytics.com`.** Public-facing, daily-updating during the WC 2026 window. Shows M★ probabilities and model-vs-market divergence. No betting advice language.
2. **Academic research paper.** Ablation study of model variants M0 through M3, Nyberg market efficiency tests, pre-registered hypotheses. Working paper pre-tournament; journal submission post-tournament.

The locked champion model is `M2_fifa` (also stamped as `M_STAR` in the public schema enum). It is locked under amendment v1.1 of the OSF pre-registration. The active batch is `batch_20260512_013228Z`, produced under amendment v1.1.

## Current state (post cp-10, post 2026-06-03 diagnostic)

Shipped on main: cp-04 through cp-10. The nightly pipeline that should refresh the site daily has been failing since 2026-06-03 because of a gitignored-input crash introduced by cp-09 (P0). cp-10's settled-result conditioning code is correct locally but cannot run in the cron at all because its data inputs are also gitignored (P0). Production is currently frozen on the snapshot dated `2026-06-02T16:24Z`.

This is the situation we have to fix before any other live-readiness work proceeds. Two hotfixes (cp-10.1 and cp-10.2) are inserted ahead of cp-11 to address it. cp-11/12/13 then proceed as originally sequenced.

The bracket page also has a half-shipped state from cp-09: `bracket.json` slots are populated, the page's subtitle now claims "draw-resolved bracket with per-round conditional probabilities," but the grid below still renders the marginal matrix because cp-12 (structural Fix 5) is not yet shipped. This is editorially deceptive on production today; cp-12 fixes it.

## Shipped checkpoints

In ship order, with one-line summaries. For full detail, read the PR descriptions linked from the merge commits.

| # | Branch | Subject | Merged | Notes |
|---|---|---|---|---|
| cp-04 | `cp-04-narrative-hotfix` | Frontend narrative hotfix (KILL CRITERIA badge → state-aware pill, dual-SE rendering) | 2026-05-27 | Made the live site stop claiming the kill criterion fired pre-tournament. |
| cp-05 | `cp-05-pipeline-restart` | Nightly pipeline rewired to `regenerate_snapshot_from_batch.py` (off `generate_snapshot.py`). Drops Elo fetch + canonical-draw export from cron. | 2026-05-27 | Stopped the cron from overwriting M2 with M0. |
| cp-05a | `cp-05a-drop-pat-dependency` | Cron pushes via default `GITHUB_TOKEN`; PAT dependency removed. | 2026-05-27 | Probe established the workflow-level `permissions: contents: write` is sufficient. |
| cp-06 | `cp-06-nav-perf-fix` | Three route-group `loading.tsx` files + `ReliabilityDiagram` lazy import on `/ledger`. | 2026-05-28 | "Click does nothing" feel collapsed; /ledger first-paint chunks 700 → 340 KB. |
| cp-07 | `cp-07-prelaunch-audit-and-fix` | Pre-launch audit (data freshness, historical-snapshots picker, simulator UI investigation) + simulator footer overlap fix + `[ ARM ALERT ]` → `[ See how the model reacts ]` rename. | 2026-05-29 | First full static audit; established the audit-then-fix pattern that drove cp-09/10. |
| cp-08 | `cp-08-onboarding-additive` | Surface A onboarding (chip + modal + masthead pill), additive overlay on the existing homepage, real-data-driven modal copy. Replaces and reverts the dead first cp-08 (which had replaced the hero entirely). | 2026-05-30 | Two hydration-fix follow-up commits (`e9bc170`, `df6643c`). The reverted first attempt is captured in `CHECKPOINT_08_REVERT_PROMPT.md`. |
| cp-09 | `cp-09-snapshot-integrity` | Wave 1 of live-readiness fixes from the 2026-06-01 diagnostic. Bracket.json slots backfilled (one-shot); snapshot metadata (`tournament_phase`, `matches_settled`, `matches_remaining`) derived from `match_outcomes`; `model_variant: "M2_fifa"` stamped and schema-required. | 2026-06-02 | Introduced the gitignored-input regression that broke the nightly cron — caught by the 2026-06-03 diagnostic. |
| cp-10 | `cp-10-mc-group-conditioning` | Monte Carlo settled-result conditioning for the group stage only. MC consumes a `settled_results: dict[match_id → MatchResult]` keyed by canonical M01-M104 ids. Re-batch trigger on `settled_count` delta. `active_batch.json` schema_version 1.0 → 1.1 with new provenance fields. | 2026-06-03 | Code shipped correctly per the test suite; cannot fire in the cron because input parquets are gitignored (caught by the 2026-06-03 diagnostic). Knockout-stage conditioning is the post-launch follow-up. |

The reverted first cp-08 (Surface A as homepage replacement, with fake-data mockups and trophy hidden) does not appear here because it was never merged. The revert is documented in `CHECKPOINT_08_REVERT_PROMPT.md`.

## Pending checkpoints (live-readiness sequence)

This is the sequence that must ship before 2026-06-11.

### cp-10.1 — Restore data availability in CI (URGENT, blocks everything else)

**Status:** Not started.
**Why first:** The nightly cron is failing in production right now. Until this lands, no future nightly will succeed and cp-10's conditioning cannot fire even after the first match is settled.
**Scope:** Force-track the gitignored `data/raw/*.parquet` files that the production pipeline reads. The diagnostic's §3.2 recommends Option A (track the locked input set used to produce `batch_20260512`). Files involved: `elo_ratings.parquet`, `historical_matches.parquet`, `recent_form.parquet`, `fifa_rankings.parquet`, `macro_data.parquet`, `wc2026_fixtures.parquet`. The `.gitignore` pattern at line 26 (`data/raw/*.parquet`) gets a targeted exception.
**Effort:** 1 to 2 hours of agent work plus a `workflow_dispatch` of the nightly to confirm it goes green end to end.
**Acceptance:** `gh workflow run nightly_pipeline.yml --ref main` succeeds. Production snapshot timestamp advances. `active_batch.json` either remains at schema 1.0 (no settled-count delta yet, so no re-batch) or bumps to 1.1 (first re-batch ran).
**Prompt:** `CHECKPOINT_10.1_DATA_AVAILABILITY_PROMPT.md`.

### cp-10.2 — Minimal CI gate (URGENT, prevents the next silent regression)

**Status:** Not started.
**Why before cp-11:** cp-11, cp-12, cp-13 all touch the same pipeline. Without a CI gate, the next regression slips through the same hole cp-09 did.
**Scope:** Add `.github/workflows/ci.yml` that runs on PR and push to main: `pip install -e ".[dev]"`, `pytest -q`, `ruff check`, `mypy` (if configured), `tsc --noEmit` in `website/`, `pnpm test`. Plus one end-to-end smoke test that runs `regenerate_snapshot_from_batch.py` on a clean checkout — that single test catches the cp-09 regression.
**Effort:** Half a day. Includes time to debug whatever pre-existing lint/type errors emerge (the project has been carrying lint baseline of 8 errors / 8 warnings since cp-07; the gate either accepts the baseline or the team agrees to clean it up).
**Acceptance:** CI runs on the cp-10.2 PR itself; the smoke test catches a deliberately-injected regression (verify by temporarily reverting cp-10.1's gitignore exception and confirming CI fails).
**Prompt:** To be written after cp-10.1 ships.

### cp-11 — Fix 3: M0/M2 reconciliation

**Status:** Not started. Architectural decision Q4 already made (option a: keep `snapshotProbs.ts`, regenerate from M2 on every nightly).
**Scope:** Add a regeneration step to the nightly pipeline that derives `snapshotProbs.ts` from the active M2 batch. The static table is preserved (per Q4); only its contents change. The evaluator's call site shape stays. Provenance comments at the top of the generated file name the source batch.
**Acceptance:** `git diff` on `snapshotProbs.ts` after a nightly run shows updated probabilities consistent with the current M2 batch. A single grep for "Auto-generated from M0" in the production tree returns no matches.
**Effort:** 1 day.
**Prompt:** To be written after cp-10.2 ships.

### cp-12 — Fix 5 structural: snapshot pipeline populates bracket.json

**Status:** Shipped via `cp-12-structural-fix5` (2026-06-08, Option B — copy fix for `BracketBoard`; conditional rendering deferred). Builds on cp-09's one-shot backfill; also repaired the `tournament.json` roster corruption at its source and tightened the roster contract test. Closes acceptance criterion #7.
**Scope:** The regenerate script writes `bracket.json` with populated slots on every run, not just the one-shot at cp-09. Also fixes the `BracketBoard.tsx` over-claim (§3.4 of the 2026-06-03 diagnostic): the subtitle "draw-resolved bracket with per-round conditional probabilities" needs either content that matches or copy that doesn't over-claim until that content exists.
**cp-12 expanded scope (per cp-11 Stage 1 finding, 2026-06-08):** The agent's inspection surfaced that `tournament.json` has Congo DR duplicated and Tunisia missing entirely. The buggy regen path's `code→team_id` map is the root cause. cp-12 will fix this as part of the structural snapshot pipeline work, since cp-12 already owns `bracket.json` + `tournament.json` correctness. User-visible: the bracket page is currently rendering 47 teams with Congo DR shown twice. (cp-11 sidesteps the bug by generating `snapshotProbs.ts` from `team_runs_M2.parquet` directly, not from `tournament.json`.)
**Acceptance:** Bracket page renders the slots-populated view, the subtitle's claim matches what's rendered, and a nightly run produces both `tournament.json` and `bracket.json` with consistent contents.
**Effort:** Half to one day depending on whether `BracketBoard` gets a content fix or just a copy fix.
**Prompt:** To be written after cp-11 ships.

### cp-13 — Fix 6: admin endpoint refresh

**Status:** ✅ **Shipped (2026-06-08).** Stage 1 found that revalidate-on-write alone is *inert* for the public bracket: every quant surface is `force-static` and renders from build-time-frozen JSON merged with structural *identity* from the fixtures DB; a `match_outcomes` upsert changes neither, so `revalidatePath` re-renders identical bytes (`docs/onboarding/cp-13-inspection-notes.md` §6). The data only changes when the snapshot-regeneration pipeline rewrites `tournament.json`/`bracket.json`. Decision **B1** (see decision log): trigger that pipeline on-demand from the endpoints.
**Scope (as shipped):**
- `website/src/lib/revalidation.ts` — `revalidatePublicSnapshotRoutes()` purges the static caches for `/bracket`, `/`, `/ledger`, `/match/[id]`, `/team/[code]` (forward-compatible hook; try/catch per route).
- `website/src/lib/regenDispatch.ts` — `triggerOnDemandRegen()` fires a GitHub `repository_dispatch` (`regen-snapshot`) with a 60s module-level debounce; degrades to `not_configured` when no PAT is present.
- Both endpoints (`api/admin/match-outcomes`, `api/ingest/match-outcomes`) call both helpers after a successful upsert and report `{ revalidation, regenDispatch }` in the response (on success and evaluator-`deferred` paths).
- `.github/workflows/on_demand_regen.yml` — copy of the nightly job triggered by `repository_dispatch`, sharing the `nightly-pipeline` concurrency group so it can never run simultaneously with the nightly.
- Cron path unchanged (Option A): `nightly_pipeline.yml:104-114` already pushes to main + POSTs the Vercel deploy hook.
**Acceptance:** Manually entering a settled outcome via `/api/admin/match-outcomes` dispatches the regen workflow, which re-conditions the MC and rewrites the bracket JSON + redeploys — a visible change on `/bracket` within ~10 minutes. Requires the `GITHUB_REGEN_PAT` Vercel secret (fine-grained, `actions: write`) to be provisioned in production; without it the endpoints degrade gracefully and the nightly remains the safety net.
**Effort (actual):** ~1.5 days (Stage 1 surfaced the architectural gap; B1 is larger than the originally-scoped revalidate-only change).

## Post-launch backlog

These are valid product work but not on the live-readiness critical path. They get scheduled after 2026-06-11 once the live model is actually live.

- **Knockout-stage settled-result conditioning** (follow-up to cp-10). Group conditioning shipped; knockout conditioning requires slot-aware match IDs and bracket cascade logic. Knockout matches start 2026-06-26, so this has roughly two weeks of runway after kickoff.
- **Surface B simulator onboarding overlay**. The Beat 1 / Beat 2 / Beat 3 walk-through over the `/scenario` simulator. Designed in the v2 design package; not yet implemented. Was the original "cp-09" before the live-readiness sequence took priority.
- **GO_TO_LAUNCH.md's original Checkpoints 3, 4, 5**. Bracket fan-readability, match-detail/edge clarity, ledger fan-readability. These are valid product work to make the site more digestible to non-quant audiences. None of them ship pre-launch; all of them depend on cp-10 / cp-11 / cp-12 / cp-13 having stabilized the data first.
- **Volatility Gate**. The 5 suppression rules from the project blueprint. Decided deferred to post-launch per Q5 of the 2026-06-01 diagnostic.
- **GO_TO_LAUNCH.md's original Checkpoint 7 (GTM)**. The 14-day launch playbook (daily briefs, press list, social rollout, OSF cross-link audit). Mostly editorial work; happens around the kickoff regardless of code state.
- **A long-running site audit on a weekly cadence during the tournament**. Periodic adversarial diagnostics, like the 2026-06-01 and 2026-06-03 ones, to catch drift between deployed state and assumed state.
- **Conditional-probability bracket rendering (cp-12 Option A)**. Render a slot-by-slot tree with per-round conditional (reach-given-survival) probabilities, replacing the marginal matrix when the draw is resolved. Requires new per-slot aggregation from the batch plus a non-trivial slot-tree UI component (est. 1–2 days). cp-12 shipped the honest copy fix (Option B); this is the content build deferred to post-launch.
- **Tighten the on-demand regen debounce with a distributed cache (cp-13 follow-up).** `triggerOnDemandRegen()` debounces on a module-level timestamp, which is per-worker and in-memory: a cold start or a second concurrent Vercel worker can still dispatch within the 60s window. The `on_demand_regen.yml` concurrency group (shared with the nightly) makes this safe — extra dispatches just queue and each regenerates from the current `match_outcomes` table — but it wastes CI minutes. Move the debounce clock to Vercel KV (or Upstash, already half-wired in `.env.example`) for a single shared window across workers. Not launch-blocking; the concurrency group is the correctness backstop.
- **Wire the contract suite into `ci.yml`**. The roster contract test (tightened in cp-12) is gated by `snapshot-deploy.yml`, which only runs on PRs touching `website/**`. A Python-only PR that regenerates the bundle (or any change outside `website/`) is not contract-checked. Add `pnpm run test:contracts` (and/or `pnpm run test`) to `ci.yml`'s website job so roster/contract violations are caught on every PR, not just website-touching ones.

## Live-readiness acceptance criteria

Adapted from the 2026-06-01 diagnostic §6, updated for the 2026-06-03 findings.

The site is live-ready when ALL of the following hold simultaneously:

1. **Nightly cron is green end to end.** `gh run list --workflow nightly_pipeline.yml --limit 10` shows the last ten runs successful. Currently failing; cp-10.1 fixes.
2. **A CI gate exists and runs on every PR and every push to main.** Includes `pytest`, `ruff`, `tsc`, `pnpm test`, and a smoke test for the regenerate script. Currently absent; cp-10.2 adds.
3. **Settled-result conditioning fires.** A scripted test inserts a fictional Brazil 0-3 group loss into `match_outcomes`, triggers regeneration, and the bracket page shows Brazil with `p_champion` reduced in a sign-correct way. Currently passes locally; cp-10.1's data fix makes it pass in the cron too.
4. **Snapshot metadata reflects reality.** After 5 fictional matches are inserted, `snapshot_meta.json` reports `matches_settled: 5` and `tournament_phase: "group_stage"`. Currently works via cp-09 logic; cp-10.1 makes it actually fire in production.
5. **One model variant served on production probability surfaces.** A grep across the website finds exactly one model-variant string referenced for probability serving. Currently fails (M2 on bracket, M0 in `snapshotProbs.ts`); cp-11 fixes.
6. **`tournament.json` schema validation in CI rejects payloads missing `model_variant`.** Currently passes locally via `website/tests/unit/snapshotProvenance.test.ts`; cp-10.2's CI gate makes it actually run on every PR.
7. **`bracket.json` slots are populated by the pipeline and `BracketBoard` renders the slots-populated branch faithfully.** ✅ **Done (cp-12, 2026-06-08).** The regen now rebuilds `bracket.json`'s 104 slots from the fixtures parquet every run (no longer reliant on cp-09's one-shot backfill), and `BracketBoard`'s slots-populated subtitle was corrected to "per-round marginal probabilities" (Option B — copy fix; matches the grid). cp-12 also repaired the `tournament.json` roster corruption (Congo DR duplicated, Tunisia dropped, surfaced by cp-11's Stage 1) at its source and tightened the roster contract test to bidirectional. The conditional (reach-given-survival) slot-tree rendering (Option A) is deferred to post-launch.
8. **`/api/admin/match-outcomes` propagates to a visible bracket-page change within 10 minutes.** ✅ **Done (cp-13, 2026-06-08).** Stage 1 established that revalidate-on-write alone cannot satisfy this (the bracket reads build-frozen JSON the upsert never touches; see `docs/onboarding/cp-13-inspection-notes.md` §6), so cp-13 closes it via decision B1: both the admin and ingest endpoints fire a GitHub `repository_dispatch` after a successful upsert, running `on_demand_regen.yml` (a `repository_dispatch`-triggered twin of the nightly, same concurrency group) which re-conditions the MC, rewrites `tournament.json`/`bracket.json`, pushes to main, and POSTs the Vercel deploy hook. Endpoint-side a 60s debounce collapses the hourly ingest's burst of outcomes into one regeneration. **Production prerequisite:** the `GITHUB_REGEN_PAT` secret (fine-grained, `actions: write`) must be set in Vercel; the endpoints report `regenDispatch.reason: "not_configured"` until it is, and the nightly stays the safety net. The T-1 dry run should verify a real admin POST produces a `/bracket` delta end-to-end on production.

A pre-tournament dry run executing all eight checks against a staging environment is the recommended go / no-go gate for 2026-06-11.

## Decision log

Architectural decisions Nicolás has made, with rationale, so they don't get re-litigated.

| Q | Decision | Made on | Rationale |
|---|---|---|---|
| Q1 (Fix 1 approach) | Re-batch full 10k MC on settled-count delta, not reweighting | 2026-06-02 | Reweighting introduces a statistical method not in the OSF pre-registration; re-batching is slower but defensible. |
| Q2 (bracket rendering) | Revalidate-on-write (keep `force-static`, trigger `revalidatePath` from admin endpoint and cron) | 2026-06-02 | Preserves cp-06 performance work; updates land within seconds of data changes. |
| Q2-amended / B1 (cp-13 freshness path) | On-demand regeneration: endpoints fire a `repository_dispatch` to run the nightly job on demand; `revalidatePath` retained as a forward-compatible cache-purge hook | 2026-06-08 | cp-13 Stage 1 found revalidate-on-write is inert against `force-static` JSON that the upsert never changes (`docs/onboarding/cp-13-inspection-notes.md` §6). Only a snapshot regeneration changes the bracket, and that regen is a Python 10k-MC batch that cannot run in a serverless function — so it runs in CI, triggered on demand. |
| Q3 (bracket.json backfill) | Backfill now via one-shot script | 2026-06-02 | Shipped in cp-09. Structural follow-up is cp-12. |
| Q4 (M0 cleanup) | Keep `snapshotProbs.ts`, regenerate from M2 every nightly | 2026-06-02 | Less refactor risk in `runEvaluator.ts` than option (b); accepts a permanent maintenance burden. |
| Q5 (Volatility Gate) | Defer to post-launch | 2026-06-02 | Recommendation-quality filter; doesn't affect public bracket correctness. |
| Q6 (cp-10 DB URL) | Prefer `DIRECT_URL` over `DATABASE_URL` via `_resolve_pg_url()` | 2026-06-02 | Avoids pgbouncer prepared-statement issues in long-running batch scripts. |
| Q7 (cp-10 test threshold) | Adopt the agent's redesigned invariants (all-3-losses → 0.0 exactly + ≥20% relative drop for single-loss) instead of the diagnostic's literal `< 0.005` | 2026-06-03 | The diagnostic threshold was a prior, not a measurement; 10k empirical floor for Mexico's recovery path is ~1.2%. |

## Timeline

T-8 days to opening match. Per the workflow above, the remaining sequence is:

- **Day T-8 (today, 2026-06-03)**: cp-10.1 prompt written. Hand to fresh session.
- **Day T-7 to T-6**: cp-10.1 ships; cp-10.2 written and shipped. Nightly cron is green.
- **Day T-5 to T-4**: cp-11 (M0/M2 reconciliation) ships.
- **Day T-3 to T-2**: cp-12 (bracket.json structural) ships. cp-13 (admin endpoint refresh) ships.
- **Day T-1 (2026-06-10)**: pre-tournament dry run against all eight acceptance criteria. If anything is N, scramble.
- **Day 0 (2026-06-11)**: opening match. The site is live.
- **Tournament window**: weekly adversarial audits, the knockout-conditioning follow-up before 2026-06-26 (R32 starts).
- **Post-tournament**: Surface B, the original GO_TO_LAUNCH product checkpoints, paper drafting.

The sequence has roughly 5 days of actual work in 8 days of runway, so there is a 3-day buffer if anything slips. Cp-10.1 is the urgent one; every day it slips, the production site stays frozen at June 2 and the public-facing claim ("nightly probabilities") is silently false.

## What to do if the diagnostic changes the plan again

This document was updated 2026-06-03 to reflect what the 2026-06-03 diagnostic found. If a future audit finds something that re-prioritizes the work, update this file. The expected cadence is one PLAN.md update per audit and one mini-update per checkpoint merge. The decision log grows; never shrinks. The shipped list grows; never shrinks. The pending list shrinks as items ship and grows as new ones surface.

The file lives at the repo root because it is read by every new agent and every new session. Keep it current.
