# Architecture diagnostic audit, 2026-06-03 (post cp-10, pre cp-11)

Read-only static audit of `main`. No code execution. The deliverable is a single markdown document at `docs/audit/architecture-diagnostic-2026-06-03.md` that mirrors the format of `docs/audit/architecture-diagnostic-2026-06-01.md` (which Nicolás uploaded earlier and is now committed at that path).

This is the same shape of audit that produced the original 2026-06-01 diagnostic that drove the cp-09 / cp-10 / cp-11 / cp-12 / cp-13 sequence. We're running it again now that cp-09 and cp-10 have shipped, before starting cp-11. The audit either confirms the remaining live-readiness fixes (cp-11/12/13) are still on track, or surfaces something that's changed and needs re-prioritization.

## Goal

Produce a static audit that answers: **given everything that's shipped through cp-10, what is the actual current state of live-readiness for 2026-06-11 (T-8 days), and what's actually left to do?**

Specifically, verify or refute these claims, every one of which should be true if cp-09 and cp-10 shipped correctly:

1. The Monte Carlo conditions on settled group-stage results (cp-10 Fix 1 partial).
2. Snapshot metadata (`tournament_phase`, `matches_settled`, `matches_remaining`) is derived from `match_outcomes` at snapshot-build time (cp-09 Fix 2).
3. `tournament.json` carries `model_variant: "M2_fifa"` (cp-09 Fix 4 schema).
4. `bracket.json` slots are populated with 104 entries across the seven rounds (cp-09 backfill).
5. The active batch tracks `settled_count_at_batch_time` and re-batches when the settled set changes (cp-10 Trigger B).
6. `_resolve_pg_url()` prefers `DIRECT_URL` over `DATABASE_URL` in both `_count_settled_via_postgres()` and `load_settled.py` (cp-10 Phase A).
7. The nightly GH Actions cron has `DATABASE_URL` and `DIRECT_URL` env vars provisioned (cp-10 verification).
8. `psycopg[binary]>=3` is in pyproject.toml (cp-10 dep).
9. The cp-04 dual-SE pill, the cp-06 loading.tsx files, the cp-07 sticky meter footer fix, and the cp-08 onboarding chip/modal/masthead are all still rendering correctly on production.

Each claim either gets a verified-OK row in the report (with file:line evidence and the actual value found) or becomes a finding to remediate.

Then identify what's still broken or unfinished:

- Fix 3 from the 2026-06-01 diagnostic (M0/M2 split-brain via `snapshotProbs.ts`). Per Q4 the resolution is to keep the static table but regenerate from M2 on every nightly. Has this work started? Has anything changed since 2026-06-01 that affects the approach?
- Fix 5 structural (snapshot pipeline populates `bracket.json` on every run, building on cp-09's one-shot backfill). Has this been touched? What's the current `bracket.json` content vs what the pipeline currently produces?
- Fix 6 (admin endpoint refresh: `revalidatePath('/bracket')` after upsert). Has the admin endpoint been modified at all since 2026-06-01? If not, this is still the same scope.
- Knockout-stage settled-result conditioning (deferred post-launch follow-up to cp-10). Has the MC's knockout loop changed? Has `match_outcomes` started accumulating R32+ rows in any test environment? What's the current readiness?

Then surface anything new that the original 2026-06-01 diagnostic didn't cover:

- New operational concerns introduced by cp-09 or cp-10.
- Vercel deployment health (the bracket page should still be statically prerendered; cp-06's nav-perf work depends on this).
- Live nightly cron health (recent runs successful? any new failure modes?).
- Any tests / lint / typecheck regressions on main.
- Anything you find that surprises you.

## Branch

`docs/diagnostic-2026-06-03` (not a `cp-XX` checkpoint; this is documentation, not implementation).

Pre-work: `git fetch && git checkout main && git pull`. Confirm HEAD includes the cp-10 merge. Working tree clean. Branch off main.

## Methodology

This is a STATIC audit, exactly like the 2026-06-01 diagnostic. The audit author of that document worked from file:line evidence without executing code. Mirror that discipline. Specifically:

- Read files directly. Use grep / find / git log freely.
- Do not run `pnpm dev`, `pnpm build`, `pnpm test`, `pytest`, `python` scripts, or any code that mutates state.
- Do not modify any file outside `docs/audit/architecture-diagnostic-2026-06-03.md`.
- Do not modify the database, the snapshot pipeline outputs, or production state in any way.
- You CAN read git history (`git log`, `git show`, `git diff`) to understand what shipped.
- You CAN read the most recent successful GH Actions runs via `gh run list --workflow nightly_pipeline.yml --limit 5` for operational health.
- You CAN curl production endpoints to verify what's deployed (`curl -sS https://45analytics.com/data/latest/snapshot_meta.json | jq .`) — this is read-only verification, not mutation.

If anything you find requires code execution to verify, document it as a "verification step deferred" in the report, not as an unconfirmed claim.

## Document structure

Mirror the 2026-06-01 diagnostic's structure exactly:

```
# Architecture Diagnostic: Live-Operation Readiness, 2026-06-03

**Date:** 2026-06-03
**T-minus:** 8 days to opening match (2026-06-11)
**Source:** Static audit of `main` (no code executed)
**Severity:** [your assessment]
**Owner ask:** [decisions needed before remediation can finalize]

## 1. Executive Summary

Two to four paragraphs naming the headline findings.

## 2. What Is Verified Working

Table format. Component / Evidence / Status.

## 3. Critical Findings

3.1, 3.2, ... etc. Each with severity, evidence, impact, and a one-line recommendation.

## 4. Risk Timeline

What breaks if nothing else ships by which date.

## 5. Remediation Plan (Sequenced)

Each remaining fix with files, scope, acceptance criteria, effort estimate.

## 6. Acceptance Criteria for "Live-Ready"

Numbered list. The same six criteria from the 2026-06-01 diagnostic, updated for current state.

## 7. Open Architectural Questions

Decisions Nicolás needs to make. List with my recommendation per question.

## 8. Appendix: File Reference Index

Quick-jump for the architect.
```

## What I want you to be especially thorough about

These are the specific verification points I care most about as the next-checkpoint author:

1. **`load_settled.py`'s precedence chain in production.** Is `DIRECT_URL` actually set in the cron env? Pull the workflow file and look. Confirm psycopg is installed at the cron's pip install step. If it isn't, cp-10 is silently using the default-0 fallback in production and conditioning never fires.

2. **`active_batch.json` post-cp-10.** What schema_version does it carry now? Does it have `settled_count_at_batch_time` and `settled_source`? Has any nightly run actually written a fresh batch under the cp-10 logic, or is it still on the cp-05a-era batch?

3. **`tournament.json` post-cp-09.** Does it actually carry `model_variant: "M2_fifa"` on the deployed snapshot? Curl it and check.

4. **`bracket.json` post-cp-09.** Are the slots still populated, or has a subsequent nightly run wiped them (cp-09 was a one-shot backfill; cp-12 is the structural fix that makes the pipeline write them too)?

5. **The nightly cron health.** `gh run list --workflow nightly_pipeline.yml --limit 5` and confirm: every recent run succeeded, the average duration is reasonable, no new failure modes.

6. **Whether cp-09's metadata derivation actually fires on production.** If the pipeline can't reach the database, the derivation falls back to defaults. The snapshot meta should show `matches_settled: 0` today (pre-tournament, correct), but the `source_label` should reveal whether that 0 came from "database returned 0 rows" or from "database unreachable, defaulting." This is the cp-10 silent-failure mode applied to the cp-09 surface; worth checking now.

7. **Whether the live site reflects everything we've shipped.** Specifically: on `/bracket`, does the slots-populated branch render? (Per cp-09's note, the slots are populated but the BracketBoard component doesn't yet consume them; cp-12 is the structural fix.) On `/ledger`, is the cp-04 pill still calm? On `/scenario/final-four`, is the cp-07 sticky meter still labeled `[ See how the model reacts ]`? On `/`, do the cp-08 chip and modal still render for first-visit users?

8. **Any unsigned drift between what we think is on main and what's actually deployed.** Vercel deployment latency, branch-protection state, anything that could cause main and prod to diverge.

## What to do AFTER the report is written

Stop. Commit the doc, push the branch, open a draft PR for documentation review. Don't merge automatically; Nicolás reviews the findings before deciding next steps.

The PR description should include:

- Executive summary copy-pasted from §1 of the report.
- Link to the prior 2026-06-01 diagnostic for comparison.
- Any items where your finding contradicts what we believed was true (cp-09 / cp-10 shipped X, but actually Y).
- Specific recommendations for whether cp-11 / cp-12 / cp-13 should proceed as planned or be re-sequenced.

## Out of scope

- **No code changes.** This is documentation only.
- **No checkpoint number.** This is `docs/diagnostic-2026-06-03`, not `cp-11`. cp-11 is the next implementation checkpoint and remains Fix 3 unless this diagnostic surfaces a higher-priority alternative.
- **No GO_TO_LAUNCH.md update.** That doc is acknowledged stale; updating it is a separate task that Nicolás will handle after the diagnostic informs the new plan.
- **No deletion of stale files.** Anything you find that's tech debt becomes a finding in §3, not a unilateral deletion.

## Verification before opening the PR

- [ ] `docs/audit/architecture-diagnostic-2026-06-03.md` exists and contains all eight sections of the standard format.
- [ ] Every claim in §2 (Verified Working) cites file:line evidence and a current value.
- [ ] Every finding in §3 (Critical Findings) has severity (P0 / P1 / P2), specific evidence, impact, and a one-line recommendation.
- [ ] §5 (Remediation Plan) is sequenced and lists each remaining fix with effort estimate.
- [ ] §6 (Acceptance Criteria) updates the original six criteria from the 2026-06-01 diagnostic to reflect current state.
- [ ] No code, data, or workflow files modified.
- [ ] Branch is `docs/diagnostic-2026-06-03`, single commit, the only added file is the audit doc.

## A note on judgement

This audit's value is in being adversarial. The author of the 2026-06-01 diagnostic surfaced things we were not aware of (the MC didn't condition on settled results, the metadata fields were hardcoded, the M0/M2 split-brain). That's the same posture we want from this one.

Specifically: do not assume cp-09 and cp-10 shipped what they claimed to ship. Verify it. The "verified working" section should be where things you actually checked land, not where things you trust are listed. Trust costs nothing to give and is expensive to get back.

If you find that cp-09 or cp-10 has a silent failure mode in production (e.g. the cron can't reach Postgres, the metadata derivation never actually fires, the snapshot is still stuck on a pre-cp-10 batch), that finding belongs at the top of §1 (Executive Summary) and as a P0 in §3. We need to know before cp-11 starts piling more work on the same pipeline.
