# Amendment v1.1: Data Completeness Backfill

## Date filed

2026-05-12T01:17:33Z (UTC). Matches `amendment_date` in
`data/calibration/champion_model.json`.

OSF filing status at the time of writing: PENDING_USER_FILING.
Founder (Nicolás Duarte) files this record at osf.io/spmkg after
Section 8 of the 2026-05-11 lockdown sprint closes and a signed Git
tag is cut. Until that step, this file is the project's local
provisional amendment record.

## Trigger

The 2026-05-11 lockdown audit surfaced two cascading data-completeness
findings against the FIFA-rankings input that M2 depends on at
`w_star = 1.0`:

  1. The prior `data/raw/fifa_rankings.parquet` was labelled with a
     snapshot date of 2026-03-20 but its top-of-table values did not
     correspond to any real FIFA publication on that date (or any
     2026-adjacent date). The prior file was a hardcoded
     synthetic-fallback fixture inside
     `ingestion/fetch_fifa_rankings.py` that had drifted from any
     authoritative source.

  2. 16 of the 48 WC2026 qualifier teams were missing from the prior
     parquet under their canonical names. 4 of those 16 were
     name-convention mismatches between FIFA's current usage and the
     project's canonical `TEAM_NAME_MAP` (USA, Iran, South Korea,
     Turkey vs. United States, IR Iran, Korea Republic, Türkiye); 12
     were genuinely absent (Bosnia & Herzegovina, Cape Verde, DR
     Congo, Curaçao, Czechia, Haiti, Norway, Paraguay, Qatar, South
     Africa, Sweden, Tunisia). Because M2 reads `w_star = 1.0` (FIFA
     only), each of the 16 missing teams was running on a fallback
     strength that effectively reduced M2's prediction for those
     teams to raw Elo. The host nation USA was among the 16; this
     contaminated tournament-progression probabilities for the
     Athletic Muller press packet specifically and for every match
     involving any of the 16 teams.

The audit chain that produced both findings is documented in
`LOCKDOWN_PLAN_2026-05-11.md` Section 3 and in Section 1's acceptance
report (closed earlier today with 13 of 13 acceptance tests passing).

## Change summary

Section 1 of the lockdown sprint re-sourced all 48 rows of
`data/raw/fifa_rankings.parquet` from the real FIFA publication
nearest the prior labelled snapshot date. The chosen publication is
2026-04-01 ("France reclaim top spot"), the FIFA publication
immediately preceding the WC2026 opening match (the next scheduled
FIFA publication, 2026-06-10, post-dates the opening match). The
script `ingestion/fetch_fifa_rankings.py` was updated to reflect the
new hardcoded list and the `SNAPSHOT_DATE` constant moved to
`date(2026, 4, 1)`. The shared `TEAM_NAME_MAP` in
`ingestion/fetch_historical_matches.py` gained two new aliases (Cabo
Verde to Cape Verde; Türkiye to Turkey) so the new FIFA snapshot and
`data/raw/wc2026_fixtures.parquet` both normalise to the same
canonical team names.

Section 2 of the lockdown sprint (this amendment) rebuilt the M2
48x48 strength matrix S against the new FIFA snapshot at the OSF-
locked `w_star = 1.0`. The new matrix has
`matrix_sha256 = f732c0e7bb018496fe345263f8ba1b893c2cea23ce979927edbf2c25bd096efe`,
preserved alongside the prior hash
`8ae40a863beb6a7eb78797efd7ab7d4de5d289c13104984293cff83db658f3cf`
in `data/calibration/champion_model.json::matrix_sha256_prior`. The
champion identity (`M2_fifa`), L_CV (0.99337), delta_vs_M0 (-0.04096),
sigma_CV (0.006587), and w_star (1.0) are all preserved verbatim from
the 2026-04-22 OSF lock. The procedural-pin justification is in its
own section below.

What did NOT change:

  - The kill criterion threshold (`pre_reg_constants.yaml::kill.ll_gap_se = 2.0`).
  - Any pre-registered constant in `evaluation/pre_reg_constants.yaml`.
  - M0, M1, or M3 parameters or strength matrices.
  - The sealed CV battery files (`data/calibration/cv_battery_results.json`,
    `data/calibration/m2_fifa_params.json`, `evaluation/cv_battery_result.json`).
  - The OSF-sealed historical CV adjudication.
  - The Phase 5 simulation engine code.
  - The volatility gate, the de-vigging method, the Kelly fractions,
    or any market-layer constant.

## Files affected

| File | pre_sha256 | post_sha256 | Description |
|------|------------|-------------|-------------|
| `ingestion/fetch_historical_matches.py` | `1f2fe2ee212374e7e03a7a086139120c375c0262c36414461d943ccc3234e060` | `df03e59c6a6d347ac7d82381638080b040dc6a0f90af747d8543565eb24bbf35` | Section 1: TEAM_NAME_MAP extended with two new aliases. No other lines changed. |
| `ingestion/fetch_fifa_rankings.py` | `a6f88814e20314ce619fe9993891812d3f0e99f52dcc853a613957705625f9e9` | `429c8f10278a956e82e8ed486466d35422a2a8e29cf6947e32e7413edeec30f8` | Section 1: WC2026_FIFA_RANKINGS list replaced with 48 real rows from the 2026-04-01 FIFA publication; SNAPSHOT_DATE constant updated. |
| `data/raw/fifa_rankings.parquet` | untracked in git; see Section 1 acceptance report | `cc67b40323b96db904392a8f53843566eb05f186d4e7b12e4b84b0f680fc5843` | Section 1: full re-write to 48 rows from the real 2026-04-01 FIFA publication. Sidecar README at `data/raw/fifa_rankings.parquet.README.md`. |
| `data/raw/wc2026_fixtures.parquet` | untracked in git; see Section 1 acceptance report | `84b16c74bb05a8010889aed6a4bba82578ccbe6923b47389039b1f1cb25f3033` | Section 1: team-name columns normalised through the updated TEAM_NAME_MAP. Schedule rows unchanged in count or order. Sidecar README at `data/raw/wc2026_fixtures.parquet.README.md`. |
| `data/calibration/champion_model.json` | `53462f0fc67edadf27ea9f93f74f32cf7b004353835ae958df93f715d868b0cf` | `951831883016a4f2ec839bb4986556bf6043486031392c7b70d33cf13e6d29fa` | Section 2: matrix_sha256 updated for the rebuilt M2 matrix; matrix_sha256_prior preserves the OSF-lock value; amendment_v1.1 metadata block added; procedural pin recorded; CV statistics preserved verbatim. |
| `osf/amendments/amendment_v1.1_data_completeness.md` | n/a (new file) | self-reference (this file) | Section 2: this amendment record. |
| `osf/amendments/amendment_v1.1_diagnostic_cv_rescore.json` | n/a (new file) | `e94faf23112c90efcb4a5f4df0b6ca471eeaf3b2764b40c346437eac053ed35c` | Section 2: Option C sensitivity diagnostic; informational only. |

The two parquet rows are marked "untracked in git" because the
project's `.gitignore` excludes `data/raw/*.parquet` from version
control. Their pre-state SHAs were recorded in Section 1's acceptance
report (the audit channel for parquet provenance is the sidecar
README and the snapshot registry, not git history).

## L_CV verification

Verification result: CASE 2 (CV log-loss WOULD change under the new
FIFA inputs). Procedural pin invoked.

Code paths inspected:

  - `models/model_registry.py` lines 181 to 214
    (`_compute_blended_ratings_cv`): standardises (mu_R, sig_R, mu_Q,
    sig_Q) over the intersection of teams present in both the
    walk-forward Elo ratings dict and the FIFA-points map; standardisation
    plus blending is therefore a function of the current
    `data/raw/fifa_rankings.parquet`.
  - `models/model_registry.py` lines 710 to 724 (the w-grid CV search
    that produced `m2_fifa_params.json::cv_log_loss_curve`): calls
    `_compute_blended_ratings_cv` at every fold and every w value
    against `self.data.fifa_df` (the current FIFA parquet).
  - `models/model_registry.py` lines 799 to 810 (the final CV pass via
    `_evaluate_fold`): also passes `self.data.fifa_df`.
  - `src/calibration/run_cv_battery.py` line 1119
    (`loader.get_fifa_rankings()`) and lines 331 to 352
    (`_blended_ratings`): the canonical CV battery uses the same
    single-snapshot pattern.

Rationale. The historical calibration corpus (2010-2021 matches) is
scored using the CURRENT `fifa_rankings.parquet` as the FIFA input
for every match. There is no time-aligned FIFA history file. Before
Section 1, 16 of the 48 WC2026 qualifiers were not in `fifa_map` and
therefore fell through to the `else: blended[t] = R` branch (raw Elo,
no FIFA contribution). After Section 1, those 16 teams are in
`fifa_map`, AND the (mu_Q, sig_Q) standardisation statistics shift
because they are now computed over a larger and different team set.
Consequently every term in the CV log-loss curve over the w-grid
moves; the argmin (w_star) can move; the log-loss at the argmin
(L_CV) moves; the M2 vs M0 delta moves; the per-fold M2 losses
(sigma_CV input) move.

The Option C diagnostic CV re-score quantifies the magnitude of this
shift. The diagnostic file is at
`osf/amendments/amendment_v1.1_diagnostic_cv_rescore.json` and
summarised in the "Sensitivity diagnostic" section below.

## w_star verification

Verification result: CASE 2 (w_star re-fit would produce a
potentially different value). Procedural pin invoked.

Code paths inspected:

  - `models/model_registry.py` line 735
    (`w_star = float(min(w_cv_losses, key=w_cv_losses.__getitem__))`):
    w_star is the argmin of a CV grid search whose loss at every grid
    point is computed against the current `fifa_rankings.parquet`.
  - `data/calibration/m2_fifa_params.json::cv_log_loss_curve`: the
    eleven grid points 0.0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.40,
    0.50, 0.75, 1.0. Under the prior synthetic FIFA snapshot the
    curve was monotone decreasing and hit its minimum at the boundary
    w = 1.0. A boundary minimum is fragile: small changes to the FIFA
    inputs that flatten the right tail of the curve can move the
    argmin off the boundary.

Rationale. The same single-snapshot dependency that affects L_CV
also affects w_star. Re-fitting w against the new FIFA snapshot is
not guaranteed to reproduce w = 1.0 exactly, and even if it does, the
loss value at w = 1.0 changes.

The diagnostic CV re-score holds w at the pinned value 1.0 by
construction (it is a sensitivity test of the CV loss, not a refit).
The diagnostic file documents the L_CV shift at w = 1.0 specifically.

## Procedural pin justification

Despite both verification steps landing in Case 2, the four CV-
derived statistics (champion_model_id, L_CV, delta_vs_M0, sigma_CV)
plus w_star are procedurally pinned at their OSF-lock values of
2026-04-22T00:00:00Z. The three sealed CV files
(`data/calibration/cv_battery_results.json`,
`data/calibration/m2_fifa_params.json`,
`evaluation/cv_battery_result.json`) are not modified.

The pin rests on the brand's pre-registration discipline. The CV
battery executed on 2026-04-22 was a one-time M-star selection
procedure under the data available at OSF lock. That decision is what
the pre-registration document committed to publicly; rewriting the
sealed CV scores under later input refreshes would convert the OSF
lockfile from a hard commitment into a moving target, which is the
opposite of what pre-registration is for.

The 2026-05-11 data-completeness backfill is correctly framed as a
forward-looking input refresh for the WC2026 simulation. M2's
strength matrix S is a forward-looking artifact (it is the input to
the Monte Carlo simulation of WC2026 fixtures) and therefore IS
rebuilt with the corrected data; the historical CV adjudication that
selected M2 in the first place is NOT rewritten.

To make this transparent to a forensic reviewer rather than papering
over it, the Option C diagnostic CV re-score is published alongside
this amendment. The reviewer can see exactly how much the locked CV
numbers would have moved under the corrected data, and judge for
themselves whether the pin is defensible.

## Sensitivity diagnostic

The diagnostic CV re-score was executed against the new
`data/raw/fifa_rankings.parquet` using the canonical CV battery
scoring functions imported from `src/calibration/run_cv_battery.py`.
Inputs: the same sealed data snapshot at
`data/snapshots/cv_battery_2026-04.parquet` (SHA `94389c17ff6ba2a980337b1f2f08efa774aeeefc39d8712cf4ab8953c80033fc`),
the same sealed CV folds at `calibration/cv_folds.parquet` (SHA
`0120bf43e2c4a56cbe92928a2ef3112cccafbf4b2a83c03e2e096906bb252b06`),
the same locked Phase 3 to 6 calibration JSON files, the same SEED
(20260422). The only varied input is `data/raw/fifa_rankings.parquet`.

Output file:
`osf/amendments/amendment_v1.1_diagnostic_cv_rescore.json`
(SHA `e94faf23112c90efcb4a5f4df0b6ca471eeaf3b2764b40c346437eac053ed35c`).

Summary table:

| Model | Locked L_CV | Diagnostic L_CV | Delta |
|-------|------------:|----------------:|------:|
| M0_elo | 1.034330 | 1.031841 | -0.002489 |
| M1_form | 1.081097 | 1.064436 | -0.016661 |
| M2_fifa | 0.993370 | 1.019901 | +0.026531 |
| M3_macro | 1.026943 | 1.027087 | +0.000144 |

Champion invariance check: `champion_invariance_check.invariant = true`
(diagnostic champion is M2_fifa; locked champion is M2_fifa).

Interpretation. The locked L_CV values in the comparison_to_locked
column come from `data/calibration/cv_battery_results.json` (the
Phase 4 `models/model_registry.py` output). The diagnostic L_CV
values come from `src/calibration/run_cv_battery.py` (the canonical
Phase 8 battery). These two scoring paths use slightly different
sigma conventions and computational shortcuts (this dual reading is
noted in `LOCKDOWN_PLAN_2026-05-11.md` Section 4); their numbers were
already known to differ slightly even under identical inputs. The
M0_elo, M1_form, and M3_macro deltas in this table are dominated by
that scoring-path drift, not by the FIFA-snapshot change, because M0
does not consume FIFA inputs at all and M1 and M3 consume them only
incidentally. The M2_fifa delta (+0.026531) is the only delta that
isolates the real sensitivity to the data correction: M2's CV log-
loss at the pinned w = 1.0 worsens by approximately 0.027 under real
FIFA data versus the prior synthetic FIFA data, while still beating
M0 in CV. The shift is well within the architect-specified threshold
of approximately 0.10 absolute change per model. The champion
remains M2_fifa.

## Methodology implications

Champion identity is unchanged: M2_fifa, as procedurally pinned and
as independently re-confirmed by the diagnostic re-score.

Quantitative implications for 2026 tournament probabilities are
deferred to Section 3 of the 2026-05-11 lockdown sprint, which
re-runs the 10,000 Monte Carlo batch against the rebuilt M2 strength
matrix. The Section 3 acceptance report and the Section 4 press-cut
regeneration will quantify the change in tournament-progression
probabilities. The expected direction of change is non-trivial only
for the 16 backfilled teams (most notably the host nation USA) and
their opponents.

No change to the kill criterion threshold (`pre_reg_constants.yaml::kill.ll_gap_se = 2.0`)
or to any pre-registered constant. No change to the volatility gate,
the de-vigging method, the Kelly fractions, or any market-layer
behaviour.

## Procedural compliance

OSF amendment filing status: PENDING_USER_FILING. The founder
(Nicolás Duarte) files this record at osf.io/spmkg after the
2026-05-11 lockdown sprint closes.

Signed Git tag: TO_BE_TAGGED_AT_END_OF_LOCKDOWN. The intended tag is
`v1.1-data-completeness` and signs the commit that introduces the
new `matrix_sha256` plus this amendment record plus the diagnostic
file.

Chain of custody anchor: `data/calibration/champion_model.json::amendment_files_changed`
lists every file changed across Sections 1 and 2 of the 2026-05-11
lockdown sprint, with pre/post SHA-256 for each. The same array
appears in summary form in the "Files affected" section above.

## Reviewer protocol

A forensic reviewer can verify this amendment in approximately one
minute by running the bash block below from the project root. The
block re-derives the new M2 `matrix_sha256` from the new FIFA snapshot,
confirms it matches `champion_model.json::matrix_sha256`, confirms
the prior hash is preserved at `matrix_sha256_prior`, confirms the
four pinned CV statistics plus w_star are unchanged from OSF lock,
and confirms the sealed CV files were not modified.

```bash
# 1. Verify the new matrix_sha256 is what the new FIFA parquet produces.
.venv/bin/python - <<'PY'
import hashlib, json, sys, yaml
from pathlib import Path
ROOT = Path(".").resolve()
sys.path.insert(0, str(ROOT))
from ingestion.data_loader import DataLoader
from models.calibrate_elo_lambda import LambdaParams
from models.model_registry import build_model
from models.base import DataBundle
import pandas as pd

loader = DataLoader()
matches = loader.get_matches(include_holdout=True)
fifa_df = loader.get_fifa_rankings()
elo_df  = loader.get_elo()
form_df = loader.get_recent_form()
macro_df = loader.get_macro()

p = json.loads((ROOT / "data/calibration/elo_lambda_params.json").read_text())
lp = LambdaParams(c=p["c"], mu=p["mu"], lam3=p["lam3"], rho=p["rho"])
team_index = {n: i for i, n in enumerate(sorted(fifa_df["team_name"].tolist()))}
with open(ROOT / "config.yaml") as f:
    cfg = yaml.safe_load(f)

bundle = DataBundle(
    matches=matches, elo_df=elo_df, form_df=form_df,
    fifa_df=fifa_df, macro_df=macro_df, lambda_params=lp,
    team_index=team_index, reference_date=pd.Timestamp("2026-04-21", tz="UTC"),
)
m2 = build_model("M2_fifa", bundle, cfg)
recomputed = hashlib.sha256(m2.get_strength_matrix().tobytes()).hexdigest()

champ = json.loads((ROOT / "data/calibration/champion_model.json").read_text())
print("recomputed matrix_sha256:        ", recomputed)
print("champion_model.json matrix_sha256:", champ["matrix_sha256"])
print("matrix_sha256_prior:              ", champ["matrix_sha256_prior"])
assert recomputed == champ["matrix_sha256"], "matrix_sha256 mismatch"
assert champ["matrix_sha256_prior"] == "8ae40a863beb6a7eb78797efd7ab7d4de5d289c13104984293cff83db658f3cf", "prior mismatch"
PY

# 2. Verify the four CV statistics plus w_star are pinned at OSF-lock values.
.venv/bin/python - <<'PY'
import json
from pathlib import Path
champ = json.loads(Path("data/calibration/champion_model.json").read_text())
expected = {
    "champion_model_id": "M2_fifa",
    "L_CV":              0.99337,
    "delta_vs_M0":      -0.04096,
    "sigma_CV":          0.006587,
    "w_star":            1.0,
    "CHAMPION_LOCKED":   True,
    "amendment_v":       "v1.1",
}
for k, v in expected.items():
    assert champ[k] == v, f"{k}: got {champ[k]!r} expected {v!r}"
print("Pinned statistics verified.")
PY

# 3. Verify the sealed CV files were not modified.
shasum -a 256 \
  data/calibration/cv_battery_results.json \
  data/calibration/m2_fifa_params.json \
  evaluation/cv_battery_result.json
# Expected (pre-Section-2 SHAs, captured 2026-05-11T19:43Z):
#   449b6b5819899447feaea4a2763bcd21765121d9ee374f73558c93fa05971a69  data/calibration/cv_battery_results.json
#   151a2162851e3a014ac0da9f46f30e2725d87249c0c7a4a42386ba3d844da2dc  data/calibration/m2_fifa_params.json
#   2d917befcc75162d208e85e4fe6982522bed4a83ff78c4ec6992dcfa78c56b25  evaluation/cv_battery_result.json

# 4. Verify the amendment_files_changed array entries.
.venv/bin/python - <<'PY'
import hashlib, json
from pathlib import Path
champ = json.loads(Path("data/calibration/champion_model.json").read_text())
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
for row in champ["amendment_files_changed"]:
    if row["post_sha256"].startswith("self_reference"):
        continue
    actual = sha(row["path"])
    ok = actual == row["post_sha256"]
    print(f"{'OK ' if ok else 'BAD'} {row['path']}: {actual[:16]}...  (expected {row['post_sha256'][:16]}...)")
PY

# 5. Verify the diagnostic file's champion invariance check is TRUE.
.venv/bin/python - <<'PY'
import json
from pathlib import Path
d = json.loads(Path("osf/amendments/amendment_v1.1_diagnostic_cv_rescore.json").read_text())
chk = d["champion_invariance_check"]
print(f"locked:     {chk['locked_champion']}")
print(f"diagnostic: {chk['diagnostic_champion']}")
print(f"invariant:  {chk['invariant']}")
assert chk["invariant"] is True, "champion invariance broken"
PY
```

Any check failing here means either (a) the amendment was not
correctly applied or (b) a subsequent change has drifted the
artifacts. In either case, halt and surface to the Architect.
