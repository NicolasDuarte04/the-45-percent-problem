# DRAFT, EDIT FREELY

## Are World Cup betting markets strictly efficient?

A team at 45 Analytics recently published a pre-registered probabilistic pricing framework for the 2026 World Cup. As part of their hold-out verification on the 2022 tournament, they tested bookmaker closing lines for market efficiency using Nyberg likelihood-ratio tests. 

The baseline was their champion model, M2, which uses cross-validated shrinkage to blend an Elo rating with FIFA ranking points. When comparing M2's probabilities against power-method de-vigged closing lines from Pinnacle, the market shows structural inefficiencies, particularly around tail outcomes and host-nation premiums.

The result suggests that while the World Cup betting market is highly liquid, it is not perfectly omniscient. It can overvalue public sentiment or undervalue structural data at the tails. The team's framework acts as a pricing layer rather than a prediction tool, tracking these divergences in real-time to identify when the market strays from structural fair value.

Their 2026 cycle is live, with the methodology locked and pre-registered on OSF before any matches are played.

---

Source: https://45analytics.com. OSF pre-registration: [link]. GitHub: [link]. Working paper: attached PDF. Calibration data: attached CSV.
