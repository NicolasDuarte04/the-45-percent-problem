---
title: "The 45% Problem: A Pre-Registered Probabilistic Pricing Framework for the 2026 FIFA World Cup"
author: "Nicolás Duarte"
affiliation: "45 Analytics"
date: "May 2026"
abstract: |
  We present a pre-registered probabilistic framework for the 2026 FIFA World Cup that prices full distributions over match outcomes and tournament progression rather than producing point predictions. The framework's central design choice is procedural: the model specification, the evaluation metrics, and the kill criterion that adjudicates the champion model are sealed on the Open Science Framework (OSF) before any 2026 match is played, locked by an annotated Git tag, and bound to the data via cryptographic hashes. We compare four candidate strength providers (M0 pure Elo, M1 Elo plus exponentially-decayed form, M2 Elo blended with FIFA ranking points via cross-validated shrinkage, M3 Elo with a Bayesian macro prior on the Hoffmann-Ging-Ramasamy variables) on a 2010 to 2021 calibration corpus with the 2022 World Cup as out-of-sample hold-out. The cross-validation battery returns M2 as the locked champion (M★) at log-loss 0.993, with M3 second at 1.027, M0 third at 1.034, and M1 disqualified at 1.081. Hold-out verification returns log-loss 0.988 for M2, 0.997 for M3, 1.018 for M0, and 1.101 for M1, consistent with the cross-validation ranking. The empirical lesson at this corpus size is methodological rather than substantive: a richer model wins only when the added structure is disciplined by shrinkage, not when features are merely layered. The framework is paired with a power-method de-vigging layer (Shin 1993; Štrumbelj 2014) on Pinnacle, Betfair Exchange, and Polymarket data, a five-rule volatility gate that suppresses flagged divergences during named-event windows or microstructure failures, and an evaluation stack that reports Brier score, ranked probability score, log-loss, Diebold-Mariano comparisons, Nyberg market-efficiency tests, and Closing Line Value as the primary diagnostic at small sample size. The framework is publicly accessible at https://45analytics.com.
keywords: ["sports forecasting", "pre-registration", "Bivariate Poisson", "Dixon-Coles", "shrinkage estimation", "market efficiency", "calibration"]
---

\newpage

# Table of Contents

1. The 45% Question
2. Probabilities as the Unit of Analysis
3. Pre-Registration Protocol
4. The Simulation Engine
5. The Four Candidate Models
6. Cross-Validation Battery and M★ Selection
7. The Market Layer
8. The Volatility Gate and Kelly Sizer
9. Evaluation Framework
10. Limitations and Scope
11. References

\newpage

# 1. The 45% Question

Roughly half of FIFA World Cup match-level outcome variance resists explanation by structural variables. Klement and Hoffmann's macroeconomic regressions, Dixon and Coles' (1997) bivariate Poisson treatments, and the rating-system extensions that followed all run into the same constraint. Even with decades of structural covariates, ranking adjustments, and form corrections, somewhere near 45% of the tournament variance is left to chance. The figure is not surprising. Mathematical models fail when isolated from a near-perfect environment, and the World Cup is structurally adversarial: 64 matches, asymmetric stakes, single-elimination from the round of 32 onward, and a calibration corpus measured in hundreds of matches rather than the tens of thousands available in domestic-league forecasting.

The purpose of this project is not to beat the 45% residual. It is the constraint we take seriously. The premise began with a methodological observation: while reviewing the Klement and Hoffmann lineage of papers, model-implied probabilities were consistently mapped against the implied probabilities embedded in bookmaker closing lines. A structural gap appears, persistently, between the two. The project is built on the assumption that there is no perfect system. Bookmakers are efficient on the variables they price; they are not omniscient. They can overvalue public sentiment or undervalue structural data, just as academic models can miss on-the-ground realities. If models genuinely capture some real signal in international tournament outcomes, their probability estimates should systematically diverge from de-vigged bookmaker-implied probabilities in ways that survive honest evaluation. If they do not, the markets are doing better than the models, and that in itself is a finding.

The project's name is a permanent reminder that the work is conducted under that constraint, not pretending to dissolve it.

# 2. Probabilities as the Unit of Analysis

The sports-forecasting public discourse suffers from a point-prediction trap. Pundits pick outright winners; binary outcomes are treated with absolute confidence; a 51% favourite is conflated with a 90% favourite. The same blindness infects model evaluation. A model that simply picks the higher-Elo team in international football clears a 60% baseline of accuracy by construction, but a high hit rate is uninformative about a model's underlying intelligence: the 51% advantage and the 95% advantage collapse into the same "Team X wins" label, and the structural information distinguishing them is destroyed.

Moving to a full probability distribution changes the evaluation surface. Calibration becomes definable. In formal terms, a model is calibrated when $P(Y = 1 \mid \hat{p} = p) = p$: when the model outputs a 70% probability, the event occurs 70% of the time over a large sample of such forecasts. Calibration is a property of a forecaster, not of a single forecast, and it is enforceable through proper scoring rules whose expected value is minimised only when the forecaster reports their true belief. The Brier score, the Ranked Probability Score (Epstein 1969), and log-loss form the metric set this framework reports. They cannot be moved by what the forecaster wants to be true; they only measure what the distribution mathematically claims.

The pre-registered kill criterion described in Section 3 is definable only under this frame. Comparing two models on a 64-match tournament under a point-prediction lens reduces to noting they got similar numbers of matches right, give or take a few; the comparison has no statistical leverage at that sample size. Under a proper-scoring frame, log-loss differences accumulate per probability point, the standard error of the difference is well-defined, and a kill criterion can fire (or not) on quantities that actually carry information. Without probabilities, the rest of this framework would be decoration.

The translation back into the visible product is straightforward. The platform publishes probabilities, not picks. It displays divergences (model probability minus de-vigged market probability), not edges, because the word "edge" implies a tradable claim that this work does not assert. Closing Line Value is computed for every flagged forecast as the running honesty test: if the closing line moves toward the model's probability, the model led the market; if not, it did not.

# 3. Pre-Registration Protocol

The framework is pre-registered on the Open Science Framework on 2026-04-22, the day before the opening match of the 2026 FIFA World Cup. The registration carries DOI `10.17605/OSF.IO/8B5HD` and the canonical URL `osf.io/spmkg`. Pre-registrations on OSF cannot be deleted; they can be amended only by filing a child registration that references the parent and produces a visible fork in the audit trail.

Three independent mechanisms anchor the registration to the artifacts it commits to. Any one is sufficient to detect tampering; the combination is what makes the lock forensically defensible.

First, the OSF record itself, with creation timestamp and immutable canonical URL. Second, an annotated Git tag `v1.0.0-MSTAR-LOCKED` against the project repository, carrying the lockdown date and the OSF URL in its message. The tag is annotated rather than GPG-signed, so it is a convenience pointer and not a cryptographic guarantee; the binding guarantees are the third-party OSF timestamp above and the content hashes below. Third, a sealed `pre_reg_constants.yaml` file at the tagged commit, whose `meta` block carries SHA-256 hashes of (a) the frozen 2026-04 calibration data snapshot, (b) the cross-validation battery report, and (c) the cross-validation results JSON. Together the three SHAs bind the YAML to the data and the results that produced the M★ adjudication.

The registration commits the project to specific values across approximately seventy leaf-level constants. The headline commitments:

- The champion model M★ is selected from the candidate set $\{M_0, M_1, M_2, M_3\}$ by a two-condition gate (lowest cross-validation log-loss, conditional on a pre-registered standard-error margin against M0). Selection uses only pre-tournament data and is completed before the opening match.
- The evaluation metric set is fixed: Brier score, log-loss, Ranked Probability Score as primary calibration measures; Diebold-Mariano (1995) tests with Harvey-Leybourne-Newbold (1997) small-sample correction for pairwise model comparison; Nyberg (2014) likelihood-ratio tests for market efficiency; Closing Line Value as the M★-only edge-detection metric.
- The edge thresholds are sealed: $\varepsilon = 0.03$ on mainline markets (1X2, match winner, group winner, tournament winner) and $\varepsilon = 0.05$ on derivative markets (over/under 2.5, BTTS, correct score, stage of elimination, both teams to score).
- The Volatility Gate's five suppression rules are sealed: a six-hour named-event window, a 3-percentage-point intra-book price-discovery threshold within 30 minutes, a 2.5-percentage-point cross-book spread threshold against Betfair Exchange, a USD 50,000 24-hour Polymarket liquidity floor, and a four-hour Pinnacle staleness ceiling.
- The Kelly fractions are sealed: $\phi = 1/4$ for mainlines (where the de-vigged book probability is at least 0.10) and $\phi = 1/8$ for longshots (below 0.10), with per-market hard caps of 5% (mainline) and 2.5% (longshot), per-event cap 8%, per-day cap 15%, and a drawdown state machine that halves stakes below 80% of peak bankroll and stops at the second drawdown episode.
- The kill criterion is sealed: a two-condition gate on cross-validation log-loss against M0, with the standard-error threshold sealed in `pre_reg_constants.yaml::kill_criterion.threshold_standard_errors`. The pre-registered consequence on firing is `pivot_paper_framing`.

A reviewer with no special access can verify the full chain by navigating to the OSF record, resolving `git rev-list -n1 v1.0.0-MSTAR-LOCKED` and reading the tag message with `git cat-file -p v1.0.0-MSTAR-LOCKED` against the project repository, and computing SHA-256 of the three sealed artifacts to compare against the values in the tagged YAML. A successful match across all three confirms that the sealed constants were computed against the data they claim and that no constant has drifted between registration and publication.

Pre-registration does not commit the framework to being correct. It commits the framework to being honestly evaluated. A pre-registered negative result (kill criterion fires, framing pivots, no edge claim is published) is not a failure; it is the correct outcome of a correctly-run experiment. The framework also does not prevent exploratory analysis. If an unexpected pattern emerges during the tournament, the framework can describe it. The description is then labelled as post-hoc, unregistered, and outside the primary evaluation. Everything in the live ledger is a pre-registered claim; anything else is descriptive.

# 4. The Simulation Engine

Every model in this framework consumes the same simulation engine. What varies between M0, M1, M2, and M3 is not how the engine simulates a match; it is the strength matrix the engine receives. The engine itself is locked.

## 4.1 From Strength Matrix to Goal Rates

For each match between teams with Elo ratings $R_h$ and $R_a$, the engine maps the Elo difference to expected goals via the calibration:

$$\Delta = \frac{R_h + H - R_a}{400}$$

$$\lambda_h = \mu^{*} \cdot e^{\,c^{*} \Delta}, \qquad \lambda_a = \mu^{*} \cdot e^{-c^{*} \Delta}$$

with calibration constants $c^{*} = 0.580386$ and $\mu^{*} = 1.715874$ fit during Phase 3 against the 2010 to 2022 international match corpus. The home advantage term $H$ is set to zero throughout the 2026 simulation: the FIFA 2026 final is played in a single host complex and no genuine venue-level home advantage applies for most of the tournament.

The asymmetry between $\lambda_h$ and $\lambda_a$ is the only place team strength enters the engine. Everything that follows treats $(\lambda_h, \lambda_a)$ as a sufficient statistic for the match.

## 4.2 The Bivariate Poisson Match Model

Goals scored by the two teams in a match show a small positive correlation, partly explained by shared match conditions (weather, refereeing tempo, pitch state) and partly by tactical reactions to score state. To capture that correlation while keeping the model tractable, we adopt the Bivariate Poisson with a common-shock decomposition (Karlis and Ntzoufras 2003):

$$X = W_1 + W_3, \qquad Y = W_2 + W_3$$

where $W_1 \sim \mathrm{Poi}(\lambda_1)$, $W_2 \sim \mathrm{Poi}(\lambda_2)$, and $W_3 \sim \mathrm{Poi}(\lambda_3)$ are independent. Setting $\lambda_3 = 0$ recovers the independent Poisson case (Maher 1982); $\lambda_3 > 0$ shifts probability mass into states where both teams score.

The joint probability mass function is:

$$P(X = x, Y = y) = e^{-(\lambda_1 + \lambda_2 + \lambda_3)} \cdot \frac{\lambda_1^{x}}{x!} \cdot \frac{\lambda_2^{y}}{y!} \cdot \sum_{k=0}^{\min(x,y)} \binom{x}{k}\binom{y}{k} k!\, \left(\frac{\lambda_3}{\lambda_1 \lambda_2}\right)^{k}$$

The shared-shock parameter is locked at $\lambda_3 = 0.10$ throughout the 2026 tournament. The value sits inside the recommended range $[0.05, 0.20]$ from Karlis and Ntzoufras's empirical work on European football and is consistent with the small positive cross-team correlation observed in the project's own 347-match corpus. The PMF is computed once per quantised $(\lambda_1, \lambda_2)$ pair (rounded to four decimal places) and cached, so re-evaluations across thousands of simulations are essentially free. The grid is truncated at ten goals per side; $P(X \geq 10)$ is below $10^{-6}$ for any realistic $\lambda$ value the engine encounters. The inner $k$-sum is computed in log-sum-exp form for numerical stability.

## 4.3 The Dixon-Coles Low-Score Correction

The independent-component Bivariate Poisson under-predicts the empirical frequency of $0$-$0$, $1$-$0$, $0$-$1$, and $1$-$1$ scorelines in international football. Dixon and Coles (1997) addressed this with a multiplicative correction $\tau(x, y)$ that adjusts the joint PMF only at those four low-score cells:

$$\tau(x, y; \lambda_1, \lambda_2, \rho) = \begin{cases} 1 - \lambda_1 \lambda_2 \rho & (x, y) = (0, 0) \\ 1 + \lambda_1 \rho & (x, y) = (0, 1) \\ 1 + \lambda_2 \rho & (x, y) = (1, 0) \\ 1 - \rho & (x, y) = (1, 1) \\ 1 & \text{otherwise} \end{cases}$$

The correction parameter is locked at $\rho = -0.05$. The negative sign shifts probability mass into the four low-score cells the independent model under-counts and out of nearby cells like $(2, 0)$ and $(1, 2)$. The magnitude is the small adjustment standard in Dixon-Coles applications across European leagues.

The engine renormalises the PMF after applying the correction so the cells sum to $1.0$ within $10^{-9}$. Sampling uses Walker's alias method on the flattened 121-cell PMF vector for $O(1)$ draws per match. Match-outcome probabilities are read off the corrected PMF directly: $P(\text{home win})$ is the sum below the diagonal, $P(\text{draw})$ is the diagonal trace, and $P(\text{away win})$ is the sum above the diagonal.

## 4.4 Extra Time and Penalty Shootouts

Extra time is sampled by re-running the same Bivariate Poisson + Dixon-Coles model with damped goal rates. Each team's 90-minute $\lambda$ is multiplied by 0.6 and the result is used as the Poisson mean for the 30-minute extra-time period. The shared-shock $\lambda_3$ is also multiplied by 0.6 for coherence, and the Dixon-Coles correction remains active. The factor 0.6 was chosen empirically from a blend of historical World Cup extra-time data and the Dixon-Robinson (1998) calibration; it is locked in `pre_reg_constants.yaml`.

The shootout model is a sequence of independent Bernoulli kicks with a small Elo-derived skew. The conversion probability for team $A$ kicking against team $B$ is:

$$p^{\text{kick}}_{A} = \mathrm{clip}\!\left( p_{\text{base}} + \kappa \cdot \frac{R_A - R_B}{400},\ p_{\min},\ p_{\max} \right)$$

with $p_{\text{base}} = 0.75$ (the historical World Cup penalty conversion rate, 1982 to 2022), $\kappa = 0.02$ as a deliberately small Elo skew, and clipping bounds $p_{\min} = 0.60$, $p_{\max} = 0.90$. The protocol matches FIFA-compliant shootout rules: five kicks per side strictly alternating, a short-circuit check on insurmountable leads, sudden death after five-each. The engine does not model ABBA shooter ordering, shooter-specific skill, or goalkeeper-specific save rates; shootouts are well-documented as near-random, and the small $\kappa = 0.02$ skew is a deliberate choice not to claim more predictive power than the data supports.

## 4.5 The Monte Carlo Bracket Walker

A single tournament run progresses through three stages and uses a fresh seeded RNG; the same `(model_id, data_hash, seed)` triple reproduces an identical run byte-for-byte.

The group stage splits 48 teams into 12 groups of four (Groups A through L), each playing six round-robin matches for 72 group-stage matches. Tie-breakers within a group apply the FIFA recursive order: points (W=3, D=1, L=0), goal difference, goals scored, head-to-head points among the still-tied subset, head-to-head goal difference, fair-play points, drawing of lots (deterministic from the run seed and logged).

The 2026 format expands the knockout phase to a 32-team Round of 32. Twenty-four slots come from the top two finishers in each group; the remaining eight come from the best third-place finishers across the twelve groups. The Round of 32 cross-group pairings are not procedurally generated; they are fixed by FIFA before the tournament and encoded as a hardcoded tuple of sixteen `R32Slot` records, organised into six zone pairs. The bracket then proceeds R16 → QF → SF → Final, with a separate third-place playoff between the two semifinal losers. Knockout matches cannot end in a draw: extra time and shootouts apply as needed.

A full-tournament simulation completes in approximately 3.5 milliseconds on a single core. A batch of 10,000 runs across all five model variants (M0, M1, M2, M3, M★) takes under 15 minutes wall-clock with `joblib` parallelism. Per-team marginals are computed as simple frequencies across runs:

$$\hat{P}(\text{team } i \text{ champion}) = \frac{1}{N} \sum_{r=1}^{N} \mathbb{1}\{\text{champion}_{r} = i\}$$

with analogous formulas for round-reached probabilities. Confidence intervals follow from the Beta-Binomial conjugate posterior under a flat prior; the live ledger reports the 90% credible interval alongside each marginal.

# 5. The Four Candidate Models

All four candidate models implement the same interface: `get_strength_matrix() -> np.ndarray` of shape (48, 48). The engine consumes the matrix and produces match-level probabilities downstream. The differences between candidates are entirely in how the strength matrix is constructed.

## 5.1 M0: Pure Elo

M0 is Elo, on the project's own walk-forward calibration of international match results: the scale that runs from approximately 1344 to 1730 across the 48 World Cup teams, with engine parameters $c^* = 0.580$ and $\mu^* = 1.716$ calibrated against the 2010 to 2021 corpus. Nothing else. No form decay, no FIFA correction, no macro prior.

The instinct, when reading "the null baseline," is to picture something obviously crippled. Elo is not that. Elo at the right scale already absorbs strength-of-schedule, recency (slowly), and most of the structural information any model in this space has access to. Beating it requires capturing some signal Elo does not, with enough power to clear a confidence interval the data cannot make narrow. M0 is the floor every richer model must clear to earn its complexity.

## 5.2 M1: Elo + Decayed Form

M1 adds an exponentially-decayed form term over a team's last 8 matches with decay constant $\tau$, applied as a recent-form Elo adjustment, capped at $\pm 15\%$ of the long-run Elo to prevent the form term from dominating the strength matrix. The half-life $\tau$ was treated as a tunable hyperparameter, fit on the calibration window via grid search.

The optimiser pinned $\tau$ at the grid boundary at 180 days. That is a diagnostic, not a setting: the optimiser wanted an even longer half-life than the search space allowed, which means the form term was already trying to decay so slowly that it was indistinguishable from the long-run Elo it was meant to refine. The "recent" in "recent form" had no leverage to provide. In a corpus that contains roughly 200 high-stakes matches per team across major tournaments over four years, eight matches is the better part of a decade of football; most of the recency signal the form-decay term was designed to capture has decayed beyond reach by the time the next World Cup arrives.

The cross-validation result was unambiguous. M1's mean CV log-loss was 1.081, against M0's 1.034, an absolute increase of approximately 0.047 in a metric where lower is better. M1 was disqualified per the pre-registered acceptance criteria for being statistically worse than baseline (Diebold-Mariano $p = 0.006$ versus M0).

## 5.3 M2: Elo + FIFA Blend

M2 implements a convex blend $\hat{S}_i = (1 - w) \cdot \text{Elo}_i + w \cdot \text{FIFA}_i$, with the blend weight $w$ optimised via cross-validation on the calibration window. The hypothesis is that FIFA's official ranking, despite well-known weaknesses in its weighting scheme, is computed against a much larger global match dataset than the project's Elo can directly observe; if the 347-match corpus is the binding constraint, FIFA's broader denominator might patch the sparsity at the cost of some methodological coarseness.

The optimiser's answer was as extreme as the search space permitted: $w^{*} = 1.0$. M2 dropped the project's own Elo entirely and ran on the FIFA signal alone. That outcome is itself the most informative result of the four models. The cross-validation procedure had access to the walk-forward Elo, calibrated on a corpus we trust, and chose not to use it. The signal in the project's 347-match Elo, at this corpus size, was less useful for predicting World Cup outcomes than FIFA's broader global ranking.

M2's mean CV log-loss was 0.993, against M0's 1.034, an absolute improvement of approximately 0.041, the largest of the four candidates. By log-loss, M2 is the champion. The pre-registered selection protocol locked M★ to M2 (Section 6).

## 5.4 M3: Elo + Macro Prior

M3 is a direct response to Klement and Hoffmann (and the broader macroeconomic forecasting literature), which argue that structural national variables (GDP per capita, population, climate, host status, tournament history) explain a non-trivial fraction of tournament success. M3 encodes those variables as a weak Bayesian prior on team strength, with confederation-level hierarchy on the prior parameters:

$$\alpha_i \sim \mathcal{N}(\mu_c, \sigma_c^2), \quad c = \text{confederation}(i)$$

with $(\mu_c, \sigma_c)$ allowing UEFA-, CONMEBOL-, and AFC-specific behaviour. The macro coefficient was locked at $\beta = 4.0$ after a sanity check confirmed that the macro signal explained roughly 40% of Elo variance ($R^2 = 0.404$), comfortably above the $\geq 0.30$ threshold the framework required to take the prior seriously at all.

M3 beat M0 in point estimate, with a CV log-loss of 1.027 against M0's 1.034, representing an improvement of approximately 0.007 in log-loss. The gap is real but small and would be unlikely to clear a stringent margin requirement on a 200-match calibration window. The replication note matters here. The Klement-Hoffmann macro thesis was a non-trivial claim in the literature, and it is the closest thing this framework has to a pre-existing hypothesis the work set out to test. M3 is not a refutation. The corpus is too small to refute anything definitively, and the macro signal does explain a substantial share of Elo variance ($R^2 = 0.404$). What can be said is narrower: at this corpus size, with the pre-registered metric, the macro prior did not statistically beat a simpler Elo baseline by a margin that would justify it as the champion. The directional signal survives; the model survives only as an eligible candidate, not as M★.

# 6. Cross-Validation Battery and M★ Selection

## 6.1 Catching a Scale Bug Before the Battery Ran

Before the formal cross-validation ran, a smoke test was executed: 1,000 Monte Carlo simulations on the 2022 World Cup bracket, asking the engine to estimate Argentina's tournament win probability. The realistic acceptance band for a top-tier favourite at a World Cup is between 5% and 15%. The first run produced 25.7%.

The cause was a scale mismatch. The pipeline had been fed raw Elo ratings from a public source, with values in the 1600 to 2163 range, instead of the project's own walk-forward Elo, calibrated on the 1344 to 1730 range. The engine parameters $c^* = 0.580$ and $\mu^* = 1.716$ had been tuned against the narrower internal scale. Against the wider external scale, the math interpreted top teams as far more dominant than they actually were. Argentina became unstoppable. The fix was a one-line data substitution; on the corrected input, Argentina settled at 10.6%, comfortably in the middle of the acceptance band.

The bug never reached the cross-validation battery and never reached production. It is included here not as a war story but as a piece of the methodology: every model's strength matrix is checked against an output sanity band before the formal protocol runs against it. The protocol does not protect a model whose inputs are silently wrong.

## 6.2 The Pre-Registered Protocol

The cross-validation scheme is a stratified k-fold over the 2010 to 2021 calibration window, with 2022 World Cup matches held out as the final exam. The metric is per-match log-loss, averaged across folds, with the standard error of the cross-fold mean reported alongside.

The pre-registered decision rule is a two-condition gate, not a single-criterion ranking. M★ is the candidate with the lowest mean CV log-loss, conditional on the pre-registered standard-error margin against M0. Both conditions must hold. Failure on either fires the kill criterion. The bar is sealed in the OSF registration before any 2026 prediction is made.

## 6.3 The Adjudication Table

The locked outcome of the cross-validation battery, drawn from `data/calibration/cv_battery_results.json`:

| Model | Mean CV LL | Δ vs M0 | Status |
|-------|------------|---------|--------|
| **M2_fifa**  | 0.993370 | −0.040960 | **CHAMPION (M★)** |
| M3_macro     | 1.026943 | −0.007387 | Eligible (improvement below required margin) |
| M0_elo       | 1.034330 |  0.000000 | Baseline |
| M1_form      | 1.081097 | +0.046767 | DISQUALIFIED (worse than M0; DM $p = 0.006$) |

Lower mean CV log-loss is better. Δ vs M0 is the absolute log-loss improvement against baseline; negative is better.

M2_fifa cleared both pre-registered conditions and was locked as M★ (`data/calibration/champion_model.json::CHAMPION_LOCKED: true`). M3_macro improved over M0 in point estimate but the improvement was small enough that the additional parametric structure does not earn its keep at this corpus size. M0_elo serves as the baseline. M1_form was disqualified for being statistically worse than M0.

## 6.4 Hold-Out Verification

The same four locked models were scored on the held-out 2022 World Cup matches (n = 64, with 192 probability points across the three-way outcome) using `evaluation/score_on_2022_holdout.py`. The hold-out log-losses were:

| Model | Hold-out LL | Hold-out vs CV |
|-------|-------------|----------------|
| **M2_fifa** | 0.987659 | consistent (CV: 0.993370) |
| M3_macro    | 0.997438 | consistent (CV: 1.026943) |
| M0_elo      | 1.018142 | consistent (CV: 1.034330) |
| M1_form     | 1.101231 | consistent (CV: 1.081097) |

The hold-out ranking matches the cross-validation ranking, with M2 winning, M3 second, M0 third, M1 last and disqualified. The absolute hold-out values track the cross-validation values to better than 0.05 log-loss on every model. The agreement across the two evaluation surfaces is the verification that the locked CV result generalises to the genuinely out-of-sample 2022 World Cup; it is not an additional hypothesis test.

## 6.5 The Methodological Reading

The empirical lesson at this corpus size is methodological. A richer model wins only when the added structure is disciplined by shrinkage. M2's win is not a victory for feature engineering; it is a victory for the cross-validation procedure that chose how much weight to assign to a second strong rating. The variants that simply layered features (form in M1, macro in M3) either disqualified outright (M1) or improved on the null by a margin too narrow to interpret (M3 beat M0 by 0.007 log-loss). The bias-variance bargain pays out only when added signal is shrunk toward a strong prior, here Elo itself.

This is not an argument that form, ranking, or macroeconomics are irrelevant to who wins a World Cup. It is that with roughly 200 calibration matches across three prior tournaments, a model spends its degrees of freedom faster than the data can support, unless those degrees of freedom are bought back by an estimator that disciplines them. The framework's own framing is more honest than most: M2 is M★ not because the FIFA blend is the right scientific answer, but because the protocol the framework committed to picked it.

# 7. The Market Layer

After the simulation engine produces $p_{\text{model}}$, the framework compares it against de-vigged bookmaker probabilities. The market layer ends at flagged divergences; sizing and suppression live in Section 8.

## 7.1 The Power Method for De-Vigging

Bookmaker decimal odds are not directly probabilities. The implied probability of an outcome quoted at decimal odds $o_i$ is the inverse $r_i = 1/o_i$, but the implied probabilities across mutually exclusive outcomes do not satisfy $\sum_i r_i = 1$. The overround $\pi = \sum_i r_i - 1$ is the bookmaker's gross margin: positive for sportsbooks like Pinnacle (overround), negative for exchanges like Betfair or prediction markets like Polymarket (underround once commission is netted).

The naive proportional estimator $q_i = r_i / \sum_j r_j$ distributes the overround uniformly across outcomes. This is provably wrong on every sportsbook studied since Shin (1993): the longshot side of any market carries a disproportionate share of the overround, because books charge more vig where adverse selection from informed bettors is highest, and because retail bettors systematically over-pay for tail outcomes (the favourite-longshot bias). Proportional de-vigging therefore inflates $q$ on longshots and deflates it on favourites, exactly the wrong direction.

We adopt the power method (Štrumbelj 2014). The method posits that a single market exponent $z$ exists such that the de-vigged probabilities are obtained by raising raw probabilities to that exponent and the result sums to one by construction:

$$\sum_{i=1}^{n} r_i^{\,z} = 1, \qquad q_i = r_i^{\,z}$$

For an overround book, $\sum_i r_i > 1$ at $z = 1$, so the root sits at $z > 1$; for an underround exchange, $z < 1$. The implementation uses Brent's method bracketed accordingly with $\mathrm{xtol} = 10^{-8}$ and a hard cap of 100 iterations. If Brent fails to bracket the root, the function raises `DeviggingNotConverged` rather than silently coercing to a fallback.

The fitted $z$ is monitored against pre-registered acceptance bands. For Pinnacle, $z$ values outside $[1.00, 1.20]$ are anomalous and route to the volatility gate as `Z_OUT_OF_BAND`. For exchanges, the symmetric band is $z \in [0.80, 1.00]$.

## 7.2 Pinnacle Bias Corrections

The 2010 to 2022 World Cup calibration corpus surfaced two systematic Pinnacle distortions on top of the power-method de-vigging.

The first is a knockout-stage draw under-pricing of approximately 1.4 probability points on neutral-venue matches that go to ninety minutes. The structural cause is plausibly that the draw on a knockout market is a near-pure 90-minute construct, while Pinnacle's quote concentrates on the progression price after shootouts. The correction is $\Delta_{\text{draw}} = +0.014$ added to $q_{\text{draw}}$ on any knockout-stage market, with the win and loss legs renormalised proportionally.

The second is a group-stage host-nation premium of roughly 0.6 probability points on the host's win line. The most plausible reading is recreational money rather than information: home crowds attract retail bets that drift Pinnacle's quote slightly above structural fair value. The correction is $\Delta_{\text{host}} = -0.006$ subtracted from $q_{\text{host\_win}}$ on group-stage markets where one of the listed teams is identified as a host.

Both magnitudes are sealed in `pre_reg_constants.yaml::market.pinnacle_bias` and cannot be re-fit on 2026 data. We are not claiming to repair Pinnacle. We are correcting two specific consistent biases that the calibration corpus identified. The pre-registration is the credibility move; the magnitudes themselves are secondary.

## 7.3 The Edge Metric

After de-vigging and bias correction, the additive edge for each outcome $i$ in a market is:

$$E_i = p_{\text{model},i} - q_{\text{devigged},i}$$

The choice of additive edge over multiplicative or log-odds edge is deliberate: the additive form is the quantity that is statistically tractable for the Diebold-Mariano and Nyberg tests in Section 9, and it has a stable interpretation across markets of different favourite strength. The Kelly transformation $f_{\text{full}} = (p \cdot o - 1)/(o - 1)$ is applied later, downstream of the gate, on the same $E_i$ value.

Raw $E_i$ is a point estimate. The Phase 5 Monte Carlo engine produces 10,000 runs per match, so $p_{\text{model},i}$ has empirical standard error $\sigma_p = \sqrt{p(1-p)/N_{\text{MC}}}$. The de-vigging step has its own uncertainty $\sigma_q$ estimated by a 50-resample parametric bootstrap on the closing line, with each $o_i$ perturbed by a uniform draw on $[-0.005, +0.005]$ (half a probability point at 50% implied probability). The standardised edge is:

$$E^{*}_i = \frac{E_i}{\sqrt{\sigma_p^{2} + \sigma_q^{2}}}$$

$E^{*}$ is logged as a sidecar column in `forecast_log.jsonl` and used for sorting flagged divergences by statistical strength on the visible terminal. The flagging decision uses raw $|E|$ against the pre-registered threshold; $E^{*}$ is informational, not gating.

The two-threshold structure. Mainline markets (1X2, match winner, group winner, tournament winner) flag at $|E| > 0.030$. Derivative markets (over/under 2.5, BTTS, correct score, stage of elimination, both teams to score) flag at $|E| > 0.050$. The asymmetry reflects two facts: derivative markets carry higher de-vigging uncertainty due to lower liquidity and wider effective tick, and the model probability for derivatives is a downstream functional of the bivariate Poisson surface and inherits more model error than the 1X2 marginal.

# 8. The Volatility Gate and Kelly Sizer

The market layer hands the volatility gate a flagged divergence. The gate decides whether the surrounding microstructure is stable enough for the divergence to be acted on hypothetically. If all five suppression rules pass, the Kelly sizer turns the divergence into a recommended stake fraction. If any rule fires, the row is written to the log with a reason code and a zero stake.

## 8.1 The Five Suppression Rules

The five rules are applied in fixed order; the first rule to fire short-circuits the cascade.

**Rule 1 (Named-event window).** Suppress the flag if a gate-relevant news event involving either team occurred within six hours before the snapshot. Six event categories qualify: `INJURY`, `SUSPENSION`, `MANAGER_CHANGE`, `SQUAD_CHANGE`, `VENUE_CHANGE`, `MATCH_RESCHEDULE`. The news monitor consumes only structured federation feeds (FIFA, the 48 member federations, the six confederations); no social media, no headline scrapers. The trade-off is deliberate: federation feeds are slower but structured, attestable, and free of adversarial noise.

**Rule 2 (Intra-book price discovery).** Suppress if the Pinnacle de-vigged probability on the flagged leg moved by more than 3 percentage points in the prior 30 minutes. A 3-pp move on Pinnacle in 30 minutes is the signature of sharp money entering the line; the divergence the model reports may simply be the model running slightly ahead of the market.

**Rule 3 (Cross-book price discovery).** Suppress if the de-vigged probability on the flagged leg differs between Pinnacle and Betfair Exchange by more than 2.5 percentage points. Both are sharp markets; a spread above 2.5 pp means at least one is mid-correction, and the model has no honest way to decide which side of the consensus is right.

**Rule 4 (Polymarket liquidity floor).** Suppress if Polymarket's 24-hour traded volume on the equivalent contract is below USD 50,000. Below that threshold, the quoted price is a thin signal that any single mid-sized order could move several percentage points; a "model edge" against a thin Polymarket quote is a measurement artifact of the thinness.

**Rule 5 (Pinnacle staleness).** Suppress if Pinnacle's most recent quote update predates the snapshot timestamp by more than four hours. A stale quote means Pinnacle has not yet absorbed information that has likely arrived since.

A flag that survives all five rules is forwarded to the Kelly sizer. A flag that is suppressed is logged with the firing rule's reason code and contributes a recommended stake fraction of zero.

## 8.2 Fractional Kelly Sizing

If the gate clears, the recommended stake fraction is full Kelly multiplied by a market-class fraction $\phi$ and clipped to a per-market hard cap:

$$f_{\text{recommended}} = \mathrm{clip}\!\big(\phi_{\text{class}} \cdot f_{\text{full}},\ 0,\ f_{\text{cap, class}}\big)$$

The class is determined by the de-vigged book probability on the flagged leg, not by the model probability:

| Class | Trigger | $\phi$ | Per-market cap |
|-------|---------|--------|----------------|
| Mainline | $q_{\text{devigged}} \geq 0.10$ | $1/4$ | 0.05 |
| Longshot | $q_{\text{devigged}} < 0.10$ | $1/8$ | 0.025 |

The $1/4$ fraction on mainline markets is the Thorp (1997) and MacLean-Thorp-Ziemba (2010) recommendation for the regime where $p$ is known with non-trivial error. The $1/8$ fraction on longshot markets is half that, reflecting two facts. The Kelly variance scales as $1/p$ for fixed edge, so longshot variance is structurally larger; and the Monte Carlo standard error $\sigma_p$ on tail outcomes is itself larger because tail events are sampled fewer times in 10,000 runs.

The classification triggers on $q_{\text{devigged}}$ rather than $p_{\text{model}}$ for a specific reason: a model with high conviction on a tail outcome could otherwise re-classify its own bet out of the longshot bucket and take quarter-Kelly on a high-variance 8% probability event. Anchoring the bucket to the de-vigged book probability prevents that self-promotion.

A drawdown state machine on the bankroll itself adds a final layer. The bankroll has three modes: `NORMAL`, `HALVED`, `STOPPED`. `NORMAL` to `HALVED` triggers when bankroll-to-peak drops below 0.80. `HALVED` to `NORMAL` triggers when bankroll-to-peak recovers to 0.90. A second distinct drawdown episode while still in `HALVED` mode triggers `STOPPED`. In `HALVED` mode every recommended stake is multiplied by 0.5; in `STOPPED` mode every recommended stake is zero. Crucially, `peak_bankroll` is not re-anchored on partial recovery: if the bankroll falls from peak $P_0$ to $0.7 P_0$ then recovers to $0.85 P_0$, the peak remains $P_0$ and the drawdown is still 15%. Only when the bankroll reaches $0.90 P_0$ does the mode revert to `NORMAL`.

Per-event and per-day caps add a final orchestrator-level constraint: 8% per event (across all legs of one match) and 15% per day (across all events on one calendar day, UTC). These require state across markets that no single gate or sizer call can see. When a cap fires, the orchestrator does not modify the original `forecast_log.jsonl` rows; the log is append-only. Original rows are written first as provisional, and adjustment rows are appended referencing the parent via `parent_decision_id`. The two-pass discipline preserves the audit trail.

# 9. Evaluation Framework

Calibration is the property the framework cares about. Proper scoring rules are the math that makes calibration enforceable.

## 9.1 The Three Scoring Rules

The multiclass Brier score, summed over $K = 3$ outcomes:

$$\mathrm{BS}_i = \sum_{k=1}^{K}\big(p_{i,k} - y_{i,k}\big)^{2}$$

where $p_{i,k}$ is the model's predicted probability for outcome $k$ on match $i$ and $y_{i,k}$ is the one-hot indicator of the realised outcome. The score is non-negative and bounded above by 2 for $K = 3$.

The Ranked Probability Score (Epstein 1969) generalises the Brier score to ordered categorical outcomes:

$$\mathrm{RPS}_i = \frac{1}{K - 1}\sum_{j=1}^{K-1}\Big(\sum_{l=1}^{j} p_{i,l} - \sum_{l=1}^{j} y_{i,l}\Big)^{2}$$

The implementation uses the natural ordering H ≻ D ≻ A. RPS rewards distributional sharpness on the ordered 1X2 outcome; misclassifying a Home win as an Away win is more wrong than misclassifying it as a Draw, and RPS captures that ordering while Brier does not.

Log-loss with a clipping floor:

$$\mathcal{L}_i = -\sum_{k=1}^{K} y_{i,k} \, \log\!\big(\max(p_{i,k},\, \varepsilon)\big)$$

with $\varepsilon = 10^{-6}$ sealed under `scoring_rules.log_loss_eps_min`. Log-loss is the steepest of the three rules at high-confidence wrong predictions; saying 90% for the realised outcome incurs $-\log(0.9) \approx 0.11$, while saying 90% for the wrong outcome incurs $-\log(0.1) \approx 2.30$. This is the metric the kill criterion is built on, because it is the most discriminating of the three at the model-comparison stage.

Reporting all three rules is the pre-registered commitment; reporting only one would leave the project free to pick the rule that flatters the result.

## 9.2 Diebold-Mariano with Small-Sample Correction

For two models with per-match losses $\ell^{A}_i$ and $\ell^{B}_i$, define the difference series $d_i = \ell^{A}_i - \ell^{B}_i$. The Diebold-Mariano (1995) test statistic is the standardised mean:

$$\mathrm{DM} = \frac{\bar{d}}{\sqrt{V_{\mathrm{HAC}}(\bar{d})}}$$

The HAC variance uses the Newey-West (1987) Bartlett kernel with bandwidth $h = \max(1, \lfloor N^{1/3}\rfloor)$. At our sample size the asymptotic normal approximation is unreliable, so we apply the Harvey-Leybourne-Newbold (1997) small-sample correction:

$$\mathrm{DM}^{*} = \mathrm{DM} \cdot \sqrt{\frac{N + 1 - 2h + h(h-1)/N}{N}}$$

The corrected statistic is compared to a Student $t$-distribution with $N - 1$ degrees of freedom. Pre-registered $\alpha$ levels: 0.05 for the M★-vs-M0 and M★-vs-Market primary comparisons, 0.005 (Bonferroni-corrected) for the four shadow-vs-baseline pairwise comparisons.

## 9.3 Nyberg Market-Efficiency Tests

The Nyberg (2014) test asks whether the market closing line incorporates all information in $p_{\text{model}}$. For each match $i$ and outcome $k \in \{H, A\}$ (with Draw as the reference category), fit the multinomial logit:

$$\log \frac{P(Y_i = k)}{P(Y_i = D)} = \beta_{0k} + \beta_{1k}\,\mathrm{logit}\big(q_{\mathrm{close},i,k}\big) + \beta_{2k}\,\mathrm{logit}\big(p_{i,k}\big)$$

where $q_{\text{close}}$ is the de-vigged closing probability and $p$ the model probability. The null hypothesis is $H_0: \beta_{2H} = \beta_{2A} = 0$ (the model coefficients contribute nothing once the closing line is conditioned on). The likelihood ratio statistic $\mathrm{LR} = 2(\ell_{\text{full}} - \ell_{\text{restricted}})$ is asymptotically $\chi^2_2$. Pre-registered critical values: 5.991 for the M★ primary test ($\alpha = 0.05$); 8.668 for the shadow-model Bonferroni-corrected tests ($\alpha = 0.0125$).

A Wald test using the HC3 sandwich variance estimator runs alongside as a robustness panel; persistent disagreement signals a misspecified covariance structure that the LR test alone would not catch. The same multinomial logit is also re-fit using opening-line de-vigged probabilities, isolating the model's information advantage at the moment the line opens, before any market adjustment to the model's own published forecasts could have happened.

## 9.4 Closing Line Value at Small N

CLV is the trading community's gold standard for edge detection at small sample size. For a 64-match World Cup with M★'s flags on perhaps 30 to 40 matches, win-rate analysis is dominated by sampling variance: a few unlucky bounces and the win rate looks bad even when the underlying probabilities were correct. CLV is dominated by signal as long as the model's flags actually move the market, because every match contributes a CLV observation regardless of whether the hypothetical bet won or lost.

The probability-space form is the primary metric:

$$\mathrm{CLV}_i = \frac{q^{*}_{\mathrm{close},i}}{q^{*}_{\mathrm{open},i}} - 1$$

The log-odds form is logged as a secondary, for cross-checking against trading-desk conventions:

$$\mathrm{CLV}^{\log}_i = \ln d_{\mathrm{open},i} - \ln d_{\mathrm{close},i}$$

The primary inferential procedure is a stationary block bootstrap (Politis and Romano 1994) Sharpe ratio with the Hall-Mueller (1997) bias correction. Five steps: compute the realised Sharpe ratio of the CLV series, choose block length $\bar{L} = \mathrm{clamp}(\lfloor 1.75 \cdot N^{1/3} \rfloor, [4, 20])$, generate $B = 10{,}000$ resamples, compute bootstrap Sharpes, apply $\mathrm{SR}_{\mathrm{HM},b} = 2 \cdot \widehat{\mathrm{SR}} - \mathrm{SR}_{\mathrm{boot},b}$. The 90% and 95% percentile CIs of the corrected distribution decide between three labels: `GENUINE_EDGE` (95% CI lower bound > 0), `WEAK_EDGE` (95% lower bound ≤ 0 but 90% lower bound > 0), `NO_EDGE` (otherwise).

Bootstrap reproducibility is governed by a deterministic seed derivation from the frozen code SHA. Anyone with access to the same code SHA can reproduce the full bootstrap distribution byte-for-byte.

## 9.5 Pseudo-CLV for the Shadow Models

The "Champion's Clothes" principle. Each shadow model M0 through M3 is hypothetically dressed in M★'s exact market-facing machinery: the same edge thresholds, the same Volatility Gate state, the same Kelly fractions, the same opening and closing lines. The only thing that varies across shadow books is the probability vector $p_{\text{model}}$. The same CLV math runs against each.

Pseudo-CLV answers: had M0, M1, M2, or M3 been the champion instead of M★, would each have generated divergences that the market subsequently moved toward? The counterfactual is constrained, not unconstrained. We are not asking what M★ would look like as a different model entirely; we are asking how each shadow model's probabilities would have priced under M★'s exact market layer, edge thresholds, gate, and Kelly sizer. That constraint is what makes the comparison interpretable.

# 10. Limitations and Scope

The framework's strength matrices in M0 through M3 capture team-level structural information. They do not capture, by deliberate scope choice: player-level injury or suspension data; in-match Bayesian updates as a match unfolds; manager-effect or tactical-system terms; draw-specific factors in knockout matches beyond what the Bivariate Poisson engine produces from the strength matrix; home-advantage adjustments beyond what Elo already absorbs; day-of-match weather data; travel and rest-fatigue metrics across the bracket.

Each is a plausible axis along which a richer model could close some of the gap to the market. Each was excluded for a defensible reason: data availability, scope discipline, or the corpus-size argument that adding parameters in a sparse-data regime spends degrees of freedom we cannot afford to spend. These omissions are named so that a reader who asks "did you try X?" sees the answer is "no, and here is why" rather than encountering silence. Some of these axes (particularly player-level injury data and travel fatigue) are the directions where future work could most plausibly find signal that the four models in this ablation could not.

The simulation engine produces final scorelines from goal-rate inputs. It does not simulate the 90 minutes minute by minute; it does not model in-match injury or red-card dynamics; it does not model referee effects on goal rates; it does not model real-time bracket updates mid-tournament. Each is a deliberate scope choice, listed honestly so a reader can see the simplifications without reverse-engineering the code.

The market layer is calibrated only on Pinnacle. Betfair Exchange and Polymarket de-vig with the power method but receive no book-specific bias correction; they are used only as cross-references for the price-discovery rules in the volatility gate, never as the $q$ in the edge metric. The bias-correction constants $\Delta_{\text{draw}}$ and $\Delta_{\text{host}}$ are fitted on the 2010 to 2022 corpus and are themselves estimated quantities with non-trivial calibration error; the framework treats them as known after pre-registration.

The corpus is small. 347 major-tournament matches, well below the approximately 12,000 international matches a fuller corpus would contain. Confidence intervals on every ranking signal are wider than we wished. The Phase 8 outcome does not prove markets are efficient. It says, narrowly, that on a corpus of 347 matches, with the pre-registered metric, on the four ranking signals tested, M2's shrinkage blend was the only structural extension that earned its complexity. A larger corpus might tell a different story. A different metric, such as calibration on knockout-only matches, might tell a different story. The honest claim is: under the pre-registered protocol, on the data, with the constants sealed in April, M★ is M2.

# 11. References

Dixon, M. J., and Coles, S. G. (1997). Modelling association football scores and inefficiencies in the football betting market. *Journal of the Royal Statistical Society: Series C (Applied Statistics)*, 46(2), 265-280.

Dixon, M. J., and Robinson, M. E. (1998). A birth process model for association football matches. *The Statistician*, 47(3), 523-538.

Diebold, F. X., and Mariano, R. S. (1995). Comparing predictive accuracy. *Journal of Business and Economic Statistics*, 13(3), 253-263.

Epstein, E. S. (1969). A scoring system for probability forecasts of ranked categories. *Journal of Applied Meteorology*, 8(6), 985-987.

Hall, P., and Mueller, H. G. (1997). On the asymmetry of the Sharpe ratio. (Block bootstrap and bias correction methods.) *Statistics and Decisions*.

Harvey, D., Leybourne, S., and Newbold, P. (1997). Testing the equality of prediction mean squared errors. *International Journal of Forecasting*, 13(2), 281-291.

Hoffmann, R., Ging, L. C., and Ramasamy, B. (2002). The socio-economic determinants of international soccer performance. *Journal of Applied Economics*, 5(2), 253-272.

Karlis, D., and Ntzoufras, I. (2003). Analysis of sports data by using bivariate Poisson models. *Journal of the Royal Statistical Society: Series D (The Statistician)*, 52(3), 381-393.

Klement, F., and Hoffmann, R. (Various years). Macroeconomic and structural determinants of international football performance.

Maher, M. J. (1982). Modelling association football scores. *Statistica Neerlandica*, 36(3), 109-118.

MacLean, L. C., Thorp, E. O., and Ziemba, W. T. (2010). *The Kelly Capital Growth Investment Criterion: Theory and Practice*. World Scientific.

Newey, W. K., and West, K. D. (1987). A simple, positive semi-definite, heteroskedasticity and autocorrelation consistent covariance matrix. *Econometrica*, 55(3), 703-708.

Nyberg, H. (2014). A multinomial logit-based statistical test of association football betting market efficiency. *Working paper*.

Politis, D. N., and Romano, J. P. (1994). The stationary bootstrap. *Journal of the American Statistical Association*, 89(428), 1303-1313.

Shin, H. S. (1993). Measuring the incidence of insider trading in a market for state-contingent claims. *The Economic Journal*, 103(420), 1141-1153.

Štrumbelj, E. (2014). On determining probability forecasts from betting odds. *International Journal of Forecasting*, 30(4), 934-943.

Thorp, E. O. (1997). The Kelly criterion in blackjack, sports betting, and the stock market. *In Finding the Edge: Mathematical Analysis of Casino Games*.

---

**Pre-registration record:** OSF DOI `10.17605/OSF.IO/8B5HD`, canonical URL `osf.io/spmkg`, registration timestamp 2026-04-22T00:00:00Z. Annotated Git tag `v1.0.0-MSTAR-LOCKED` against the project repository.

**Reproducibility:** Code at GitHub (link to be inserted). Data snapshot SHA: `94389c17ff6ba2a980337b1f2f08efa774aeeefc39d8712cf4ab8953c80033fc`. Cross-validation results SHA: `2d917befcc75162d208e85e4fe6982522bed4a83ff78c4ec6992dcfa78c56b25`.

**Live framework:** https://45analytics.com.

**Correspondence:** Nicolás Duarte, 45 Analytics. Email available on request via the project website.
