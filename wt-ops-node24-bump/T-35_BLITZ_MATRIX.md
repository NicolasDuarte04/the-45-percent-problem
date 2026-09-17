# T-35_BLITZ_MATRIX

**Document owner**: Lead Growth Architect
**Status**: EMERGENCY OPERATING PLAN, supersedes `GTM_DISTRIBUTION_MATRIX.md` in entirety
**Today**: 2026-05-07 (Thursday)
**Kickoff**: 2026-06-11 (Thursday), Estadio Azteca, Mexico vs. opener
**Window**: 35 days to first whistle, 73 days to final
**Posture**: Saturation under brutalist discipline. Speed without aesthetic compromise.

---

## 0. Reality Check

The previous plan assumed two years of compounding authority. We do not have it. We have the assets, the methodology, the live terminal, and 35 days of rising public attention curve before kickoff.

What we keep from the old plan: the brand discipline, the no-betting-advice posture, the credibility scaffold logic, the suppression rules.

What we burn: the 6-month karma cycle, the 14-day reviewer follow-ups, the "whisper before broadcast" sequence.

The compression strategy: the brutalist Bloomberg-terminal aesthetic *is* the credibility scaffold when there is no time to build a citation graph. We must look so unmistakably serious that the absence of a 12-month track record is irrelevant. The trailers do in 90 seconds what we previously planned to do over 18 months.

The risk we are pricing: at T-35 we cannot afford a single off-tone deliverable. One sportsbook-flavored tweet, one "lock of the day" thumbnail, one influencer in a polo shirt, and the entire year of methodology work gets coded as just another bracket app. Brand discipline tightens, not loosens, under speed.

---

## 1. Sprint Architecture (5 calendar weeks, 35 days)

| Week | Window | Theme | Daily ship rate |
|---|---|---|---|
| W-5 | May 7 to May 13 (T-35 to T-29) | Press blitz + asset drop | 1 press wave/day, 3 short-form/day |
| W-4 | May 14 to May 20 (T-28 to T-22) | Saturation + paid live | Press round 2, 4 short-form/day, paid uncapped within envelope |
| W-3 | May 21 to May 27 (T-21 to T-15) | Conversation capture | Daily Number, paid peak, creator embeds |
| W-2 | May 28 to Jun 3 (T-14 to T-8) | Pre-kickoff crescendo | Press round 3, opening-match analysis content, alert push |
| W-1 | Jun 4 to Jun 10 (T-7 to T-1) | Final approach, ops readiness | Daily snapshots public, kickoff-day countdown, paid recalibrated to retargeting |
| W0 | Jun 11 to Jul 19 | Operate | Daily snapshot pipeline, real-time divergence reports |

Single hard gate: any week's KPI missed by >40% triggers a 24-hour stand-down to diagnose before the next week begins. We do not push harder into a leak.

---

## 2. Channel 1: Press and Authority Blitz

**Mandate**: Replace the academic citation graph with a tier-1 data-journalism citation graph in 21 days. The byline of one Burn-Murdoch piece or one Athletic feature is worth a year of reviewer outreach in this window.

### 2.1 Target list (named, sequenced)

**Tier A: Methodology-fluent data journalists (pitch this week)**

- **John Burn-Murdoch** (Financial Times). Lives for calibration plots. Pitch: pre-registered model + market efficiency divergence chart. Hook is methodology, not picks.
- **Nate Silver** (Silver Bulletin). Has run World Cup models. Pitch: ablation results vs. his historical SPI approach. Offer Substack guest contribution exchanging methodology disclosure for amplification.
- **Geoff Foster, Carl Bialik, Neil Paine** (FiveThirtyEight alumni, now scattered across Substacks and The Athletic). Pitch: dataset access + named acknowledgement.
- **John Muller, Mark Carey, Mark Critchley, Tom Worville** (The Athletic data desk). Pitch: bespoke pre-tournament team analyses, one per writer, exclusive numbers per outlet so they do not compete on the same story.
- **Karun Singh** (independent, ex-StatsBomb). Pitch: collaborative annotated visualization of the 10,000-simulation density.
- **The Upshot team** (NYT). Pitch: probability divergence, model vs. market, framed as a financial-markets story not a soccer story.
- **Joe Pompliano, Front Office Sports data team**. Pitch: the business-of-uncertainty angle.
- **Bloomberg sports data desk + Bloomberg Opinion (Matt Levine adjacent)**. Pitch: bookmaker market efficiency in a high-volume event. Levine touches gambling markets occasionally; the de-vigging methodology is a Money Stuff sentence.

**Tier B: Long-form analytical voices (pitch W-4)**

- **The Ringer** (Brian Phillips, Ryan O'Hanlon, Bill Simmons-adjacent). Pitch: the "we cannot predict, we can only price" thesis as a feature essay.
- **The Guardian** (Sean Ingle, Jonathan Wilson). Tone-fit on the methodological humility angle.
- **Reuters** (Simon Evans), **AP**, **AFP**. Wire pickup on the model-vs-market divergence at kickoff.
- **Wired**, **Quanta Magazine**, **MIT Technology Review**. Pitch: the methodology piece, not the prediction piece.

**Tier C: Podcast circuit (pitch W-3)**

- *Sports analytics*: Analytics FC, The Double Pivot, Total Soccer Show.
- *Data and forecasting*: The Knowledge Project (Shane Parrish), Data Skeptic, Linear Digressions.
- *Markets and gambling structure (no betting-advice shows)*: Odd Lots (Bloomberg), Money Stuff podcast if pitchable.

### 2.2 Pitch protocol

We use one master pitch with three swappable modules per outlet. No mass send. Every email goes to one inbox.

**Subject patterns** (rotate, never reuse on the same outlet):

- *Pre-registered: probability divergence in the 2026 World Cup market*
- *Methodology question for [specific recent piece]*
- *Embargoed: 10,000-simulation model vs. Pinnacle de-vigged probabilities*

**Master pitch body (~110 words)**

```
[Greeting].

We pre-registered a probabilistic framework for the 2026 World Cup on OSF
last quarter. Today, with 35 days to kickoff, the model assigns
[specific concrete probability that will surprise this writer's audience],
which sits [X percentage points] off the de-vigged Pinnacle market.

Methodology is locked, code SHA on GitHub, snapshots are append-only,
M-star was selected by frozen log-loss protocol on the 2022 hold-out.
Working paper is 14 pages.

Two assets, your call:
- Three-minute methodology trailer (Trailer 1, link)
- Live terminal access, including the daily divergence layer

Exclusive numbers available per outlet for the next 72 hours.
Working paper attached.

[Name]
```

The "exclusive numbers" line is the lever. Every Tier A outlet receives a different lead probability, different team, different group, so they do not run the same story. Spreadsheet of allocations lives at `growth_log/press_allocations.csv`. No outlet learns it is one of many; the allocation is asymmetric distribution of the same simulation output.

### 2.3 Send schedule

| Day | Action | Volume |
|---|---|---|
| May 7 (today) | Tier A pitches drafted, allocations assigned, list reviewed | 0 sent |
| May 8 | Tier A round 1 sent (15 pitches, batched 8am ET, 2pm ET) | 15 |
| May 9 to 10 | Triage, schedule calls, begin custom data drops for Tier A interest | inbound |
| May 11 | Tier A non-responders followed up, single message | 8 max |
| May 12 to 13 | Tier B prep, podcast list confirmed | 0 sent |
| May 14 | Tier B round 1 sent | 12 |
| May 18 to 22 | Tier C podcast outreach | 8 |
| May 25 to 29 | Press round 2: "What our model says about [first match] / [host nations] / [your team]." Personalized angle per outlet that already wrote about us. | unlimited |
| Jun 1 to 5 | Press round 3: opening-match commentary, divergence one-pager. | unlimited |

Inbound triage rule: any Tier A response gets a same-day reply, even on weekends. The window between "interested" and "what is this" is measured in hours during a tournament news cycle. We staff the inbox accordingly.

### 2.4 What we offer, what we hold back

Offered freely:
- Working paper, OSF link, GitHub, methodology trailer, live terminal access, named acknowledgement
- Custom-cut probability slices per outlet (the lever)
- Quote-on-demand from a named methodology lead

Held back until on-record interest:
- Daily divergence snapshot during tournament (this is the W0 retention asset; we do not give it away pre-launch except to confirmed press partners)
- The market-efficiency working paper sub-section (this is the post-tournament academic submission; only Tier A methodology writers see it)

### 2.5 Output artifacts (W-5 to W-3 deliverables)

- 3+ Tier A bylines secured by May 25
- 1 podcast booking by May 30 (long-form audio anchors the post-tournament archive)
- `press_log.csv` updated daily, every contact, every reply, every published mention

---

## 3. Channel 2: Social Sprint

**Mandate**: Skip the Reddit warmup, deploy the trailers and the OG share asset as legitimacy carriers, and let the founder account do the human-voice work that an institutional account cannot. We do not pretend to be a 6-month native. We are openly arriving with a thesis and showing the receipts.

### 3.1 Reddit, in 35 days

We cannot karma-farm. Three plays only:

**Play A: Direct mod outreach**

For r/soccer, r/datascience, r/MachineLearning, and the largest national team subs (r/USsoccer, r/CanadaSoccer, r/socceroos, r/Gunners-tier diaspora subs for travelling fans), the founder writes the head moderator privately. The pitch is a structured AMA scheduled for W-4 or W-3, not a self-post. Mods respond well to "we have a working paper on OSF, we want to do this above-board, please tell us your rules." This is a 24-hour conversation per sub, not a 6-month relationship build.

**Play B: Reddit promoted posts (paid)**

r/soccer, r/datascience, r/sports, r/dataisbeautiful run promoted posts that look native because *ours actually are*: terminal screenshot, no team logos, monospace caption, no CTA copy beyond "explore your scenario." Reddit's CPC on these subs runs $1.50 to $4.00. We allocate per Section 4.

**Play C: Answer-only contribution from a real human**

The founder, on a 6-year-old personal Reddit account with non-zero history, replies under questions that can be answered with our terminal. Three to five replies a day, no link unless asked. This is not karma farming; this is using existing personal credibility as the carrier. Same account that has been posting in r/soccer about Colombia for a decade.

What we do *not* do: create new accounts, use multiple accounts, link the terminal in unrelated threads, run any contest or giveaway, post in r/sportsbook or r/Soccerbetting at all in the next 35 days.

### 3.2 Twitter/X, deployed today

The institutional account (`@theforty_five_percent`) and the founder account run in parallel from May 8.

**Day 1 (May 8) launch sequence:**

- 9:00 ET: Founder pinned thread, 11 tweets, walks through the methodology with screenshots from the terminal. Closes with Trailer 1 embed.
- 9:05 ET: Institutional account quote-amplifies the thread, adds OSF link.
- 9:30 ET: Trailer 2 (viral engine, OG rarity image) drops as a separate institutional post.
- Throughout day: founder replies to 20+ ongoing soccer/probability tweets with terminal screenshots and methodology corrections. Each reply is substantive; none are promotional.

**Coordinated amplification (the bench)**

We secure, before launch day, 8 to 12 quiet endorsers: the academics who replied to the original outreach window if any, friendly podcasters, ex-FiveThirtyEight contacts, sports analytics independents, two or three soccer-Twitter writers with 20k+ followers. They are not promised anything; they are sent the trailer 48 hours early and asked, plainly, "if you find this rigorous, a quote-tweet helps." No dollar exchange. Names go in `bench_log.md`.

**Daily cadence after launch**

- Founder: 4 to 7 substantive replies/day on soccer-stats Twitter; 1 original analysis tweet/day with a terminal-derived chart.
- Institutional: 1 daily Number (Section 5 archetype) with the OG-derived chart; 1 weekly methodology piece; aggressive RT of any Tier A press.

**Disagreement protocol**

When a popular voice posts a directionally wrong probability claim (which will happen 5 to 10 times daily during W-2 and W-1), we have a fixed reply pattern: quote-tweet, single line of correction, terminal screenshot showing the actual posterior, OSF link in the second tweet of the thread. No "ratio" attempts. No dunking. The screenshot does the work.

### 3.3 The trailers as legitimacy carriers

Trailer 1 (research, methodology, the Vault) is the credibility anchor. Deployed:
- Pinned on both Twitter accounts from May 8 onward
- Embedded on the terminal landing page above the fold
- Pasted into every Tier A press pitch
- Sent direct to the 12-account bench 48 hours pre-launch
- Cut into one 4-minute YouTube anchor video for SEO and durable surface

Trailer 2 (viral engine, OG rarity sharing) is the activation engine. Deployed:
- Same Twitter pinning logic
- Cut into 5 short-form vertical clips per Section 5 (Channel 4)
- Used as the lead creative on paid TikTok/Reels (Section 4)

We never run Trailer 2 without Trailer 1 visible in the same surface. The viral creative without the methodology anchor reads as gimmick. Order matters.

### 3.4 The OG image as community currency

The dynamic 1-in-N rarity image is the single most efficient social asset we have for the next 35 days. Activation pattern:

- Every Tier A press piece links to a custom-rendered OG slot for the journalist's home country or featured team
- Every podcast appearance has a host-specific scenario rendered live during recording, then shared on the host's account post-publish
- Every paid Reddit post creative is an OG image from a notable scenario (e.g. an underdog reaching the semifinal, a host-nation early exit, a 1-in-50,000 final pairing)
- The terminal home page has a "render your scenario" CTA above the alert subscription, optimised for mobile share

The asset's job is to convert spectator attention into participant attention. Conversion target: 12% of unique terminal sessions produce a share, 30% of which produce an inbound visit, 8% of inbound shares produce an alert subscription. These targets are aggressive; they are tracked daily.

### 3.5 Output artifacts (W-5 to W-1)

- 5,000 alert subscribers by May 25
- 15,000 alert subscribers by June 10
- Top 5 r/soccer threads cite the terminal organically (we measure this)
- 30+ quote-amplifications by named soccer/data accounts on Twitter
- `social_log.csv` daily, append-only

---

## 4. Channel 3: Paid Acceleration

**Mandate**: Deploy capital starting May 8 to force visibility into surfaces where 6 months of organic build is now impossible. Every dollar must compound either onto a press placement, onto a methodology surface, or onto an alert subscription. No paid dollar buys raw impressions in isolation.

### 4.1 Total envelope and tiering

Recommended 35-day envelope: $180,000 to $240,000, deployed in four tiers. Numbers are operational ranges; lock the exact amount today before any tier goes live.

| Tier | Allocation | $ range | Surfaces | Goal |
|---|---|---|---|---|
| 1 Newsletter sponsorships | 25% | $45k to $60k | Silver Bulletin, John Burn-Murdoch FT alerts (if available), Stratechery sponsor slot, Money Stuff sponsor slot, Sports Spreadsheet, The Athletic newsletter sponsorships, FT Scoreboard | Premium credibility through proximity; alert signups |
| 2 Reddit + X promoted | 30% | $55k to $72k | r/soccer, r/datascience, r/sports, r/dataisbeautiful; X promoted tweets targeting follower lists of 538 alumni, Burn-Murdoch, soccer analytics handles | Direct niche penetration |
| 3 TikTok + Reels boost | 25% | $45k to $60k | Spark Ads on top-performing organic content; lookalike audiences off alert subscribers; geo-weighted to host countries (US, Mexico, Canada) and qualified national audiences | Algorithmic reach with our own creative |
| 4 Search + retargeting | 20% | $35k to $48k | Google Search on long-tail probability queries; programmatic retargeting on high-intent terminal visitors; YouTube pre-roll on Trailer 1 | Capture and retention |

Tier order is also chronological priority. Tier 1 placements get booked May 8 to 10 because newsletter slots are scarce. Tier 4 retargeting only switches on once we have a 30,000+ session pixel base, around May 18.

### 4.2 Creative discipline (paid ads)

Every paid asset that ships passes the same brand gate as organic content. Three rules:

1. **No team logos, no national flags, no player imagery.** All paid creative uses our own monospace renderings of country codes (BRA, ARG, MEX), terminal-green-on-black charts, and the OG share image where a case-specific scenario is the visual.
2. **No imperative voice.** No "Predict now," "Beat the bookies," "Don't miss out." Headline patterns: *"Brazil: 18.4% to win. The market says 21.2%."* and *"Render your scenario. 1 in 47,300 picked yours yesterday."*
3. **No financial offer language.** No reference to bookmaker odds, no payout numbers, no "value bet" framing. The market layer is described as "implied probability divergence," consistently, in every ad.

Any creative that fails these is rejected before flight. Tracker in `paid_creative_log.md`.

### 4.3 Tier 1: Newsletter sponsorships, in detail

Why this tier first: a 200-word sponsor blurb in Silver Bulletin reaches roughly the same audience as 20 well-shared subreddit posts and arrives pre-validated by the host's editorial trust. Cost is high; signal-to-noise is unmatched.

Targets, in order of approach (May 8 to 10):

- Silver Bulletin (Nate Silver). Sponsor slot $4k to $8k per send. Aim for 2 sends pre-tournament, 1 during.
- Money Stuff (Matt Levine, Bloomberg). Mass audience, finance-literate, sponsor slot exists indirectly via Bloomberg sales. Probably $20k to $40k for tournament-window placement; long lead time risk; pitch immediately.
- The Athletic newsletter (multiple soccer-specific newsletters; sponsor slots negotiated through their ads desk).
- Sports Spreadsheet, Sportico, Front Office Sports daily.
- Stratechery, The Information (lower probability of fit; pitch anyway, the rejection is cheap).
- Specialist data newsletters: Visualising Data (Andy Kirk), Quantum of Sollazzo, Data Is Plural (Jeremy Singer-Vine). Three-figure to low four-figure sponsor slots; outsized fit.

If a slot cannot be bought because the lead time has closed, we shift to direct paid post on the host's social channel for the same audience at lower fidelity.

### 4.4 Tier 2: Reddit and X paid distribution

Reddit promoted posts go live May 11 once the AMA conversation with mods has been opened. Running paid ads while we are also asking mods for AMA slots looks bad; sequence matters. Allocations within Tier 2:

- r/soccer: 35% of Tier 2 spend, weighted to W-3 and W-2
- r/datascience and r/dataisbeautiful: 15% of Tier 2 spend, methodology creative only
- r/sports and team-specific subs: 25% of Tier 2 spend, geo and team weighted
- X promoted tweets: 25% of Tier 2 spend, exclusively on follower-list targeting (538 alumni, Burn-Murdoch, soccer analytics writers, FT data desk readers)

X promoted creative is exclusively the daily Number archetype. Reddit creative is exclusively the OG rarity image.

### 4.5 Tier 3: TikTok and Reels Spark Ads

We do not buy raw cold reach on TikTok. Spark Ads on our own top-performing organic posts only. The reason is creative quality control: the algorithm rewards the format we already produce, and amplifying organic content keeps us inside the brand discipline. Three creative bands:

- Boost any organic Number that crosses 50,000 organic views in 24 hours. Boost budget: $3k to $5k.
- Boost any Methodology Receipt that crosses a 0.7% follow-through rate. Boost budget: $5k to $8k.
- Lookalike campaigns off the email subscriber list, exclusively targeted to US, MX, CA in W-2 and W-1.

### 4.6 Tier 4: Search and retargeting

Google Search keywords are pre-locked, never expanded ad hoc:

- *world cup 2026 probabilities*
- *world cup 2026 simulator*
- *world cup forecast model*
- *world cup model vs market*
- *bivariate poisson world cup*
- *dixon-coles world cup*
- *world cup monte carlo*

Negative keywords are aggressive: anything containing *bet, betting, picks, odds, parlay, sportsbook, prop, lock* gets blocked. We do not want that traffic.

Retargeting is conservative: 30-day window, frequency cap 4 per week, exclusion list anyone who has already subscribed to alerts. Creative is exclusively Trailer 1 short-cut + alert-subscription CTA.

### 4.7 Paid kill criteria

Any tier missing its allocation efficiency target by >35% on day 7 of operation gets paused, re-creatived, relaunched. We do not pour money into a leak. Audit every Tuesday.

### 4.8 Output artifacts

- `paid_log.csv` daily, append-only, every dollar reconciled to a spend line and a measured outcome
- Weekly tier review document, written, archived
- A paid pixel base of 50,000+ unique terminal sessions by May 25 (this powers retargeting in W-2 and W-1)

---

## 5. Channel 4: Algorithmic Wave

**Mandate**: Ship vertical short-form content starting tomorrow (May 8). 35 days, ~140 pieces, batched and templated. The algorithm rewards consistency more than novelty; we exploit that.

### 5.1 Production architecture

Batch shoot every Sunday and Wednesday for the upcoming 3-day window. Templates locked. One operator, one editor, one motion designer. No improvisation on camera; every piece is scripted in a 2-line shot list before any frame is captured.

### 5.2 Daily ship rate

| Surface | Daily | Weekly batch | Notes |
|---|---|---|---|
| TikTok | 3 | 21 | Primary. Longest tail. Fastest feedback loop. |
| Reels | 3 | 21 | Cross-post + 1 native variant per week. |
| YouTube Shorts | 2 | 14 | Cross-post + Methodology Receipts native. |
| LinkedIn video | 1 | 7 | Methodology Receipt + Disagreement only. |
| X video | 2 | 14 | Number + Disagreement, native upload. |

Total per day: 11 ships across 5 surfaces, ~80% cross-posted, ~20% surface-native.

### 5.3 Format archetypes (compressed from prior plan)

**The Number** (15-22s, daily). Single counter-intuitive probability + 10,000-simulation density visual + terminal CTA. Source: daily snapshot. Production time: 90 min for 3 pieces.

**The Disagreement** (20-30s, 4x/week). Pundit prediction vs. our posterior, no editorial voice. Source: scraped pundit predictions, fact-checked against terminal.

**The Methodology Receipt** (45-75s, 3x/week). Voiceover walkthrough of one design choice (de-vigging today, Dixon-Coles tomorrow, the volatility gate Friday). Source: working paper sections.

**The Rarity Reveal** (8-15s, 2x/week). User-generated OG share asset, posted with permission. Source: terminal share flow, opt-in collection.

**The Divergence Map** (new for blitz, 30-45s, 2x/week). Live model-vs-market chart for a single team or group, animated, no commentary. Pure data ASMR. Highest save-rate format on the existing channel benchmarks.

### 5.4 Hook discipline

All hooks open with a number, a country code, or a divergence. Banned openers: *"Hey,"* *"Did you know,"* *"Here is why,"* *"Wait until you see,"* any first-person voiceover that starts with "I" or "we." If a script opens any other way it gets rewritten before shoot.

### 5.5 Trailer 2 cut-down assignments

Trailer 2 produces 7 short-form pieces, scheduled across W-5 and W-4:

1. The 1-in-N reveal close-up (8s, hook for the rarity engine) — Reels + TikTok, May 8
2. The terminal type-out sequence (12s, methodology hook) — TikTok + Shorts, May 9
3. The leaderboard scroll (15s, social proof hook) — Reels + TikTok, May 11
4. The kickoff-day countdown (10s, urgency hook) — all surfaces, May 13
5. The host-nation specific cut (3 versions: US, MX, CA) (12s each) — Reels native, geo-targeted, May 14 to 16
6. The methodology one-liner (20s, audio quote) — LinkedIn + Shorts, May 15
7. The "what is the model saying today" loop (15s, recurrent format) — TikTok native, May 18 onwards

Trailer 1 is *not* cut down for short form. Trailer 1 lives as a single anchor on YouTube, the website, and pinned on Twitter. Cutting it dilutes the credibility weight; it stays whole.

### 5.6 Paid amplification of organic short-form

Per Section 4.5, we boost only organic content that has cleared a quality threshold. The Spark Ads layer is judgment-gated, not auto-spend.

### 5.7 Output artifacts

- 140+ short-form pieces shipped by June 10
- A repurposable archive for the W0 tournament window
- 25k follower base across TikTok and Reels combined by tournament start

---

## 6. Asset Deployment Schedule

| Date | Asset | Surfaces |
|---|---|---|
| May 7 | Press list locked, bench list locked, paid envelope locked | internal |
| May 8 | Trailer 1 + Trailer 2 launch on owned channels; Tier A press round 1; first 11 short-form pieces ship; X coordinated amplification | all |
| May 9 | Reddit mod outreach begins; Tier 1 newsletter slots booked | Channel 1, 2 |
| May 10 | Tier 1 first newsletter live (target: Silver Bulletin or earliest available) | Channel 3 |
| May 11 | Reddit promoted posts live; X promoted live | Channel 3 |
| May 14 | Tier B press round 1; podcast outreach | Channel 1 |
| May 18 | Tier 4 retargeting switches on; first creator embed | Channel 3 |
| May 21 | Press round 2 (team-specific exclusives) | Channel 1 |
| May 28 | Press round 3 (opening-match commentary); paid peak begins | Channel 1, 3 |
| Jun 4 | Daily snapshot public release; W-1 acceleration | Channel 4 |
| Jun 10 | Kickoff-eve push; 24-hour press window for opening-match analysis | all |
| Jun 11 | Operate. Marketing voice quiets. The model speaks. | W0 |

---

## 7. Suppression Rules (sprint conditions)

The original 5-rule volatility gate carries over with one addition.

1. **Calibration failure**: any short-form piece contradicted by next snapshot. Pull within 6 hours, public correction. (unchanged)
2. **Tone failure**: prediction language, pick language, "lock of the week" register. Reject before publish; if shipped, retract within 6 hours. (unchanged)
3. **Press breach**: any Tier A writer reports they were pitched by a competing source with our identical numbers (we cannot afford a leak of the per-outlet allocation table). Halt all press outreach for 48 hours; investigate; written apology where warranted. (NEW for blitz)
4. **Subreddit ban or warning**: any sub. Halt that surface for the remainder of the sprint; resume only post-tournament. (tightened)
5. **Paid creative miscalibration**: any paid asset goes live with a numeric claim later corrected by the methodology. Pause that line item; retract; review before relaunch.
6. **Volume-induced quality slip**: if the daily ship cadence forces a piece below brand discipline, we cut the cadence. Quality dominates volume in every contested decision.

---

## 8. Definition of Done at T+0 (June 11, 0:00 ET)

Tournament starts. We declare the blitz successful if all of the following are true on kickoff morning:

1. 3+ Tier A bylines published, with the framework named and methodology described correctly
2. 25,000+ alert subscribers on the terminal, of which at least 60% have non-zero engagement in the prior 7 days
3. The terminal infrastructure has survived a stress-test load equivalent to 5x the highest pre-tournament daily peak (we run this test in W-1)
4. The daily snapshot pipeline has shipped on schedule for 14 consecutive days
5. Brand integrity is intact: no public correction sequence longer than one cycle, no mod ban, no paid creative pulled mid-flight
6. The forecast log has zero overwrites (this is non-negotiable; pre-registration depends on it)

If any one of these is false on kickoff morning, the post-tournament academic submission still proceeds, but the marketing claim that the framework was visibly correct *before* the tournament gets a written caveat in the working paper.

---

## 9. What We Are Still Not Doing

The compression does not loosen the prohibitions. Restated for the record:

- No partnership, integration, or affiliation with any sportsbook, fantasy operator, or pick provider
- No "lock," "pick," "play," or "value bet" language anywhere
- No giveaway, contest, or bracket challenge
- No paid creative featuring real player likenesses or team logos
- No SEO ghost-writing, no link-buying, no traffic exchanges
- No purchased follower counts, no purchased engagement
- No claim, ever, that the model is *predicting* an outcome. The framework prices residual uncertainty. That language is invariant under all compression.

---

## 10. Sign-off and Daily Check

This plan is operational from 09:00 ET on May 8, 2026.

Daily 08:30 ET standup. Three questions only:
1. What shipped yesterday?
2. What ships today?
3. What is at risk of slipping?

Anything beyond those three goes to the weekly review. We do not optimise the plan during the sprint; we execute the plan during the sprint and revise it at the W-2 and W-1 boundaries.

If something feels like it is approaching a sportsbook in tone, it is. Pull it before it ships.

35 days. Ship.
