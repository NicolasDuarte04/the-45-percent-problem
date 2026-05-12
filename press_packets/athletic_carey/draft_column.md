# DRAFT, EDIT FREELY

## How a pre-registered model prices Brazil at the 2026 World Cup

A team at 45 Analytics has launched a pre-registered probabilistic framework for the 2026 World Cup, with the methodology and champion model sealed on OSF before any 2026 match was played. The champion, M2, is an Elo rating blended with FIFA ranking points via cross-validated shrinkage; it won the locked log-loss battery against the 2022 hold-out at 0.993, against an M0 pure-Elo baseline at 1.034.

What makes the framework usable for tactical analysis is the decomposition underneath the headline probabilities. The simulation engine is a Bivariate Poisson with Dixon-Coles low-score correction, and every match under M2 produces an explicit pair of expected-goal rates, $\lambda_h$ and $\lambda_a$, mapped from the strength matrix through a calibrated log-linear transform.

For Brazil's three group matches in 2026, those rates are: against [VERIFY OPP1], $\lambda_{BRA} = $[VERIFY] and $\lambda_{OPP} = $[VERIFY]; against [VERIFY OPP2], [VERIFY] and [VERIFY]; against [VERIFY OPP3], [VERIFY] and [VERIFY]. The cross-shock parameter $\lambda_3 = 0.10$ and the Dixon-Coles correction $\rho = -0.05$ are locked from pre-registration.

The tournament-level reading. Across 10,000 Monte Carlo runs, Brazil wins the tournament in [VERIFY]% of simulations, reaches the final in [VERIFY]%, and reaches the semifinal in [VERIFY]%. The most interesting piece for a tactical column is the divergence against the de-vigged Pinnacle market: M2's lambda for Brazil in tier-2 group matchups is [HIGHER/LOWER] than Pinnacle's implied lambda by [VERIFY], on a [VERIFY] percentage-point divergence on the Brazil-win line.

The framework calls these divergences, not edges, and is explicit that it is a pricing layer rather than a prediction tool. The site is 45analytics.com; the working paper, code, and OSF lock are all public.

---

Source: https://45analytics.com. OSF pre-registration: [link]. Working paper attached. Underlying Brazil data: attached parquet.
