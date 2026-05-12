# LAUNCH_DAY_PLAYBOOK 2026-05-08

**Owner**: Nicolás
**Day**: Friday May 8, 2026 (T-34, Launch Day)
**Press auto-send**: 10:00 ET (BM, Silver, Levine, Singh)
**Mode**: Execution. Do not improvise outside this document. Deviations get logged.

The original W-5 plan put Substack at 16:00 ET. That was wrong on reflection. Substack is moved to 09:45 so the methodology essay anchors the thread's claims before any press engagement begins. Every social asset must land before 10:00 so a journalist clicking through to 45analytics.com from the press packet sees a populated, coherent surface.

---

## Hour-by-hour

**07:30 to 08:30 ET (final prep, private)**

- Verify press queue: confirm 10:00 ET auto-send is armed for all four packets, attachments load on a fresh client, links resolve
- Verify 45analytics.com renders cleanly on mobile and desktop, OG image works, alert-subscription email loop tested end-to-end one more time
- Open `growth_log/daily_log.md`, write the day's standup entry
- Lock the Substack post into draft, ready to publish

**08:30 ET (bench heads-up, late but acceptable)**

Send DMs to your 8 to 12 bench accounts now. The ideal was 24h ago; the second-best moment is now. Use the script in §1 below. Tone is informational, not asking. Bench accounts who care will spend the morning quietly reading and quote-tweet later in the day or the next morning.

**09:00 ET (founder thread)**

Founder pinned thread posts. 11 tweets, copy in §2 below. Pin to the founder profile. Same tweet 1 also goes on the institutional account two minutes later (not as a retweet, as a manual quote).

**09:05 ET (institutional amplification)**

Institutional account quote-tweets the founder thread with the verification anchors. Copy in §3 below.

**09:30 ET (Trailer 2 drop)**

Trailer 2 posts as a separate institutional tweet. Copy in §4. Pin Trailer 1 link below the fold on 45analytics.com home, embedded in the methodology section.

**09:45 ET (Substack live)**

Methodology essay publishes at `45analytics.substack.com`. Copy in §5. Cross-post the URL from both Twitter accounts as a single follow-up reply to the pinned thread (not a new top-level tweet).

**10:00 ET (press auto-send fires)**

Stop. Watch the press inbox for delivery confirmations. No new outbound activity for 30 minutes; if any of the four addresses bounce, you want to see it before publishing more noise.

**10:00 to 12:00 ET (founder presence on Twitter)**

- Reply to every quote-tweet, reply, and DM that hits the founder account within 15 minutes
- 5 to 8 substantive replies in soccer-stats Twitter, no link unless directly responsive to a question
- One quote-tweet correcting a bad probability claim if the timeline produces an obvious one (terminal screenshot in the QT, no editorial)

**12:00 ET (short-form ships)**

First 5 short-form pieces ship across TikTok, Reels, Shorts, X video, LinkedIn (per the W-5 batch you locked yesterday). One Number, one Methodology Receipt, three cuts from Trailer 2.

**13:00 to 14:30 ET (press inbox triage)**

Lunch + same-day reply discipline on any Tier A engagement. Burn-Murdoch, Silver, Levine, or Singh: same-day reply, no exceptions, even if they reply with a clarifying question. The window between "interested" and "what is this" is hours, not days.

**14:30 ET (Reddit mod outreach)**

Send mod DMs to r/datascience, r/soccer, r/dataisbeautiful per the AMA pitch script in `T-35_BLITZ_ORGANIC.md` §3.1. Each DM offers the sub-specific custom analysis whether or not the AMA is greenlit.

**15:00 to 17:00 ET (sustain)**

- Continued press inbox triage
- Continued Twitter replies, lower frequency now
- Daily log updated with every metric: thread engagement count, Substack subs, alert subs delta, Twitter follower delta, press acknowledgements

**17:00 to 19:00 ET (close out)**

- 5+ more substantive Twitter replies on soccer-stats and quant-data threads
- Daily log final entry
- Confirm tomorrow's queue (Athletic packets to Muller, Carey, Critchley, Worville at 09:00 ET Saturday)

---

## §1 Bench DMs (Twitter, send 08:30 ET)

Copy this into each DM, customising only the first line per recipient if you have a prior interaction to reference:

```
Quick heads-up: 45 Analytics goes live publicly at 09:00 ET today.

Pre-registered probabilistic framework for the 2026 World Cup, locked on
OSF before any 2026 match was played. M2 (Elo + FIFA shrinkage blend) won
the locked CV log-loss battery at 0.993 against M0 baseline at 1.034,
verified on the 2022 hold-out. Methodology, code, and working paper all
public.

If you find it rigorous, a quote-tweet helps. If not, no expectation.

Site: https://45analytics.com
Pinned thread on @theforty_five_percent at 09:00 ET sharp.
OSF: [link]
GitHub: [link]
Trailer 1 (3 min methodology): [link]
```

Send count: 8 to 12. Track in `growth_log/bench_list.md` who got the DM and who QTs by end of day.

---

## §2 Founder pinned thread (post 09:00 ET, 11 tweets)

Each numbered block is one tweet. Post them as a connected thread on the founder account. Pin the first tweet.

**1/11**
```
Today we're publishing 45 Analytics: a pre-registered probabilistic pricing framework for the 2026 World Cup.

Not a prediction tool. A pricing layer.

Methodology locked on OSF before any 2026 match was played. M★ selected by frozen log-loss protocol.

Thread.
```

**2/11**
```
The premise: structural variables explain ~55% of World Cup variance. The remaining 45% is the project's subject.

We don't try to beat that residual. We price under it with calibrated uncertainty, and we publish the spread between our model and the de-vigged market.
```

**3/11**
```
One simulation engine: Bivariate Poisson + Dixon-Coles low-score correction, configured for the 2026 bracket (48 teams, 12 groups, knockouts to final).

10,000 Monte Carlo runs per snapshot. Deterministic seeds. Append-only forecast log. Snapshot SHA on every row.
```

**4/11**
```
Four candidate strength providers, all pre-registered:

M0: pure Elo (null baseline)
M1: Elo + exponentially-decayed form
M2: Elo + FIFA blend via cross-validated shrinkage
M3: Elo + Bayesian macro prior on Hoffmann-Ging-Ramasamy variables (GDP, population, climate, host, history)
```

**5/11**
```
Result, by cross-validated log-loss on the 2010 to 2021 calibration window with 2022 as out-of-sample hold-out:

M2: 0.993  (CHAMPION)
M3: 1.027
M0: 1.034
M1: 1.081  (DISQUALIFIED, statistically worse than baseline)

Lower is better. M★ is M2.
```

**6/11**
```
The lesson at 200-match corpus size: a richer model wins only when shrinkage is doing the work.

Layering features (form in M1, macro in M3) either disqualified or improved on the null by margins too narrow to interpret. The bias-variance bargain is unforgiving.
```

**7/11** (attach `calibration_2022_holdout.png`)
```
Calibration on the 2022 hold-out, all four models, n=64 matches, 192 probability points.

M2 hugs the diagonal. M1 swings (visible miscalibration). M0 and M3 close to each other and close to baseline.
```

**8/11**
```
The market layer pairs the model with power-method de-vigging (Shin 1993; Štrumbelj 2014) on Pinnacle, Betfair Exchange, Polymarket.

Edge: E = p_model − q_devigged. Threshold sealed pre-tournament: 3% mainline, 5% derivative.

We display divergences. We do not call them edges.
```

**9/11**
```
Five suppression rules, sealed:
1. 6h named-event window
2. 3pp / 30min intra-book price discovery
3. 2.5pp Pinnacle-Betfair cross-book spread
4. $50k Polymarket 24h liquidity floor
5. 4h Pinnacle staleness

First-rule-wins. Append-only gate log.
```

**10/11**
```
What's pre-registered: model spec, evaluation metrics (Brier, RPS, log-loss), edge thresholds, Kelly fractions and caps, gate rules, kill criterion.

~70 leaf-level constants. Signed Git tag v1.0.0-mstar-lock. Three SHA-256 anchors. Reviewer can verify in ~5 minutes.
```

**11/11**
```
Not a betting service. No picks, no plays, no tipping language anywhere on the site.

We publish probabilities, divergences, and CLV.

Site: https://45analytics.com
Working paper (15p): [link]
OSF: [link]
GitHub: [link]
Trailer 1 (3 min): [link]
```

---

## §3 Institutional amplification (post 09:05 ET)

Quote-tweet of tweet 1/11 above, from `@theforty_five_percent`:

```
Pre-registration anchors are public and verifiable.

OSF DOI: 10.17605/OSF.IO/8B5HD
Signed Git tag: v1.0.0-mstar-lock
Three SHA-256 hashes in the locked YAML bind the constants to the data.

Reviewer protocol: osf.io/spmkg → git verify-tag → sha256sum. ~5 min.
```

---

## §4 Trailer 2 drop (post 09:30 ET, separate institutional tweet, attach video)

```
Three minutes on what 45 Analytics shows you.

Probabilities. Divergences. A 1-in-N rarity stamp on every scenario you save. No picks. No tipping. Just the math.

45analytics.com
```

---

## §5 Substack first post (publish 09:45 ET)

Title: **Pre-registering a probabilistic World Cup forecast**
Subtitle (optional): *Why 45 Analytics is a pricing layer, not a prediction tool*

Body (paste into the editor; ~700 words):

```markdown
45 Analytics goes live today, five weeks before the opening match of the
2026 FIFA World Cup. The framework prices full probability distributions
over match outcomes and tournament progression rather than producing
point predictions. This post is the methodological essay that sits behind
the live terminal and the working paper.

## The 45% question

Roughly half of World Cup match-level variance resists explanation by
structural variables. The Klement-Hoffmann macroeconomic regressions,
the Dixon-Coles bivariate Poisson treatments, and the rating-system
extensions that followed all run into the same constraint. With decades
of structural covariates, ranking adjustments, and form corrections,
somewhere near 45% of tournament variance is left to chance.

The figure is not surprising. The World Cup is structurally adversarial:
64 matches, asymmetric stakes, single-elimination from the round of 32,
and a calibration corpus measured in hundreds of matches rather than the
tens of thousands available in domestic-league forecasting.

The purpose of this project is not to beat the 45% residual. It is the
constraint we take seriously.

## Why probabilities, not picks

Sports-forecasting public discourse suffers from a point-prediction
trap. Pundits pick outright winners; binary outcomes are treated with
absolute confidence; a 51% favorite is conflated with a 90% favorite.
The same blindness infects model evaluation. A model that picks the
higher-Elo team in international football clears a 60% accuracy
baseline by construction, but a high hit rate is uninformative about
whether the model is intelligent.

Moving to a full probability distribution changes everything. Calibration
becomes definable. A model is calibrated when, conditional on its 70%
predictions, the event occurs 70% of the time. Calibration is enforceable
through proper scoring rules (Brier, log-loss, ranked probability score)
whose expected value is minimised only when the forecaster reports their
true belief.

Without probabilities, the rest of this work is decoration.

## Four candidates, one champion, locked

The framework compares four candidate strength providers on out-of-sample
data from the 2022 World Cup hold-out:

- **M0**: pure Elo, the null baseline.
- **M1**: Elo + exponentially-decayed form, capped at ±15% of long-run Elo.
- **M2**: Elo blended with FIFA ranking points via cross-validated shrinkage.
- **M3**: Elo with a Bayesian macro prior on the Hoffmann-Ging-Ramasamy
  variables (GDP, population, climate, host status, tournament history).

The locked cross-validation result, by mean log-loss:

| Model | CV log-loss | Status |
|-------|-------------|--------|
| **M2_fifa** | 0.993 | **CHAMPION (M★)** |
| M3_macro | 1.027 | Eligible, improvement small |
| M0_elo | 1.034 | Baseline |
| M1_form | 1.081 | DISQUALIFIED |

The methodological reading is uncomfortable for forecasters who like
adding features: a richer model wins only when the added structure is
disciplined by shrinkage. M2 is not a richer feature set; it is a
disciplined feature set, with cross-validation choosing how much to
weight a second strong rating. The variants that simply layered features
(form in M1, macro in M3) either disqualified outright or improved on
the null by margins too narrow to interpret.

## The pre-registration

The model specification, evaluation metrics, edge thresholds, Kelly
fractions, gate rules, and kill criterion are sealed on the Open Science
Framework on 2026-04-22, the day before the opening match. The
registration carries DOI 10.17605/OSF.IO/8B5HD. Three independent
mechanisms anchor the lock: the OSF record itself, a signed Git tag
(v1.0.0-mstar-lock) on the project repository, and three SHA-256 hashes
in the sealed pre_reg_constants.yaml that bind the constants to the data
they were computed against.

A reviewer can verify the entire chain in five minutes by navigating to
osf.io/spmkg, running `git verify-tag`, and computing SHA-256 on the
three sealed artifacts. The lock cannot be moved or backdated without
invalidating the cryptographic signature.

## What you see on the site

Probabilities for every match and every tournament-progression marginal,
updated daily during the tournament. De-vigged Pinnacle, Betfair, and
Polymarket prices alongside, with the divergence (model − market)
displayed as a number, not as a recommendation. Five suppression rules
on the divergence flag (named events, intra-book price discovery,
cross-book spread, Polymarket liquidity, Pinnacle staleness). Closing
Line Value computed for every flagged forecast as the running
honesty test.

We do not tell you who to back. We do not call divergences edges. We
publish probabilities and we publish the spread.

## What this newsletter is

A research log. Weekly methodology essays through the tournament window,
the calibration challenge artifact on Sunday, the kill-criterion
checkpoint after the round of 16, and a post-tournament accuracy
write-up. No picks, no plays, no tipping. Subscribe if that is the
substack you want in your inbox.

Working paper (15 pages): [link]
OSF pre-registration: osf.io/spmkg
GitHub: [link]
Live terminal: https://45analytics.com
```

---

## What does NOT publish today (reminder)

These are scheduled for later in the sprint. Do not pull them forward without a written deviation in `growth_log/deviations.md`:

- The calibration challenge artifact (Sunday May 10, 11:00 ET)
- Show HN submission (Tuesday May 12, 07:30 ET)
- The Athletic data desk packets (Saturday May 9, 09:00 ET)
- arXiv preprint (W-4, target May 15)
- /r/dataisbeautiful organic post (W-3, Wednesday May 21)
- Reddit AMAs (W-4 onward, after mod conversations conclude)

---

## Last-mile discipline

Three things to verify before each publish action fires today:

1. No em-dash or en-dash punctuation slipped into any tweet, the Substack post, or any thread reply. Pre-registered brand discipline. (Periods, semicolons, colons, parens.)
2. No prediction language anywhere. "M2 says Brazil wins" is wrong; "Under M2, Brazil's tournament-win probability is X%" is right. The verb is *prices*, not *predicts*.
3. The four log-loss values match `data/calibration/cv_battery_results.json` to three decimals every place they appear today (M2=0.993, M3=1.027, M0=1.034, M1=1.081). One mismatch on a public artifact today and a journalist will catch it.

Move.
