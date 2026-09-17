# Amendment v1.2: Evaluation Reporting Corrections

## Date filed

2026-09-07 (UTC).

OSF filing status at the time of writing: PENDING_USER_FILING.
Founder (Nicolás Duarte) files this record at osf.io/spmkg. Until that
step, this file is the project's local provisional amendment record.

## Scope, stated first because it constrains everything below

**No sealed statistic changes. This amendment corrects reporting, not
results.** Every number that adjudicated M★ is byte-identical before
and after: `L_CV`, `sigma_CV`, `delta_CV`, `fold_losses`, `brier`,
`rps`, `dm_stat`, `dm_pvalue`, `mean_log_loss`, `se_log_loss`,
`holdout_log_loss`, `m_star_vs_m0_gap_se`, `sanity_gate_passed`,
`champion_model_id`, `matrix_sha256`, `w_star`, `tau_star`, and every
constant in `evaluation/pre_reg_constants.yaml`. The champion is
M2_fifa and remains M2_fifa.

Not modified by this amendment, by rule:

  - `data/calibration/cv_battery_results.json`
  - `data/calibration/champion_model.json`
  - `evaluation/cv_battery_result.json`
  - `evaluation/pre_reg_constants.yaml`
  - `evaluation/frozen_batch.py`
  - `website/public/data/snapshots/**` (all historical snapshots)
  - `website/public/data/latest/evaluation_metrics.json`
  - `osf/amendments/amendment_v1.1_data_completeness.md` and every
    previously filed deviation record, including
    `osf/amendments/deviation_cp-25b_r16_checkpoint_forecast_set.md`,
    which this amendment corrects by citation rather than by edit.

In particular the field name `marginal_gap_se` is **not renamed**. It
is published in dozens of historical snapshots and renaming it would
break the record. What is corrected is the prose and the labels that
describe that field.

## Trigger

An audit of the project's own evaluation reporting on 2026-09-07 found
five reporting defects. Each was reproduced independently from the
sealed artifacts before this record was written; the reproduction table
is in the "Independent verification" section below and in the pull
request that carries this amendment.

The five findings, in order of severity:

  1. **The paper claimed the champion cleared both pre-registered
     conditions; its own sealed artifact says otherwise.**
     `paper/working_paper.md` §6.3 read "M2_fifa cleared both
     pre-registered conditions and was locked as M★". Meanwhile
     `evaluation/cv_battery_result.json::champion_selection` carries
     `"sanity_gate_passed": false` and a `decision_narrative` reading
     "WARNING: sanity gate NOT passed — M★ only 1.75 SE better than M0
     (threshold ≥ 2.0 SE)." Both statements cannot be true. The
     artifact is right.

  2. **The hold-out verification was not independent.** The fifth
     entry of every model's `fold_losses` array in
     `data/calibration/cv_battery_results.json` is numerically
     identical to that model's 2022 hold-out log-loss as reported in
     §6.4. This is by design, not by a serialisation bug: fold 5 of
     `_CV_FOLDS` is the 2022 evaluation window and the fold loop
     deliberately admits hold-out matches into the evaluation set.
     `L_CV` — the statistic that selected M★ — therefore contains the
     hold-out, and so does the grid search that selected `w_star`.
     Additionally, the same artifact records a `null` second fold: the
     Phase 4 battery ran on four folds, not the five the methodology
     describes.

  3. **Two published standard-error figures carry names that do not
     describe what they compute.** Neither 6.22 nor 1.75 is a paired
     difference. Both divide the M2-vs-M0 gap by a dispersion of M2
     alone.

  4. **The public badge rests on the weaker figure, and the component
     comment justified that with a false claim.**
     `KillCriteriaPill.tsx` asserted that "the marginal SE is the
     pre-registered LOCKED criterion". `evaluation/pre_reg_constants.yaml`
     seals no SE construction, and the only implementation of the
     criterion uses a paired per-match SE.

  5. **The two-condition gate is described but not implemented.** The
     second condition is computed, logged and serialised; nothing
     consumes its result.

## Independent verification

Every figure below was recomputed from the sealed artifacts before any
file was edited.

| Check | Source | Recomputed | Verdict |
|---|---|---|---|
| `\|delta_CV\|/sigma_CV`, M2_fifa | `data/calibration/cv_battery_results.json` | 0.040960 / 0.006587 = 6.21830879 | matches published 6.22 |
| mean of non-null `fold_losses` vs `L_CV`, all four models | same | identical to 6 dp in all four | confirmed |
| 5th `fold_losses` entry vs §6.4 hold-out LL, all four models | same + `paper/working_paper.md` §6.4 | identical in all four (M2 0.987659, M3 0.997438, M0 1.018142, M1 1.101231) | confirmed |
| `sigma_CV` = `np.std(non-null folds, ddof=1)` | `models/model_registry.py:822` | reproduces all four to 6 dp | confirmed; no √n |
| `sanity_gate_passed` | `evaluation/cv_battery_result.json` | `false` | confirmed |
| `m_star_vs_m0_gap_se` vs (mean_LL_M0 − mean_LL_M2)/se_log_loss_M2 | same | 0.031684934 / 0.018086716 = 1.7518345627380938; equals the stored field to < 1e-12 | exact identity |
| `se_log_loss` = sd(`fold_log_losses`, ddof=1)/√5 | same | exact in all four models | confirmed |
| paired SE on `fold_log_losses` | same | d̄ = −0.031684934, sd(d, ddof=1) = 0.031565288, se = 0.014116426, \|d̄\|/se = **2.2445** | above the 2.0 bar |
| `se_for_gate` is the champion's own SE | `src/calibration/run_cv_battery.py:616-618` | `champ_se = cv_agg[champion_id]["se_log_loss"]` | confirmed; not an SE of a difference |

## Finding 1: the paper contradicted its own artifact

**Status: CONFIRMED.**

Evidence: `paper/working_paper.md` §6.3 (pre-amendment text quoted
above) against `evaluation/cv_battery_result.json` lines 103-105.

Correction: §6.3 now states that M2 cleared the first condition only,
that the margin condition failed at 1.75 SE against a 2.0 SE bar, that
the gate recorded the failure, and both reasons the champion was
retained — the pre-registered `pivot_paper_framing` action, and the
implementation gap in Finding 5. The abstract carries the same
correction in one clause.

The published figure was not softened. The correction makes it worse
for the project, not better: the gate's own verdict was recorded on a
denominator that is not the pre-registered construction, and the
corrected construction (Finding 3) puts the gap on the bar rather than
clear of it.

## Finding 2: the hold-out verification was not independent

**Status: CONFIRMED, and the mechanism is by design, not a bug.**

Two explanations were possible and were resolved against the code
rather than assumed:

  - **(A) By design.** The 2022 hold-out is one of the folds, so `L_CV`
    includes it.
  - **(B) By plumbing.** A serialisation bug wrote the hold-out value
    into the fold array without it entering the mean.

**The answer is (A).** The evidence chain:

  1. `models/model_registry.py:53-59` defines `_CV_FOLDS`. The fifth
     entry is `("2021-12-31", "2022-01-01", "2022-12-18")`, commented
     `# fold 5: 2022 WC`.
  2. `models/model_registry.py:787-792` builds each fold. Training is
     `matches[(matches["date"] <= cutoff) & (~matches["is_holdout"])]`;
     evaluation is selected on the date window **alone**, with no
     hold-out exclusion. The comment on line 788 is explicit: "Eval
     uses all matches in the window (holdout allowed in eval — see
     §6.3.1)".
  3. The 2022 evaluation window contains exactly the 64 hold-out
     matches and nothing else. Verified against
     `data/raw/historical_matches.parquet`: the corpus has no other
     2022 fixtures, because `ingestion/fetch_historical_matches.py:68-83`
     admits no tournament that played in 2022 other than the World Cup.
  4. `models/model_registry.py:820-821` computes
     `scores[mid] = np.mean(valid_folds)` over the non-NaN folds, which
     includes fold 5.
  5. `models/model_registry.py:1103` writes that structure to
     `data/calibration/cv_battery_results.json` via `export_cv_report`.

There is therefore no serialisation bug to report. There is a
selection-leakage finding.

**Severity, stated in two parts because they differ.**

The loss values themselves are clean. Every fold trains on
`~is_holdout`, so no model was ever fitted on a 2022 result;
0.987659 is a genuine out-of-sample loss.

Model selection is not clean. `L_CV` selected the champion and `L_CV`
contains the hold-out. So does the M2 blend weight: `w_star` is the
argmin of a grid whose per-`w` CV mean also averages over fold 5
(`models/model_registry.py:710-734`). §6.4 could not be an independent
second surface. This also contradicts the project's own standing rule
in `CLAUDE.md` that the hold-out "must never be used during
calibration".

**Sensitivity.** Recomputing the Phase 4 means without fold 5:

| Model | L_CV (4 folds, incl. hold-out) | L_CV (3 folds, excl. hold-out) | Δ vs M0 excl. |
|---|---|---|---|
| M2_fifa | 0.993370 | 0.995274 | −0.044452 |
| M3_macro | 1.026943 | 1.036778 | −0.002948 |
| M0_elo | 1.034330 | 1.039726 | 0.000000 |
| M1_form | 1.081097 | 1.074386 | +0.034660 |

The ranking is unchanged, so the leakage did not manufacture the
champion. It inflated the appearance of independent corroboration.

**The null fold.** Fold 2 of `_CV_FOLDS` covers 2016-01-01 to
2016-07-10 and the corpus contains no 2016 tournament. The fold is
empty, `models/model_registry.py:794-796` appends `NaN`, and it
serialises as the `null` second element of every `fold_losses` array.
Every Phase 4 mean, standard deviation and delta is over n = 4.

**A genuinely independent 2022 reading does exist** and should have
been the one cited: `src/calibration/run_cv_battery.py` partitions the
283 calibration matches into stratified folds
(`build_stratified_folds`, line 199) and scores the 64 hold-out matches
separately (`run_holdout`, line 543), reporting `holdout_log_loss`.
That path never admits the hold-out into a fold.

Correction: `paper/working_paper.md` §6.4 now describes the actual
construction, the four-fold execution, both severity levels, the
sensitivity table and the independent alternative. §6.2 now
distinguishes the two batteries explicitly. The vault pages carry the
same disclosure.

## Finding 3: two figures with names that do not describe them

**Status: CONFIRMED, and the published explanation of the divergence
was also wrong.**

Neither 6.22 nor 1.75 is a paired difference. Both divide the gap by a
dispersion of M2 alone; neither uses M0's variance and neither uses the
fold-level pairing.

  - **6.22** = 0.040960 / 0.006587, where 0.006587 is `sigma_CV` from
    `data/calibration/cv_battery_results.json`, computed at
    `models/model_registry.py:822` as `np.std(valid_folds, ddof=1)` —
    the standard deviation *between* M2's fold losses, with **no**
    division by √n.
  - **1.75** = 0.031685 / 0.018087, where 0.018087 is `se_log_loss`
    from `evaluation/cv_battery_result.json`, i.e. sd/√5 — the standard
    error of M2's cross-fold **mean**. The gate source is explicit:
    `se_for_gate = champ_se` (`src/calibration/run_cv_battery.py:618`).

They also come from **two different batteries with different folds**,
which is the larger part of the divergence:

| Battery | n | gap | gap / between-fold SD | gap / mean SE | paired |
|---|---|---|---|---|---|
| Phase 4 (`data/calibration/cv_battery_results.json`) | 4 | 0.040960 | **6.22** | 12.44 | 1.96 |
| Phase 8 (`evaluation/cv_battery_result.json`) | 5 | 0.031685 | 0.78 | **1.75** | 2.24 |

M2's between-fold spread is 0.006587 in the Phase 4 tournament windows
and 0.040443 in the Phase 8 stratified folds — a factor of 6.1, because
tournament-window grouping keeps matches clustered by chronological
block and tightens within-fold variance.

**The honest number is neither published figure.** On the paired
construction — the one `evaluation/accuracy_metrics.check_kill_criterion`
implements — the gap is 1.96 on the Phase 4 folds and 2.24 on the
Phase 8 folds. It straddles the 2.0 bar.

**Names adopted.** In place of "marginal SE" and "paired-difference
SE":

  - 6.22 → *the gap in units of the champion's **between-fold standard
    deviation***, short form "between-fold SD reading".
  - 1.75 → *the gap in units of the standard error of the champion's
    **cross-fold mean***, short form "mean SE reading".
  - *paired-difference SE* is reserved for the construction that is
    one: `d_i = ℓ^{M★}_i − ℓ^{M0}_i`, `se = sd(d, ddof=1)/√n`. It names
    the 1.96 / 2.24 figures and the live R16 checkpoint, and nothing
    else.

These names are more exact than the ones suggested when this work was
commissioned ("gap in units of the between-fold deviation of the
champion" and "gap in units of the champion's standard error") only in
that they pin *which* dispersion and *which* battery; the substance is
the same.

**Correction of `deviation_cp-25b_r16_checkpoint_forecast_set.md` by
citation.** That record is filed and is not edited. Section 4, lines
88-89, reads: "the 1.75 SE paired-difference reading in
`evaluation/cv_battery_result.json` or the 6.22 SE marginal reading in
`data/calibration/champion_model.json`". Three corrections apply:

  1. 1.75 is not a paired-difference reading; it is the mean SE
     reading.
  2. 6.22 is not a "marginal" reading in any standard sense; it is the
     between-fold SD reading.
  3. 6.22 does not live in `data/calibration/champion_model.json`. That
     file carries `delta_vs_M0` and `sigma_CV` but no ratio field. The
     6.22 value is published in
     `website/public/data/latest/evaluation_metrics.json` as
     `kill_criteria_check.marginal_gap_se` and hardcoded in
     `website/src/components/editorial/KillCriteriaStatusBlock.tsx`.

Everything else in cp-25b — that the R16 checkpoint's own statistic is
a genuine paired per-match SE, and that it is never numerically
compared to the cross-validation readings — is correct and unaffected.

Correction in code and prose: `evaluation/r16_checkpoint.py`
`_CONSTRUCTION_NOTE` (which propagates into the `construction` field of
every future R16 artifact) now names both readings correctly. The vault
pages, `KillCriteriaStatusBlock.tsx`, `KillCriteriaPill.tsx` and the
`schemas.ts` field comment carry the same correction. Artifacts already
published are untouched.

## Finding 4: the badge rests on the weaker figure

**Status: CONFIRMED as to the false claim. The badge itself is NOT
changed by this amendment — see "Proposed but not executed".**

The claim under audit was the comment in
`website/src/components/primitives/KillCriteriaPill.tsx` that "the
marginal SE is the pre-registered LOCKED criterion".

Verified against `evaluation/pre_reg_constants.yaml`:

  - Line 81: `kill.ll_gap_se: 2.0`
  - Line 116: `kill_criterion.threshold_standard_errors: 2.0`
  - Nothing else. The registration seals a **threshold** and an
    **action** (`kill.action: pivot_paper_framing`). It does not seal an
    SE construction.

Verified against the only implementation,
`evaluation/accuracy_metrics.check_kill_criterion` (lines 648-668):

```python
d = ll_mstar - ll_m0
se = d.std(ddof=1) / np.sqrt(n)
threshold_se = float(_CONST["kill_criterion"]["threshold_standard_errors"])
tripped = bool(d_bar > threshold_se * se)
```

That is a paired per-match SE, which the 6.22 figure is not.

**The comment's claim is therefore false, and it is corrected in this
amendment.** The badge is rendering CLEARED on a figure that is not the
pre-registered criterion, and describing that figure as though it were.

## Finding 5: the two-condition gate is described, not implemented

**Status: CONFIRMED. No binding code path exists.**

The paper (§3 bullet 1, §3 bullet 6, §6.2) described selection as "a
two-condition gate, not a single-criterion ranking… Both conditions
must hold. Failure on either fires the kill criterion."

The implementation:

  - `models/model_registry.py:849`:
    `eligible = [mid for mid in model_ids if scores[mid] < l_m0]`.
    Lowest CV log-loss, no margin term anywhere in rules 1-5.
  - `src/calibration/run_cv_battery.py:613-621` computes
    `sanity_gate_passed`. `champion_id` was assigned at line 601 and is
    not revisited afterwards.
  - On failure, line 623 emits `log.warning(...)`; line 636 appends a
    sentence to `decision_narrative`; line 655 writes the boolean into
    the JSON artifact; line 892 writes a row into the PDF. Execution
    continues. Nothing raises, nothing reselects.
  - A repository-wide search for consumers of `sanity_gate_passed`
    (excluding published snapshots) returns only: the JSON artifact,
    the JSON schema `schema/cv_battery_v1.json`, the amendment v1.1
    diagnostic file, the PDF/console reporting in the same module, and
    four vault MDX pages. No consumer branches on it.

There is no other code path making the second condition binding.

Correction: the paper's description is aligned with the implementation
in §3, §6.2, §6.3 and the new §6.3.1, and the discrepancy is recorded
here. The code is **not** changed: making the gate binding after the
fact would rewrite the adjudication the pre-registration committed to.

## Proposed but not executed

**The kill-criteria badge state is deliberately left as it is.**

`KillCriteriaPill.tsx` currently renders "KILL CRITERION: CLEARED" on
the 6.22 reading whenever the snapshot carries `pre_tournament_locked`
with matches settled. Amendment v1.2 corrects the *terminology* in the
component's comments and aria-labels but changes neither the badge
variant, the visible label text, nor the accent colour of the
`KillCriteriaStatusBlock`. The reasoning:

  - Findings 3 and 4 establish that the badge rests on a figure that is
    not the pre-registered construction.
  - Changing the badge changes what a visitor sees on the vault home.
    That is a maintainer decision about the public face of the project,
    not a reporting correction that an audit can make on its own
    authority.

Three options are on the table for the maintainer:

  1. **Re-anchor to the paired construction.** Publish the paired
     reading (1.96 Phase 4 / 2.24 Phase 8) as the headline figure,
     since it is the only construction the pre-registered criterion is
     implemented on. The badge would still read CLEARED on the Phase 8
     folds (2.24 ≥ 2.0) but would do so on the right statistic, and the
     Phase 4 reading of 1.96 would have to be shown alongside it.
  2. **Demote the badge to a neutral state** that reports all three
     readings without a CLEARED/WARNING verdict, on the grounds that
     the pre-registration never chose a construction and the project
     should not choose one retroactively.
  3. **Leave as is**, with the corrected terminology and an explicit
     on-page note that the badge's figure is not the pre-registered
     construction.

Option 1 is the recommendation of this amendment. It is the only option
that puts the public badge on the statistic the code actually
implements against the sealed threshold.

## Files affected

| File | pre_sha256 | post_sha256 | Description |
|------|------------|-------------|-------------|
| `paper/working_paper.md` | `933f9efa939dc836dcbf7e9fd6aca1c6b71f454368fc1b6c6a5bd7f4ffec8c7c` | `0cab278a5679d4c5520e4084976207b484aa0b8a0da27f443bfd42a23e8f5479` | Abstract, §3 bullets 1 and 6, §6.2, §6.3 corrected; new §6.3.1 (SE decomposition and gate/implementation discrepancy); §6.4 rewritten for hold-out non-independence and the four-fold execution. Prose only; no table value altered. |
| `evaluation/r16_checkpoint.py` | `c033b792a1bfadc1bb0372e9eb31c0372d11100137845d39772e9f2e191551d1` | `f6e35390e3ccd325b5bdef3b5e61084d1995f25dbc4d4585452a6921b59c14d8` | `_CONSTRUCTION_NOTE` string corrected so the `construction` field of future artifacts names both CV readings accurately. No computation changed. |
| `website/src/app/(editorial)/vault/kill-criteria/page.mdx` | `5975afc480bf22ab2d98642a7de02152a050afe40958b987a76e8fab923bb615` | `0de9379fcdebd514a6c37cf748c171bf9dfa2a110b8350dfaa40e0a218905226` | "Dual SE reading" section replaced by "Two SE readings" with the correct decomposition and the paired figures; adjudication-table column relabelled; the 1.49 SE attribution corrected to the Phase 8 file; fold disclosure added. |
| `website/src/app/(editorial)/vault/models/page.mdx` | `80604e78bbaca3950cdc666c69bad9ac0b715661d9cc6d3461816d846bd896c6` | `a7d7c1a306c3c56f0234d14a7710a5e05534be480b631939bf9df46508adbc44` | SE labels corrected; the "different seeds" explanation of the two batteries replaced by the actual difference (fold construction); fold-5 and null-fold disclosure and sensitivity figures added. |
| `website/src/app/(editorial)/vault/preregistration/page.mdx` | `4c74428abd4a8993202ce09f68c663411e791d91af5ac60d50614eb0464da88c` | `b73f0a230b2429662154aeb2503ec8d2f44be56f682798cada22529539fe411a` | SE labels corrected in the dropcap, the M★ section, the kill-criterion constant section and the contingency section. |
| `website/src/app/(editorial)/vault/evaluation/page.mdx` | `2e2b792fa67e27460bf84e4fafeefecd6f9eda2bbb4bc2b7410df607f5c69f72` | `bb571c7d66e19f087e7053722fdfe189bd12c13fa88354082c37c6fb38de815d` | SE labels corrected in the current-state note. |
| `website/src/app/(editorial)/vault/the-45-percent/page.mdx` | `0998c06c5349d8774dd9085df4bf24139a6f5b34b33f1f0261f511a4ec17cd88` | `7b3904fdab70783d05f9a8da25d4c12b550d6ab0d4d5525c430590b25de6115d` | SE labels corrected; paired reading added to the lead essay's findings and honest-claim sections. |
| `website/src/components/editorial/KillCriteriaStatusBlock.tsx` | `59563460834ef23199f1e15bcf4cca8c11086a038700a702251303e13f92fce0` | `b48c10e170b5b5f6c0b85a322077b5643d7aca44892a30748a5907b6726e2201` | Header docblock, badge captions, aria-labels and the connecting status line relabelled. Badge state logic, colours and accent unchanged. |
| `website/src/components/primitives/KillCriteriaPill.tsx` | `b4fd599537c649460e9546c704cd0b6a4c1eb36867d012745c929281117767f3` | `f8738704e4d3950a5b56799f1a692c9ab58d297ffff64e2d4ad1bcd28ef1a1e0` | False "pre-registered LOCKED criterion" claim removed and replaced with the v1.2 caveat; aria-label terminology corrected. Variant, glyph and visible label for every state are byte-identical. |
| `website/src/lib/data/schemas.ts` | `8f3d90d646768b14e1ca1a2a9102a6ade25525fdf0b4c3697148453ebfec607f` | `f88d1a3f691074b5a975c7a78d25c752415d33f055535e4bc1db17dce65db6d1` | Comment on `marginal_gap_se` corrected. **The field name is unchanged**; the comment now records why it is kept. |
| `website/tests/unit/killCriteriaPill.test.ts` | `4691179f3bee43808ca6c36e96f5164e59cac3d14a8487df53d857644319c936` | `e221bc3ac42f0ef01e79a9c328fc57ac0c9b041157aa5905b249cd5166129104` | Three aria-label assertions updated to the corrected terminology; a `not.toContain("paired")` assertion added. All state assertions unchanged. |
| `CHANGELOG.md` | `428aba15e9eb1163bc80016c86295b451333f9e27996698f0b9e2333e1d41fa1` | see repository | Amendment v1.2 entry. |
| `osf/amendments/amendment_v1.2_evaluation_reporting_corrections.md` | n/a (new file) | self-reference (this file) | This amendment record. |

## What changes and what does not

**Changes:** prose in the working paper; prose and labels on six vault
surfaces; two component files' comments, captions and aria-labels; one
Python docstring constant that propagates to future artifacts; one unit
test's string assertions; one schema comment.

**Does not change:** any sealed statistic; any pre-registered constant;
the champion identity; the M2 strength matrix; the frozen batch; any
published snapshot; any previously filed amendment or deviation; the
`marginal_gap_se` field name; the kill-criteria badge state; the
selection code; the gate code.

## Reviewer protocol

```bash
# 1. Confirm no sealed artifact was touched on this branch.
git diff --name-only main...HEAD | grep -E \
  'data/calibration/cv_battery_results\.json|data/calibration/champion_model\.json|evaluation/cv_battery_result\.json|evaluation/pre_reg_constants\.yaml|evaluation/frozen_batch\.py|website/public/data/snapshots/|website/public/data/latest/evaluation_metrics\.json' \
  && echo "SEALED ARTIFACT TOUCHED — REJECT" || echo "OK: no sealed artifact in the diff"

# 2. Confirm the marginal_gap_se field name survives.
grep -c 'marginal_gap_se' website/public/data/latest/evaluation_metrics.json website/src/lib/data/schemas.ts

# 3. Reproduce every figure this amendment asserts.
.venv/bin/python - <<'PY'
import json, math, statistics as st
A = json.load(open('data/calibration/cv_battery_results.json'))
B = json.load(open('evaluation/cv_battery_result.json'))['models']

a2 = [x for x in A['M2_fifa']['fold_losses'] if x is not None]
a0 = [x for x in A['M0_elo']['fold_losses'] if x is not None]
gapA = A['M0_elo']['L_CV'] - A['M2_fifa']['L_CV']
dA = [x - y for x, y in zip(a2, a0)]
print("Phase 4  n =", len(a2), "(of 5 folds; fold 2 is null)")
print("  gap / between-fold SD :", round(gapA / st.stdev(a2), 2), "expect 6.22")
print("  gap / mean SE         :", round(gapA / (st.stdev(a2)/math.sqrt(len(a2))), 2), "expect 12.44")
print("  paired                :", round(abs(sum(dA)/len(dA)) / (st.stdev(dA)/math.sqrt(len(dA))), 2), "expect 1.96")

b2, b0 = B['M2_fifa']['fold_log_losses'], B['M0_elo']['fold_log_losses']
gapB = B['M0_elo']['mean_log_loss'] - B['M2_fifa']['mean_log_loss']
dB = [x - y for x, y in zip(b2, b0)]
print("Phase 8  n =", len(b2))
print("  gap / between-fold SD :", round(gapB / st.stdev(b2), 2), "expect 0.78")
print("  gap / mean SE         :", round(gapB / B['M2_fifa']['se_log_loss'], 2), "expect 1.75")
print("  paired                :", round(abs(sum(dB)/len(dB)) / (st.stdev(dB)/math.sqrt(len(dB))), 2), "expect 2.24")

for m in A:
    assert round(A[m]['fold_losses'][4], 6) == round(
        json.load(open('evaluation/cv_battery_result.json'))['models'][m]['holdout_log_loss'], 6)
print("fold 5 == hold-out LL for all four models: confirmed")

excl = {m: sum(x for i, x in enumerate(A[m]['fold_losses']) if x is not None and i != 4) / 3 for m in A}
print("ranking excluding fold 5:", sorted(excl, key=excl.get))
PY

# 4. Confirm fold 5's evaluation set is exactly the 64 hold-out matches.
.venv/bin/python - <<'PY'
import pandas as pd
df = pd.read_parquet('data/raw/historical_matches.parquet')
df['date'] = pd.to_datetime(df['date'], utc=True)
ev = df[(df['date'] >= pd.Timestamp('2022-01-01', tz='UTC')) &
        (df['date'] <= pd.Timestamp('2022-12-18', tz='UTC'))]
print("fold 5 eval rows:", len(ev), "of which hold-out:", int(ev['is_holdout'].sum()))
assert len(ev) == int(ev['is_holdout'].sum()) == 64
print("confirmed: fold 5 evaluates the hold-out and nothing else")
PY

# 5. Confirm the pre-registration seals no SE construction.
grep -n 'll_gap_se\|threshold_standard_errors' evaluation/pre_reg_constants.yaml

# 6. Confirm nothing branches on the gate result.
grep -rn 'sanity_gate_passed' src/ models/ evaluation/ | grep -v 'log\.\|"sanity_gate_passed"\|PASSED\|FAILED'
```

Check 6 returning only the assignment and the two `if not
sanity_gate_passed:` reporting blocks is the confirmation of Finding 5.
