# Onboarding Design Brief v2 — additive, app-pattern, no homepage replacement

## What changed since v1

The v1 brief (`website/onboarding-design-brief.md` in the cp-08 branch, now discarded) instructed the design to "replace the homepage hero on first visit" with a custom three-block layout. That direction produced a landing page that hid the Monte Carlo trophy graphic, removed the real model probabilities, and shipped mocked-up data ("Argentina at 21%" when the real model says Spain at 18.2%). For a research publication built on pre-registration discipline, that's a credibility problem, not a design problem. v1 is dead.

v2 is fundamentally different: the existing homepage stays untouched. The onboarding is purely additive, lightweight, and follows patterns proven in production by successful apps. Think Linear's "what's new" chip, Stripe's inline guidance, Bloomberg Terminal's minimal welcome chrome, Polymarket's pre-2024 first-visit explainer. Not a wizard, not a takeover, not a brand swap on first contact.

## What 45analytics is

(Read `email-capture-design-brief.md` and the existing `45analytics.com` site for full context. The aesthetic mandate, the colour palette, the type system, the "what you must NOT design" list all apply unchanged.)

The site is a probabilistic pricing framework for the 2026 FIFA World Cup, pre-registered at OSF (osf.io/spmkg). It publishes nightly Monte Carlo probabilities, compares them to bookmaker-implied probabilities, and surfaces divergences. Two deliverables: a live model on the website, an academic paper post-tournament. The audience splits between OSF / academic / prediction-markets readers (who find the site through pre-registration) and football fans (who'll find it through search and social during the WC). The site today serves the first audience well; the onboarding's job is to make it serve the second without losing the first.

## Hard constraints (these are non-negotiable)

**Do not replace, hide, or restyle the existing homepage hero.** The Monte Carlo trophy graphic, "The 45% Problem" headline, the OSF pre-registration line, the "Receive the daily brief" CTA, the leaderboard with team flags, the bracket preview, the divergences block — all of these stay exactly as they are today on returning visits, on first visits, on every visit. The onboarding lives alongside or on top of this content; it does not displace it.

**Do not render mocked-up or hardcoded data anywhere.** Every probability, every team name, every flag, every ranking must come from the live snapshot files at `website/public/data/latest/`. If the onboarding wants to call attention to a specific data point (e.g. "Spain leads at 18.2%"), it does so by pulling from the real source. No exceptions. If a specific surface can't be designed without fake data, redesign the surface.

**Do not introduce a blocking flow on the homepage.** No multi-step wizard, no "complete onboarding to continue," no required choice. Every onboarding element must be dismissible immediately, must not gate access to any other part of the site, and must not appear if the user has already dismissed it.

**Follow established onboarding patterns from production apps.** This is the most important shift from v1. The brief invites you to look at how Linear, Stripe, Bloomberg Terminal, Polymarket, Notion, FT/Bloomberg, and other tools at the academic-meets-financial intersection handle first-visit experiences. The brief lists specific acceptable patterns in the surface-specific sections below.

**Voice stays academic / editorial.** No "Welcome!", no exclamation points, no marketing language, no "Let's get you started," no "Join thousands of forecasters." The site is a research publication; the onboarding is the receptionist at a serious institution, not a sales rep.

## The two surfaces

There are two contexts that need onboarding work, treated independently because they sit in different parts of the site and serve different visitor moments.

### Surface A: Homepage onboarding (lightweight, additive)

A first-visit visitor lands on `45analytics.com/`. Today they see the trophy, the headline, the dashboard. Without any onboarding, a football fan looking for "world cup predictions" might bounce within 5 seconds because they don't immediately understand what they're looking at — "55% / 45%", "OSF pre-registered", "M★ posterior" all read as opaque jargon.

The onboarding's job is to give them a 30- to 90-second orientation that helps them stay. It does NOT capture an audience-mode preference (we are decoupling that from onboarding; see "Open questions"). It does NOT replace anything on the page. It IS dismissible and stays dismissed.

**Acceptable patterns. Pick the one that best fits the project's voice, propose a single direction.**

- **A bottom-right floating chip / toast.** Appears on first visit only, after a 2-3 second delay so the page is established first. Reads something like "First time here? Read in 90 seconds →". Click opens a brief modal (see modal spec below). Dismiss icon in the corner. Stays dismissed via localStorage. Reference: Linear's "what's new" pill, Intercom messenger chips at their most restrained.

- **A subtle top-of-page banner.** Spans the full width above the masthead or below it. One line, mono type. Reads something like "New here? This is a research publication, not a betting site. [Quick read →]" Click opens a modal or scrolls to an explainer section. Click anywhere to dismiss. Reference: GitHub's "what's new in this version" banner, Stripe's API version notices.

- **A small "i" / "?" / "first time?" link in the masthead navigation.** Always available (not just first visit). Click opens a brief modal. Use this if you think first-visit visitors will find it on their own; pair it with one of the above for first-visit attention.

- **A 3-screen swipeable / clickable intro modal that appears on first visit.** Each screen is a single sentence + one visual element. Screen 1: "This is a pre-registered probability model for the World Cup." Screen 2: "Each night we run 10,000 simulations and publish the results." Screen 3: "We also compare our numbers to bookmaker odds and publish every miss." [Dismiss] [Got it →]. Reference: Notion's first-run modal, Linear's onboarding panels at their most restrained.

The right answer might be one of these, a combination (chip + modal), or something better that you propose. The brief asks you to make the call.

**What the modal (if any) contains:**

- A 90-second-read explainer of the project: what it is, why it exists, what visitors can do with it.
- A single CTA at the end: "Try the simulator →" linking to `/scenario` (which triggers Surface B's walk-through). Or "Read the brief →" linking to `/brief`. Pick one as the primary CTA.
- No form, no email capture, no choice that the visitor has to make.
- Closeable via Esc, click-outside, and explicit "Got it" button.

**State management:**

- `localStorage.45a.onboarding.seen = "true"` is set when the visitor dismisses the chip/banner OR closes the modal OR clicks any CTA inside the modal.
- Once set, the chip/banner/modal does not re-appear on subsequent visits.
- The masthead "i" / "?" / "first time?" link (if you include it) remains visible always, for the visitor who wants to revisit the explainer.

### Surface B: Simulator walk-through (mostly unchanged from v1)

This part of the v1 brief was correct and worth keeping. The scenario simulator at `/scenario` is the project's most interactive and viral surface, and a first-time user genuinely needs a walk-through to understand what the tool does. v2's Surface B is essentially v1's Surface B with two small updates noted below.

**Pattern:** an interactive 3-beat walk-through overlaid on the existing simulator UI, with the real UI dimmed to ~32% opacity behind it. The walk-through does NOT redesign the simulator; it sits on top.

**Beat 1: "You make a call."** Anchored to the mode-picker (Final Four / Champion's Path / Full Bracket). Copy: "Pick a mode. Final Four is 30 seconds. Champion's Path tells one team's story. Full Bracket is for the obsessives." Clicking a mode advances to Beat 2 with that mode selected.

**Beat 2: "We run 10,000 simulations against your call."** Anchored to the mode's picker UI (e.g. team grid for Final Four). Copy: "Each night we simulate the tournament 10,000 times. When you make a call, we compare it to that distribution. The closer your call to the model's median, the more confident the model is in you." Small one-shot animation in a corner panel (~1.5s total) showing four tiny brackets fill in rapid succession then a composite probability resolve. The Beat 2 overlay fades after the first pick is registered.

**Beat 3: "Your call appears beside the model's."** Triggered when the user clicks Submit. The user's bracket slides in from the left, the model's median bracket slides in from the right, a thin vertical rule draws between them, a rarity badge resolves at the bottom. Total ~1.2 seconds, cubic-bezier(0.4, 0, 0.2, 1). Reduced-motion users see the same final composition with no transitions.

**After Beat 3:** a soft email capture appears below the rarity badge: "We'll send you one email when the tournament ends, comparing your call to the model's. No marketing." Dismissible. Re-uses the existing `EmailCapture` component pattern.

**Updates from v1:**

1. **The replay control.** A small "[ ? ] tour" pill in the simulator header re-triggers the walk-through on demand. It's visible always, not only after first dismissal. This protects against the case where a visitor accidentally dismisses or finishes the tour too fast and wants to see it again.

2. **The Beat 1 replay** must actually re-trigger the hover-preview state machine, not be a no-op. v1's design agent caught this and offered to fix it; carry that fix into v2.

3. **State management:** `localStorage.45a.onboarding.tour = "completed"` after Beat 3. Subsequent visits to `/scenario` skip the tour automatically. Re-triggers via the header pill don't update this key.

## Things you must NOT design (v2 list)

This list is stronger than v1's. Read it carefully.

- Anything that replaces, hides, or restyles the existing homepage hero, trophy graphic, leaderboard, bracket preview, or divergences block.
- Any rendering of mocked-up, hardcoded, or placeholder data in a position where a visitor could mistake it for real model output. If you need to illustrate a UI pattern, use the real current snapshot data; if you can't, redesign the illustration.
- A modal or banner that occupies more than 80% of the viewport height at any breakpoint.
- A blocking flow with a "complete to continue" pattern.
- A required preference capture (no "are you a fan or a quant?" question that the visitor must answer to proceed).
- Anything that takes more than 90 seconds to read end-to-end.
- Confetti, sparkles, celebratory animations, or motion that lasts more than 1.5 seconds.
- A separate `/welcome` or `/onboarding` route.
- A "skip tour" button — every dismissal mechanism should be self-evident from the UI (Esc, X icon, click-outside), not a labeled button competing with the primary CTA.
- An onboarding that appears every visit; everything must remember itself via `localStorage.45a.*` keys and stay dismissed.

## What the design package should contain (same as v1)

- **Static mockups** at 1440px, 768px, and 375px viewports. PNG or live HTML.
- **Live HTML mockup** with the actual onboarding behaviour functional (the chip animates in, the modal opens, the tour beats advance, the reduced-motion variant toggles). This was the most useful part of v1.
- **Copy block** for every text element in a single markdown table.
- **Interaction notes** for every behavior (hover, click, focus, keyboard, dismissal). ~300 words per surface.
- **Component inventory:** which existing primitives in `website/src/components/primitives/` get reused, which need extension, which are net new.
- **One-paragraph design rationale per surface** explaining the pattern choice (why a chip vs a banner vs a modal) referencing one or more of the production-app patterns this brief lists.
- **A "do not implement" tag** on any artboard that mocks a follow-up question or future feature (v1's design agent caught the need for this).

## Open questions for the designer to answer in the rationale

1. **Should Surface A include the audience-mode preference at all?** v1 made the audience-mode choice (fan vs quant) central to Surface A. v2 decouples them: audience-mode is a separate feature that probably belongs as a header toggle or a `/bracket` view-switcher, NOT in the onboarding. State your recommendation. If you think the onboarding is a better place for the audience-mode pick, say so and explain why; the brief leans toward decoupling.

2. **Surface A pattern recommendation.** Pick one of the four patterns (chip, banner, masthead link, 3-screen modal) or propose a combination. State your reasoning. If you think the answer is "nothing on the homepage, just an inline explainer on `/bracket` for fans who land there cold," that's a legitimate answer; defend it.

3. **Should Surface A link to Surface B?** A natural primary CTA for the homepage onboarding modal is "Try the simulator →", which would land the visitor on `/scenario` and trigger Surface B's walk-through. State whether you think this composition reads well or whether it feels like onboarding-on-onboarding.

4. **Surface B Beat 3 rarity badge — what number for the demo?** v1 used "1 in 847" for a Final Four demo. Confirm or revise based on a realistic combinatorics estimate.

5. **What happens after Surface B's email prompt is dismissed?** Does the result panel just stay open with the actual bracket comparison? Does the rarity badge stay visible? Spec it.

## Reference material

- The site itself: `https://45analytics.com`. Spend time on it. Click around. Note which pages feel approachable and which feel opaque.
- The existing design system: visible in `website/src/components/primitives/`, the brand voice in `website/src/app/(editorial)/vault/` pages, the email-capture pattern in `website/onboarding-design-brief.md`... wait, that file is being discarded with the cp-08 revert. Use `email-capture-design-brief.md` instead (which IS in the repo and was the precedent for v1).
- Successful app patterns to study:
  - Linear: their "what's new" chip, their suggestion pills, their onboarding modals
  - Stripe Docs: inline guidance, "first time?" callouts
  - Notion: 3-screen first-run modal (clearest reference for the modal option)
  - Bloomberg Terminal: minimal "welcome back" chrome at the top of every session
  - Polymarket pre-2024: how they oriented first-visit users to "prediction markets" as a concept
  - FT / Bloomberg news sites: first-visit paywall framing as a reference for "polite blocking" patterns (NOT to copy, but to understand the polite-blocking grammar)
  - Notion / Linear: the small persistent "?" or "i" affordances in their headers

## Final note

The hardest part of this brief is restraint. v1 failed by trying to do too much: it captured a preference, replaced a hero, showed a side-by-side comparison, all on first visit. v2 succeeds by doing one quiet thing well. If the deliverable feels small, that's good. If it feels like a research publication's reception desk rather than a SaaS product tour, that's right.

The simulator walk-through (Surface B) can be playful and animated because it lives inside an interactive tool that's already opt-in. The homepage onboarding (Surface A) must be quieter, because the homepage is the public face of an OSF-pre-registered research publication and every element on it is read as a deliberate claim by the project.
