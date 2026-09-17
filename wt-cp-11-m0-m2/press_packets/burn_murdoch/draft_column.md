# DRAFT, EDIT FREELY

## When shrinkage beats both naïve Elo and macro priors: a pre-registered World Cup ablation

A team at 45 Analytics has published its full 2026 World Cup forecasting framework, locked and pre-registered on OSF before any 2026 match was played. The pre-registration matters because it removes the temptation to pick, after the fact, the variant of a model that ended up looking best.

The setup compares four candidates on the 2022 World Cup hold-out: M0 (pure Elo), M1 (Elo plus exponentially-decayed recent form), M2 (Elo blended with FIFA ranking points via cross-validated shrinkage), and M3 (a Bayesian macro prior on the Hoffmann-Ging-Ramasamy variables: GDP per capita, population, climate, host status, tournament history).

By cross-validated log-loss: M2 wins at 0.993. M3 second at 1.027. M0 third at 1.034. M1 disqualified at 1.081 per the pre-registered acceptance criteria. A richer model wins, but only when the added structure is disciplined by shrinkage. The variants that simply layered features (form in M1, macro in M3) either disqualified or improved on the null by a margin too narrow to interpret (M3 beat M0 by 0.007 log-loss).

This is not an argument that form, ranking, or macroeconomics are irrelevant to who wins a World Cup. It is that with roughly 200 calibration matches across three prior tournaments, the bias-variance bargain pays out only when added signal is shrunk toward a strong prior, here Elo itself. M2's win is a methodological win for shrinkage estimators in small-sample sports forecasting.

The team's framing is more honest than most: 45 Analytics calls its site a probabilistic pricing layer, not a prediction tool, and publishes its full reliability diagram. The 2026 cycle starts in five weeks. We should ask the same of every World Cup model we cite this summer.

---

Source: https://45analytics.com. OSF pre-registration: [link]. GitHub: [link]. Calibration data: attached CSV. Working paper: attached PDF.
