# cp-12 — Structural Fix 5 + tournament.json roster corruption: Stage 1 inspection notes

**Branch:** `cp-12-structural-fix5` (worktree `wt-cp-12-structural-fix5`, off `origin/main` @ `ba79ba3`, which includes cp-11 `#88`).
**Date:** 2026-06-08.
**Scope (4 sub-deliverables):** (1) repair the `tournament.json` roster (48 unique, TUN present, no COD dup) and fix the root cause; (2) tighten the contract test from subset to bidirectional; (3) make the regen populate `bracket.json` every run; (4) fix the `BracketBoard` over-claim. Closes PLAN.md acceptance criterion **#7**.

This is read-only Stage 1. No code written. **Hard stop at the end — awaiting Nicolás's review before Stage 2.**

---

## 0. Headline: the prompt's root-cause hypothesis is imprecise (read this first)

The prompt (and the cp-12 PLAN entry, and cp-11 §8.1) frame the bug as *"a team_id → FIFA code mapping bug in the regen path"* / *"the buggy regen path's `code→team_id` map is the root cause."*

**That is not what the trace shows.** The `_TEAM_ID_TO_DISPLAY_NAME` map (`scripts/regenerate_snapshot_from_batch.py:94-101`) is **correct** — `"DR Congo" → "Congo DR"` and all six special cases are right, and its inverse is unambiguous. The actual root cause is:

> **`regenerate_tournament_json()` rebuilds the roster by iterating the *carried-forward* `existing["teams"]` list** (`:492`), which has been corrupted since **2026-05-12** (it carries two `COD` rows and zero `TUN` rows). Because the rebuild is **roster-driven, not batch-driven, and has no uniqueness/completeness guard**, it faithfully re-emits the corruption on every nightly and **never errors** — both `COD` rows map cleanly to the valid batch id `"DR Congo"`, and `TUN` is simply never iterated, so the `KeyError` guard at `:501` never fires.

So Commit 1 cannot be "fix the mapping" — the mapping is fine. The correct fix is **(a) repair the committed roster data and (b) make the rebuild corruption-proof** (drive it from a clean source and/or add a fail-loud 48-unique guard). Details in §1. I flag this prominently per WORKFLOW.md's "verify, do not trust" posture: the assigned diagnosis would not have fixed the bug.

---

## 1. The roster corruption — trace, origin, and fix options

### 1.1 Confirmed live state (`website/public/data/latest/tournament.json`)

- 48 team rows, but only **47 unique `fifa_code`s**. `COD` ("Congo DR") appears **twice** (at `seed` 37 and 39, byte-identical probabilities). **`TUN` (Tunisia) is absent.**
- The batch is *not* the problem: `team_runs_M2.parquet` has all 48 team_ids including `"Tunisia"` and `"DR Congo"`; `aggregate_team_progression()` produces a correct 48-entry dict. The corruption is purely in the carried-forward **roster metadata**.

### 1.2 Where the corruption entered (git trace)

| snapshot | commit | roster |
|---|---|---|
| 2026-05-12T00:00Z | `c0aef04` | **clean** — 48 unique, TUN present |
| 2026-05-12T12:44Z | `f524ee7` ("Lockdown 2026-05-11: amendment v1.1 data completeness", #35) | **corrupt** — COD×2, no TUN |
| 2026-05-27 … 2026-06-08 | every nightly since | corrupt (carried forward verbatim) |

The corruption was introduced **once** by the v1.1 lockdown work (`#35`) and has been perpetuated by `regenerate_snapshot_from_batch.py`'s carry-forward ever since. The likely original culprit is `scripts/generate_snapshot.py` (builds the roster from `team_stats.iterrows()` with a name→code map at `:585-593`), run manually during the lockdown — but **that script is a dead path**: it is *not* in any workflow (the only reference in `nightly_pipeline.yml` is a comment, lines 1-3, documenting the cp-05 rewiring), and its canonical-draw input `data/raw/wc2026_official_draw.json` is gitignored (`.gitignore:42`) **and absent** from the tree, so it cannot even run in a clean checkout. We do not need to fix `generate_snapshot.py` for the live pipeline; I recommend leaving it (noting the latent bug) — see §7 out-of-scope.

### 1.3 The exact mechanism (`scripts/regenerate_snapshot_from_batch.py`)

- `:588` — `existing_tournament = json.loads((LATEST_DIR / "tournament.json").read_text())` reads the **already-corrupt** roster.
- `:492` — `for row in existing["teams"]:` — the rebuild iterates the corrupt 48-row list.
- `:496-500` — inverse-maps each `display_name` to a batch `team_id`. Both `"Congo DR"` rows → `"DR Congo"` → both present in `aggregated` → both emitted with identical probs. No dedup.
- `TUN` never appears in `existing["teams"]`, so it is never looked up and never emitted. The `KeyError` guard at `:501-506` only catches a *present* display_name with no batch match; it cannot catch an *absent* team.
- `:533-535` — re-sorts by `p_champion` desc and reassigns `seed = idx`. (So seed numbers self-correct on any regen; the dup/missing is the real defect.)

**Cascade into `teams/*.json` (`:752-783`):** `code_to_team_id` (`:752-759`) is built by matching batch ids against `existing_tournament["teams"]` display names. Since the corrupt roster has no "Tunisia" row, `code_to_team_id` gets **no `"TUN"` key**, so `teams/TUN.json` is **carried-through-frozen** (`:766-769`), not rewritten. It currently holds correct values only by luck; during a tournament re-batch it would freeze while other teams update (cp-11 §7 Option B caveat). **Repairing `tournament.json`'s roster also repairs this `code_to_team_id` construction**, so `teams/TUN.json` starts being rewritten again — a beneficial side effect of Commit 1.

### 1.4 Proposed fix — DESIGN DECISION REQUESTED

Two parts: repair the committed data, and make the code corruption-proof.

**Data repair (required either way):** the committed `latest/tournament.json` must become 48-unique-with-TUN. TUN's metadata is available in `teams/TUN.json` (confederation CAF, elo 1636.0, group F) and its probs in the batch aggregation.

**Code repair — pick one:**

- **Option A — minimal guard.** Keep the carry-forward rebuild, but after building `new_teams` assert `len(new_teams) == 48`, all codes unique, and that the consumed `team_id` set equals the 48 aggregated keys; raise loudly otherwise. Smallest diff. **Risk:** a future corrupt carried roster would then *break the cron* (fail-loud) rather than self-heal — acceptable per the project's "surface loudly" preference, but a broken nightly mid-tournament is costly.

- **Option B (RECOMMENDED) — batch/teams-driven, self-healing rebuild + assert.** Rebuild the roster from the **clean 48-team canonical source** (`teams/*.json`, which is keyed by code and includes `TUN.json`) instead of from `existing["teams"]`, joined to `aggregated`, with a `len==48 && unique` assertion. This is **immune to a corrupt `tournament.json`** (a single regen self-heals it), aligns the `teams/ ↔ tournament.json` entanglement, and never silently perpetuates. Slightly more code: remap `elo_rating`→`elo_current`, carry `rank_change_7d` (default `0`, as today), and `seed` is reassigned anyway. This is the genuine "fix the root cause" called for by Goal #1.

- **Option C — data-only, no code change.** Rejected: the regen would still silently perpetuate the next corruption; does not satisfy Goal #1 ("root cause … is fixed").

**Recommendation: Option B.** It is the only option where a corrupt roster cannot survive a single pipeline run, which is what "structural fix" should mean here.

**How to produce the repaired committed file (sub-decision):**
- **B-run (recommended):** after the code fix, run `python scripts/regenerate_snapshot_from_batch.py` once and commit the regenerated bundle. This *proves the fixed pipeline produces a correct roster* (the whole point) but yields a **full-bundle diff** (new `snapshot_id`, `snapshot_meta`, `freshness`, `manifest` append, a new `snapshots/<id>/` dir, rewritten `teams/`). This is exactly what a nightly produces, so it is legitimate, just large.
- **B-surgical:** hand-repair only `tournament.json` (+ `teams/TUN.json`) for a small diff, and rely on the smoke test + a local (uncommitted) regen to prove the pipeline. Smaller, more reviewable, but the committed data and the pipeline output are proven separately.

I lean **B-run** for trustworthiness; flag the diff-size trade for your call.

---

## 2. Contract test — current subset check and the tightening

### 2.1 The asymmetric check (the gap)

There are **two copies** of the contract suite (the second is a hand-rolled harness that works around a "% in the project-dir path breaks vitest URL handling" issue):

| file | the check | how run |
|---|---|---|
| `website/tests/contracts/snapshot.contract.test.ts:362-371` | `for (const t of tournament.teams) expect(teamFiles.has(t.fifa_code))` | `pnpm run test` (vitest, all `tests/**`) |
| `website/tests/contracts/run_contracts.ts:349-357` | same loop, hand-rolled | `pnpm run test:contracts` (tsx) |

Both are **one-directional** (`tournament codes ⊆ teams/ files`). The corrupt roster **passes both**: each of the 48 rows' codes (incl. both `COD`s) exists in `teams/`, and `TUN.json` being present-but-unreferenced is never examined. A separate test asserts `tournament.teams` has length 48 (`:105-108`) — also passes (48 rows). So the corruption sails through green today. **This is the test that should have caught `#35` and didn't.**

> ⚠️ **Correction to the prompt.** The prompt calls this a *Python* test (`pytest tests/<contract_test_file>`, `set(...).issubset(...)`). It is **TypeScript** (vitest + a tsx runner). Stage 2's "Commit 2 verify" command is `cd website && pnpm run test:contracts` (and `pnpm run test`), **not** `pytest`. There is a Python `tests/test_team_schema.py`, but it only schema-checks each `teams/*.json` in isolation — it does not compare rosters.

### 2.2 Proposed tightening (apply to BOTH files so they don't drift)

Replace the one-directional loop with a **bidirectional set-equality + no-duplicate** assertion:

```ts
const tournamentCodes = tournament.teams.map(t => t.fifa_code);
// (a) no duplicate codes in tournament.json
expect(new Set(tournamentCodes).size).toBe(tournamentCodes.length);   // catches COD×2
// (b) the set of tournament codes equals the set of teams/ files
const tSet = new Set(tournamentCodes), fSet = teamFiles;              // both Sets
expect([...fSet].filter(c => !tSet.has(c))).toEqual([]);              // catches missing TUN
expect([...tSet].filter(c => !fSet.has(c))).toEqual([]);              // catches stray code
```

(a) is needed in addition to set-equality because `Set` collapses the dup; with exactly 48 files a dup *implies* a missing code, but asserting (a) explicitly gives a clear failure message and survives future count changes. Mirror the same three assertions into the `run_contracts.ts` harness (its `expect` supports `toBe`/`toEqual`-style via `toBe`; may need a tiny `toEqual`/length helper — check the harness's `expect` shim at `run_contracts.ts:~62`).

### 2.3 Proof-of-protection

Both checks currently **pass** against the corrupt state (subset holds). After Commit 1 they pass against the 48-unique roster. To capture the proof the prompt wants: with Commit 2 applied, temporarily revert Commit 1 (restore the corrupt roster) and run `pnpm run test:contracts` — the tightened check goes **red** (missing TUN + dup COD). Restore Commit 1. Capture that failing run for the PR description.

### 2.4 CI wiring — IMPORTANT nuance

The contract suite is **not** in `ci.yml` (the cp-10.2 gate). `ci.yml`'s website job runs only `vitest run tests/unit` (`.github/workflows/ci.yml:111`). The contract suite is gated by a **different** workflow, **`snapshot-deploy.yml`** ("Site CI (PR validation)"), which runs `pnpm run test:contracts` (`:45`) and `pnpm run test` (`:48`) — but **only on PRs whose paths touch `website/**`** (`:8-11`), and *no longer* on data pushes.

Consequences:
- A cp-12 PR **does** touch `website/**` (BracketBoard + the repaired `public/data/`), so `snapshot-deploy.yml` **will** run and the tightened check **will** be exercised on this PR. Good.
- A PR that touches *only* `scripts/` would **not** trigger `snapshot-deploy.yml`, and nightly data pushes to `main` don't run contracts at all. So the contract test guards **website-touching PRs** (which is the path `#35` came through), not nightly pushes. That is consistent with the existing design; I do **not** recommend widening CI scope in cp-12 (keep it tight), but flagging the boundary so we don't over-claim "now every path is guarded."

---

## 3. `bracket.json` regeneration — approach

### 3.1 Current state

`regenerate_snapshot_from_batch.py:688-691` **carries `bracket.json` forward verbatim**, only overwriting `snapshot_id`:
```python
bracket = json.loads((LATEST_DIR / "bracket.json").read_text())
bracket["snapshot_id"] = new_snapshot_id
(new_dir / "bracket.json").write_text(json.dumps(bracket, indent=2))
```
The slots exist on production **only** because cp-09's one-shot `scripts/backfill_bracket_slots.py` wrote them once. A fresh clone + regen (without the prior populated file… though it's committed, so it persists) would never *rebuild* them, and the slots would silently never reflect the fixtures parquet. This is the cp-09 "one-shot not structural" pitfall (WORKFLOW.md).

Live `bracket.json`: 7 rounds, GRP 72 / R32 16 / R16 8 / QF 4 / SF 2 / 3P 1 / FIN 1 = **104** slots. Schema: `BracketRoundSchema` accepts `slots: array<record>`; contract test only asserts 7 rounds.

### 3.2 Proposed approach — function-in-regen, reusing cp-09's helpers (RECOMMENDED)

Per the prompt's recommendation (one regen step, one timestamp, one commit), add `populate_bracket_slots()` to the regen and call it where the carry-forward block is now (`:688-691`). **Reuse cp-09's logic, don't re-implement** (cp-11 pattern, no drift): import `build_slots` and `build_bracket_doc` from `scripts.backfill_bracket_slots`, read the already-known `FIXTURES_PARQUET` (the regen already owns this constant at `:79` and reads it in `_count_total_matches`), and write `{snapshot_id, rounds}` into `new_dir`.

- **Determinism:** slots are sorted by `match_id` and derived from the static, force-tracked fixtures parquet → the regen-produced `bracket.json` will be **byte-identical** to cp-09's backfill except `snapshot_id`. So Commit 3's diff on the committed file is ~empty (it just proves reproduction). Low risk.
- **Formatting nit:** the backfill writes `json.dumps(...) + "\n"` (trailing newline); the current regen write at `:691` has **no** trailing newline (the live file ends `]\n}` with no final `\n`). To keep the diff to slots-only, match the regen's existing convention (no trailing newline) when writing — or accept a 1-byte change. Decide in Stage 2; I'd match existing to keep the diff truly empty.
- **Import-surface caveat (verify in Stage 2):** `backfill_bracket_slots` does `from ingestion.fetch_match_outcomes import DISPLAY_NAME_TO_FIFA`, which transitively imports `ingestion.fetch_historical_matches`. `fetch_match_outcomes` only imports `requests`/`tenacity` at module level (both deps) with no network at import (guarded by `__main__`), so it *should* be CI-safe — but the smoke test (which runs the whole regen) is where any import-chain problem would surface. **Fallback if it bites:** factor `build_slots`/`build_bracket_doc`/`_resolve_team`/`STAGE_TO_ROUND_CODE` into a dependency-light shared module (e.g. `scripts/_bracket_slots.py`) imported by both scripts, importing only `DISPLAY_NAME_TO_FIFA` (a plain dict). Recommend trying the direct reuse first.

**Alternative (flagged, not recommended):** keep `backfill_bracket_slots.py` as a separate workflow step. Rejected for the prompt's reasons (extra step, separate timestamp/commit).

Per the prompt: leave `backfill_bracket_slots.py` in place (history of how slots were first populated) and add a header comment noting cp-12 moved the same logic into the regen.

---

## 4. `BracketBoard.tsx` — Option A vs Option B

### 4.1 What's actually wrong (one line)

`website/src/components/compositions/BracketBoard.tsx`:
- `:40` `slotsPopulated = bracket.rounds.some(r => r.slots.length > 0)` → **true** today.
- The **only** over-claim is the subtitle at **`:92-94`**: when `slotsPopulated`, it reads *"draw-resolved bracket with per-round conditional probabilities."* Meanwhile the h3 (`:86` "Bracket · per-round marginal probabilities"), the grid `aria-label` (`:153` "per-round marginal probabilities"), and every cell (`:248-269`, rendering `team[r.key]` = the marginal `P(reach round)` from `tournament.json`) are **marginal**. No conditional probabilities are computed anywhere.
- The empty-state copy at `:135-143` ("Once the draw resolves, this view augments with … conditional (reach-given-survival) probabilities") is inside `!slotsPopulated`, so it is **hidden** today and, once cp-12 makes slots always-populated, is effectively unreachable dead copy.

### 4.2 New finding — there is already a defensive dedupe for THIS bug

`:42-59` already dedupes `tournament.teams` by `fifa_code`, with a comment (`:44-48`) explicitly citing *"May 2026: COD appeared at seeds 37 and 39 while TUN was dropped."* So the page currently renders the **deduped 47 teams** (COD once, no TUN) and `sortedTeams.length` reads **47** (used in the subtitle `:94` and the chip `:101`). After Commit 1 fixes the roster to 48-unique, this dedupe becomes a **no-op**, TUN renders, and the count auto-corrects to **48** — no BracketBoard change needed for the count. Recommend **keeping** the dedupe as harmless defense-in-depth (the contract test is now the real upstream guard); optionally refresh its comment to reference cp-12.

### 4.3 Option A (content) vs Option B (copy)

- **Option A — render real conditional probabilities / a slot tree.** The bracket.json slots give the *draw structure* (slot_id, match_id, placeholders like `1A`/`WM73`), but the **conditional** quantities `P(reach R | in slot S)` are **not in any current artifact** — they'd need new per-slot aggregation from the batch *plus* a new slot-tree UI component. ≈1–2 days. Real UI build.
- **Option B — copy fix (RECOMMENDED).** Change `:93` to match the marginal grid, e.g. **"draw-resolved bracket · showing per-round marginal P(reach round)"** (or the prompt's "draw-resolved bracket; showing per-round marginal probabilities"). One line. The data is correct; only the framing over-claimed. This also *aligns* the subtitle with the guided-tour step titled **"Marginal, not conditional"** (`bracket/_steps.tsx:46-57`), which already, correctly, tells users the cells are marginal.

**Recommendation: Option B**, for the prompt's four reasons (separate substantial UI work; the numbers aren't wrong, only the framing; conditional rendering is a clean post-launch checkpoint; T-3 days). If you approve, I'll also lightly update or note the now-unreachable empty-state copy at `:135-143` (the draw is resolved; "Once the draw resolves…" is stale).

### 4.4 Scope decision — two MORE bracket-surface over-claims the prompt didn't name

The same "conditional probabilities" over-claim appears in two other user-facing places:
1. **`website/src/components/compositions/ResearchVaultCTA.tsx:36`** — *"Full 48-team bracket with per-round conditional probabilities from the current M★ distribution."* ("Full 48-team" becomes true after Commit 1; "conditional" stays an over-claim.)
2. **`bracket/_steps.tsx:46-57`** — the guided step is actually **honest** (it says cells are marginal, *not* conditional). Its only staleness: it says conditional "become reportable only after the draw resolves and slots are populated" — which is now, yet we still show marginal. Not an over-claim; leave or lightly note.

Per PR-scope discipline (don't silently bundle; surface and ask): I recommend cp-12 **also** make the trivial copy fix to `ResearchVaultCTA.tsx:36` (drop "conditional", → "marginal"), since it's the identical editorial-integrity class and one word. But it's outside the prompt's literal "BracketBoard" scope, so I'm flagging it for your decision rather than assuming. `_steps.tsx` needs no change.

---

## 5. CI gate touchpoints (Stage 1.5)

cp-12 touches three CI-relevant surfaces. The cp-10.2 gate (`ci.yml`, runs on every PR + push to main) has three jobs:

| Job (`ci.yml`) | What cp-12 changes hit it | Risk |
|---|---|---|
| `python` (ruff advisory + `pytest -q`, excludes smoke) | the tightened contract test is **not** here (it's TS); `pytest` covers `tests/` incl. `test_team_schema.py` (still green — `teams/` already clean) | low |
| `python-smoke` (`test_snapshot_regen_smoke.py`) | **HIGHEST RISK.** Runs the **full regen end-to-end** and asserts exit 0 + non-empty `snapshot_id`. Commit 1 (roster rebuild) and Commit 3 (`populate_bracket_slots`) both run inside it. An import-chain failure, an over-strict guard firing, or a write error here turns this red. This is the canary the prompt warns about. | **high** |
| `website` (`tsc --noEmit` + `vitest run tests/unit`) | Commit 4's BracketBoard edit is type-checked here; the contract test is **not** in this job | low |

Plus **`snapshot-deploy.yml`** (PRs touching `website/**`, which cp-12 does): runs `pnpm run test:contracts` + `pnpm run test` (incl. the contract `.test.ts`) + `next build`. **This is where the tightened contract test (Commit 2) actually runs on the PR.** Confirm green there.

So: the smoke job is the make-or-break for Commits 1 & 3; the snapshot-deploy job is where Commit 2's tightening is proven; the website job type-checks Commit 4.

### Environment note (Stage 2)
The worktree has **no `.venv` and no `website/node_modules`**. Stage 2 local runs need either `pip install -e ".[dev]"` + `pnpm install` in the worktree, or use the primary tree's `.venv` for read-only checks. Since Stage 2 *runs* the mutating regen and `pnpm` builds, a worktree-local env is cleaner. (Same note as cp-11 §8.4.)

---

## 6. Cross-project / preservation checks

- **El Voto:** cp-12 only touches `scripts/`, `tests/`, `website/src/components/`, `website/public/data/`, `.github/` (no change planned), `PLAN.md`. None overlap `the-21j-problem/`. No El Voto handoff needed (no root `pyproject.toml` / shared-workflow change beyond — actually, **no** workflow change is planned at all). Confirmed `the-21j-problem/` present and will be left untouched.
- **cp-10.1 preserved:** `.gitignore:35-40` by-name exceptions intact; all six `data/raw/*.parquet` tracked (`git ls-files` → 6). cp-12 does not touch `.gitignore`.
- **cp-04…cp-11 preserved:** cp-12 adds a function to the regen + tightens a test + one-line copy fix; it does not restructure the pipeline, the MC conditioning (cp-10), or the snapshotProbs regeneration (cp-11).

---

## 7. Out of scope / follow-ups

- **Option A conditional-probability slot-tree rendering** — deferred to a post-launch checkpoint (track in PLAN.md backlog). cp-12 takes Option B.
- **`scripts/generate_snapshot.py` latent roster bug** — the dead path that originally produced the corruption (§1.2). Not in the cron, can't run in a clean checkout (gitignored draw input). Recommend leaving it with a note; fixing it is neither necessary for the live pipeline nor low-risk to touch pre-launch. Flag as optional cleanup.
- **`ResearchVaultCTA.tsx:36` over-claim** — surfaced in §4.4 for your scope decision (recommend the one-word fix; awaiting your call).
- **Contract suite not gated on `scripts/`-only PRs or nightly pushes** — §2.4. Inherent to the existing `snapshot-deploy.yml` path filter; not widening in cp-12.

---

## 8. Proposed commit plan (pending approval)

1. **Commit 1** — root-cause fix: make `regenerate_tournament_json` roster-correct & corruption-proof (Option B recommended), + repaired committed `tournament.json` (B-run or B-surgical, your call). Verify 48 unique codes, TUN present, no COD dup.
2. **Commit 2** — tighten the contract check to bidirectional + no-dup in **both** `snapshot.contract.test.ts` and `run_contracts.ts`. Capture proof-of-protection (revert C1 → red → restore).
3. **Commit 3** — `populate_bracket_slots()` in the regen (reuse cp-09 helpers), replacing the carry-forward at `:688-691`; comment the one-shot script.
4. **Commit 4** — BracketBoard subtitle copy fix (Option B); optional `ResearchVaultCTA` fix pending §4.4 decision; tidy stale empty-state copy.
5. **Commit 5** — PLAN.md: mark acceptance criterion #7 Done; note Option B; backlog the conditional-rendering item.

---

## STOP GATE

**Awaiting Nicolás's review of the design before Stage 2 begins.**

Specific confirmations requested:

1. **Root-cause framing (§0/§1):** acknowledge the bug is the corrupt carried-forward roster + guard-less roster-driven rebuild, **not** the `_TEAM_ID_TO_DISPLAY_NAME` map. OK to fix accordingly?
2. **Roster fix = Option B** (self-healing, teams/-driven rebuild + 48-unique assert), and produce the repaired file via **B-run** (commit a full regenerated bundle) vs **B-surgical** (small hand-repair + smoke proof)? Or do you prefer Option A (minimal guard, keep carry-forward)?
3. **Contract test (§2):** confirm bidirectional **+ no-duplicate** assertions, applied to **both** copies, run via `pnpm` (the prompt's `pytest` framing is wrong)?
4. **`bracket.json` (§3):** function-in-regen reusing cp-09's `build_slots`/`build_bracket_doc` (with the dependency-light shared-module fallback if the import chain bites)?
5. **BracketBoard = Option B** copy fix? And the **scope question (§4.4):** also fix the same-class over-claim in `ResearchVaultCTA.tsx:36`, or leave it out of cp-12?
