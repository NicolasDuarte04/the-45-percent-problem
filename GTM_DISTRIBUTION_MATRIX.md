# GTM_DISTRIBUTION_MATRIX

**Document owner**: Lead Growth Architect
**Status**: Operational plan v1.0 (locked unless deviation logged)
**Horizon**: T-24 months to T+0 (2026 World Cup opening match)
**Counterparty**: Public attention markets (saturated, adversarial, mean-reverting)
**Posture**: Authority before reach. Citations before clicks. Defensible before shareable.

---

## 0. Thesis

The product is not a website. The product is a methodology that prices residual uncertainty in the most-watched stochastic event on the planet, and shows the work. Distribution must mirror that. We earn the right to be loud by being correct, peer-reviewed, and quietly cited first. Paid amplification is a Phase 3 instrument, not a Phase 0 instrument.

Two failure modes we are pricing against:

1. **Premature virality**. A meme reaching scale before the credibility scaffold is poured produces a flash of traffic and a permanent reputational ceiling ("just another bracket toy"). Recovery cost is high. Avoid.
2. **Permanent obscurity**. A flawless paper that nobody reads. Mitigated by Phase 1 and Phase 2 once Phase 0 has produced a citation graph.

The 45% residual is the brand. Every distribution surface must reinforce a single proposition: *we do not predict the World Cup; we price it under calibrated uncertainty, and we publish the spread*.

---

## 1. Phase Architecture

| Phase | Window | Primary KPI | Kill Criterion | Posture |
|---|---|---|---|---|
| P0 Authority Seeding | T-24 to T-18 | 8+ named academic responses; 3+ inbound peer-review interest | <3 responses by T-19 | Whisper |
| P1 Niche Penetration | T-18 to T-12 | 25+ organic citations in r/soccer, r/datascience, FiveThirtyEight-adjacent Twitter; 1,000 terminal alert subscribers | <500 subscribers by T-13 | Contribute |
| P2 Algorithmic Amplification | T-12 to T-3 | 100k cumulative short-form impressions per month; 10k DAU on terminal during qualifier windows | <30k monthly impressions by T-6 | Broadcast |
| P3 Tournament Activation | T-3 to T+0 | 50k DAU; >40% return rate within 7 days; CLV-positive market commentary cited by 3+ tier-1 outlets | <20k DAU by T-1 | Operate |

Each phase carries a frozen budget envelope and a deviation log. Advancing without clearing the phase KPI is a deviation; it requires written justification and goes into the same registry as model deviations. Same discipline as the modeling stack; same paper trail.

---

## 2. Channel 1: Academic and Peer-Review Outreach

**Mandate**: Build a citation graph and a referee bench *before* the methodology is publicly stress-tested. Trailer 1 (research, methodology, the Vault) is the asset; the cold email is the carrier.

### 2.1 Target taxonomy

Three concentric rings. Work outward only after the inner ring shows traction.

**Ring 1 (T-24 to T-22): The Methodology Reviewers** (target: 30 named individuals)

Departments to source from:

- Statistics and Statistical Sciences (Bayesian inference, hierarchical models, calibration)
- Operations Research (simulation, Monte Carlo, tournament design)
- Sports analytics groups (Carnegie Mellon Sports Analytics, MIT Sloan, Harvard Sports Analysis Collective, Stanford Sports Innovation Lab)
- Behavioral and market microstructure economics (de-vigging, market efficiency, Nyberg-style tests)

Selection rule: every candidate must have at least one published paper touching one of (a) Elo-style rating systems, (b) bivariate Poisson with low-score correction, (c) market efficiency in betting markets, (d) Hoffmann/Klement-lineage macro-determinant work. No mass-list outreach. Each name has a one-line dossier explaining the methodological overlap.

**Ring 2 (T-22 to T-19): Forecasting Practitioners** (target: 15 named individuals)

Andrew Gelman, Nate Silver-tier independents, Aaron Clauset, Matthew Yglesias-adjacent forecasters, Metaculus founders, Good Judgment alumni. They will not co-author; they will *signal*. One blog mention or quote-tweet from Ring 2 is worth ten cold replies from Ring 1.

**Ring 3 (T-19 onward): Editorial and Conference Surface** (target: 5 venues)

JQAS (Journal of Quantitative Analysis in Sports), International Journal of Forecasting, MIT Sloan Sports Analytics Conference, NESSIS, RSS Sports Section. Submit working paper post-pre-registration, present pre-tournament.

### 2.2 Cold-email protocol

Three rules, no exceptions.

1. **Specificity tax**. Every email must name a paper the recipient wrote, in the second sentence, and connect it to a specific design choice in our framework. No "I read your work" filler. Generic outreach gets filtered as spam by exactly the readers we need.
2. **Asymmetric ask**. We are asking for a 20-minute methodology review in exchange for early access to the Vault and named acknowledgement in the working paper. The recipient is doing us a favor; the email must read that way.
3. **One link, one trailer, one PDF**. Trailer 1 (research-focused), the working paper draft, the link to the live terminal. Nothing else. No "p.s." links to the viral engine. Ring 1 must not see the meme layer; the meme layer poisons the citation.

### 2.3 Cold-email template (Ring 1)

Subject: *Methodology review request: pre-registered World Cup forecasting framework*

```
Professor [Last Name],

Your 2019 paper on [exact title or topic] in [venue] informed our handling of
[specific methodological choice: e.g., Dixon-Coles low-score correction, K-factor
calibration on imbalanced fixture lists, power-method de-vigging vs.
proportional]. We have implemented [one-sentence summary of how their work shows
up in our code], and the design decision we are least confident about is
[concrete question, two sentences max].

We are 24 months from the 2026 World Cup. The framework is pre-registered on
OSF, M0-M3 ablation locked, M-star selected by frozen log-loss protocol on the
2022 hold-out. Working paper attached.

Would you be willing to review the methodology section (12 pages) and flag
anything that would not survive a JQAS referee? In exchange we offer named
acknowledgement and pre-publication access to the live terminal during the
tournament, including the daily snapshots that feed the divergence layer.

Three-minute orientation: [Trailer 1 link].

Best,
[Name]
[Affiliation, if any]
[OSF pre-registration link]
```

**Send cadence**: 5 emails per week, Tuesday and Thursday mornings (UTC), tracked in a single spreadsheet with columns for `sent`, `opened`, `replied`, `agreed`, `delivered_review`, `permission_to_cite`. No follow-up before 14 days. One follow-up only, then drop.

### 2.4 Reciprocity loop

Every reviewer who replies receives, within 72 hours: (a) a written response addressing every flag they raised, (b) a Git diff showing the code change if we implemented their suggestion, (c) a deviation log entry if we did not, with the reason. This is the same protocol used internally for blueprint deviations. Reviewers will notice. Some will tweet about it. That is the entire point.

### 2.5 Output artifacts (P0 deliverables)

- `reviewer_log.md` (private): every contact, every response, every implemented change
- `acknowledgements.md` (public, in repo): named reviewers who consented
- `referee_bench.md` (private): 5+ academics who have agreed to be quoted at launch
- A working paper that has survived ~10 rounds of unpaid pre-referee criticism before formal submission

---

## 3. Channel 2: Niche Communities (Reddit and Twitter/X)

**Mandate**: Establish the framework as the default citation when somebody in a soccer-statistics conversation asks "where did that number come from?" Posture: contributor, not promoter. The OG image (dynamic 1-in-N rarity) is a tool, not a payload.

### 3.1 Anti-spam doctrine

The fastest way to get banned and reputationally tarred on r/soccer and r/datascience is to post your own product. We do not do that.

Three rules:

1. **Karma before content**. Every account used for distribution accrues 6+ months of unrelated, genuinely useful contributions before linking the terminal once. No exceptions. Anything else is detectable and gets the link domain shadowbanned at the subreddit level.
2. **Answers before announcements**. We post when somebody else asks a question we can answer better than anyone else with our data. We never post to announce ourselves.
3. **Receipts before claims**. Every quantitative claim we make in a thread is reproducible from the public terminal in 30 seconds. Mods notice this. Once they notice, they stop pre-screening our links.

### 3.2 Surface map and contribution archetypes

| Surface | Audience size | Primary archetype | Posting cadence | Asset |
|---|---|---|---|---|
| r/soccer | 3.6M | Data-grounded counter-takes in match threads | 2 to 4 per week, no self-link | Terminal screenshot, no domain in image |
| r/datascience | 1.5M | Methodology deep-dive (calibration, MC variance) | 1 high-effort post per month | Working-paper excerpt, one terminal link in comments only after ~50 upvotes |
| r/Soccerbetting and r/sportsbook | 200k+ | Strict neutrality; we are not betting advice | 0 unprompted posts; reply only when called out | Edge dashboard read-only |
| Team-specific subs (r/USsoccer, r/Gunners-style nationals during qualifying) | varies | "How does our team's path actually look?" with simulator output | Tournament-window only | OG rarity image |
| Twitter/X (FiveThirtyEight-adjacent, soccer Twitter) | varies | Quote-tweets correcting bad probability talk | Daily during qualifying windows | OG image with terminal URL baked in lower-right |

### 3.3 Reddit playbook (operational detail)

**r/soccer**

Post types we run:

- *Pre-tournament path analysis*: "Group X scenarios under 10,000 simulations." Image carousel of the bracket implication. One sentence in the body explaining the model, one link to OSF pre-registration. Terminal link only if asked in comments.
- *Post-result calibration check*: "We assigned this result a 7.2% probability pre-match. Here is what happened to the posterior." Self-flagellation is the highest-trust posture on r/soccer. Show the misses, not the hits.
- *AMA series*: One per phase (P1 launch, P2 launch, T-30 days, T-1 day). Coordinated with mods in advance, not unannounced.

What we never post: predictions, betting picks, "we said so" gloating, anything with a trailing pixel parameter on the URL. The mods will permanently ban for any of those.

**r/datascience and r/MachineLearning**

One high-effort post per month. Format: Jupyter notebook excerpt + working-paper figure + a question. Examples:

- *"How would you handle Elo K-factor calibration on tournaments where the home-field advantage variable is structurally absent (neutral venues)?"*
- *"Power vs proportional de-vigging on illiquid markets: anyone replicated Strumbelj 2014 on Polymarket data?"*

The post asks a question; the terminal is mentioned only as "what we are doing in this space, full code on GitHub." Self-promotion gates open at exactly the moment we are asking, not telling.

**Team-specific subs during qualifying windows**

Each national sub (r/USsoccer, r/USMNT, r/socceroos, r/CanadaSoccer, etc.) gets one custom-rendered analysis when their team plays a qualifier or pre-tournament friendly. The OG rarity image (the 1-in-N share asset) is the centerpiece. Format: scenario probability + bracket implication + the rarity stamp. The image is screenshot-friendly and carries the brand without a watermark that triggers the spam filter.

### 3.4 Twitter/X playbook

Two account architecture:

- **@theforty_five_percent** (working handle): the institutional account. Posts terminal updates, working paper milestones, calibration reports, reviewer acknowledgements. Voice: dry, quantitative, never reactive.
- **Founder account** (operator's personal handle, no logo, no bio claim): contributes to soccer-stats Twitter as a person. Quote-tweets bad probability claims with the receipts. Replies under FiveThirtyEight, John Burn-Murdoch, Karun Singh, Tom Worville-tier accounts when the math is wrong. No blanket promotion; just being the most consistently right person in the replies for 18 months.

The OG rarity image is the only piece of viral content the founder account ever pushes, and only when the user-generated permutation is itself extraordinary (a 1-in-50,000 scenario, or a divergence event during a major qualifier).

### 3.5 Output artifacts (P1 deliverables)

- `community_log.csv` (private): every post, every karma score, every link delivered, every ban or removal
- A measured 25+ organic citations in domain-specific threads where another user, not us, links the terminal in answer to a question
- 1,000 confirmed terminal alert subscribers acquired without a single dollar of paid spend

---

## 4. Channel 3: Algorithmic Wave (TikTok, Reels, Shorts)

**Mandate**: Translate the methodology into atoms small enough to ride the algorithm without becoming intellectually dishonest. Trailer 2 (the viral engine, the dynamic shareable, the 1-in-N rarity asset) is the source material.

### 4.1 Format archetypes

We run four archetypes, each with a fixed structure. Production happens in batches of 12; we never improvise on-camera.

**Archetype 1: "The Number"** (15 to 22 seconds)

Pattern: a single counterintuitive probability, on-screen, with the methodology stamp in the corner.

```
Hook (0 to 2s):  "Brazil's chance of winning the 2026 World Cup
                  changed by 3.1 percentage points yesterday."
Body (2 to 18s): Three-shot reveal of (a) the prior, (b) the news event
                  that shifted it, (c) the posterior, with the
                  10,000-simulation density curve animating underneath.
Tag (18 to 22s): Terminal screenshot, "see all 48 teams; link in bio."
```

Cadence: 3 per week. Source data: the daily snapshot pipeline. One person can produce 3 of these in 90 minutes once the template is locked.

**Archetype 2: "The Rarity Reveal"** (8 to 15 seconds)

The viral engine. User screen-records picking a scenario; the OG rarity image pops with "1 in N" stamp; cut to a leaderboard of the rarest scenarios picked that week. Cadence: 1 per week, sourced from real users. Permission flow built into the terminal share modal.

**Archetype 3: "The Methodology Receipt"** (45 to 75 seconds)

Long-form by short-form standards. Voice-over walking through one specific design choice (de-vigging, Dixon-Coles, the volatility gate). Whiteboard or terminal-screen aesthetic; brutalist green-on-black.

The point of this format is not algorithmic. The point is to convert the small fraction of viewers who care about substance into terminal subscribers. Conversion rate target: 0.8% follow-through to alert signup. Cadence: 1 per week. Repurposable into a 4-minute YouTube essay; YouTube is a Phase 2 secondary surface.

**Archetype 4: "The Disagreement"** (20 to 30 seconds)

Quote a popular pundit's prediction; show our model's posterior next to it; let the divergence speak. No editorial. The screen reads: *Pundit: 38%. Model: 19%. Difference: 19 points.* That is the entire script. Used sparingly (1 per two weeks); excessive use makes us look like a takedown account.

### 4.2 Posting cadence and platform allocation

| Platform | Posts per week | Primary archetype | Secondary archetype | Notes |
|---|---|---|---|---|
| TikTok | 5 | The Number | The Rarity Reveal | Highest reach for cold viewers |
| Instagram Reels | 5 (cross-posted) | The Number | The Disagreement | Best conversion to email signup |
| YouTube Shorts | 3 (cross-posted) | The Methodology Receipt | The Number | Long tail; old videos still pay |
| LinkedIn (native video) | 1 | The Methodology Receipt | (none) | Highest per-impression value to academic and finance audiences |

We do not run the same content schedule on Twitter; Twitter content is text-native and lives in Channel 2.

### 4.3 Brand discipline (non-negotiable)

The aesthetic is locked. Any short-form deliverable that violates these is rejected by the editor before it ships:

- Type: monospace only. No serifs. No display fonts. No script fonts.
- Color: terminal green, terminal amber, full black background, off-white text. No color outside this palette.
- Music: no music. Sound design is keystroke clicks, terminal beeps, ambient room tone. The absence of music is the brand.
- No human face in frame for Archetypes 1, 3, 4. The methodology speaks; the operator does not.
- No "hey guys" openers. No "here's why." Cold-open with the number.

### 4.4 Quantitative dishonesty filter

Every short-form piece passes a single test before publish: *does this video, in isolation, give the viewer a directionally correct picture of the underlying probability?* If the hook compresses a 19-percentage-point divergence into "we proved the experts wrong," the video is rejected. The format constraint cannot be allowed to corrupt the numbers; if it does, we lose Channel 1, which is the only channel that compounds.

### 4.5 Output artifacts (P2 deliverables)

- 100k cumulative monthly impressions by T-6
- 10k follower base across TikTok and Reels combined by T-3
- A repurposable archive of 200+ short-form clips ready for tournament-window acceleration

---

## 5. The Viral Engine (cross-channel asset)

The dynamic 1-in-N rarity image is the single piece of infrastructure that makes Channels 2 and 3 cohere. Operational requirements:

1. Image is generated server-side at share time, with the user's scenario embedded; never client-side. Server-side guarantees the rarity calculation is canonical and non-spoofable.
2. Image carries the terminal URL bottom-right, in monospace, small enough to not feel like a watermark, large enough to be readable at thumbnail scale.
3. Each image is signed with a short hash (8 characters) that maps back to the exact MC seed and snapshot SHA used to compute the rarity. Reproducibility is the brand promise; the share asset must honor it.
4. The terminal alert system is wired directly into the share flow: any user who shares a scenario is offered (not pushed) a "watch this scenario" alert subscription.

The viral engine is not the growth engine. The viral engine is the *retention* engine. Channels 1 and 2 produce arrival; the rarity image and the alert subscription produce return.

---

## 6. Operational Cadence

| Cadence | Activity | Owner |
|---|---|---|
| Daily | Snapshot pipeline runs; Channel 3 content drafted; Channel 2 monitoring | Operator |
| Weekly | Channel 1 sends 5+5; Channel 2 effort post review; Channel 3 batch shoot | Operator |
| Monthly | Phase KPI review; deviation log audit; reviewer-bench update | Lead Growth Architect + Methodology Lead |
| Quarterly | Working paper rev cycle; OSF pre-registration deltas | Methodology Lead |
| Phase boundary | Kill-criterion check; advance / hold / retreat decision | Steering committee (3 people, written vote) |

Every cadence has a single artifact, stored in `growth_log/` in the repo, parallel to `data/snapshots/`. Same append-only discipline.

---

## 7. Metrics That Matter (and Metrics That Do Not)

**Tracked, weighted heavily**:

- Inbound peer-review responses (Channel 1)
- Citations of the framework by other practitioners, unpaid (Channel 2)
- Terminal alert subscribers with non-zero engagement after 30 days (Cross-channel)
- Returning DAU 7 days after first session (Cross-channel)
- CLV (closing line value) signal during qualifier and tournament windows (Methodology proof; not a marketing metric per se but the most defensible authority claim we have)

**Tracked, weighted lightly**:

- Raw impressions
- Follower count
- Single-day traffic spikes

**Not tracked, deliberately**:

- Vanity engagement (likes without saves, views without follow-through)
- Press mentions in non-domain outlets
- Anything that does not eventually map to either a citation or a returning user

---

## 8. Suppression Rules (the "do not ship" list)

Drawn directly from the model's volatility gate, adapted for distribution. Any of these triggers a 24-hour content freeze and a written incident report.

1. **Calibration failure**: any short-form piece whose claim is contradicted by the next snapshot. Pull the post. Issue a public correction. Log in `corrections.md`.
2. **Tone failure**: any deliverable that strays into prediction language, pick language, or "lock of the week" register. Reject before publish; if shipped, retract within 6 hours.
3. **Reviewer breach**: any Ring 1 or Ring 2 contact mentioning, in private or public, that we are spamming or pressuring. Halt outbound to that ring; escalate; written apology within 24 hours.
4. **Subreddit warning**: any mod-flagged post on r/soccer, r/datascience, or any team sub. Halt that surface for 30 days; review what triggered the flag; resume only with a different posting archetype.
5. **Algorithmic miscalibration**: a piece of short-form content goes viral on a misreading of the methodology (the audience receives a wrong directional impression). Pull, correct in a follow-up post, accept the engagement loss. Channel 1 trust is more expensive than Channel 3 reach.

---

## 9. Budget Envelope

T-24 to T-6: zero paid media. Spend lives in production (camera, lights, editor freelance budget for Channel 3) and in software (analytics, email, hosting). Estimated quarterly burn: $4k to $7k, mostly variable.

T-6 to T-3: optional small paid retargeting layer ($5k cap) on users who already touched the terminal and did not subscribe to alerts. Performance only; no top-of-funnel paid.

T-3 to T+0: paid envelope unlocked up to $50k contingent on Phase 2 KPIs cleared. Allocation: 40% retargeting, 30% lookalike of alert subscribers, 30% direct sponsorship of one tier-1 sports analytics newsletter (negotiated, not auctioned).

The default is zero. Every paid dollar requires an explicit cleared phase KPI as authorization.

---

## 10. The Two-Year Calendar (high-level)

| Date target | Milestone |
|---|---|
| T-24 (now) | This document approved; reviewer outreach list finalised |
| T-22 | First 30 Ring 1 emails sent; first 5 responses logged |
| T-20 | Working paper v0.5 in reviewer hands; OSF pre-registration draft |
| T-18 | OSF pre-registration submitted; M-star locked; P0 KPI checkpoint |
| T-16 | First high-effort r/datascience post; first Twitter quote-tweet wave |
| T-14 | First AMA on r/soccer (coordinated) |
| T-12 | P1 KPI checkpoint; Channel 3 production line live |
| T-9 | First 50 short-form pieces shipped; first viral cycle measured |
| T-6 | P2 KPI checkpoint; paid retargeting envelope unlocks if cleared |
| T-3 | P3 launch; tournament dashboard goes daily-update |
| T-1 | Press embargo lifts; tier-1 outreach to embedded reviewers |
| T+0 | Tournament starts; we operate, we do not market |

---

## 11. What We Are Not Doing

Stated explicitly so that future deviations are visible deviations:

- Not running Google or Meta top-of-funnel paid acquisition before T-6
- Not partnering with sportsbooks under any circumstances at any time
- Not speaking the language of "picks," "locks," "expert plays," or "prop bets"
- Not building an affiliate program
- Not gating any methodology behind a paywall or email wall during P0 and P1
- Not running giveaways, bracket challenges, or contests
- Not ghostwriting "guest posts" on SEO blogs

Each of these would deliver short-term traffic and would compound against the credibility scaffold for the entire two-year horizon. Cost-benefit is decisively negative.

---

## 12. Sign-off

This plan is binding through the next quarterly review (T-21). Deviations require written justification logged in `growth_log/deviations.md`, parallel to the methodology deviation registry. Distribution and methodology are governed by the same discipline because in this project they are the same product.

If the plan starts to feel like marketing, it is broken; pull it back to "publish, document, contribute, repeat" until it stops feeling like marketing.

End of document.
