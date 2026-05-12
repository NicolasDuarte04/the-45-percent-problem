# W-5 Daily Checklist (May 7 to May 13, 2026)

**Owner**: Nicolás
**Window**: T-35 to T-29
**Site**: https://45analytics.com (live)
**Mode**: Execution. Plan is locked. Move.

Each day has a hard list. Anything not on the list does not happen this week. Items are ordered by priority within the day; if the day shortens, you cut from the bottom.

---

## Thursday May 7 (today, T-35) — PREP

This is the only zero-ship day in the sprint. Tomorrow ships.

Morning (4 hours):
- [ ] Confirm site live; verify OG image generation works end-to-end on mobile and desktop
- [ ] Verify alert subscription flow stores email correctly; send a test from a clean address
- [ ] Build `growth_log/` directory in repo with subfolders: `press_log.csv`, `social_log.csv`, `paid_log.csv` (will stay near-empty), `budget_deviations.md`, `corrections.md`
- [ ] Build the press allocation table in `growth_log/press_allocations.csv`. One row per Tier A target, columns: writer, outlet, exclusive_finding, status, last_contact, last_response, published_url
- [ ] Lock the bench list (8 to 12 named accounts you will privately ask to QT on May 8). Save to `growth_log/bench_list.md`. No money exchange, no obligation; just a heads-up DM 24h before launch

Afternoon (5 hours):
- [ ] Generate the Burn-Murdoch calibration chart per `BURN_MURDOCH_PACKET.md` Section 3. PNG + SVG + CSV. Save to `press_packets/burn_murdoch/`
- [ ] Finalize the Burn-Murdoch email and draft column from `BURN_MURDOCH_PACKET.md`. Triple-check the numbers in the draft column against the actual M0-M3 ablation output before sending tomorrow
- [ ] Draft the next 3 Tier A packets (Silver, Levine, Karun Singh) following the same structure: chart + 250-word column + email. These ship Friday May 9
- [ ] Draft the four Athletic data desk packets (Muller, Carey, Critchley, Worville). Different team angle each. These also ship Friday

Evening (3 hours):
- [ ] Lock the 11-tweet pinned thread on the founder Twitter account, scheduled for 09:00 ET tomorrow. Saved as draft, not posted
- [ ] Lock the institutional account amplification tweet, scheduled for 09:05 ET
- [ ] Lock the Trailer 2 drop tweet, scheduled for 09:30 ET
- [ ] Lock 5 short-form pieces for tomorrow's 12:00 ET ship (1 Number, 1 Disagreement, 1 Methodology Receipt, 1 cut from Trailer 2, 1 Divergence Map). Render and queue
- [ ] Send 24-hour heads-up DMs to the 8 to 12 bench accounts. Single sentence each, no ask, just "going live tomorrow 09:00 ET, link if you find it interesting"
- [ ] Send the arXiv endorsement request email tonight. Target endorser: any researcher who has previously published in stat.AP and whose work touches sports forecasting or sports stats. Pull the list from arXiv author search; send to the top 3 names in priority order

End-of-day check: every item above complete or actively logged as deviated.

---

## Friday May 8 (T-34) — LAUNCH DAY

This is the most operationally dense day of the sprint. Block the calendar.

08:30 ET:
- [ ] Daily standup written into `growth_log/daily_log.md`: yesterday shipped, today ships, slip risk
- [ ] Coffee. No exceptions.

09:00 ET:
- [ ] Pinned thread posts (founder account)
- [ ] Set Trailer 1 link visible above the fold on 45analytics.com home

09:05 ET:
- [ ] Institutional account amplifies the thread

09:30 ET:
- [ ] Trailer 2 drops on institutional account

10:00 ET — TIER A PACKETS GO:
- [ ] Send Burn-Murdoch packet (per `BURN_MURDOCH_PACKET.md`)
- [ ] Send Silver packet
- [ ] Send Levine packet
- [ ] Send Karun Singh packet

10:30 to 12:00 ET:
- [ ] Founder replies in soccer-stats Twitter and quant-data Twitter. 5 to 10 substantive replies, no link unless responsive. Quote-tweet at most one bad probability claim with a terminal screenshot

12:00 ET:
- [ ] First 5 short-form pieces ship across TikTok, Reels, Shorts, X, LinkedIn

13:00 to 14:30 ET:
- [ ] Lunch + Tier A inbox triage. Anyone who replied gets a same-day, hand-written response

14:30 ET — REDDIT MOD OUTREACH:
- [ ] Send AMA outreach DMs to head mods of: r/datascience, r/soccer, r/dataisbeautiful. Use the script in `T-35_BLITZ_ORGANIC.md` Section 3.1. Each DM includes a sub-specific custom analysis offer that gets delivered whether or not the AMA is greenlit

16:00 ET:
- [ ] Substack live: `45analytics.substack.com`. First post is a 600-word "what we built and why" essay. Title: *Pre-registering a probabilistic World Cup forecast*. Cross-link to OSF, GitHub, Trailer 1
- [ ] Pin the Substack URL to the institutional Twitter bio
- [ ] Add the Substack signup widget below the fold on 45analytics.com home

17:00 to 19:00 ET:
- [ ] Founder Twitter: 10+ more substantive replies. Continue. The day ends with engagement, not announcement
- [ ] Inbox triage round 2

End-of-day check:
- [ ] 4 Tier A packets out, confirmed delivered
- [ ] Trailers + thread + Substack + 5 short-form all live
- [ ] 3 mod DMs out
- [ ] Daily log updated with every metric: thread engagement, packet acknowledgements, Substack subs, Twitter follower delta, alert subs delta

---

## Saturday May 9 (T-33) — TRIAGE + ATHLETIC

Morning (4 hours):
- [ ] Standup
- [ ] Tier A reply triage. If Burn-Murdoch, Silver, Levine, or Karun engaged, draft a same-day follow-up with whatever they asked for, no matter what
- [ ] Send the 4 Athletic data desk packets (Muller, Carey, Critchley, Worville) at 09:00 ET. Each has a different team-specific angle and a different exclusive number

Afternoon (4 hours):
- [ ] Send AMA outreach DMs to the next 3 subs: r/MachineLearning, r/sports, r/USsoccer
- [ ] Substack second post: *The 2022 hold-out, four models, and why the simplest one won*. Roughly 700 words. Reuses the same chart sent to Burn-Murdoch but with the full ablation table
- [ ] Ship 5 short-form pieces (cross-posted across TikTok, Reels, Shorts, X)

Evening (2 hours):
- [ ] Founder Twitter: 8+ substantive replies
- [ ] Daily log

End-of-day check:
- [ ] 8 Tier A packets total out (4 from Friday + 4 today)
- [ ] 6 mod DMs total out (3 yesterday + 3 today)
- [ ] Substack at 2 posts, growing

---

## Sunday May 10 (T-32) — CALIBRATION CHALLENGE DAY

Light shipping day. The big public action is the calibration challenge.

Morning (3 hours):
- [ ] Standup
- [ ] Lock the calibration challenge artifact: a single pinned tweet thread + a Substack post + a GitHub release tag (`v1.0-pre-tournament`). The artifact contains:
  - 45 Analytics' pre-tournament probability for each of 48 teams winning the Cup
  - Pre-tournament probability for each of the 12 group winners
  - The 30 most-divergent match probabilities vs. de-vigged Pinnacle
  - SHA-stamped, no edits possible after publish
- [ ] Publish the artifact at 11:00 ET (Sunday morning maximises engaged audience)

Afternoon (3 hours):
- [ ] Tag in the challenge post: Silver, Burn-Murdoch, FiveThirtyEight successors, Karun Singh, the soccer analytics bench. Tone is inviting, not confrontational. "We have committed; we are interested in seeing how others do." Single tweet, no thread of grievance
- [ ] Ship 5 short-form pieces, including 1 specifically about the challenge ("we just locked our predictions, here is what they are")

Evening (2 hours):
- [ ] Founder Twitter: respond to all engagement on the challenge post, no matter how minor
- [ ] Daily log

End-of-day check:
- [ ] Challenge artifact published, SHA-stamped, immutable
- [ ] All Tier A and Tier B writers tagged

---

## Monday May 11 (T-31) — REST + BATCH SHOOT

Enforced rest *morning*. This is non-negotiable per the suppression rules. Burnout suppression is a real failure mode.

Morning: away from the computer. Walk, gym, breakfast that is not at the desk. Phone airplane mode for 3 hours.

Afternoon (5 hours) — BATCH SHOOT for May 12-14:
- [ ] Shoot 12 short-form pieces in a single session. Templates locked, no improvisation
  - 4 Numbers (one per day for May 12, 13, 14, plus 1 spare)
  - 2 Disagreements
  - 2 Methodology Receipts
  - 1 Rarity Reveal (sourced from terminal usage data this week)
  - 1 Divergence Map
  - 2 spare cuts from Trailer 2
- [ ] Edit all 12 pieces tonight or schedule for early tomorrow

Evening (2 hours):
- [ ] One-touch follow-up on Tier A non-responders only. Four max: a one-line email saying "circling back; available for a 15-minute call this week if useful." No second follow-up after this. No nagging
- [ ] Daily log

End-of-day check:
- [ ] 12 short-form pieces in the publish queue
- [ ] No Tier A target has received more than 2 emails total

---

## Tuesday May 12 (T-30) — SHOW HN DAY

The single highest-EV organic surface of the entire sprint. Day cleared in advance.

07:30 ET:
- [ ] Submit Show HN: *Show HN: Pre-registered probabilistic World Cup forecast (M0-M3 ablation, OSF)*
- [ ] URL points to 45analytics.com (not Substack, not GitHub; the live terminal is the strongest landing page)
- [ ] Post the anchor first comment within 60 seconds of submission. 300 words covering: project purpose, what is not being claimed, what is open-source, one specific design decision the audience will want to debate (suggested: power-method vs proportional de-vigging, or M0 winning the ablation)

08:00 to 14:00 ET — ON THE THREAD:
- [ ] Reply to every top-level comment within 30 minutes. No exceptions. Front-page retention on HN is mostly OP responsiveness in the first 6 hours
- [ ] Do not get defensive. Acknowledge the substantive criticisms; mark which ones go on the working paper's "open questions" list; thank the trolls and move on

14:00 to 18:00 ET:
- [ ] Continue thread engagement, but at lower frequency (every 60 to 90 minutes)
- [ ] Pause the day's other ships if HN is in the front page top 10. Do not flood the launch with ancillary noise
- [ ] If HN does not take by 14:00 ET (front page top 30 or higher), do not panic. Do not resubmit. The submission is now durable Google authority regardless

Evening:
- [ ] Capture the entire HN thread for archive (the comments are content)
- [ ] Send the HN URL to any Tier A target who replied this week. "FYI, this went live today; the discussion is interesting"
- [ ] Daily log; this is the most important entry of the week

End-of-day check:
- [ ] HN submission posted on schedule
- [ ] OP engagement maintained for 6+ hours
- [ ] Whatever happened, captured and archived

---

## Wednesday May 13 (T-29) — RECAP + W-4 PREP

Morning (3 hours):
- [ ] Standup
- [ ] Write a 600-word Substack post about the HN experience: what landed, what got pushback, what changed in the working paper as a result. This is exactly the kind of meta-post that converts HN-surfaced visitors into subscribers
- [ ] Pin the Substack post to both Twitter accounts

Afternoon (4 hours):
- [ ] Draft Tier B packets: The Ringer, Wired, Quanta, Guardian, Reuters, AP. 6 packets, each with a different angle (cultural framing, methodology-as-software, plain-English bivariate Poisson, narrative humility, wire-style scoop, wire-style scoop). These ship Thursday May 14
- [ ] Draft Tier C podcast outreach list (8 shows confirmed). Reach out beginning May 18 per plan

Evening (2 hours):
- [ ] Ship 4 short-form pieces (lighter day on shipping; the HN post and Substack are the cognitive load today)
- [ ] Write the W-5 retrospective: what worked, what to amplify in W-4, what to drop
- [ ] Daily log

End-of-day check:
- [ ] Tier B packets drafted, ready for Thursday send
- [ ] W-5 retrospective written and saved to `growth_log/retrospectives/W-5.md`
- [ ] Substack at 4 posts; institutional Twitter has 7 days of consistent shipping behind it

---

## What Is Not on This Week's List (deliberately)

- Paid anything
- arXiv submission (W-4; endorsement is requested this week, submission follows)
- Wikipedia talk-page suggestions (W-4 onward, after arXiv preprint exists)
- /r/dataisbeautiful organic post (W-3, May 21 Wednesday morning)
- Press round 2 (W-3)
- Tournament dashboard public launch (W-2)

If something on this list pulls forward, write it as a deviation in `growth_log/daily_log.md` before doing it. The plan can flex; the audit trail cannot.

---

## End of Week Hard Check (Wednesday May 13, 18:00 ET)

By the end of W-5 the following must be true. If any are false, W-4 starts with a 24-hour catch-up before new work:

1. 12 packets out (8 Tier A + 4 Athletic). 0 to 4 replies is normal; this is not a failure mode
2. 6 AMA mod DMs out, at least 2 acknowledged
3. 1 Show HN submission, captured outcome
4. Substack live with 4 posts, organic subscribers >100
5. 11-tweet thread + Trailer 1 + Trailer 2 + calibration challenge artifact all live and pinned
6. Daily log written every day, no gaps
7. Founder is not destroyed (sleep average above 6 hours; one rest morning taken)

Move.
