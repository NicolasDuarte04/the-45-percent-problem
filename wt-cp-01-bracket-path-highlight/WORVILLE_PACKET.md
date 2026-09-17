# Worville Press Packet (Athletic, England + methodology angle)

**Target**: Tom Worville, The Athletic
**Send time**: Saturday May 9, 2026, 09:00 ET
**Exclusive cut**: England's tournament probabilities under M2, plus the rating-system architecture comparison (M2's FIFA-blend weight $w^{*} = 1.0$ as a methodology story)
**Status**: DRAFT, do not send until England-specific numbers and the rating-system comparison are reconciled

The Worville angle is methodology-fluent and Premier-League-data-adjacent. He is ex-StatsBomb, current Athletic data desk, and his audience cares about why a model decides what it decides as much as about the headline number. The exclusive lever is twofold: England-specific probabilities (so the column has a national-team hook for an English audience) and a methodology layer about how M2's cross-validation chose to drop the project's own Elo entirely in favour of FIFA's broader denominator. That second story is unique to Worville among the four Athletic writers; the others get team-narrative angles.

---

## Section 1 — The Email

### 1.1 Subject

```
Pre-registered framework: M2's rating-system choice + England's 2026 path
```

### 1.2 Body

```
Tom,

We launched 45 Analytics yesterday: a pre-registered probabilistic
framework for the 2026 World Cup, methodology locked on OSF before any
match was played. Champion model is M2 (Elo blended with FIFA ranking
points via cross-validated shrinkage); it won the locked CV log-loss
battery at 0.993 against M0 baseline at 1.034 (working paper attached,
page 7).

Two angles for your audience, you choose.

Angle 1, the methodology story. M2 is a convex blend
S_i = (1 - w) * Elo_i + w * FIFA_i, with the blend weight w optimized
via cross-validation on the 2010 to 2021 calibration window. The
optimizer's answer was w* = 1.0. M2 dropped the project's own walk-
forward Elo entirely and ran on the FIFA signal alone.

That outcome is the most informative result of the four-model ablation.
Cross-validation had access to a calibrated Elo computed against a
trusted 347-match corpus, and chose not to use it. The signal in our own
Elo, at this corpus size, was less useful for predicting World Cup
outcomes than FIFA's broader global ranking. The implication is not that
FIFA rankings are good (they are imperfect); it is that the binding
constraint is corpus size, and FIFA's denominator patches it.

Angle 2, the England cut. Under M2 with 10,000 Monte Carlo runs:

- England tournament-win probability: [VERIFY]%
- England reaches the final: [VERIFY]%
- England reaches the semifinal: [VERIFY]%
- Group winner (Group [VERIFY]): [VERIFY]%

De-vigged Pinnacle for England to win the tournament is [VERIFY]%; the
model sits [VERIFY] pp [ABOVE/BELOW] the market.

Three deliverables for you, no return condition:

1. Calibration chart at publication resolution (PNG + SVG attached)
2. A 250-word draft column you can rewrite, repurpose, or discard
   (DRAFT, EDIT FREELY)
3. England-specific data, plus the M2 cross-validation surface as a
   function of the blend weight w (the curve that justified w* = 1.0)

The England cut is exclusive to you among Athletic writers; Muller has
USA, Carey has Brazil, Critchley has Argentina.

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
- `england_path_probabilities.csv` (exclusive)
- `m2_blend_weight_cv_curve.csv` (exclusive: log-loss as a function of $w$)
- `england_market_divergence.csv` (exclusive)
- `draft_column.md`

### 1.4 Send-time checklist

- [ ] All `[VERIFY]` placeholders replaced with locked numbers
- [ ] M2 blend weight $w^{*} = 1.0$ confirmed against `data/calibration/m2_fifa_params.json`
- [ ] CV log-loss curve as a function of $w$ exported with at least 21 grid points (w = 0.0, 0.05, ..., 1.0)
- [ ] England's group letter and group opponents confirmed against `wc2026_fixtures.parquet`
- [ ] Send between 09:00 and 09:30 ET Saturday morning

---

## Section 2 — The Draft Column

### File: `press_packets/athletic_worville/draft_column.md`

```markdown
# DRAFT, EDIT FREELY

## What it means that a World Cup model dropped its own ratings in favour of FIFA's

A team at 45 Analytics has launched a pre-registered probabilistic
framework for the 2026 World Cup. The methodology is sealed on OSF, the
constants are locked behind a signed Git tag, and the champion model
M2 won the locked cross-validation log-loss battery at 0.993 against an
M0 pure-Elo baseline at 1.034. The technical story I find most
interesting is what M2 actually chose to use as its inputs.

M2 is a convex blend, $S_i = (1 - w) \cdot \mathrm{Elo}_i + w \cdot \mathrm{FIFA}_i$,
with the blend weight $w$ chosen by cross-validation on a 2010 to 2021
calibration window. The team had calibrated its own walk-forward Elo on
a 347-match international tournament corpus. The optimiser's answer was
$w^{*} = 1.0$. M2 dropped the bespoke Elo entirely and ran on FIFA's
official ranking points alone.

That is the kind of result you only get from cross-validation. The
optimiser had access to a rating system the team trusted enough to ship,
and chose not to use it. The implication is not that FIFA's rankings
are unusually good. It is that with 347 matches of calibration data, a
locally-fit Elo is over-specified relative to the signal it can actually
extract, and FIFA's broader global denominator is more useful even with
its known weighting flaws.

What this prices for England. Under M2 with 10,000 Monte Carlo runs,
England wins the tournament in [VERIFY]% of simulations, reaches the
final in [VERIFY]%, and reaches the semifinal in [VERIFY]%. The market,
de-vigged Pinnacle, sits at [VERIFY]%; the model sits [VERIFY]
percentage points [ABOVE/BELOW].

The framework calls these divergences, not edges, and is explicit that
it is a pricing layer rather than a prediction tool. The site is
45analytics.com; the working paper, code, and OSF lock are public.

[~ 280 words]

Source: 45analytics.com. OSF pre-registration: [link]. Working paper
attached. Underlying England data and the blend-weight CV curve:
attached CSVs.
```

---

## Section 3 — Data Spec

### `england_path_probabilities.csv`

Same schema as the Muller USA cut, applied to England.

### `m2_blend_weight_cv_curve.csv`

The cross-validation log-loss as a function of the M2 blend weight $w$, evaluated on the calibration window.

| Column | Type | Notes |
|--------|------|-------|
| w | float | Blend weight, 21 values from 0.0 to 1.0 inclusive |
| mean_cv_log_loss | float | Mean across cross-validation folds at this $w$ |
| std_error | float | Standard error of the cross-fold mean |
| folds | int | Number of folds used |

Acceptance test: the minimum mean_cv_log_loss occurs at $w = 1.0$ (or within one $w$-grid step of 1.0). The curve is monotonically decreasing for $w > 0.5$ on a properly calibrated grid.

### `england_market_divergence.csv`

One row per market, schema identical to the Carey Brazil divergence file.

---

## Section 4 — Failure Modes

If Worville does not respond: one follow-up email Wednesday May 13. After that, no further direct contact.

If Worville responds with a methodology question: same-day reply, full transparency. He is the most data-fluent of the four Athletic writers, and his clarifications are usually about cross-validation fold structure, identifiability of the blend weight, or how the working paper handles the small-sample regime. Send the relevant working-paper section directly; do not summarise.

If Worville asks for the M2 vs M3 head-to-head Diebold-Mariano test on the hold-out: the corrected DM statistic is in the evaluation directory; ship it within 24 hours with the Newey-West bandwidth and the Harvey-Leybourne-Newbold correction noted.

If Worville pushes back on the $w^{*} = 1.0$ result as a sign of over-fitting: that is a fair methodological question. The right reply is to send the leave-one-tournament-out cross-validation curve as a robustness check, which is in `data/calibration/cv_battery_results.json` and shows the same minimum at $w = 1.0$ on the LOTOCV scheme.

---

## Section 5 — File Manifest

```
press_packets/athletic_worville/
├── README.md
├── email.md
├── draft_column.md
├── working_paper.pdf                    (shared)
├── calibration_2022_holdout.png         (shared)
├── calibration_2022_holdout.svg         (shared)
├── calibration_data_2022_holdout.csv    (shared)
├── england_path_probabilities.csv       (exclusive)
├── m2_blend_weight_cv_curve.csv         (exclusive)
└── england_market_divergence.csv        (exclusive)
```
