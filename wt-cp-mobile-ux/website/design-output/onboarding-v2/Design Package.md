# Onboarding v2 — design package

**Deliverable:** `Onboarding v2.html` (live, functional). Two surfaces, additive only, nothing on the existing homepage is replaced, hidden, or restyled.

- **Surface A** — homepage onboarding: a bottom-right chip on first visit → a compact 90-second modal, plus a persistent "First time?" affordance in the masthead.
- **Surface B** — simulator walk-through: a 3-beat coachmark over the real Scenario Simulator UI, dimmed behind a scrim, ending in a side-by-side result + soft email capture.

Open the **Tweaks** panel (toolbar) to flip reduced motion, change the chip delay, reset onboarding state to replay the chip, jump into the simulator, or reset the tour so it auto-runs.

> Every probability, team, and figure in this mockup reads from a single source of truth (`data.jsx`). In production those objects are swapped for reads from `website/public/data/latest/`. Nothing is typed inline. See "Data provenance" below.

---

## 1 · Rationale, per surface

### Surface A — why a chip + modal + persistent "?", not a banner or a forced modal

A first-visit football fan needs ~30–90 seconds of orientation or they bounce; an OSF/academic reader needs the homepage to stay exactly as it is, because every element on it is read as a deliberate claim. The chip resolves that tension. It is the most restrained attention-getter that still earns a glance — the register of **Linear's "what's new" pill** and **Intercom's messenger chip at its quietest**: bottom-right, appears only after a 2.5s settle so the page establishes first, one line of copy, a self-evident ✕. It never covers content and never blocks. Clicking opens a modal that is a **Notion-style first-run panel** reduced to three plain claims — no carousel, no progress dots, no choice to make.

A top **banner** (the GitHub / Stripe-API-notice pattern) was the runner-up. It reads slightly louder because it spans the masthead and shifts the eye before the headline lands, and on a research publication that "above the masthead" real estate is the most editorially loaded space on the page. The chip keeps first contact with the hero pristine and moves the orientation to the periphery, which is the more deferential choice for this voice. The persistent **"First time?"** masthead link (the small "?"/"i" affordance Linear and Stripe Docs keep in their chrome) covers the visitor who dismissed the chip, arrived deep-linked, or simply wants the explainer later — it is always available and never sets or respects the dismissed flag.

### Surface B — why a coachmark over the live tool, not a redesign

The simulator is opt-in and already interactive, so it can afford to be playful where the homepage cannot. The walk-through never rebuilds the simulator; it dims the real UI behind a scrim and spotlights the one region each beat is about, so the user learns the actual controls they are about to use (the coachmark grammar of Linear's onboarding panels). The mini-bracket sampling animation and the Beat-3 slide-in are the only motion, both ≤1.5s, both gated on reduced-motion. This is the one place a small flourish is on-brief because it lives inside the tool, not on the publication's front door.

---

## 2 · Answers to the brief's open questions

1. **Audience-mode (fan vs quant) in onboarding?** **No — decouple it, as the brief leans.** Onboarding's job is orientation, not preference capture; forcing a "are you a fan or a quant?" choice on first visit is exactly the v1 failure. Audience mode belongs as a **persistent header/view toggle on `/bracket`** (and could mirror into `/terminal`), where it is reversible, low-stakes, and discoverable when the visitor actually wants it. It is deliberately absent from both surfaces here.

2. **Surface A pattern.** **Chip → modal, plus a persistent masthead "First time?" link.** Reasoning above. One committed direction, not a menu.

3. **Should Surface A link to Surface B?** **Yes, and it reads well — not onboarding-on-onboarding** — *because the two are sequenced, never stacked.* The modal's primary CTA is "Try the simulator →"; the homepage onboarding closes the moment it hands off, and the simulator tour is a different modality (coachmarks on a live tool, not an explainer card). The visitor experiences one continuous "learn → do," not two overlapping tutorials. The handoff also sets `45a.onboarding.seen`, so the homepage onboarding is finished for good once they cross over.

4. **Beat-3 rarity number.** **"1 in 81" (≈123 of 10,000)** for the default Final Four {Spain, France, Argentina, Morocco} — three favorites plus Morocco, the mid-tier contender the "45% problem" is about. v1's "1 in 847" (count ≈ 12) implies a far more contrarian set. Derivation: a top seed's title probability ≈ P(reach SF)·P(win SF)·P(win final), and for these seeds the two knockout wins compound to roughly a third, so P(SF) ≈ ~2.7× the championship probability shown on the leaderboard. Product of the four semifinal probabilities × 10,000 runs: `0.46·0.40·0.37·0.18 ≈ 0.01225 → ≈ 123 → ≈ 1 in 81`. Computed live from the leaderboard numbers (`finalFourScore()` in `data.jsx`), restricted to the eight teams the leaderboard already shows, so the walk-through introduces no probability the visitor can't find on the homepage. The Beat-3 panel carries an explicit **"◆ ILLUSTRATIVE DEMO VALUE · DO NOT IMPLEMENT AS HARDCODED"** tag. (The figure is recomputed for whatever four the visitor actually picks.)

5. **What happens after the Beat-3 email prompt is dismissed?** The capture collapses and **the result stays fully intact**: the side-by-side "Your Final Four vs Model's median" comparison, the agreement dots, and the rarity badge (band label + Reality Score % + 1-in-N) all remain on screen, along with "Try another prediction" and "[ ? ] replay tour". Dismissal removes only the email row; it never closes or resets the result.

---

## 3 · Copy block

| # | Surface · element | Copy |
|---|---|---|
| A1 | Chip | First time here? · **Read in 90 seconds** → |
| A2 | Masthead link | First time? |
| A3 | Modal eyebrow | § WHAT THIS IS |
| A4 | Modal headline | A research publication, read in 90 seconds. |
| A5 | Modal claim 01 | A **pre-registered probability model** for the World Cup — not a betting site. The method was committed to OSF before the data came in. |
| A6 | Modal claim 02 | Each night it runs **10,000 simulations** of the tournament and publishes the results. Right now it puts {leader} first, at {leader p}%. *(values pulled live — currently Spain, 18.2%)* |
| A7 | Modal claim 03 | It compares those numbers to **bookmaker odds** and publishes every divergence — hits and misses with identical weight. |
| A8 | Modal primary CTA | Try the simulator → |
| A9 | Modal secondary | Got it |
| A10 | Modal footer | osf.io/8b5hd |
| B1 | Replay pill | [ ? ] tour |
| B2 | Beat 1 head | You make a call. |
| B3 | Beat 1 body | Pick a mode. **Final Four** is 30 seconds. **Champion's Path** tells one team's story. **Full Bracket** is for the obsessives. |
| B4 | Beat 2 head | We run 10,000 simulations against your call. |
| B5 | Beat 2 body | Each night the model simulates the tournament 10,000 times. When you pick, we count how many of those runs match. The closer your call to the model's median, the more often it agrees. |
| B6 | Beat 2 corner panel | Sampling the distribution · COMPOSITE {leader p}% |
| B7 | Final Four prompt | Pick the four teams you think reach the semifinals. |
| B8 | Beat 3 head | Your call, beside the model's. |
| B9 | Beat 3 columns | Your Final Four · Model's median Final Four |
| B10 | Rarity badge | {band}. · {band caption} · {pct}% · {1-in-N} simulated tournaments matched your call. |
| B11 | Provenance tag | ◆ ILLUSTRATIVE DEMO VALUE · DO NOT IMPLEMENT AS HARDCODED |
| B12 | Soft email capture | We'll send you one email when the tournament ends, comparing your call to the model's. No marketing. One email, then nothing. → NOTIFY ME · No thanks |
| B13 | Email confirmed | Recorded. We'll send one email when the tournament ends. |

Voice check: third-person/neutral, sentence case, no exclamation points, no "Welcome", no "Let's get started", no "Join thousands". UPPERCASE only on enum-style data labels. `M★`, `osf.io/8b5hd`, signed pp, mono numerals all preserved.

---

## 4 · Interaction notes

### Surface A (~300 words)
The chip is mounted by a controller that reads `localStorage['45a.onboarding.seen']` on first render. If unset, a timer (default 2.5s, Tweak-adjustable) reveals the chip with a 240ms `chipIn` rise from 12px below; under reduced motion the rise is dropped and the delay clamps to ≤400ms. The chip has two hit targets: the body (opens the modal) and a ✕ (dismiss). Both are ≥30px tall. Hovering the ✕ raises its background and ink. Clicking the body opens the modal and hides the chip; clicking ✕ sets `seen=true` and the chip never returns. The masthead "First time?" link is independent: it force-opens the modal regardless of `seen`, and hovering shifts its border and ink 120ms ease-out.

The modal is a focus-trapped dialog: on open the card receives focus, `Esc` closes, clicking the scrim (outside the card) closes, and an explicit "Got it" closes — three self-evident dismissals, no labeled "skip". The card animates in with `modalIn` (180ms, cubic-bezier(0.4,0,0.2,1)); the scrim fades with `overlayIn` (160ms). The overlay is capped at `max-height:80vh` with internal scroll, so it never exceeds the brief's 80% ceiling at any breakpoint. Any close path — Esc, scrim, "Got it", or the "Try the simulator →" CTA — writes `seen=true`. The CTA additionally navigates to the simulator and starts the tour. Focus ring is the design system's single cyan `2px` outline. No element gates access to the page; the homepage scrolls and works normally underneath at all times.

### Surface B (~300 words)
On entering the simulator the controller checks `localStorage['45a.onboarding.tour']`. If not `"completed"` (or if launched from the modal CTA / the replay pill), the tour starts at Beat 1 with the mode picker spotlit: a fixed scrim (`rgba(10,9,8,0.68)`) dims the real UI to roughly a third, while the picker is lifted above it at full opacity with a warm focus ring and stays fully interactive. Hovering a mode card shows its live accent-warm preview — the replay path re-mounts this state so the hover-preview state machine actually re-arms (it is not a no-op). Clicking a mode selects it and advances to Beat 2.

Beat 2 spotlights the Final Four grid and shows a corner panel that, over ~1.3s, fills four tiny bracket columns in 230ms steps then resolves a composite probability — a one-shot, ≤1.5s, gated on reduced motion (it renders its final state immediately when reduced). The Beat-2 coachmark and scrim fade the instant the first team pick registers, returning the visitor to the full-bright grid to finish picking. Picking is capped at four; a fifth is disabled. Submit is enabled only at four picks.

Submit triggers Beat 3 and writes `tour="completed"`. The user's four slide in from the left (`slideInL`), the model's median from the right (`slideInR`), a 1px rule draws between them (`drawRule`, scaleY), and the rarity badge resolves (`badgeIn`) — total ≈1.2s, cubic-bezier(0.4,0,0.2,1). Agreement dots mark teams the model also has. ~1s later the soft email capture appears below the badge. `Esc` or the scrim dismisses an active beat (writing `tour="completed"`). The header **[ ? ] tour** pill is always visible and re-triggers the whole sequence without touching the completed key. Reduced motion replaces every transition with the final composition, no movement.

---

## 5 · Component inventory

| Component | Status | Notes |
|---|---|---|
| `EditorialMasthead` / `HomeMasthead` | **Extended** | Existing masthead + one new ghost affordance ("First time?"). No restyle of existing nav. |
| `ProjectIntro` / hero, `TournamentLeaderboard`, `FeaturedDivergenceCard`, `CalibrationStrip`, `VaultRow`, trophy point-cloud | **Reused, unchanged** | Recreated faithfully from `ui_kits/editorial` as the Surface-A backdrop; not modified. |
| `EdgeBadge` | **Reused** | Mint/rose tinted pill via `color-mix`, per design system. |
| `OnboardingChip` | **Net new** | Bottom-right first-visit chip. ~60 lines. |
| `OnboardingModal` | **Net new** | 90-second explainer dialog; Esc / scrim / "Got it" close. |
| `SurfaceA` controller | **Net new** | Owns `seen` flag + chip/modal visibility + masthead help signal. |
| `SimHeader` | **Extended** | Existing simulator header + the always-visible **[ ? ] tour** replay pill. |
| `ModeSelectorCards`, `RealityBar`, Final Four grid (`ModeA`) | **Reused, unchanged** | Surface-B backdrop; the walk-through sits on top. |
| `EmailGate` / `EmailCapture` pattern | **Reused** | Beat-3 soft capture re-uses the existing register (input + mono CTA + conversational skip). |
| `Spotlight`, `BeatBubble`, `MiniBracketAnim`, `Beat3Comparison`, `SoftEmailCapture` | **Net new** | Tour chrome only; none of it persists or alters the simulator. |
| `SurfaceB` controller | **Net new** | Orchestrates sim phase × tour beat, owns the `tour` key. |

---

## 6 · Data provenance (no mocked data)

`data.jsx` is the single source of truth and mirrors the live snapshot at `45analytics.com/data/latest/tournament.json`. **Spain leads at 18.2%**, France 14.9%, Argentina 13.7%, England 8.3%, Morocco 6.4%, with **Brazil slipped to ~6.3%, below Morocco**. The modal's "what the model says" prose references `LEADER` (Spain) and updates automatically if these values change — the callout text is never typed inline. **Swap target:** replace the `SNAPSHOT`, `TOURNAMENT`, `FEATURED`, `CALIBRATION` objects with reads from `latest/`, and the chip/modal/walk-through callouts update automatically.

The one figure that is *not* a snapshot read is the Beat-3 Reality Score, which is by definition a function of the visitor's own pick (no "real" number exists until someone picks). It is **derived** from the leaderboard's semifinal probabilities, restricted to displayed teams, and carries a visible "do not implement as hardcoded" tag — satisfying the brief's requirement that any illustrative figure be tagged and traceable.

---

## 7 · State keys

| Key | Set when | Effect |
|---|---|---|
| `45a.onboarding.seen` | chip dismissed · modal closed (Esc / scrim / "Got it") · modal CTA clicked | Chip never re-appears. Masthead "First time?" link stays available always. |
| `45a.onboarding.tour` = `completed` | Beat 3 reached, or a beat dismissed via Esc/scrim | Tour does not auto-run on later `/scenario` visits. The header [ ? ] pill always re-triggers it and does **not** change this key. |

Reset both from the Tweaks panel ("Reset onboarding" / "Reset tour") to re-experience first-visit behaviour.

---

## 8 · Things deliberately NOT done (per the v2 "do not design" list)

No homepage hero/leaderboard/divergence content was replaced, hidden, or restyled. No mocked data in a position mistakable for model output (the one illustrative figure is derived + tagged). No element exceeds 80vh. No blocking / "complete to continue" flow. No required preference capture. Nothing reads longer than ~90s. No confetti/sparkles; all motion ≤1.5s and reduced-motion-aware. No `/welcome` or `/onboarding` route. No labeled "skip" button — dismissal is Esc / ✕ / click-outside. Everything remembers itself via `localStorage.45a.*` and stays dismissed.

---

## 9 · Responsiveness

The live build reflows at the brief's three widths. Key grids (hero, featured divergences, calibration, vault, mode picker, Final Four grid, Beat-3 comparison) collapse via media queries at 920px and 560px; the leaderboard scrolls horizontally on narrow screens rather than crushing the bars. The modal's 80vh cap and the chip's `max-width:calc(100vw − 48px)` hold at 375px. Resize the preview to inspect 1440 / 768 / 375.

---

## 10 · Motion (added per pre-handoff request)

All three requested touches are in. Easing stays in the `cubic-bezier(0.4,0,0.2,1)` family or simpler; no bounce, overshoot, or spring; every one has a reduced-motion path that renders the final state with no transition (handled by the `html[data-reduced="1"]` backstop **and** the in-page "Reduced motion" Tweak, which both clamp durations to ~0).

| # | Where | Spec | Implementation |
|---|---|---|---|
| **P1** | First-visit chip | Slides in from **outside** the bottom-right corner over **300ms** ease-out. | `@keyframes chipIn` animates `translateX(calc(100% + 24px)) → 0` + opacity. Reduced motion → instant (`animation:none`). |
| **P2** | Masthead "First time?" pill | First visit only: gentle **opacity breath 1.0 ↔ 0.85 on a 1.5s cycle, no scale**. Stops the moment onboarding is dismissed, the modal closes/CTA fires, or the pill itself is clicked. | `.help-pulse` class toggled by `helpPulse` state in `App`; `SurfaceA.onSeen` and the pill's own `onHelp` both clear it. Reduced motion freezes it at full opacity. |
| **P3** | Trophy point cloud | **One-pass, ~2.4s, never repeats** — reads as Monte-Carlo samples resolving. | `@keyframes trophySettle`: `blur(4px)+opacity .5+translateY(6px) → sharp`, `both` fill so it ends crisp. On-brand (the dots *are* MC samples); chose blur→sharp over a per-dot drift because the asset is a single SVG, and a convergence/settle reads truer to the method than a glint. Reduced motion → static. |

**Budget note.** The brief's "~2s combined per page load" is read as *discrete entrance motions don't chain into a long sequence*. On the homepage the only one-shot entrance is the trophy settle (2.4s, slightly over the round number but exactly the P3 "~3s" ask, kept on the short side for restraint). The chip arrives later (after its 2.5s settle delay) in a different corner, so it never stacks with the trophy in the same glance. The pill "breath" is an intentional ongoing loop, not an entrance, and is excluded from the budget. Nothing was added to Surface B — Beat 3 remains the sole showpiece motion there, uncontested.

A possible **P4** (modal-claim stagger / chip hover lift) was considered and declined: the modal's three claims appearing together reads calmer than a staggered reveal, and an extra hover transition on the chip would compete with the slide-in. Restraint held.

