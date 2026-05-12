# Silver Press Packet

**Target**: Nate Silver, Silver Bulletin
**Send time**: Friday May 8, 2026, 10:00 ET (parallel send with Burn-Murdoch packet)
**Status**: DRAFT, do not send until all log-loss values reconcile with `data/calibration/` outputs

Silver-specific framing: he ran SPI for years; he uses shrinkage estimators; he has been publicly insistent on pre-registration as the dividing line between forecasting and selection bias. The packet's hook is the macro-null finding (which validates SPI-style rating-system purity over Hoffmann-Klement-style structural priors) plus the shrinkage-wins finding (which is itself a Silver-style methodological move applied at a different layer). Both are honest and both are catnip for him.

---

## Section 1 — The Email

### 1.1 Subject

```
M0-M3 ablation on 2022 World Cup hold-out, pre-registered on OSF
```

### 1.2 Body

```
Nate,

Your repeated insistence that pre-registration is what separates
forecasting from selection bias was the founding methodological commitment
of our 2026 World Cup framework. We pre-registered on OSF in Q1 and just
locked the M-star selection.

The headline, by cross-validated log-loss on the 2022 hold-out:

  M2 (Elo blended with FIFA ranking points via cross-validated
      shrinkage)                                       = 0.993  (CHAMPION)
  M3 (Bayesian prior on macro variables: GDP, population,
      climate, host status, tournament history)        = 1.027
  M0 (pure Elo, an SPI-style baseline)                 = 1.034
  M1 (Elo plus exponentially-decayed form)             = 1.081  (DISQUAL)

Two findings your readers would care about most.

First, the macro toolkit (M3) beat pure Elo by 0.007 log-loss. With
roughly 200 calibration matches, structural priors did not earn their
parametric keep. The Hoffmann-Ging-Ramasamy approach that has anchored
soccer-forecasting econometrics for two decades does not, on this hold-
out, justify its complexity over a rating system.

Second, the discipline that did pay was shrinkage. M2 is not a richer
feature set; it is a disciplined feature set, with cross-validation
choosing the Elo-to-FIFA blend weight. That is the same mechanism rating
systems like SPI rely on, applied one layer up.

Site is at https://45analytics.com. Code on GitHub. Working paper is 15
pages. We have also locked our pre-tournament probabilities for all 48
teams, group winners, and the 30 most market-divergent matches; that
artifact ships Sunday May 10 as a public calibration challenge open to
anyone who wants to score against us in July.

Three deliverables, no return condition:

1. Calibration chart at publication resolution (PNG + SVG attached)
2. A 250-word draft column for Silver Bulletin (DRAFT, EDIT FREELY)
3. The underlying CSV (calibration_data_2022_holdout.csv)

If you would ever take a guest essay or a footnote on the macro-null
result, the door is open. If not, the calibration challenge is the
standing invitation, no commitment required.

Nicolás Duarte
45analytics.com
OSF: [link]
GitHub: [link]
Working paper PDF attached.
Trailer 1 (3 minutes, methodology): [link]
```

### 1.3 Attachments

- `calibration_2022_holdout.png` (3000x1875)
- `calibration_2022_holdout.svg`
- `calibration_data_2022_holdout.csv`
- `silver_draft_column.md` (Section 2 below)
- `working_paper.pdf`

### 1.4 Send-time checklist

- [ ] All four log-loss values match `data/calibration/` to four decimals when re-rounded
- [ ] OSF link is the public OSF URL
- [ ] No tracking pixel, no UTM parameters, no link shortener
- [ ] Send between 10:00 and 10:30 ET. Silver reads in ET; mid-morning is his sweet spot
- [ ] Same chart and CSV as the Burn-Murdoch send; one canonical asset, two contextualised pitches

---

## Section 2 — The Draft Column

### File: `silver_draft_column.md`

```markdown
# DRAFT, EDIT FREELY

## A pre-registered World Cup ablation just told us shrinkage beats macro variables

The difference between a forecaster and a fortune-teller is whether the
methodology was committed to in writing before the data came in. So when
a team called 45 Analytics published a pre-registered, OSF-locked
ablation for the 2026 World Cup, with four model variants tested out-of-
sample on the 2022 hold-out, I read carefully.

The headline, by cross-validated log-loss: M2, an Elo rating blended with
FIFA ranking points via a cross-validated shrinkage weight, won at 0.993.
M3, a Bayesian model layering macro priors (GDP, population, climate,
host status, tournament history) on Elo, came second at 1.027. Pure Elo
(M0) was third at 1.034. An Elo-plus-form variant (M1) was disqualified
at 1.081 per the pre-registered acceptance criteria.

Two things stand out. First, the Hoffmann-Ging-Ramasamy macro toolkit
that has anchored soccer-forecasting econometrics for two decades beat
pure Elo by 0.007 log-loss. With roughly 200 calibration matches,
structural priors did not earn their parametric keep.

Second, the discipline that did pay was shrinkage. M2 is not a richer
feature set; it is a disciplined feature set, with cross-validation
choosing how much to weight the second rating. That is exactly the
mechanism rating systems like SPI rely on, applied at a different layer.
At this sample size, the right way to beat Elo is not to add features,
but to shrink toward a second strong prior.

The 2026 cycle is five weeks away. The team has locked its pre-tournament
probabilities and is publishing them publicly Sunday. Score them in July.

[~ 260 words]

Source: 45analytics.com. OSF pre-registration: [link]. GitHub: [link].
Working paper: attached PDF. Calibration data: attached CSV.
```

### 2.1 Tone notes

- Silver's voice is more first-person than Burn-Murdoch's. The opening "I read carefully" is in his register; if he edits, he edits down rather than rewriting tone
- The macro-null finding is the lede for him; the shrinkage finding is the methodological close. Order matters
- "Score them in July" is the ask without being an ask. Leaves him room to take or leave the calibration challenge

### 2.2 Numbers to verify before send

Same four log-loss values as the Burn-Murdoch packet. If anything reconciles differently in re-runs, both packets update before either ships. Send the same numbers to both targets or send to neither.

---

## Section 3 — Failure Modes

If Silver does not respond:

- One follow-up email Wednesday May 13, single line ("Following up; happy to share more if useful, no expectation otherwise"). After that, no further direct contact
- He gets tagged in the calibration challenge tweet on Sunday May 10 regardless of whether he replied to the email

If Silver responds with a clarifying question:

- Same-day reply, fully answered. He has been a forecaster long enough that his clarifications are usually about methodology, not framing
- If he asks for the M1 disqualification rationale specifically, that is the working-paper appendix; send the appendix, not just a paraphrase

If Silver invites a guest essay:

- Yes, immediately. Drafted essay arrives within 48 hours. Length to his spec, structure to his spec
- The chart we sent is reused; we do not re-render unless he requests
- After publication, the institutional account does not amplify on the same day. Wait 24 hours

If Silver disputes the macro-null finding:

- He might. He has read more World Cup forecasting literature than almost anyone outside academia
- Same-day, factual reply: here is the regression, here is the fold structure, here is the cross-validation seed, here is the 95% CI on the M3-M0 gap
- Engage as a peer in good faith. Do not retreat to "well, it is just one sample." Sample size is exactly the methodological point

---

## Section 4 — File Manifest

```
press_packets/silver/
├── README.md                             (snapshot SHA, ablation timestamp, send log)
├── email.md                              (Section 1 above)
├── silver_draft_column.md                (Section 2 above)
├── calibration_2022_holdout.png          (same chart as BM packet)
├── calibration_2022_holdout.svg          (same chart as BM packet)
├── calibration_data_2022_holdout.csv     (same CSV as BM packet)
└── working_paper.pdf
```

The chart and CSV are shared assets, identical files in both packets. The narrative around them differs; the data does not.
