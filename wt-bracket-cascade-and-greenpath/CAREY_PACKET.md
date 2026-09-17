# Carey Press Packet (Athletic, Brazil + tactical xG decomposition)

**Target**: Mark Carey, The Athletic
**Send time**: Saturday May 9, 2026, 09:00 ET
**Exclusive cut**: Brazil's expected-goals decomposition under M2, plus the bivariate Poisson surface for Brazil's three group matches
**Status**: DRAFT, do not send until Brazil-specific numbers and the goal-rate decomposition are reconciled with the locked simulation output

The Carey angle is tactical and metric-fluent. He writes about expected goals, pressing structures, and team-system analysis. The exclusive lever is a metric the model produces that other Athletic writers do not get: per-match goal-rate decompositions $(\lambda_{home}, \lambda_{away})$ for Brazil, with the bivariate Poisson + Dixon-Coles surface as the basis for tactical commentary. Brazil is the right allocation because the model's view of Brazil's strength surface is itself a story, particularly if it diverges from Pinnacle's pricing in either direction.

---

## Section 1 — The Email

### 1.1 Subject

```
Pre-registered framework: M2's xG decomposition for Brazil at the 2026 WC
```

### 1.2 Body

```
Mark,

We launched 45 Analytics yesterday: a pre-registered probabilistic
framework for the 2026 World Cup, methodology locked on OSF before any
match was played. Champion model is M2 (Elo blended with FIFA ranking
points via cross-validated shrinkage), winning the locked CV log-loss
battery at 0.993 against M0 baseline at 1.034 (working paper attached,
page 7).

The angle for your audience is the goal-rate decomposition. The
simulation engine is a Bivariate Poisson with Dixon-Coles low-score
correction, parameterised through calibrated constants
c* = 0.580, mu* = 1.716. Each Brazil match in the group stage produces
an explicit lambda pair under M2:

- Brazil vs [VERIFY GRP OPP1]: lambda_BRA = [VERIFY], lambda_OPP = [VERIFY]
- Brazil vs [VERIFY GRP OPP2]: lambda_BRA = [VERIFY], lambda_OPP = [VERIFY]
- Brazil vs [VERIFY GRP OPP3]: lambda_BRA = [VERIFY], lambda_OPP = [VERIFY]

The cross-shock parameter lambda_3 = 0.10 is locked; the Dixon-Coles rho
is -0.05. The full 11x11 score-cell PMF for each match is in the attached
parquet.

Tournament-level numbers under 10,000 Monte Carlo runs:

- Brazil tournament-win probability: [VERIFY]%
- Brazil reaches the final: [VERIFY]%
- Brazil reaches the semifinal: [VERIFY]%

Where this gets interesting for a tactical column: the model's lambda
for Brazil against tier-2 group opponents is [HIGH/LOW] vs Pinnacle's
implied lambda, by [VERIFY]. The divergence sits at [VERIFY] percentage
points on the Brazil-win line, which is [ABOVE/BELOW] the pre-registered
3% mainline edge threshold. We display these as divergences, not edges.

Three deliverables for you, no return condition:

1. Calibration chart at publication resolution (PNG + SVG attached)
2. A 250-word draft column (DRAFT, EDIT FREELY)
3. Brazil-specific data: per-match lambda pairs, the score-cell PMFs,
   tournament marginals, and the model-vs-market divergence table

The Brazil cut is exclusive to you among Athletic writers; Muller has
USA, Critchley has Argentina, Worville has England.

Site: https://45analytics.com
Working paper (15p): attached
OSF: [link]
GitHub: [link]
Trailer 1 (3 min, methodology): [link]

Citation if useful, no follow-up if not.

Nicolás Duarte
```

### 1.3 Attachments

- `working_paper.pdf` (shared)
- `calibration_2022_holdout.png` (shared)
- `calibration_2022_holdout.svg` (shared)
- `calibration_data_2022_holdout.csv` (shared)
- `brazil_lambda_decomposition.parquet` (exclusive: per-match goal rates and PMFs)
- `brazil_market_divergence.csv` (exclusive: model vs Pinnacle per market)
- `draft_column.md`

### 1.4 Send-time checklist

- [ ] All `[VERIFY]` placeholders replaced with locked numbers from the latest snapshot
- [ ] Brazil's group letter and three group opponents confirmed against `wc2026_fixtures.parquet`
- [ ] Lambda values computed via the same calibrated mapping documented on page 5 of the working paper, not via any ad-hoc rescale
- [ ] Divergence direction (HIGH/LOW, ABOVE/BELOW) reflects the actual sign and magnitude
- [ ] Send between 09:00 and 09:30 ET Saturday morning

---

## Section 2 — The Draft Column

### File: `press_packets/athletic_carey/draft_column.md`

```markdown
# DRAFT, EDIT FREELY

## How a pre-registered model prices Brazil at the 2026 World Cup

A team at 45 Analytics has launched a pre-registered probabilistic
framework for the 2026 World Cup, with the methodology and champion
model sealed on OSF before any 2026 match was played. The champion, M2,
is an Elo rating blended with FIFA ranking points via cross-validated
shrinkage; it won the locked log-loss battery against the 2022 hold-out
at 0.993, against an M0 pure-Elo baseline at 1.034.

What makes the framework usable for tactical analysis is the decomposition
underneath the headline probabilities. The simulation engine is a
Bivariate Poisson with Dixon-Coles low-score correction, and every match
under M2 produces an explicit pair of expected-goal rates,
$\lambda_h$ and $\lambda_a$, mapped from the strength matrix through a
calibrated log-linear transform.

For Brazil's three group matches in 2026, those rates are: against
[VERIFY OPP1], $\lambda_{BRA} = $[VERIFY] and $\lambda_{OPP} = $[VERIFY];
against [VERIFY OPP2], [VERIFY] and [VERIFY]; against [VERIFY OPP3],
[VERIFY] and [VERIFY]. The cross-shock parameter $\lambda_3 = 0.10$ and
the Dixon-Coles correction $\rho = -0.05$ are locked from
pre-registration.

The tournament-level reading. Across 10,000 Monte Carlo runs, Brazil
wins the tournament in [VERIFY]% of simulations, reaches the final in
[VERIFY]%, and reaches the semifinal in [VERIFY]%. The most interesting
piece for a tactical column is the divergence against the de-vigged
Pinnacle market: M2's lambda for Brazil in tier-2 group matchups is
[HIGHER/LOWER] than Pinnacle's implied lambda by [VERIFY], on a [VERIFY]
percentage-point divergence on the Brazil-win line.

The framework calls these divergences, not edges, and is explicit that
it is a pricing layer rather than a prediction tool. The site is
45analytics.com; the working paper, code, and OSF lock are all public.

[~ 270 words]

Source: 45analytics.com. OSF pre-registration: [link]. Working paper
attached. Underlying Brazil data: attached parquet.
```

---

## Section 3 — Data Spec for the Brazil Cut

### `brazil_lambda_decomposition.parquet`

One row per Brazil match (group, R32, R16, QF, SF, Final, conditional on advancing). Schema:

| Column | Type | Notes |
|--------|------|-------|
| match_id | string | e.g. `G-X-1`, `KO-R32-3` |
| phase | string | group, R32, R16, QF, SF, Final |
| opponent | string | 3-letter country code or "TBD-conditional" |
| lambda_BRA | float | Brazil's expected goals under M2 |
| lambda_opp | float | Opponent's expected goals under M2 |
| lambda_3 | float | Cross-shock, fixed at 0.10 |
| rho | float | Dixon-Coles, fixed at -0.05 |
| p_BRA_win | float | P(home win) from corrected PMF |
| p_draw | float | P(draw) |
| p_opp_win | float | P(away win) |
| p_pinnacle_BRA_win | float | De-vigged Pinnacle probability for Brazil to win |
| divergence | float | p_BRA_win minus p_pinnacle_BRA_win, in probability points |
| flagged | bool | True if abs(divergence) > 0.030 (mainline) |
| score_cell_pmf | binary | Flattened 121-cell PMF, log-sum-exp computed |

Acceptance test: per-match probabilities $p_{BRA win} + p_{draw} + p_{opp win}$ sum to 1.0 within 1e-9. The score-cell PMF marginals reproduce those probabilities to the same tolerance.

### `brazil_market_divergence.csv`

One row per market (1X2, group winner, tournament winner, knockout-stage, BTTS, over/under 2.5). Columns: `market`, `outcome`, `p_model`, `q_devigged_pinnacle`, `divergence`, `divergence_se`, `flagged`, `gate_status`, `gate_reason_code`.

---

## Section 4 — Failure Modes

If Carey does not respond: one follow-up email Wednesday May 13, single line. After that, no further direct contact.

If Carey responds with a clarifying question on the goal-rate decomposition: same-day reply, with the corresponding section of the working paper (page 5, the calibration mapping) attached if the question is about how $c^{*}$ and $\mu^{*}$ were fit.

If Carey asks for the full bivariate Poisson surface visualisation: that is a Karlis-Ntzoufras-style 2D heatmap; ship it within 24 hours as a PNG plus the underlying CSV.

If Carey publishes and references a divergence as an edge: email him privately, factually, no public correction. The framework's posture is divergence rather than edge; misuse of the term in his column is a brand risk for us, but a one-line correction request is the right move.

---

## Section 5 — File Manifest

```
press_packets/athletic_carey/
├── README.md
├── email.md
├── draft_column.md
├── working_paper.pdf                    (shared)
├── calibration_2022_holdout.png         (shared)
├── calibration_2022_holdout.svg         (shared)
├── calibration_data_2022_holdout.csv    (shared)
├── brazil_lambda_decomposition.parquet  (exclusive)
└── brazil_market_divergence.csv         (exclusive)
```
