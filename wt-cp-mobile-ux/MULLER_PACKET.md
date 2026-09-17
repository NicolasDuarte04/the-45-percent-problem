# Muller Press Packet (Athletic, USA exclusive)

**Target**: John Muller, The Athletic
**Send time**: Saturday May 9, 2026, 09:00 ET
**Exclusive cut**: USA tournament probabilities under M2, including conditional knockout-path probabilities given group placement
**Status**: DRAFT, do not send until USA-specific numbers are reconciled with the locked simulation output (`outputs/phase5/<latest>/team_runs.parquet`)

The Muller angle is host-nation analysis. He writes data-driven US soccer pieces for The Athletic and has the audience that will care most about USA-specific probabilities five weeks before the home World Cup. The exclusive lever is per-team granularity: he gets the USA cut, no other Athletic writer does. The other three Athletic writers (Carey, Critchley, Worville) get Brazil, Argentina, and England respectively.

---

## Section 1 — The Email

### 1.1 Subject

```
Pre-registered probabilistic framework: USA path probabilities under M2
```

### 1.2 Body

```
John,

We launched 45 Analytics yesterday: a pre-registered probabilistic
framework for the 2026 World Cup, methodology locked on OSF before any
match was played. The champion model M2 (Elo blended with FIFA ranking
points via cross-validated shrinkage) won the locked CV log-loss battery
at 0.993 against M0 baseline at 1.034, verified out-of-sample on the
2022 hold-out (working paper attached, page 7 has the ablation).

For your audience the lead number is the USA path. Under M2 with 10,000
Monte Carlo runs:

- Tournament win probability: [VERIFY]%
- Reaching the quarterfinals: [VERIFY]%
- Reaching the semifinals: [VERIFY]%
- Reaching the final: [VERIFY]%
- Group winner (Group [VERIFY]): [VERIFY]%

The bracket is the FIFA-confirmed cross-group structure, so the path
distribution is real, not assumed. The most-likely USA Round of 32
opponent under our simulation is [VERIFY], at [VERIFY]% conditional
probability. The most-likely Round of 16 opponent (conditional on
advancing) is [VERIFY].

Three deliverables for you, no return condition:

1. Calibration chart at publication resolution (PNG + SVG attached;
   our brand colours are advisory, please rebrand to The Athletic palette)
2. A 250-word draft column you can rewrite, repurpose, or discard
   (attached as draft_column.md, watermarked DRAFT, EDIT FREELY)
3. The underlying data: USA-specific probability tables across 10,000
   simulations, plus the calibration CSV

The USA cut is exclusive to you among Athletic writers; Carey, Critchley,
and Worville have different team angles.

Site: https://45analytics.com
Working paper: 15 pages, attached.
OSF: [link]
GitHub: [link]
Trailer 1 (3 min, methodology): [link]

If a citation eventually fits a piece you are writing, that is the only
return I would ask. If it does not fit, no follow-up.

Nicolás Duarte
```

### 1.3 Attachments

- `working_paper.pdf` (15 pages, shared with all packets)
- `calibration_2022_holdout.png` (publication resolution)
- `calibration_2022_holdout.svg` (vector, rebrandable)
- `calibration_data_2022_holdout.csv` (40 binned points, shared)
- `usa_path_probabilities.csv` (USA-specific, generated for this packet)
- `draft_column.md`

### 1.4 Send-time checklist

- [ ] All `[VERIFY]` placeholders in the email body replaced with locked numbers from the latest simulation snapshot
- [ ] USA group letter confirmed against `data/raw/wc2026_fixtures.parquet`
- [ ] Conditional opponent probabilities computed correctly (joint probability divided by marginal, not raw frequency across all runs)
- [ ] No tracking pixel, no UTM parameters, no link shortener
- [ ] Send between 09:00 and 09:30 ET Saturday morning

---

## Section 2 — The Draft Column

### File: `press_packets/athletic_muller/draft_column.md`

```markdown
# DRAFT, EDIT FREELY

## What a pre-registered model says about the USA's path through 2026

A team at 45 Analytics published its pre-registered probabilistic
framework for the 2026 World Cup last week, with the methodology and
champion model locked on OSF before any 2026 match was played. The
champion is M2, an Elo rating blended with FIFA ranking points via
cross-validated shrinkage; it won the locked log-loss battery against
the 2022 hold-out at 0.993, against an M0 pure-Elo baseline at 1.034.

What the model says about the USA. Under 10,000 Monte Carlo simulations
of the full bracket, the United States has a [VERIFY]% probability of
winning Group [VERIFY], a [VERIFY]% probability of reaching the
quarterfinals, and a [VERIFY]% probability of reaching the final. The
tournament-win probability sits at [VERIFY]%, well below the model's
top-tier favourites and consistent with the wider point that the home
nation premium in international football is real but smaller than retail
markets typically price it.

The path matters more than the headline number. Conditional on advancing
out of Group [VERIFY], the model's most-likely Round of 32 opponent for
the USA is [VERIFY]; the most-likely Round of 16 opponent is [VERIFY].
Each of those probabilities sits between [VERIFY]% and [VERIFY]%, which
is the structural reading: the new 32-team knockout phase widens the
distribution of plausible early opponents and rewards the host's path
less than the older 16-team format would have.

The framework is a pricing layer rather than a prediction tool, and the
team behind it is explicit that they are not making picks. They are
publishing probabilities, divergences against de-vigged Pinnacle, and
Closing Line Value as the running honesty test. The site is
45analytics.com.

[~ 250 words]

Source: 45analytics.com. OSF pre-registration: [link]. GitHub: [link].
Working paper attached. Underlying USA path data: attached CSV.
```

---

## Section 3 — Data Spec for `usa_path_probabilities.csv`

The exclusive data cut for this packet. Generated from the latest 10,000-run simulation snapshot, filtered to USA rows in `team_runs.parquet`.

Schema (8 columns x ~30 rows):

| Column | Type | Notes |
|--------|------|-------|
| metric | string | One of: group_winner, group_runner_up, group_third, qualified_r32, exit_round_<X>, reach_round_<X>, champion |
| metric_label | string | Human-readable description |
| probability | float | USA's marginal probability for the metric |
| std_error | float | Sqrt(p(1-p)/N) Monte Carlo standard error |
| ci_90_lower | float | 90% credible interval lower bound (Beta-Binomial conjugate) |
| ci_90_upper | float | 90% credible interval upper bound |
| n_runs | int | Sample size (always 10,000 unless filtered) |
| snapshot_sha | string | SHA-256 of the source `team_runs.parquet`, first 16 chars |

Plus a separate sheet `usa_path_conditional.csv` with conditional knockout-path probabilities:

| Column | Type | Notes |
|--------|------|-------|
| condition | string | e.g. "won_group_X", "runner_up_group_X" |
| round | string | R32, R16, QF, SF, Final |
| opponent | string | Three-letter country code |
| conditional_probability | float | P(opponent | condition) |
| n_conditioned_runs | int | Number of runs satisfying the condition |

Acceptance test: marginal probabilities across all `metric` rows for a fixed event class must sum to 1.0 within 1e-9. If they do not, the spec did not bin the engine output correctly.

---

## Section 4 — Failure Modes

If Muller does not respond:

- One follow-up email Wednesday May 13, single line
- After that, no further direct contact. He is tagged in the calibration challenge tweet on Sunday May 10 regardless

If Muller responds with a clarifying question:

- Same-day reply, fully answered. He is data-fluent; clarifications are usually about methodology or about which simulation snapshot the numbers are drawn from. Send the snapshot SHA along with any answer

If Muller asks for additional cuts:

- Anything that derives cleanly from `team_runs.parquet` ships within 24 hours, no exceptions
- New cuts that require a fresh simulation run flag with the timestamp; do not pretend a 24h-old snapshot is real-time

If Muller asks to publish:

- Yes, immediately. No conditions, no embargo timing games, no co-author asks
- We provide whatever else he needs and do not amplify from the institutional account on the same day; wait 24 hours so the placement reads as his story

If The Athletic publishes and gets a number wrong:

- Email him privately, factually, no public correction. Provide the right number and the source SHA. Trust him to handle it. Do not tweet about it

---

## Section 5 — File Manifest

```
press_packets/athletic_muller/
├── README.md                            (snapshot SHA, run timestamp, send log)
├── email.md                             (Section 1 above)
├── draft_column.md                      (Section 2 above, watermarked)
├── working_paper.pdf                    (shared, 15 pages)
├── calibration_2022_holdout.png         (shared)
├── calibration_2022_holdout.svg         (shared)
├── calibration_data_2022_holdout.csv    (shared)
├── usa_path_probabilities.csv           (exclusive)
└── usa_path_conditional.csv             (exclusive)
```

The shared files are identical to the BM/Silver packets; the two exclusive files are generated only for this packet.

The Muller packet ships at 09:00 ET Saturday May 9, alongside the Carey, Critchley, and Worville packets. Each goes to a different team allocation; the four Athletic writers do not compete on the same story.
