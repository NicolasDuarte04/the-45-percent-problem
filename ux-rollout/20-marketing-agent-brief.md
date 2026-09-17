# Marketing Agent Brief: 45 Analytics WC 2026 Campaign

## Context

You are being hired as the marketing mastermind for a probabilistic World Cup forecasting platform called 45 Analytics (project name: The 45% Problem). The product has been in development for several months and is now operationally ready. The 2026 FIFA World Cup starts in 25 days (June 11, 2026). You have a budget of $100 USD and a clear preference for organic / high-yield growth over paid spend.

Your job: produce a comprehensive marketing strategy plus the first 30 days of content drafts, ready for the operator (the founder, Nicolas) to execute.

This brief is long because the product is non-trivial and the brand discipline is unusually strict. Read it in full before drafting anything.

---

## Part 1: What the product is

### The framing

45 Analytics is a probabilistic pricing framework for the 2026 FIFA World Cup. It is NOT a betting tool, NOT a tipping service, NOT a sportsbook. It is a research-grade simulator that estimates probability distributions for tournament outcomes, then compares its estimates to bookmaker-implied probabilities to surface mispricings.

The name "The 45% Problem" comes from the Hoffmann-Ging-Ramasamy (2002) paper on World Cup forecasting variance. Their finding: structural variables (economic, demographic, historical) explain roughly 55% of outcome variance. The remaining 45% residual is the project's subject. The brand owns that 45% as a research constraint, not an enemy.

### The two deliverables of the broader project

1. A live website (45analytics.com) that publishes probability distributions, model-vs-market divergences, and a public simulator. This is what you market.
2. An academic research paper documenting the methodology, ablation studies (M0 through M3 model variants), pre-registered hypotheses, calibration outcomes. Pre-registered at OSF (osf.io/spmkg) with code SHA tagged v1.0.0-mstar-lock before kickoff. The paper is the credibility layer.

### Technical methodology in one paragraph (for the academic track)

The model is a bivariate Poisson with Dixon-Coles low-score correction, calibrated nightly on 10,000 Monte Carlo runs. Per-match expected goals come from a calibrated Elo-based strength model (Mstar, the champion model selected via cross-validation log-loss between M0 pure Elo, M1 Elo plus exponential-decay form, M2 Elo plus FIFA rank shrinkage, M3 Bayesian macro-prior). The market layer uses Shin power method de-vigging (1993, Strumbelj 2014) to convert bookmaker odds into implied probabilities. Edge metric is E = p_model minus q_devigged. Pre-registration discipline locks the model, constants, and kill criteria before the first match.

### The user-facing surfaces

The website has three product surfaces you market:

1. **Scenario Simulator** at /scenario (this is the viral engine). Three modes:
   - **Final Four**: pick 4 teams to reach the semifinals. 30 seconds. Yields a "Reality Score" showing how rare your scenario is across 10,000 simulated tournaments (e.g., 1 in 88).
   - **Champion's Path**: trace one team's journey to the final, picking opponents and outcomes at each round. About a minute.
   - **Full Bracket**: predict the whole tournament. For obsessives.
   - **Browse Rarities** at /scenario/explore: pick a rarity band (Common / Plausible / Uncommon / Rare / Vanishingly rare), see 5 example scenarios at that band with their actual probabilities.
   - Every submission generates a permalink with a brutalist OG image (1200x630 PNG) showing the user's "1 in N" number, the scenario, and the team flags. Designed to unfurl beautifully on social media.
   - Submitting an email "arms an alert" (the brand calls it ARM POSITION, not "subscribe"). The user receives a daily digest during the tournament showing how their scenario's state evolved as matches settled (ALIVE / DEAD / PROMOTED).

2. **Quant Terminal** at /terminal (Bloomberg-style data interface). Shows the model's championship probabilities for all 48 teams, divergences from bookmaker-implied prices, top mispricings sorted by edge magnitude. Lower-priority for marketing because it is denser; useful as a credibility surface for the quant audience.

3. **The Bracket** at /bracket. A 48x6 matrix showing per-round marginal probabilities for every team. Visual proof of model rigor.

4. **The Vault** at /vault. Research essays explaining methodology, the kill criterion, calibration approach. Academic credibility layer; do not gamify.

5. **Forecast Desk** at /me. Returning user dashboard showing their submitted predictions and how each has evolved.

### Pre-built viral assets

The product ships with four hand-curated promo OG cards at /api/og/promo/[slug]:
- favorites (ESP/FRA/ARG/BRA in semifinals): 1 in 88 at current snapshot
- conmebol (ARG/BRA/URU/ECU): 1 in 189
- euro-four (ESP/FRA/GER/ENG): 1 in 10,000
- host-trio (USA/MEX/CAN/ESP): 1 in 10,000

Each card links to /scenario/final-four?card=<slug>, which pre-fills the picker. A click on a tweet's image takes the user directly into a scenario they can edit and submit.

The Final Four mode also accepts /scenario/final-four?teams=ESP,FRA,ARG,BRA to pre-fill any custom combination. You can construct an arbitrary scenario link for any country narrative.

### The calibration loop (during tournament)

From June 11 through July 19, the system runs autonomously:
- Hourly cron polls Football-Data.org for newly-settled matches.
- New outcomes flow to the predictions evaluator.
- Predictions transition state: ALIVE (scenario still possible), DEAD (contradicted by a match outcome), PROMOTED (confirmed by a match outcome).
- Daily calibration digest fires at 06:05 UTC the next morning.
- Subscribers receive an email like "GER eliminated in R32 vs ITA (0-2). Your Final Four scenario is no longer possible."

This means the marketing has a free content engine during the tournament: every match day produces real probability shifts that can be screenshot, tweeted, and explained.

### The Plausible analytics events you can measure

Already instrumented and shipping to Plausible:
- simulator_opened (with mode and surface: page or inline)
- first_pick (per session per mode)
- submit_success (with mode and rarity_band)
- share_action (with type: copy, png, native, copy_post)
- alert_armed (email verified)
- promo_card_landed (with slug)
- desk_viewed (per session for verified operators)
- snapshot_toggle (with snapshot ID)
- explore_band_selected (with band)
- explore_card_clicked (with band and teams)

You can request specific reports from Nicolas to validate engagement once content goes live.

---

## Part 2: Brand discipline (NON-NEGOTIABLE)

Read this section twice. Every piece of content you draft will be checked against these rules. Violations are reasons to discard the draft entirely.

### Vocabulary that is BANNED in marketing copy

- "Bet", "betting", "wager", "odds" (use "probabilities", "model-implied prices")
- "Pick" as a noun, "lock", "play", "value bet", "expert pick", "tip", "tipster"
- "Edge" in the sportsbook sense (the brand uses "divergence" for model-vs-market gaps)
- "Predict", "prediction" as certainty claims ("the model says X will win"). Always use probabilistic framing.
- "Beat the bookies", "smarter than Vegas", "outperform"
- "Genius", "expert", "guru", "savant"
- "Shocker", "stunner", "upset of the century"
- Emoji of trophies, money bags, fire, alarm bells, gambling chips
- "Limited time", "act now", "don't miss out", manufactured urgency

### Vocabulary that is ENCOURAGED

- "Calibrated", "pre-registered", "transparent"
- "1 in N simulated tournaments"
- "Probability distribution", "marginal probability"
- "The model's modal call", "the model places this at X%"
- "Settled", "alive", "dead", "promoted" (operator vocabulary)
- "Divergence" (for model-vs-market gaps)
- "Snapshot" (for daily data updates)
- "ARM POSITION" (the existing alert vocabulary)

### Aesthetic constraints

- The site is brutalist quant. Black background, mono and serif fonts, terminal-green / terminal-amber / off-white. NO flashy graphics in your marketing assets either. If you produce visual content, it should look like a Bloomberg terminal, not a sportsbook ad.
- No celebratory animations, no confetti, no "Level up!" framing.
- Founder explainer videos should be calm, descriptive, slightly nerdy. Not hype.

### Tone constraints

- No promotional language. Describe what the product does; do not sell it.
- No comparisons that demean other sports analytics. Do not punch at Nate Silver, 538, sportsbook services, etc.
- The audience for this brand is sophisticated. Treat them that way. Reading depth is rewarded.

### Honesty constraints

- The model is not better than bookmakers at predicting outcomes. The model produces calibrated probabilities and surfaces divergences. Never claim the model "wins" anything.
- The 1-in-N numbers are computed from the current snapshot's marginal probabilities. They are honest. Never round to exaggerate rarity.
- The pre-registration discipline is the credibility anchor. Mention it; do not fabricate other credentials.

### What to do if a tactic feels brand-incompatible

Skip it. Brand integrity matters more than any single viral hit. The audience that will sustain the project after kickoff cares about how this brand presents itself. A single tasteless tweet damages trust more than ten clean ones build it.

---

## Part 3: Audience segmentation

Two tracks. Different content, different channels, different cadence. Some assets can serve both.

### Track A: Mass casual (TikTok, Instagram Reels, Facebook, possibly YouTube Shorts)

**Who they are**: World Cup fans. Casual sports followers. The kind of audience that posts "Vamos Colombia" emoji during a match. National-pride driven. Mobile-first. Short attention span.

**What hooks them**: country-specific narratives, rarity stats they can flex, founder explainer content that feels human, "I built this" personal story.

**Specific creative directions Nicolas already suggested**:
- Localized country posts: "I simulated the World Cup 10,000 times. Colombia won in [X]%. Here's the path that gets us there." Repeat with the user's prediction permalink as the unfurl.
- "Every day during the World Cup, I will simulate the tournament 10,000 times. Today, Colombia's chances are [X]%. Yesterday they were [Y]%. Here's why they moved."
- Founder explainer: "I am a [background] who built a model for the World Cup that does not pick winners. It shows you how rare your favorite scenario is. Try it for free." 30-60 second talking head.

**Localization angles** (one per country, repeat the template):
- Colombia, Argentina, Brazil, Mexico (LATAM strong)
- USA, Canada (host nations)
- Morocco (2022 dark horse story, strong narrative)
- Spain, France, England, Germany (European powers)

Each country gets its own "1 in N" video. Use the existing /scenario/final-four?teams= URLs to construct pre-filled scenarios for each.

### Track B: Nerd / quant / academic (X/Twitter, LinkedIn, possibly Reddit r/dataisbeautiful and r/soccer-stats)

**Who they are**: Sports analytics enthusiasts who follow 538, Nate Silver, Tony Bloom, Stathletes, Opta. Quant researchers in finance, decision theory, behavioral economics. Sports econometrics academics. Bayesian statisticians. People who tweet about Brier scores.

**What hooks them**: methodological rigor, pre-registration discipline, model-vs-market divergence content, the Hoffmann-Ging-Ramasamy framing, calibration data once it starts flowing.

**Specific creative directions**:
- Methodology thread: "Pre-registered probabilistic model for WC 2026. Bivariate Poisson + Dixon-Coles. Calibrated on 60 years of international match data. Pre-reg at osf.io/spmkg. Code SHA locked at v1.0.0-mstar-lock. Here is the ablation study comparing M0 through M3..."
- Divergence callouts: "The model puts Spain at 18.2% to win. Pinnacle's de-vigged implied probability is 21.4%. That is a 3.2pp divergence at the favorite. Here's why..."
- Snapshot toggle content: "The model said Spain was at 30.8% on May 9. Today it says 18.2%. What changed: France's win over [opponent] tightened the upper bracket. Here is the per-stage shift..."
- Academic thread on the 45% problem: "Hoffmann, Ging, Ramasamy (2002) found structural variables explain ~55% of WC outcome variance. The remaining 45% residual is what we are pricing under, not predicting through. Here's how we operationalized that..."

**Channels**:
- X/Twitter: short threads (8-12 tweets), screenshot of the bracket page, the terminal, specific divergences.
- LinkedIn: long-form posts about the methodology, the pre-registration discipline, "why a research paper plus a live site is the right deliverable shape for sports analytics."
- Reddit: r/dataisbeautiful (the bracket matrix as an image post), r/soccer (the rarity reveal of common scenarios), r/statistics (the calibration discipline).

---

## Part 4: Timeline and cadence

25 days to kickoff. The tournament runs June 11 to July 19. Total content window: roughly 60 days.

### Phase 1: Pre-kickoff (Days 1 to 25, NOW until June 11)

Goal: build the audience before the tournament starts. Establish credibility. Get the simulator into the hands of early adopters who will then create their own UGC during the tournament.

Content cadence:
- 2 to 3 organic posts per channel per week (LinkedIn, X, Instagram, TikTok)
- 1 longer-form piece per week (LinkedIn essay, YouTube video, or Twitter long thread)
- Coordinate launches: same day across channels for amplification

Content priority:
- Founder explainer video (do this first, week 1)
- Methodology thread on X (week 1)
- 4 localized country videos (one per week)
- 2 divergence callouts on X (weeks 3 and 4)
- 2 LinkedIn essays on the research framing (weeks 2 and 4)

### Phase 2: Kickoff week (June 11 to June 18)

Goal: ride the wave. Match-day content compounds. Every match settles probabilities; every shift is content.

Content cadence:
- Daily during match days: brief tweet or Instagram story about the day's biggest probability shifts
- 1 "after a match settles, here is how [country]'s chances moved" post per major settling
- 1 founder reaction video per day on TikTok if feasible
- Calibration emails are firing daily; the audience that signed up gets value immediately

### Phase 3: Group stage to knockouts (June 19 to July 5)

Goal: the storytelling phase. Each KO match settles dramatic state transitions. Featured scenarios reveal.

Content cadence:
- Daily X tweets on biggest divergences and biggest probability movers
- 2 to 3 deeper threads per week (model-vs-market, country narratives, the unexpected eliminations)
- Featured scenarios at /scenario/explore as social posts
- Founder reaction videos for upsets

### Phase 4: Quarters, semis, final (July 6 to July 19)

Goal: peak audience attention. Convert curious viewers into newsletter subscribers / future research users.

- One per-match deep dive post per channel
- Daily probability shift video on TikTok
- The final: live-narrated probability evolution during the match (X) and a finale video the next morning

### Phase 5: Post-tournament (July 20 onwards)

Goal: convert tournament audience into the research-paper audience.

- Working paper announcement
- Calibration results: how the model did (Brier score, log-loss, retrospective)
- Most surprising probability shifts of the tournament

---

## Part 5: Budget allocation ($100 USD total)

Realistic options:
- $30: One small TikTok boost on the founder explainer video (test creative)
- $20: One small Instagram boost on the best-performing organic localized country video (the version with highest organic reach)
- $20: LinkedIn boost on the methodology essay if it lands well organically (test track B)
- $30: Reserve for opportunistic boost on whatever hits viral organic during the tournament

Reasoning: $100 is too small to drive top-of-funnel acquisition through ads alone. The strategy is heavy organic with paid amplification on whatever proves itself. Do not commit the budget up front; deploy reactively to organic wins.

Do NOT recommend spending on:
- Tabloid-style "boost this post" without organic proof
- Influencer payments (out of budget range)
- Display advertising (wrong audience and format)

---

## Part 6: What to deliver

Produce a marketing strategy document at the project root titled `MARKETING_STRATEGY_2026-05-17.md`. Structure:

```
# 45 Analytics Marketing Strategy (WC 2026)

## Executive summary (one page)

## Brand positioning (half page)
What the brand stands for in one sentence. The two audience tracks named. The core constraint that other sports forecasting brands ignore.

## Audience definitions
Track A: mass casual. Track B: nerd / quant / academic. Specific personas for each, with channel preferences and content preferences.

## Channel strategy
Per channel: cadence, content type, voice, what NOT to post.

## Content calendar: first 30 days
Day-by-day or week-by-week schedule. Specific post drafts (not just topics) for at least the first 14 days. Drafts should be paste-ready: title, body, image asset to use, link to embed, hashtags.

## Specific creative concepts (12 to 18 concepts)
Detailed concepts for the highest-leverage content ideas:
- Founder explainer video (script, 60 to 90 seconds)
- Localized country videos (template plus 4 to 6 country-specific scripts)
- Methodology thread (full 12-tweet draft)
- Divergence callout template (with one worked example using current snapshot data)
- LinkedIn long-form essay drafts (2 essays, full text)
- Featured rarity scenarios (5 specific scenarios to lead with, using the existing promo card slugs plus 1 to 2 custom)
- One "the bracket as data" post for r/dataisbeautiful (specific framing + the bracket page screenshot)
- One TikTok daily-during-tournament template (15 to 30 second format)

## Visual asset list
Screenshots, OG cards, video frames the operator needs to produce or capture. Be specific about which URLs to screenshot.

## Budget plan
How to deploy the $100. Trigger conditions for each deployment.

## Metrics and feedback loops
What to measure week by week. Which Plausible events matter for which audience track. When to course-correct.

## Risks
Brand-discipline risks (the things that would damage the brand). Operational risks (what to do if a piece flops or if a match outcome the model missed becomes a viral talking point against the brand).

## Open questions for the operator
List the questions you would want Nicolas to answer to refine the plan further.
```

The output should be roughly 4,000 to 7,000 words. Substantial. The first 30 days of content drafts is the most important part because it is what the operator will execute starting tomorrow.

---

## Part 7: How you should think about this assignment

You are not writing ad copy. You are designing a campaign whose central asset is a working product. The product does the heavy lifting; your job is to put it in front of the right people in a way that respects what the product actually is.

The reason this brand has a chance to break through is that almost no one in the sports forecasting space combines a rigorous probabilistic model with a public-facing viral instrument. ESPN has predictions but no rigor. 538 had rigor but they killed the site. Bookmakers have the math but they are bookmakers. The 45 Analytics positioning is: research-grade methodology with a play surface. The simulator is the surface that makes the research approachable.

The viral hook is not "we predict winners better than anyone else." The viral hook is "we show you how rare your favorite tournament outcome is, with calibrated honesty, and we update those numbers in real time as matches settle." That framing is unusual enough to break through.

When you draft content, ask yourself: does this respect the audience or does it sell them something? The audience for this brand notices the difference. Respect them.

When you finish, the operator should be able to open the document, copy a draft, paste it into the relevant platform, attach the named asset, and post. No further translation needed.

---

## What this delivers and how the operator will use it

### What changes

The operator has a comprehensive marketing playbook with the first 30 days of content drafts ready to post. Strategy is two-track (mass casual + nerd/academic) with channel-specific guidance. Budget allocation is explicit. Success metrics tie to existing Plausible events.

### How the operator (Nicolas) uses it

1. Read the strategy document end to end before starting.
2. Days 1 to 7: post the founder explainer video first (the asset that takes the longest to produce); ship the methodology thread the same week.
3. Days 8 to 14: launch the localized country videos one per week, on a regular cadence.
4. Days 15 to 25: maintain pre-kickoff cadence, build the audience.
5. June 11 onwards: switch to match-day content using the calibration data the system already produces automatically.

### How to verify the agent did good work

Three checks before executing any draft:

1. Vocabulary check: grep the document for the banned words listed in Part 2. Count should be zero in user-facing copy. Any hit is a discard for that draft.
2. Aesthetic check: any visual concept that does not match the brutalist quant aesthetic gets discarded.
3. Audience fit: does a Track A piece feel right for TikTok? Does a Track B piece feel right for an X analytics audience? If you cannot tell, the agent missed the segmentation.

### If the agent's plan does not pass these checks

Send it back with specific corrections cited. The brand-discipline constraints in Part 2 are non-negotiable; an agent that drifts from them produces unusable output regardless of how creative the ideas are.

### Coordination with future product changes

You mentioned visual/intuition UX changes coming after the marketing brief lands. The marketing plan should NOT depend on speculative future product changes. It works with the current production state of the site. If you ship UX changes that affect the marketing surfaces (e.g., the simulator landing, the promo OG cards), the marketing plan needs a small revision pass, but the strategic structure remains.
