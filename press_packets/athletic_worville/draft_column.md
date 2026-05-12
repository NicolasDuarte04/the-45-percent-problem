# DRAFT, EDIT FREELY

## What it means that a World Cup model dropped its own ratings in favour of FIFA's

A team at 45 Analytics has launched a pre-registered probabilistic framework for the 2026 World Cup. The methodology is sealed on OSF, the constants are locked behind a signed Git tag, and the champion model M2 won the locked cross-validation log-loss battery at 0.993 against an M0 pure-Elo baseline at 1.034. The technical story I find most interesting is what M2 actually chose to use as its inputs.

M2 is a convex blend, $S_i = (1 - w) \cdot \mathrm{Elo}_i + w \cdot \mathrm{FIFA}_i$, with the blend weight $w$ chosen by cross-validation on a 2010 to 2021 calibration window. The team had calibrated its own walk-forward Elo on a 347-match international tournament corpus. The optimiser's answer was $w^{*} = 1.0$. M2 dropped the bespoke Elo entirely and ran on FIFA's official ranking points alone.

That is the kind of result you only get from cross-validation. The optimiser had access to a rating system the team trusted enough to ship, and chose not to use it. The implication is not that FIFA's rankings are unusually good. It is that with 347 matches of calibration data, a locally-fit Elo is over-specified relative to the signal it can actually extract, and FIFA's broader global denominator is more useful even with its known weighting flaws.

What this prices for England. Under M2 with 10,000 Monte Carlo runs, England wins the tournament in [VERIFY]% of simulations, reaches the final in [VERIFY]%, and reaches the semifinal in [VERIFY]%. The market, de-vigged Pinnacle, sits at [VERIFY]%; the model sits [VERIFY] percentage points [ABOVE/BELOW].

The framework calls these divergences, not edges, and is explicit that it is a pricing layer rather than a prediction tool. The site is 45analytics.com; the working paper, code, and OSF lock are public.

---

Source: https://45analytics.com. OSF pre-registration: [link]. Working paper attached. Underlying England data and the blend-weight CV curve: attached CSVs.
