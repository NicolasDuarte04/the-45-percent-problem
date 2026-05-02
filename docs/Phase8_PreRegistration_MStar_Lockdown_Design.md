# Phase 8 — Pre-registration & M★ Lockdown

**Project:** The 45% Problem — Probabilistic Pricing for FIFA World Cup 2026
**Author:** Nicolás Duarte Jaraba
**Status:** DESIGN LOCKED — 2026-04-22
**OSF Pre-registration:** [https://osf.io/spmkg/overview?view_only=b2ba9087b4ac494f8255388d78af0321](https://osf.io/spmkg/overview?view_only=b2ba9087b4ac494f8255388d78af0321) — REGISTERED & LOCKED 2026-04-23
**Upstream dependencies:** Phases 2–7 (full pipeline operational, Red-Team stress tests passed)
**Downstream consumers:** Academic paper, live MVP website, OSF registration audit trail, all in-tournament forecasts

---

## 0. Preamble & Philosophical Scope

Phase 8 is not a modeling phase. It does not fit a parameter, tune a threshold, or write a new line of predictive logic. Its only function is to take the scientific machinery built across Phases 2–7 and render it **immutable** before the first ball of FIFA World Cup 2026 is kicked on 11 June 2026.

Pre-registration is the architectural linchpin of the paper. Without it, every number in our evaluation — log-loss, Brier, CLV, pseudo-CLV, Nyberg p-values — is a post-hoc artifact and the 45% thesis is statistically indefensible. With it, each of those numbers becomes a pre-committed test outcome that the entire community can re-verify against a timestamped, content-addressable, public record.

The phase therefore operates under a **one-way door** principle: every action in Phase 8 moves the project into a state from which no retreat is permitted without a public OSF amendment. The agent executing this phase must treat every filesystem write, every `git tag`, and every OSF upload as irreversible.

### 0.1 Design Invariants (apply to all four deliverables)

1. **Single source of truth.** After Phase 8 completes, `pre_reg_constants.yaml` is the **only** place any downstream module reads a tunable constant from. Any hard-coded magic number discovered in code post-lock is a **defect**, not a configuration choice.
2. **Public before private.** Every artifact produced in Phase 8 (CV battery report, constants YAML, README, design docs) is uploaded to OSF **before** the Git tag is pushed to the remote. The OSF timestamp is the authoritative pre-registration moment; the Git tag is its cryptographic mirror.
3. **Hash everything.** The YAML, the CV report PDF, every design doc in the repository, and the Parquet data snapshot used for calibration all receive explicit SHA-256 values recorded in the OSF manifest. The paper quotes these SHAs verbatim.
4. **Clean working tree.** The `v1.0.0-mstar-lock` tag is only pushed from a working tree where `git status --porcelain` produces zero lines. The tag message itself records the current `HEAD` SHA, the data snapshot SHA, and the OSF DOI.
5. **No retroactive edits.** Once a file is OSF-registered, it is never overwritten in the repository. Corrections live in `amendments/` and reference the original artifact by SHA.
6. **Decision provenance.** The M★ crown is *declared* in Phase 8 via the formal CV battery even though Phase 4 flagged M2 as the champion candidate. The Phase 4 result is a **preview**; the Phase 8 battery is the **adjudication**. The paper cites only Phase 8.
7. **Frozen means frozen.** Post-lock the repository accepts exactly two categories of commits: (a) pure data additions to `data/snapshots/`, and (b) amendment records under `amendments/`. Every other change is blocked by branch protection and CI.

---

## 1. CV Log-Loss Battery — Formal M★ Adjudication

### 1.1 Responsibility

Execute the single, pre-registered Cross-Validation battery whose output is the **legally-binding** crowning of M★. The battery is run exactly once on frozen code, against a frozen data corpus. Its output is the signed PDF `cv_battery_report.pdf` and the machine-readable `cv_battery_result.json`, both hashed into OSF.

Although Phase 4 produced a preview in which M2 (FIFA Blend, $w=1.0$) led the field, that run was performed with still-mutating code and an evolving data ingestion pipeline. Phase 8's battery is the **re-execution** under lockdown conditions; its result supersedes all prior indications. If M2 wins again, the provenance is now auditable; if the order shifts, the new winner is M★.

### 1.2 Data Partitioning (IMMUTABLE)

| Partition | Period | Matches (est.) | Purpose |
|---|---|---|---|
| **Calibration** | 2010-06-11 through 2021-12-31 | ~310 major-tournament matches | All hyperparameter fitting, all 5-fold CV scoring |
| **Hold-out** | 2022-01-01 through 2022-12-31 (incl. Qatar WC) | ~37 major-tournament matches | Single-shot, post-CV evaluation. Never touched during tuning. |

Major-tournament scope: FIFA World Cups, Copa América, UEFA Euros, Africa Cup of Nations, CONCACAF Gold Cup, and CONMEBOL/UEFA/CAF/AFC qualifiers at the final stage. Club matches, friendlies, and age-restricted tournaments are **excluded**. This partitioning recognizes the documented ~347-match data constraint — the battery cannot conjure matches that do not exist.

The Parquet snapshot freezing this partition is `data/snapshots/cv_battery_2026-04.parquet`. Its SHA-256 is computed once and written into `pre_reg_constants.yaml` under `data_snapshot_sha`. Any future regeneration of this file from scratch that produces a different SHA invalidates the entire battery.

### 1.3 Execution Protocol

The battery runs as a single idempotent script: `src/calibration/run_cv_battery.py`. Execution sequence:

1. **Pre-flight checks.**
   - `git status` must be clean. Abort on any untracked or modified file.
   - `data/snapshots/cv_battery_2026-04.parquet` SHA must match the value pinned in `pre_reg_constants.yaml` (this is a self-consistency check: the YAML is built against the snapshot).
   - Python environment lock (`uv.lock` / `requirements-lock.txt`) must match the committed lock file SHA.
2. **Fold construction.** 5-fold stratified CV on the calibration block. Strata: tournament type × era bucket (pre-2016 / 2016–2021). Folds are generated deterministically from `seed = 20260422` and cached to `calibration/cv_folds.parquet`. Folds are written once and are hashed into the report.
3. **Per-model execution.** For each of M0, M1, M2, M3:
   - For each fold $k \in \{1,\dots,5\}$: fit model's free parameters on the 4 training folds, score held-out fold. Record per-match log-loss, Brier score, and RPS. Running time and peak RSS are also logged.
   - Aggregate to $\overline{\text{LL}}_m$, $\overline{\text{Brier}}_m$, $\overline{\text{RPS}}_m$ with fold-level standard errors ($\text{SE} = s / \sqrt{5}$).
4. **Hold-out single-shot.** After all four models have completed CV on calibration, each model is **re-fit once on the full calibration block** and scored once on the 2022 hold-out. This produces `LL_holdout_m`, reported but **not used** for selection.
5. **Decision rule (pre-committed, do not alter).**
   - Primary ranking: mean CV log-loss $\overline{\text{LL}}_m$ on calibration, lower is better.
   - Tie-breaker (within 1 SE of the leader): hold-out log-loss `LL_holdout_m`, lower is better.
   - Sanity gate: M★ must beat M0 by **at least 2 SE** on calibration log-loss. If no model clears this gate, the paper's framing pivots to the pre-registered kill-criterion narrative (Phase 1 contingency) and M★ is provisionally set to M0 for trading-policy purposes (no Kelly stakes placed).
6. **Report generation.** `cv_battery_report.pdf` is compiled via LaTeX with booktabs + siunitx, embedding:
   - Table 1: per-model $\overline{\text{LL}}, \overline{\text{Brier}}, \overline{\text{RPS}}$ with SEs.
   - Table 2: per-fold log-loss matrix (5 × 4).
   - Table 3: hold-out single-shot scores.
   - Table 4: decision rule application, with explicit SE gap computation.
   - Fold-hash, data-hash, code-hash footer on every page.
7. **Machine artifact.** `cv_battery_result.json` contains the same numbers, schema-versioned, for programmatic ingestion by the OSF manifest builder.
8. **Seal.** The report and JSON are both SHA-256'd and the hashes are written to `pre_reg_constants.yaml` fields `cv_report_sha` / `cv_result_sha`. The YAML is then itself re-hashed; this chained hashing ensures any post-lock tampering with the report propagates to a YAML mismatch detected at forecast-emit time.

### 1.4 Acceptance Criteria (§1)

- [ ] `src/calibration/run_cv_battery.py` is deterministic: two runs on the same hardware with the same seed produce byte-identical outputs of both the PDF and the JSON (modulo PDF timestamp metadata, which is stripped before hashing).
- [ ] Calibration block and hold-out block never appear in the same Pandas DataFrame; they are physically separate Parquet files after partitioning.
- [ ] The script refuses to run if any of `c*`, `μ*`, `ρ`, `λ_form`, `w`, `τ₀` is already present in `pre_reg_constants.yaml` — this guarantees the battery is the source of those values, not a consumer.
- [ ] The PDF's Table 4 includes the verbatim sentence: *"Per §1.3.5, M★ = `{winner}` was selected because its calibration log-loss was `{gap}` SE below the runner-up."*
- [ ] `cv_battery_result.json` validates against `schema/cv_battery_v1.json`.

---

## 2. Hyperparameter Freeze — `pre_reg_constants.yaml`

### 2.1 Responsibility

Compile, validate, sign, and lock the single YAML file that every downstream module reads its constants from. This file is the **constitutional document** of the project. No module is permitted to use a numeric threshold, a decay coefficient, or a statistical cutoff that is not read from this file at import time.

### 2.2 Location & Structure

Canonical path: `evaluation/pre_reg_constants.yaml`

The file is organized into eight top-level sections, each corresponding to an upstream phase. Every scalar value carries a `value`, a `unit`, a `source` (which phase/experiment derived it), and a `sha_origin` (the Git SHA of the run that produced it).

```yaml
meta:
  schema_version: "8.0"
  created_at_utc: "2026-04-22T00:00:00Z"
  author: "Nicolás Duarte Jaraba"
  project: "The 45% Problem"
  pre_registration_status: "PENDING_OSF"   # flipped to "LOCKED" by seal script
  data_snapshot_sha: "{sha256 of cv_battery_2026-04.parquet}"
  cv_report_sha: "{sha256 of cv_battery_report.pdf}"
  cv_result_sha: "{sha256 of cv_battery_result.json}"
  git_sha_at_freeze: "{short SHA of HEAD at seal}"
```

### 2.3 Frozen Parameter Inventory (EXHAUSTIVE)

Every value below is written **exactly once** into the YAML. Subsequent drift in any module is a compliance failure.

**§ A — Elo Engine (Phase 3)**
- `elo.c_star: 0.580` — logistic slope of Elo → expected-goals mapping.
- `elo.mu_star: 1.716` — intercept (mean goals per match at Elo parity).
- `elo.k_factor: 30` — Elo update coefficient for major tournaments.
- `elo.home_advantage: 65` — Elo-point equivalent of home advantage.
- `elo.initial_rating: 1500` — cold-start rating for new national teams.

**§ B — Dixon-Coles / Bivariate Poisson (Phase 5)**
- `match_model.rho: {value from Phase 5 calibration}` — low-score correlation parameter.
- `match_model.lambda_3: {value from Phase 5 calibration}` — bivariate Poisson covariance term.
- `match_model.max_goals: 10` — truncation of score grid for probability normalization.

**§ C — Form Layer (Phase 4 / M1)**
- `form.half_life_matches: {value from Phase 4 CV}` — exponential decay across last 8 matches.
- `form.cap_pct: 0.15` — ±15% cap on form adjustment to strength.
- `form.window_matches: 8` — lookback window.

**§ D — FIFA Blend (Phase 4 / M2)**
- `fifa_blend.w: 1.0` — blend weight between Elo-derived and FIFA-ranking-derived strength (Phase 4 CV result, re-verified by §1).
- `fifa_blend.rank_to_rating_scale: {value from Phase 4}` — linear map from FIFA rank to Elo-equivalent.

**§ E — Macro Prior (Phase 4 / M3)**
- `macro_prior.tau_0: {value from Phase 4 Bayesian calibration}` — precision of Hoffmann-Klement prior.
- `macro_prior.gdp_weight: {Phase 4 fit}` — coefficient on log-GDP-per-capita.
- `macro_prior.population_weight: {Phase 4 fit}` — coefficient on log-population.

**§ F — Market Layer (Phase 6)**
- `market.devig_method: "power"` — Shin 1993 / Strumbelj 2014 power method (not proportional).
- `market.pinnacle_bias.draw_delta: +0.014`
- `market.pinnacle_bias.host_delta: -0.006`
- `market.edge_threshold_mainline: 0.03`
- `market.edge_threshold_derivative: 0.05`

**§ G — Volatility Gate & Kelly (Phase 6)**
- `gate.news_window_hours: 6`
- `gate.price_discovery_pct: 0.03`
- `gate.price_discovery_window_min: 30`
- `gate.cross_book_spread_pp: 0.025`
- `gate.liquidity_floor_usd: 50000`
- `gate.pinnacle_staleness_hours: 4`
- `kelly.phi_mainline: 0.25`
- `kelly.phi_longshot: 0.125`
- `kelly.longshot_cutoff: 0.10`
- `kelly.cap_per_market: 0.05`
- `kelly.cap_per_market_longshot: 0.025`
- `kelly.cap_per_event: 0.08`
- `kelly.cap_per_day: 0.15`
- `kelly.drawdown_halve_trigger: 0.20`
- `kelly.drawdown_recover_trigger: 0.90`

**§ H — Simulation Engine (Phase 5)**
- `sim.runs_website: 10000`
- `sim.runs_paper: 100000`
- `sim.seed_master: 20260611`

**§ I — Kill Criteria (Phase 1 contingency, invoked in Phase 7)**
- `kill.checkpoint_round: "R16"` — evaluation moment.
- `kill.ll_gap_se: 2.0` — if M★ log-loss is worse than M0 by ≥ 2 SE at the checkpoint, kill flag fires.
- `kill.action: "pivot_paper_framing"` — the kill does not stop the tournament; it rewrites the paper's narrative to the pre-committed contingency framing.

**§ J — Evaluation (Phase 7)**
- `eval.alpha: 0.05` — family-wise α for pre-registered tests.
- `eval.bootstrap_resamples: 10000` — for Hall-Mueller CLV CI.
- `eval.dm_small_sample_correction: "HLN"` — Harvey-Leybourne-Newbold.
- `eval.nyberg_lags: [1, 2, 3]` — autoregression lags for market-efficiency regression.

### 2.4 Validation Pipeline

A dedicated script, `src/lockdown/seal_constants.py`, performs the sealing ceremony:

1. Load the YAML; validate against `schema/pre_reg_constants_v8.json` (JSON-Schema, strict mode, no additional properties).
2. Cross-check every `sha_origin` field against `git log` — every origin SHA must exist in the repository's reflog.
3. Cross-check `cv_report_sha` / `cv_result_sha` against the actual files on disk.
4. Verify every downstream module's imports (grep-based static check) do not reference a numeric literal that should live in the YAML. The allowlist of permitted magic numbers (π, 0, 1, integer indices, etc.) is in `schema/magic_number_allowlist.txt`.
5. Flip `meta.pre_registration_status` from `PENDING_OSF` to `LOCKED`.
6. Emit the final SHA of the YAML to `evaluation/constants.sha` (plain text, one line).

### 2.5 Acceptance Criteria (§2)

- [ ] `pre_reg_constants.yaml` contains every parameter in §2.3 with no `TODO`, no `null`, no placeholder strings.
- [ ] Schema validation passes; `additionalProperties: false` holds at every level.
- [ ] `src/lockdown/seal_constants.py` exits 0; flipping status to `LOCKED`.
- [ ] A grep for float literals in `src/**/*.py` (excluding tests and the constants loader itself) returns only allowlisted numbers.
- [ ] `evaluation/constants.sha` is committed; its contents match `sha256sum evaluation/pre_reg_constants.yaml` byte-for-byte.
- [ ] A golden test asserts that the import-time constants in every downstream module (elo_engine, match_model, kelly_sizer, volatility_gate, forecast_log, evaluation_dashboard) match the YAML values on instantiation.

---

## 3. OSF Submission Protocol

### 3.1 Responsibility

Create an immutable, publicly-timestamped registration on the Open Science Framework that serves as the external proof-of-pre-commitment for the paper. The OSF record is the architectural linchpin: everything else (Git tag, forecast log, paper) derives its credibility from the fact that the OSF registration predates the opening match.

### 3.2 Repository Structure on OSF

Project title on OSF: **"The 45% Problem: Probabilistic Pricing for FIFA World Cup 2026 — Pre-registration"**

OSF component layout:

```
osf.io/<handle>/
  ├── 00_README.md                           # project abstract, authorship, contact
  ├── 01_design_documents/
  │     ├── Phase1_System_Design.pdf
  │     ├── Phase3_Elo_Calibration_Design.pdf
  │     ├── Phase4_Model_Development_Design.pdf
  │     ├── Phase5_Simulation_Engine_Design.pdf
  │     ├── Phase6_Market_Layer_Design.pdf
  │     ├── Phase7_Evaluation_Framework_Design.pdf
  │     └── Phase8_PreRegistration_MStar_Lockdown_Design.pdf   # this document
  ├── 02_constants/
  │     ├── pre_reg_constants.yaml
  │     └── constants.sha
  ├── 03_cv_battery/
  │     ├── cv_battery_report.pdf
  │     ├── cv_battery_result.json
  │     └── cv_folds.parquet
  ├── 04_code_reference/
  │     ├── git_sha.txt                      # v1.0.0-mstar-lock SHA
  │     ├── repo_tree.txt                    # full file tree at freeze
  │     └── dependency_lock.txt              # uv.lock / requirements-lock.txt
  ├── 05_data_manifest/
  │     ├── snapshot_sha.txt                 # SHA of cv_battery_2026-04.parquet
  │     ├── snapshot_schema.json
  │     └── source_provenance.md             # where each match record came from
  ├── 06_pre_registered_hypotheses.md        # H1–H7 from bias_tests.py (Phase 6)
  └── 07_kill_criteria.md                    # Phase 1 contingency, restated
```

### 3.3 Registration Workflow

1. **Account & component.** The project owner (Nicolás Duarte Jaraba) creates a private OSF project under the title above. All co-authors (if any) are added as contributors with "Admin" or "Read + Write" roles per journal authorship practice.
2. **Upload batch.** All artifacts listed in §3.2 are uploaded in a single batch. Each upload's SHA is verified client-side before and after (OSF exposes file SHAs via its API).
3. **Manifest file.** `00_README.md` ends with a **Manifest** table listing every file's SHA-256. This manifest is the human-readable cross-check of everything in `pre_reg_constants.yaml → meta`.
4. **Pre-registration mint.** From the OSF project, create a **Frozen Registration** of type *OSF Preregistration* (not *Open-Ended Registration*). The registration snapshots the full component tree at a UTC timestamp and issues a persistent DOI. Once minted, the registration is **immutable** — files cannot be added, removed, or modified within the registered snapshot.
5. **Embargo.** The registration is created with an embargo aligned to the live MVP website launch. After the embargo lifts, the record is public and discoverable. Target public-visibility date: **2026-04-25** (aligned with the April 25 live MVP website launch).
6. **DOI capture.** The minted DOI is written back into the repository at `docs/osf_registration_doi.txt` in the **same commit** that produces the Git tag (§4). The DOI is also embedded in the `v1.0.0-mstar-lock` tag message.
7. **Amendment protocol.** Post-registration amendments are only possible via an OSF *child registration* linked to the parent. Each amendment requires: (a) a dated justification document, (b) a new SHA for the changed artifact, (c) a paper-manuscript footnote quoting the amendment DOI. The amendment process is invoked only for the scenarios enumerated in §4.4 (critical-bug hotfix) and never for performance reasons.

### 3.4 Pre-registered Hypotheses (content of `06_pre_registered_hypotheses.md`)

This file restates the seven hypotheses implemented by `bias_tests.py` (Phase 6) plus the paper-level thesis. Each hypothesis is recorded with:

- **H-ID** (e.g., H1 — Draw-bias neutralization).
- **Statistical test** used.
- **Pre-committed α** (read from `pre_reg_constants.yaml → eval.alpha`).
- **Direction of interest** (one-sided / two-sided).
- **Decision rule** (exactly how the p-value maps to a paper-level claim).

The **paper-level thesis** — *"Model M★ identifies systematically mispriced outcomes in the Pinnacle-devigged line with cumulative CLV Z-score > 1.96 across the tournament"* — is registered as H0 of the paper and marked as the **primary endpoint**.

### 3.5 Acceptance Criteria (§3)

- [ ] OSF project exists under the canonical title; DOI is live and resolvable from a clean browser.
- [ ] Every file listed in §3.2 is present in the OSF component, and each file's OSF-reported SHA matches the local SHA.
- [ ] The Frozen Registration is created and minted; its status is `pending embargo` or `public`, never `draft`.
- [ ] `docs/osf_registration_doi.txt` is committed and equals the DOI on OSF.
- [ ] The manifest in `00_README.md` enumerates every file with its SHA, and no file on OSF is absent from the manifest.
- [ ] Public visibility lands on or before **2026-04-25 23:59 UTC**, aligned with the April 25 live MVP website launch; under no circumstance later than **2026-04-25 23:59 UTC**.

---

## 4. SHA Freeze & Git Tagging

### 4.1 Responsibility

Encode the pre-registration into the repository itself. After this step, the code corresponding to M★ is addressable by a single Git SHA, signed by the author, and protected from modification by branch-protection rules enforced at the remote.

### 4.2 Tagging Protocol

1. **Clean tree precondition.** `git status --porcelain` returns empty. `git diff HEAD` returns empty. The only staged artifacts are the final commits of §1, §2, §3.
2. **Final freeze commit.** A single commit with message:
   ```
   chore(lock): M★ pre-registration freeze

   - CV battery adjudicated; see cv_battery_report.pdf
   - pre_reg_constants.yaml sealed; status=LOCKED
   - OSF DOI: {doi}
   - Data snapshot SHA: {sha}
   ```
   This commit contains only: the sealed YAML, `evaluation/constants.sha`, `docs/osf_registration_doi.txt`, and `04_code_reference/git_sha.txt` (self-referencing; see §4.3 for how this is achieved).
3. **Signed annotated tag.**
   ```bash
   git tag -s v1.0.0-mstar-lock -m "M★ locked for FIFA WC 2026. OSF DOI: {doi}. Data SHA: {sha}."
   ```
   The `-s` flag mandates a GPG/SSH signature from a key whose public half is recorded on OSF under `04_code_reference/`.
4. **Push order.** The tag is pushed **after** the OSF registration is minted (§3) but **before** public embargo lifts. This guarantees the tag's timestamp is bracketed by the OSF timestamp on both ends, rendering any "we tagged it later" objection mechanically impossible.
5. **Remote branch protection.** On GitHub (or chosen remote), `main` is configured with:
   - Require pull requests for every change (no direct pushes).
   - Require at least one approving review.
   - Require the `post-lock-guard` CI check to pass (see §4.3).
   - Disallow force-pushes and branch deletions.
   - Tags matching `v1.0.*-mstar-lock` are protected and cannot be deleted or moved.

### 4.3 Code SHA Injection into Every Forecast

The Phase 7 `forecast_log` schema already mandates a `code_sha` field (see Phase 7 §1.3). Phase 8 **tightens** this contract:

- At forecast emit time, `forecast_log.emit_opening()` calls `git rev-parse HEAD` **and** verifies that the current `HEAD` is an ancestor of `v1.0.0-mstar-lock` OR is the tag itself.
- If `HEAD` is the tag exactly, `code_sha` is emitted as the full 40-character SHA.
- If `HEAD` is a descendant (data-only commit per §4.4), the emitted record additionally carries a `post_lock_diff` field listing the files changed since the tag, for the auditor's consumption.
- If `HEAD` is **not** a descendant of the tag (i.e., a force-push or branch switch corrupted history), emission aborts with `PostLockHistoryViolation` and the `market_pipeline.py` scheduler shuts down the live site until manual resolution.

The self-referential `git_sha.txt` file in the final commit is generated by a two-commit dance: the first commit places a placeholder, the freeze commit is amended with the actual SHA after the parent commit hash is known. The canonical approach is to compute the SHA that the amend will produce via `git commit-tree` before the final amend, which is the standard idiom.

### 4.4 What Is Allowed Post-Lock (STRICT BOUNDARIES)

The only commits accepted on `main` after `v1.0.0-mstar-lock` are:

1. **Pure data additions** to `data/snapshots/`. Specifically: new daily Pinnacle/Polymarket odds captures, new match-result records from completed WC 2026 matches, new FIFA-ranking monthly updates. These commits must pass the `post-lock-guard` CI check, which:
   - Asserts that the diff touches **only** files matching `data/snapshots/**` and `data/raw_odds/**`.
   - Asserts that `pre_reg_constants.yaml`, every file under `src/`, and every file under `schema/` are byte-identical to their `v1.0.0-mstar-lock` versions.
   - Asserts that the new data file appears in an append-only manner (no pre-existing Parquet is modified).
2. **Amendment records** under `amendments/{YYYY-MM-DD}-{slug}/` containing a justification markdown, an OSF child-registration DOI, and any replacement artifact. Amendments require:
   - A public blog post or paper-manuscript footnote announcing the change.
   - A new Git tag `v1.0.{n}-mstar-lock-amend{n}` linking to the amendment commit.
   - Explicit author acknowledgement that the original registration's integrity is preserved and the amendment is disclosed as a deviation.
3. **Forecast log writes** under `evaluation/forecasts/**`. These are runtime append-only writes, not code commits; the `post-lock-guard` allowlist covers them identically to §4.4.1.

### 4.5 What Is Prohibited Post-Lock (NO EXCEPTIONS)

The following changes are blocked by CI and, should they somehow land, trigger immediate paper retraction:

1. **Any edit to `src/`.** Bug fixes included. If a critical defect is found, the response is an OSF amendment (§4.4.2), not a silent patch.
2. **Any edit to `pre_reg_constants.yaml`.** Changing a threshold mid-tournament is the canonical example of the pre-registration failure mode this entire phase exists to prevent.
3. **Any edit to `schema/`.** Schema evolution constitutes a silent breaking of reproducibility guarantees.
4. **Rebasing, squashing, or rewriting history at or before `v1.0.0-mstar-lock`.** The tag's SHA must remain stable for the lifetime of the project.
5. **Deleting any file under `evaluation/forecasts/`.** Write-once semantics are enforced by filesystem-level tests in CI.
6. **Swapping `M★` for another model mid-tournament**, even if a shadow model (M1/M3) outperforms. This is restated here for completeness of the post-lock prohibition list; the underlying rule is Phase 7 §6.3.

### 4.6 Hotfix Protocol (Used Only In Catastrophic Defect Scenarios)

If — and only if — a defect is discovered post-lock that causes `market_pipeline.py` to crash or to produce provably incorrect output (e.g., negative probabilities), the following procedure is invoked:

1. The live site is taken offline. No new forecasts are emitted until the hotfix lands.
2. A minimal patch is written on a `hotfix/{issue-id}` branch.
3. An OSF amendment is drafted **and minted** before the patch is merged, documenting the bug, the diff, and its effect on already-emitted forecasts.
4. The patch is merged behind a new tag `v1.0.1-mstar-lock` whose message links to the amendment DOI.
5. The paper's methods section is appended with a subsection titled *"Post-registration amendments"* quoting each amendment DOI.
6. Already-emitted forecasts are **not retroactively corrected**. The affected period is flagged in the forecast log via a `corrections.jsonl` record with reason code `CORR_HOTFIX`.

The hotfix protocol is a pre-registered escape valve, not a license to tune. Invocation without a crash-class bug is treated as a violation of the registration.

### 4.7 Acceptance Criteria (§4)

- [ ] `v1.0.0-mstar-lock` tag exists on the remote, is signed, and its signature validates against the registered key.
- [ ] `git show v1.0.0-mstar-lock` produces a tag message containing the OSF DOI and the data snapshot SHA verbatim.
- [ ] Branch protection rules on `main` are configured per §4.2; a test PR that modifies `src/` is blocked by CI with the expected `post-lock-guard` failure.
- [ ] A synthetic test commit that adds a single new Parquet file under `data/snapshots/` passes CI end-to-end.
- [ ] `forecast_log.emit_opening()` on a `HEAD` that is not a descendant of the tag raises `PostLockHistoryViolation`; golden test covers this case.
- [ ] `docs/osf_registration_doi.txt`, `evaluation/constants.sha`, and the tag message all agree on the DOI and the YAML SHA (three-way consistency check runs in CI).

---

## 5. Anti-Scope

The following are **explicitly out of scope** for Phase 8. Any request to extend into these areas requires an OSF amendment *before* the extension is implemented.

1. **No model re-selection.** The CV battery in §1 is run exactly once. A second run to "sanity check" the result is prohibited; if the first run crashes, the crash itself is a fatal event requiring investigation, not a silent retry.
2. **No new models introduced.** M0–M3 are the entire roster. Even if a clever new idea emerges on 2026-04-30, it does not enter the battery. It is noted for a potential post-tournament companion paper.
3. **No hyperparameter re-fitting.** Every constant in §2.3 derives from Phases 3–6. Phase 8 transcribes; it does not recompute. If a transcription error is suspected, the fix is to **re-derive from the original phase's calibration script**, not to retune.
4. **No new data sources.** The data corpus underlying calibration is frozen by `data_snapshot_sha`. Adding a new federation's match record post-lock, even if it would expand the corpus beneficially, is blocked.
5. **No changes to Phase 7's test families.** The seven hypotheses in `bias_tests.py` are locked. An eighth "while we're at it" test is not added; the family-wise α budget is spent exactly once.
6. **No OSF edits after mint.** Typos in the README, improved diagrams, clarifying footnotes — none of these are edited on the minted registration. They live in a separate, publicly-linked *companion* OSF component that never claims registration status.
7. **No scope creep into Phase 9 territory.** Post-mortem, post-hoc exploration, and secondary-paper work all happen in a future Phase 9 explicitly not covered here. Any scripting toward that work goes in a separate branch that never touches `main` pre-tournament.
8. **No live site cutover.** The MVP website's public launch is its own pre-tournament milestone and is **not** bundled into the lockdown. Launch gates on the tag being live but does not require new code beyond Phase 6 / Phase 7.
9. **No retroactive Phase 4 rewrites.** The Phase 4 design document describes the preview crowning of M2. Phase 8 supersedes it for authoritative purposes, but the Phase 4 document is **not** edited — it stands as a historical record of the investigation. The relationship is documented in §1.1 of this document.

---

## 6. Global Acceptance Criteria (Phase 8 as a whole)

The phase is **complete** when all of the following hold simultaneously:

- [ ] §1 (CV Battery), §2 (YAML Freeze), §3 (OSF Submission), §4 (Git Tag) each pass their local acceptance criteria.
- [ ] `v1.0.0-mstar-lock` points to a commit whose tree contains a sealed `pre_reg_constants.yaml` with `meta.pre_registration_status == "LOCKED"`.
- [ ] OSF Frozen Registration is minted with public visibility on or before **2026-04-25 23:59 UTC** (April 25 live MVP website launch).
- [ ] Three independent reproductions (three fresh clones on three different machines, ideally three different operating systems) can: (a) check out `v1.0.0-mstar-lock`, (b) run `src/calibration/run_cv_battery.py`, (c) obtain a `cv_battery_result.json` that is byte-identical to the OSF-registered copy.
- [ ] The `post-lock-guard` CI check is live and has blocked at least one intentional test-violation PR (documented in `.github/guard_test_pr.md`).
- [ ] Every downstream module (Phase 5 match_model, Phase 6 market_pipeline, Phase 7 forecast_log and evaluation_dashboard) reads its constants from the sealed YAML at import time; this is asserted by an integration test that mutates the YAML and observes every dependent test failing with the expected `ConstantsMismatchError`.
- [ ] The paper's methods section references the OSF DOI and the `v1.0.0-mstar-lock` SHA by name; a lint check in the manuscript build rejects any PR whose methods section lacks both strings.
- [ ] A one-page **Lockdown Certificate** is generated at `docs/lockdown_certificate.pdf` containing the DOI, tag SHA, YAML SHA, data SHA, CV-battery winner, and the signed author statement *"To the best of my knowledge, the pre-registration is complete and no post-hoc modifications have been made."*

---

## 7. Implementation Order (hand to coding agent)

1. `src/calibration/run_cv_battery.py` — produces the CV-battery artifacts that feed the YAML.
2. `src/lockdown/seal_constants.py` — validates and seals `pre_reg_constants.yaml`; depends on artifacts from step 1.
3. **OSF project creation and upload** — manual workflow, scripted only for idempotent SHA verification (`src/lockdown/osf_verify.py`).
4. Final freeze commit (§4.2.2) and signed tag (§4.2.3) — strictly after the OSF DOI is in hand.
5. `post-lock-guard` CI workflow — implemented and enabled on `main`; a violation test PR demonstrates it works.
6. `forecast_log` patch for `PostLockHistoryViolation` — appended to the existing Phase 7 module; backward-compatible golden-test addition.
7. Lockdown Certificate generator (`src/lockdown/make_certificate.py`) — consumes the sealed YAML and the tag to produce the final PDF.

Each step is gated by the prior. Do not parallelize. Do not attempt to mint the OSF registration before the CV battery has completed, and do not push the tag before the OSF DOI exists.

### 7.1 Operating Principles for the Coding Agent

1. If any step's acceptance criterion is red, **stop**. Do not proceed to the next step. Surface the failure before taking any further action.
2. When a command in this document prescribes a specific flag (e.g., `git tag -s`), the flag is mandatory. Do not substitute `-a` for `-s`.
3. If a required value is missing (e.g., OSF DOI not yet minted), halt and raise the question. Never fabricate a placeholder DOI.
4. Every action taken must be reversible **only** up to the point it is listed as irreversible in §0.1. Once the OSF Frozen Registration is minted, nothing above that point is undoable.
5. Stop and surface any ambiguity against §5 Anti-Scope before expanding scope. Anti-Scope is the first thing to check, not the last.

---

*End of Phase 8 Design Document. This document is itself an OSF artifact; upon sealing, it is uploaded to `01_design_documents/Phase8_PreRegistration_MStar_Lockdown_Design.pdf` and its SHA is recorded in the OSF manifest.*
