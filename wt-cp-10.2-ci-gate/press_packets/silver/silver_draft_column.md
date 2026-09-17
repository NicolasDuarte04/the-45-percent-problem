# DRAFT, EDIT FREELY

## A pre-registered World Cup ablation just told us shrinkage beats macro variables

The difference between a forecaster and a fortune-teller is whether the methodology was committed to in writing before the data came in. So when a team called 45 Analytics published a pre-registered, OSF-locked ablation for the 2026 World Cup, with four model variants tested out-of-sample on the 2022 hold-out, I read carefully.

The headline, by cross-validated log-loss: M2, an Elo rating blended with FIFA ranking points via a cross-validated shrinkage weight, won at 0.993. M3, a Bayesian model layering macro priors (GDP, population, climate, host status, tournament history) on Elo, came second at 1.027. Pure Elo (M0) was third at 1.034. An Elo-plus-form variant (M1) was disqualified at 1.081 per the pre-registered acceptance criteria.

Two things stand out. First, the Hoffmann-Ging-Ramasamy macro toolkit that has anchored soccer-forecasting econometrics for two decades beat pure Elo by 0.007 log-loss. With roughly 200 calibration matches, structural priors did not earn their parametric keep.

Second, the discipline that did pay was shrinkage. M2 is not a richer feature set; it is a disciplined feature set, with cross-validation choosing how much to weight the second rating. That is exactly the mechanism rating systems like SPI rely on, applied at a different layer. At this sample size, the right way to beat Elo is not to add features, but to shrink toward a second strong prior.

The 2026 cycle is five weeks away. The team has locked its pre-tournament probabilities and is publishing them publicly Sunday. Score them in July.

---

Source: https://45analytics.com. OSF pre-registration: [link]. GitHub: [link]. Working paper: attached PDF. Calibration data: attached CSV.
