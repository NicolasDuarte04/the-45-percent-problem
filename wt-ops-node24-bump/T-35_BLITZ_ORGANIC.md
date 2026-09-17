# T-35_BLITZ_ORGANIC

**Document owner**: Lead Growth Architect
**Status**: ZERO-BUDGET OPERATING PLAN, supersedes `T-35_BLITZ_MATRIX.md` in entirety
**Today**: 2026-05-07 (Thursday)
**Kickoff**: 2026-06-11 (Thursday)
**Window**: 35 days
**Budget**: $100 ceiling, $0 preferred
**Posture**: Earned-only saturation. Founder time substitutes for capital. Brand discipline becomes the entire moat.

---

## 0. Constraint Acceptance

We are not a VC-funded launch. We have $100 and 35 days. The constraint is not a problem; the constraint is a feature, because the brutalist quant aesthetic was always going to outperform paid acquisition that wears a Bloomberg costume but smells like DraftKings. Zero spend forces us into the only growth mode that compounds: be cited because we are correct, available, and useful.

What this plan trades: scale of reach.
What this plan keeps: every credibility-bearing surface from the prior matrix.
What this plan adds: surfaces that paid budgets actively poison (Hacker News, arXiv, Wikipedia adjacencies, Substack network reciprocity, organic Reddit virality on /r/dataisbeautiful), all of which reward authenticity and punish promotion.

The single mental model: the methodology produces 3 to 5 genuinely surprising findings in the next 14 days. Each finding becomes its own distribution event. Press writes about the finding because no other source has it; Reddit upvotes the finding because it is reproducible; TikTok carries the finding because the visual is striking. We do not distribute the brand; we distribute the work, and the brand attaches to it.

---

## 1. Sprint Architecture (5 weeks, 35 days)

| Week | Window | Theme | Founder hours/day target |
|---|---|---|---|
| W-5 | May 7 to May 13 | Earned-asset construction + first wave | 14 |
| W-4 | May 14 to May 20 | HN, arXiv, Reddit organic + press round 2 | 14 |
| W-3 | May 21 to May 27 | Conversation capture, podcast circuit, Substack reciprocity | 12 |
| W-2 | May 28 to Jun 3 | Pre-kickoff press round 3, daily snapshots public | 12 |
| W-1 | Jun 4 to Jun 10 | Final approach, bench mobilisation, ops readiness | 14 |
| W0 | Jun 11 to Jul 19 | Operate. Daily snapshot. Real-time divergence reports. | sustaining |

Founder time, not capital, is the constraint that prices everything else in this document.

---

## 2. Channel 1: Press, 10x

**Mandate**: We cannot buy a sponsor slot in Silver Bulletin or Money Stuff. We can be the subject of a column. The pitch volume goes from 30 to 80, the personalization tax doubles, and every single email carries a finding the writer cannot get from any other source.

### 2.1 The shift from "tell" to "give"

A paid sponsorship asks the reader for attention in exchange for the writer's ad slot. An organic feature gives the writer something their column requires. The pitch is no longer "please write about us." The pitch is "here is the column, fully formed, with the data exclusive baked in. Use it. Cite us if you find it useful."

For each Tier A target we produce a **bespoke press packet**, sent only to that one writer:

1. A 60-second methodology video clip (cut from Trailer 1)
2. A custom calibration chart pre-rendered with their audience's interest in mind (Burn-Murdoch gets a calibration plot; Levine gets a market-efficiency divergence; Silver gets an ablation table comparing M0-M3 against his last published SPI variant)
3. A 250-word draft column they could publish verbatim, watermarked "draft, edit freely"
4. A spreadsheet with the underlying numbers
5. The OSF pre-registration link
6. A single specific ask: "If this is useful, a citation is the only return I need."

This is 4 to 6 hours of work per packet. We produce 8 in W-5. That is the entire week.

### 2.2 The Tier A roster, with the exact organic angle

**John Burn-Murdoch (Financial Times)**

He writes about calibration constantly. He does not respond to pitches; he responds to charts. The play:
- Send a single tweet at him with the calibration plot of M0-M3 on the 2010-2022 hold-out, no link, no ask, no follow-up. If he engages, we send the packet. If he does not, we DM the chart with two sentences. If still no reply, we run the same chart in a public thread tagging the FT data desk and let it speak.
- Risk: looks thirsty if executed badly. Mitigation: the chart must be objectively the best calibration plot anyone has rendered for World Cup forecasting in the last decade. If it is not, we do not send.

**Nate Silver (Silver Bulletin)**

He has run World Cup models. He notices when others do too, and he has historically engaged with people who replicate his methodology and extend it. The play:
- Pitch a guest essay for Silver Bulletin titled along the lines of *Pre-registering a World Cup forecast: ablating M0-M3 against SPI*. The frame is not "look at us"; the frame is "your old methodology is the baseline against which we test richer variants. Here is the ablation."
- If guest essay declines, fall back to a free-to-use data drop: a CSV of our model's daily probabilities for all 48 teams, refreshed nightly, available at a stable URL. He cites public datasets in passing all the time.
- Specific lever: he is sensitive to pre-registration as a methodological norm because most sports forecasters do not pre-register. We are pre-registered on OSF. That is genuinely rare and is the single most pitchable fact in our entire framework to him.

**Matt Levine (Money Stuff, Bloomberg)**

He does not write about World Cup forecasting. He does write about market efficiency in unusual markets. The play:
- The pitch is a market structure story, not a sports story. Subject line: *"Are bookmakers calibrated on the World Cup market? A pre-registered test, with data."*
- Body: we ran a power-method de-vigging test on Pinnacle's 2010-2022 World Cup closing lines, computed pre-registered Nyberg-Mishkin tests for unbiasedness and efficiency, and the answer is [the actual result we obtain]. The data is public. The methodology is locked. The framework that produces it is at thefortyfivepercent.com. Reuse freely.
- He uses material like this. He has cited public datasets and academic working papers many times. The pitch reads as a Bloomberg footnote, not as a marketing email.

**Karun Singh (independent)**

He builds visualizations. The play is a visualization collaboration, not a press hit. We send him our raw simulation tensor for one specific question (e.g. probability mass over knockout-round configurations) and ask if he would render it in his style for a joint post. He is a peer; we treat him as one.

**The Athletic data desk (John Muller, Mark Carey, Tom Worville)**

The Athletic does not run sponsored content the way newsletters do, but their writers individually pitch features to their editors. The play:
- One personalised email per writer, each with a different team-specific angle (USA path probabilities for Muller, transfer-market-adjacent rating analysis for Worville, tactical implications of expected-goals decomposition for Carey).
- Each writer gets unique numbers. The allocation table is the same lever as the prior plan; cost-free to run.

**Joe Pompliano, Front Office Sports, Sportico**

These run on data scoops. The pitch is the divergence number, packaged as a one-line story: "Bookmakers value Brazil at X. A pre-registered model says Y. The difference is Z." They will write a short piece if the number is interesting. Cost: one email each.

**The Upshot (NYT)**

The Upshot publishes data-driven pieces with one-week to two-week lead times. Pitch in W-5. The angle is the framing, not the prediction: "Why a model that admits it cannot predict is more useful than one that claims it can." This is an Upshot column waiting to happen if pitched right.

**The Ringer, Wired, Quanta**

Long-form lead times push these to W-4 or W-3 for tournament-window publication. Each gets a different angle: The Ringer (the cultural framing of probabilistic humility), Wired (the methodology as software), Quanta (the mathematics of bivariate Poisson in plain English).

### 2.3 Volume and cadence

| Day | Action | Sent |
|---|---|---|
| May 7 (today) | Tier A roster locked, allocation table built, first 4 packets drafted | 0 |
| May 8 | First 4 Tier A packets sent (Burn-Murdoch, Silver, Levine, Karun Singh) | 4 |
| May 9 | Next 4 Tier A packets sent (Athletic data desk individually) | 4 |
| May 10 to 11 | Tier A response triage; bespoke follow-ups for any reply | inbound |
| May 12 to 13 | Tier B (Ringer, Wired, Quanta, Guardian, wires) packets | 6 |
| May 14 to 17 | Tier B sends; Tier C podcast outreach prep | 8 |
| May 18 to 22 | Tier C podcast outreach (8 shows) | 8 |
| May 25 to 29 | Press round 2: team-specific exclusives to anyone who engaged in round 1 | unlimited |
| Jun 1 to 5 | Press round 3: opening-match commentary, divergence one-pager | unlimited |

Inbound triage: same-day replies, even on weekends. The window between "this is interesting" and "we forgot about it" is one news cycle.

### 2.4 The reciprocity protocol

Every Tier A target gets one thing for free *before* we ask for anything. For Burn-Murdoch it is the chart. For Levine it is the test result. For Silver it is the SPI ablation. For Karun it is the rendering-grade data. The ask comes after the gift, in the same email, framed as "if useful, a citation is the only return I need." This is the entire organic press strategy in one sentence.

### 2.5 Output artifacts (W-5 to W-3)

- 1 to 2 Tier A bylines (realistic, not aspirational)
- 3+ Tier B mentions
- 2 podcast bookings
- `press_log.csv` daily, append-only

---

## 3. Channel 2: Reddit and Online Communities, Earned Only

**Mandate**: No paid promoted posts. Three plays only, all of which trade founder time for visibility.

### 3.1 The AMA play (high leverage)

Direct, written outreach to head moderators of r/soccer, r/datascience, r/dataisbeautiful, r/MachineLearning, r/sports, and the largest national team subs.

The mod pitch script:

```
Hi [mod name],

I run thefortyfivepercent.com, a pre-registered probabilistic framework for
the 2026 World Cup. Working paper is on OSF, code is on GitHub, model is
selected on a 2022 hold-out, no betting affiliation, no monetisation.

I would like to do an AMA in [sub] in [proposed week]. Ahead of it I will
publish a [sub-specific custom analysis: e.g., a teardown of the
methodology for r/datascience, a path-by-path bracket for r/soccer]. The
custom analysis is yours regardless of whether you greenlight the AMA.

I am happy to follow whatever AMA format you prefer and to be verified
through the standard channels. No links in the title. No CTA in the body.

[Name]
[OSF link]
[GitHub link]
```

The lever: **the custom analysis is delivered whether or not the AMA happens.** This is unusual enough to register. Mods who decline still receive useful content, and they tend to remember accounts that gave value with no return condition.

Targets, in send order on May 8:

- r/datascience (highest fit, methodology-fluent)
- r/soccer (largest reach, highest sensitivity)
- r/dataisbeautiful (visual-first, perfect for our calibration plots)
- r/MachineLearning (only if methodology paper is at arXiv preprint stage)
- r/sports
- r/USsoccer, r/CanadaSoccer, r/socceroos, country-specific subs (W-3)

### 3.2 The /r/dataisbeautiful organic play

This is the highest-EV zero-budget Reddit surface we have. /r/dataisbeautiful does not block self-promotion if the post is the best chart in the queue that day. The play:

- Post once, on a Wednesday morning at 9:00 ET (peak engagement window for the sub).
- The chart: a calibration plot of M0-M3 against the 2022 World Cup hold-out, brutalist black background, monospace, no logo, watermark "thefortyfivepercent.com" in 8pt corner.
- The title: a single-sentence factual claim, no exclamation marks, no hooks. Example: *"Calibration of four World Cup forecasting models against the 2022 hold-out."*
- The first comment, posted by the same account immediately after, is a 200-word OC explanation with a GitHub link and an OSF link.
- We post one chart, once. If it lands, we ride it. If it does not, we do not repost the same chart with a new title; that gets the account shadowbanned.

### 3.3 The founder-as-human play

The founder uses an existing personal Reddit account with non-zero history, replying under questions where the answer is genuinely better with our terminal than without. Three to five replies a day, no link unless asked, terminal screenshot only when directly responsive.

This is unglamorous, slow, and works. It is the closest zero-budget analogue to building an audience. Volume target: 100+ substantive replies across the 35 days.

### 3.4 What we do not do

No new Reddit accounts. No multi-account amplification. No karma-farming via repost. No posting in r/Soccerbetting or r/sportsbook ever. No contests, no giveaways, no "who picks the winner" gimmicks. The cost of a single sub ban during a tournament window is permanent.

---

## 4. Channel 3: Earned-Media Trojan Horses (NEW)

**Mandate**: Surfaces that exist specifically to reward technical authenticity and that paid budgets cannot improve. Each is a one-shot opportunity with high upside.

### 4.1 Hacker News (Show HN)

Single highest-EV launch surface available to us. One front-page hit on HN delivers approximately 30,000 to 80,000 unique sessions, mass coverage by tech-adjacent newsletters, and durable Google authority.

Operational protocol:

- **Title**: *Show HN: Pre-registered probabilistic World Cup forecast (M0-M3 ablation, OSF)*. No emoji, no exclamation. Title-case avoided in favour of sentence-case to fit HN convention.
- **First comment** (posted by the founder account immediately after submission): a 300-word context comment covering (a) the project's purpose, (b) what is not being claimed, (c) what is open-source, (d) one specific design decision the audience will want to debate. Anchoring the comment thread is the difference between a top-10 day and a top-100 day.
- **Submission timing**: Tuesday morning, 7:00 to 8:30 ET. Avoid Mondays (saturated). Avoid weekends (low velocity).
- **Submission day**: Tuesday May 12 (W-5) is the target. We do not pre-announce. The HN community penalises announcement spamming.
- **Response discipline**: founder must be available to reply to every top-level comment within 30 minutes for the first 6 hours. HN frontpage retention is largely a function of OP engagement quality. Day cleared in advance.
- **No vote manipulation, no ring-voting, no "please upvote" outside the platform.** HN's flag system is unforgiving and a flag stays attached to an account for years.

We get one shot. If it does not land, we do not resubmit with a different title.

### 4.2 arXiv preprint

Free. Indexed by every academic and most science journalists. Working paper goes up under the stat.AP (Applications) or stat.ME (Methodology) category in W-4 (target: May 15). Posting an arXiv preprint:

- Costs zero
- Provides a permanent citable URL
- Gets crawled by Google Scholar within 48 hours
- Gets crawled by tools like Semantic Scholar and Connected Papers
- Confers academic legitimacy that no marketing surface can buy
- Creates an inbound discovery vector for adjacent researchers

Endorsement: arXiv requires endorsement for first-time submitters in some categories. Acquiring endorsement requires emailing one researcher who has previously published in the category. Add this to the W-5 task list. The methodology lead handles this.

### 4.3 Wikipedia adjacency (delicate, do not self-edit)

We never edit our own page or any page about us. We instead, on the talk pages of articles like *FIFA World Cup forecasting*, *Bivariate Poisson distribution*, *Elo rating system*, *Vigorish*, *Pre-registration*, suggest our working paper as a reference once it is on arXiv. The talk page convention is that the editor flags conflicts of interest and asks neutral editors to evaluate. If the work is good and the suggestion is honestly framed, half the time it gets added. If it does not, no harm.

### 4.4 Substack reciprocity network

We do not buy Silver Bulletin sponsorships. We do guest-pitch adjacent Substacks. The newsletters that overlap with our audience and which actively run guest contributions:

- *Statistical Modeling, Causal Inference, and Social Science* (Andrew Gelman). High prestige, low frequency, slow turnaround. Pitch a methodology note in W-5; it may publish in W-2 or post-tournament.
- *Marginal Revolution* (Tyler Cowen). Famously responsive to interesting links via the Tip Line. One emailed link with two sentences of context can produce a TC link post.
- *The Generalist*, *Stat Significant*, *Numlock News* (Walt Hickey, ex-538), *Quantum of Sollazzo*, *Data Is Plural*. All explicitly run links to public datasets. We are a public dataset.
- *Sports analytics-specific*: *American Soccer Analysis* newsletter, *The Athletic* Substack-adjacent newsletters where the author can solo-pitch.

Cost per pitch: 30 minutes. Hit rate: 5 to 10 percent. Worth doing across all of them.

### 4.5 Our own Substack as a research log

Set up `thefortyfivepercent.substack.com` (free) on May 8. Cross-post the working paper, weekly methodology essays, and the daily snapshot during W0. Substack's discovery mechanism (Notes, recommendations, the trending tab) is generous to honest niche content. By W0 we should have 800 to 2,000 subscribers organically. Conversion to alert subscribers from there is high.

### 4.6 GitHub as a distribution surface

GitHub repos surface in search and in adjacent-repo recommendation feeds. The code repo's README is its own pitch. README rewrite is a W-5 priority:

- First paragraph: a single sentence stating the thesis
- Second paragraph: 3 lines of code that reproduces the lead figure
- Third section: the calibration chart embedded as PNG
- Footer: links to OSF, arXiv, the working paper, and (eventually) the Show HN thread

A high-quality README in a niche category gets stars from people who would otherwise never have heard of us. Stars are cheap and meaningless individually, but a 500-star repo confers a different kind of credibility than a 5-star one.

### 4.7 The "calibration challenge" play

Public, time-stamped, unambiguous: on May 10 we publish a pinned tweet, a Substack post, and a GitHub release that locks our pre-tournament probabilities for all 48 teams winning the Cup, all group winners, and the top-30 most-divergent match probabilities. We invite anyone (Silver, Burn-Murdoch, FiveThirtyEight successors, /r/soccerbetting bench) to lock theirs in the same format. After the tournament, we publish the calibration scoreboard.

This is genuinely rare; it is a transparent commitment that almost no one else in this space will match. Even if no one accepts the challenge, the call itself is a press hook ("World Cup model issues calibration challenge to incumbents"). If anyone accepts, it becomes the central story of our tournament window.

---

## 5. Channel 4: Algorithmic Wave, Founder-Powered

**Mandate**: 100% organic short-form, 35 days, the founder produces and ships every piece. Cadence is the moat. Brand discipline is the algorithmic differentiator.

### 5.1 Cadence (down from prior plan)

The prior plan called for 11 ships per day. Realistic without paid amplification and with one operator: **5 ships per day total, cross-posted.**

| Surface | Daily ships | Notes |
|---|---|---|
| TikTok | 1 (native upload) | Primary discovery surface |
| Instagram Reels | 1 (cross-post) | Highest conversion to email |
| YouTube Shorts | 1 (cross-post) | Long tail; old videos still pay |
| LinkedIn video | 1 every 2 days | Methodology Receipts only |
| X video | 1 (native upload) | Number + Disagreement only |

5 platforms x 35 days at high consistency = approximately 140 to 175 surface-touches. This is the volume target.

### 5.2 Format archetypes (unchanged from prior plan, condensed for solo production)

- **The Number** (15-22s, 4x/week). Daily snapshot result + density visual. Production: 30 minutes once template is locked.
- **The Disagreement** (20-30s, 2x/week). Pundit prediction vs. our posterior. Production: 20 minutes once chart pipeline is hot.
- **The Methodology Receipt** (45-75s, 2x/week). Voiceover walkthrough of one design choice. Production: 90 minutes including writing.
- **The Rarity Reveal** (8-15s, 1x/week). User-generated OG share. Production: 15 minutes including permission DM.
- **The Divergence Map** (30-45s, 1x/week). Pure data ASMR animation of model vs. market over time. Production: 60 minutes.

Sunday and Wednesday are batch shoot days. Everything else is ship and reply.

### 5.3 Consistency hacks at zero budget

Two algorithmic levers we can pull without spending:

1. **Hashtag squatting**. Own #wc2026model, #pricewc2026, #fortyfivepercent. Use them on every piece. After 30 days of consistent use, we are the top result on those hashtags.
2. **Cross-pollination commenting**. Founder comments under top creators in soccer-data and quant-content niches before posting our own. The algorithm learns what category we belong in. 20 substantive comments per day across TikTok and Reels; not a chore, a discipline.

### 5.4 The trailer cut-down (unchanged)

Trailer 2 produces 7 short-form pieces, scheduled across W-5 and W-4 (per prior plan). Trailer 1 stays whole as the YouTube anchor and pinned-tweet asset. Both trailers are uploaded May 8 by 09:00 ET.

### 5.5 The "boring videos that compound" rule

A daily Number that gets 3,000 views per video, every day for 35 days, produces 100,000+ cumulative views and a tight follower base of people who actually save the chart. A single video that gets 1M views and is forgotten produces nothing. We optimise for the former, not the latter. If a Number happens to spike, that is a bonus, not the strategy.

---

## 6. Asset Deployment Schedule (zero-budget revision)

| Date | Action | Cost |
|---|---|---|
| May 7 | Press list locked; bench list locked; arXiv endorsement requested; Substack created; GitHub README rewritten | $0 |
| May 8 | Trailer 1 + Trailer 2 launch on owned channels; first 4 Tier A packets out; first 5 short-form pieces ship; founder Twitter pinned thread; calibration challenge prep | $0 |
| May 9 | Next 4 Tier A packets; AMA mod outreach to 6 subs; Substack first post | $0 |
| May 10 | Calibration challenge published (pinned tweet, Substack, GitHub release) | $0 |
| May 12 | Show HN submission, 07:30 ET; founder all-day on thread | $0 |
| May 14 to 15 | arXiv preprint live; Tier B packets sent; first AMA happens (target: r/datascience) | $0 |
| May 18 to 22 | Podcast outreach; Wikipedia talk-page suggestions; Substack guest pitches | $0 |
| May 21 | /r/dataisbeautiful organic post, 09:00 ET Wednesday | $0 |
| May 25 to 29 | Press round 2; second AMA (target: r/soccer) | $0 |
| May 28 to Jun 3 | Pre-kickoff press round 3; daily snapshot publishing begins | $0 |
| Jun 4 to Jun 10 | Final approach; bench mobilisation; calibration challenge results pre-locked | $0 |
| Jun 11 | Operate. | sustaining |

---

## 7. The $100 Deployment

We treat the $100 as a strategic reserve, not a budget to spend. Default state: untouched.

Three pre-authorised micro-deployments, each requires written justification:

1. **arXiv endorsement-related cost** (estimated $0; included for completeness). Free.
2. **Domain alias for the share asset** (~$12, registered May 7). A short URL that fits inside the OG image bottom-right and reads cleaner than a long path. Worth it for the visual discipline.
3. **One contingency spend** (up to $80). Triggered by exactly one scenario: a Tier A writer requests a piece of data, a chart, or a renderable artifact that requires a one-off cloud-compute or API expense to produce in the time window they need. We pay that bill, no questions, because the press hit pays for itself a thousand times over.

We do not spend on Twitter Premium, Substack paid features, ad credits of any kind, Reddit promoted posts, TikTok boosting, or any newsletter sponsorship. Any deviation requires a written exception logged in `growth_log/budget_deviations.md`.

Default 35-day spend: $12. Maximum: $100. Most likely: $12 to $40.

---

## 8. KPIs (calibrated to zero-budget reality)

The prior plan's 25,000 subscribers and 50,000 DAU at kickoff were paid-budget numbers. Real targets at zero spend:

| Metric | T+0 target (kickoff morning) | Stretch |
|---|---|---|
| Tier A bylines (in print or online) | 1 | 3 |
| Tier B mentions | 3 | 6 |
| Podcast appearances aired or scheduled | 1 | 3 |
| Email alert subscribers | 3,000 | 8,000 |
| GitHub stars on the repo | 200 | 1,000 |
| arXiv preprint posted with at least 1 outside citation | yes | yes + 3 cites |
| Show HN result | front page top 30 for 4+ hours | front page top 5 |
| /r/dataisbeautiful organic post | 500+ upvotes | front page of the sub |
| AMA completions | 2 | 4 |
| TikTok + Reels combined followers | 2,500 | 8,000 |
| Substack subscribers | 800 | 2,500 |
| Reddit organic citations of the terminal in unrelated threads | 8 | 25 |
| Calibration challenge accepted by 1+ named forecaster | 0 | 1 |
| Bench amplifications (named accounts QT-ing the framework) | 8 | 20 |
| Wikipedia references added (talk-page-driven) | 0 | 2 |

The realistic and stretch columns differ by roughly 3x. We plan for realistic and budget for stretch.

---

## 9. Suppression Rules (unchanged in spirit, two additions)

All rules from the prior matrix carry. Two new failure modes the zero-budget posture introduces:

7. **Founder burnout suppression**. 14-hour days are not sustainable for 35 days without a single rest day. Two enforced full off-days in the sprint: Sunday May 17 and Sunday May 31. Skipping either is itself a deviation requiring written justification. The plan fails if the operator fails.
8. **Reciprocity-cost suppression**. Free help is given to every Tier A target before any ask is made. If we find ourselves making asks before we have given the gift, we are doing the strategy backwards and we stop until the order is corrected.

---

## 10. The Single Hardest Question

If this plan only produces one outcome at T+0, what should it be?

**Answer**: one Tier A byline that names the framework, describes the methodology accurately, and links to the live terminal. That single placement compounds for the entire tournament window and into the post-tournament academic submission. Every other channel in this document is a probability multiplier on getting that one piece of coverage to land.

If the operator wakes up tomorrow and can only do one thing, they should be writing the press packet for John Burn-Murdoch.

---

## 11. Sign-off and Daily Check

Operational from 09:00 ET on May 8, 2026.

Daily standup (08:30 ET, written, archived in `growth_log/`):

1. What shipped yesterday?
2. What ships today?
3. What is at risk of slipping?

35 days. $0 to $100. Ship.
