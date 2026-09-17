# DRAFT, EDIT FREELY

## What a pre-registered model says about Argentina defending the World Cup

No team has won successive World Cups since Brazil in 1962. Across the expanded post-1958 era, the historical base rate of a defending champion winning the next tournament sits at roughly 6 to 7 percent if you treat every defender symmetrically. That low rate has, in the journalistic shorthand, become the weight of expectation: the harder it is to repeat, the more we read into the second attempt.

A team at 45 Analytics published a pre-registered probabilistic framework for the 2026 World Cup last week, with the methodology and champion model sealed on OSF before any 2026 match was played. The champion is M2, an Elo rating blended with FIFA ranking points via cross-validated shrinkage; it won the locked log-loss battery against the 2022 hold-out at 0.993, against an M0 pure-Elo baseline at 1.034.

What the model says about Argentina. Across 10,000 Monte Carlo simulations of the full bracket, Argentina wins the tournament in [VERIFY]% of runs, reaches the final in [VERIFY]%, and reaches the semifinal in [VERIFY]%. Conditional on winning Group [VERIFY], the title probability rises to [VERIFY]%.

The structural reading. The model's [VERIFY]% is meaningfully above the historical defender-wins-next base rate of ~6-7%, but the difference isn't a reward for being the holders. It is a reading of Argentina's M2-implied strength, which the model evaluates from Elo and FIFA ranking points without any prior on tournament status. Compared to de-vigged Pinnacle at [VERIFY]%, the model sits [VERIFY] percentage points [ABOVE/BELOW] the market.

The framework is a pricing layer, not a prediction tool. It tracks divergences against the de-vigged market and publishes Closing Line Value as the running honesty test. The site is 45analytics.com.

---

Source: https://45analytics.com. OSF pre-registration: [link]. Working paper attached. Underlying Argentina data: attached CSV.
