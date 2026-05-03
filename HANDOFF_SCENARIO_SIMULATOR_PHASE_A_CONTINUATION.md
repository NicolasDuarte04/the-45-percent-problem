# Handoff: Continue Scenario Simulator Phase A Implementation

You are continuing implementation work that began in a previous Claude Code session. That session's context window filled and the work was paused mid-flight. Your first job is **not to write code**; it is to investigate the current state, report what was done, and propose the concrete next step. Wait for the user's confirmation before producing any new code.

This handoff is self-contained. Do not assume any context from prior conversations.

---

## 1. What we are building

The **Tournament Scenario Simulator** is a new feature on the 45analytics website (Next.js 16 / React 19 / TypeScript / Tailwind v4 / Drizzle / Supabase Postgres / Resend / Upstash). It is a public-facing scenario builder that lets a user predict a World Cup outcome and receive a **Reality Score** (the fraction of 10,000 simulations matching their prediction), with a **Digital Trade Ticket** they can screenshot and share. The simulator's email capture must integrate with the project's existing email subsystem rather than duplicating any of it.

Phase A is what we are shipping. It includes the visible feature, predictions persisted in Postgres, email capture wired into the existing email subsystem with one new react-email template, and a deterministic mock for the Reality Score. State-change emails and real Monte Carlo queries are explicitly out of scope and reserved for Phase B and Phase C.

The landing has no hero visual element. No trophy. No bracket animation. No image. No icon. Just a serif headline, a mono subhead, and a CTA. Two earlier design directions for a hero visual were explored and dropped.

---

## 2. Required reading (do this first, before anything else)

Read these files in this order. They are the canonical specification. Do not skim. Do not paraphrase to yourself; read them carefully and confirm absorption before investigating git state.

1. `IMPL_PROMPT_SCENARIO_SIMULATOR_PHASE_A.md` (project root) — the implementation prompt that the previous session worked from. This is the canonical contract.
2. `DESIGN_BRIEF_SCENARIO_SIMULATOR.md` (project root) — design v1.
3. `DESIGN_BRIEF_SCENARIO_SIMULATOR_V2_DELTA.md` (project root) — design v2 delta. v2 wins on conflicts.
4. `DESIGN_PATCH_V2_1_COLOR_FIXES.md` (project root) — three localized color and behavior patches.
5. `website/email-system-implementation-prompt.md` — full email subsystem spec.
6. `website/email-system-session-bootstrap.md` — current session state of the email subsystem.

**Do not read** `DESIGN_BRIEF_LANDING_TROPHY_ANIMATION.md` or `DESIGN_BRIEF_ANIMATED_BRACKET_HERO.md`. Both are deferred designs that were dropped. They are not part of Phase A.

After reading, briefly confirm in your first response: "Absorbed all six required documents. Now investigating git state."

---

## 3. Decisions already made (do not re-litigate)

The previous session resolved every architectural and implementation question. You inherit those decisions. **Do not re-open them.** If you discover something that genuinely contradicts one of these decisions, surface it as a finding in your status report, do not unilaterally revise.

### Conflict resolutions approved

1. **`subscriber_id` FK is `uuid`**, not integer. The original prompt had a typo; this was corrected.
2. **`subscription_types text[]` column** added to `subscribers`. Default `ARRAY['daily_brief']` for back-population of existing rows. Net-new simulator inserts pass `ARRAY['prediction_tracking']` explicitly.
3. **Vocabulary "prediction" / "simulate" is allowed inside simulator surfaces only.** Surface-aware grep gates this. Email-system surfaces stay clean of `predict` (verb), `pick` (noun), etc.
4. **`/api/verify` branches on a redirect param** for simulator verifications. Sets a signed `45a:sim:owner` cookie using a **separate env var `PREDICTION_OWNER_HMAC_SECRET`** (not `UNSUBSCRIBE_HMAC_SECRET`).
5. **`/api/unsubscribe` accepts an optional `t` topic param** (`prediction_tracking` or `daily_brief`). Removes that topic from `subscription_types`. Flips `status='unsubscribed'` only when array becomes empty. The unsubscribe response page tells the user what was removed and offers a one-click "unsubscribe from everything" escape.
6. **Back-population migration is non-destructive.** Existing subscribers correctly receive `subscription_types = ARRAY['daily_brief']`.
7. **localStorage carve-out** for the in-flight scenario only, single key `45a:simulator:inflight`, scoped to `(simulator)` components, cleared on submit and on mode change.
8. **Crockford base32 prediction ID generator** (alphabet excludes I, L, O, U), format `45A-2026-XXXX`, collision-checked on insert with retry.
9. **Next 16 docs read in-tree** (`node_modules/next/dist/docs/`) before authoring route handlers, Server Actions, layouts, `cookies()`, or `redirect()`.
10. **`Scenario Simulator-2.html`** in the user's design uploads is approved as visual reference for layout pixel values, color exact values, and copy strings.

### Additions on top of the resolutions

(a) **Owner cookie:** 1 year `Max-Age` with sliding renewal on each dashboard visit.
(b) **`/api/predictions` rate limit:** 30 per hour per IP (looser than `/api/subscribe`'s 10 per minute, since users may legitimately submit a few predictions in a session).
(c) **Public permalink** at `/scenario/p/[id]` is server-rendered, must not leak email or `subscriber_id`, has `<meta name="robots" content="noindex,nofollow">`.
(d) **CSRF on `/api/predictions/[id]/email`** mirrors the Origin/Referer check pattern used for the email subsystem. (Open question from the previous session: whether to also add the Origin check to `/api/subscribe`. The previous session left this unresolved; you should NOT change `/api/subscribe`'s CSRF behavior unless the user explicitly approves it now.)
(e) **`<EmailCaptureForm />`** receives additive backwards-compatible props: `submitUrl?`, `predictionId?`, `onSuccess?`, plus copy overrides (`heading?`, `body?`, `cta?`, `microcopy?`, `skipLink?`). All defaults preserve current behavior.

### Approved file-by-file plan

The previous session produced a complete file-by-file plan covering: the new `predictions` table and migration SQL, the extended `subscribers` schema, the four new API routes (`POST /api/predictions`, `POST /api/predictions/[id]/email`, `GET /api/predictions/[id]`, `GET /api/predictions?email=`), the modified existing routes (`/api/subscribe`, `/api/verify`, `/api/unsubscribe`), the new `<PredictionVerificationEmail />` template, all simulator components under `src/components/simulator/` and `src/app/(simulator)/`, the surface-aware vocab grep configuration in `scripts/check-forbidden-words.mjs`, and the test suite under `tests/unit/simulator/`, `tests/integration/api/`, and `tests/e2e/`.

The implementation order was approved as: **schema and migration → service layer → route handlers → email template → simulator components → tests.**

The migration SQL (forward and rollback) was approved verbatim. Both are in the previous session's transcript; if not present in the worktree, they will need to be re-derived from the IMPL_PROMPT §4 specification.

---

## 4. Git state and worktree

Work happens in a **separate git worktree**, branched from `origin/main`. The main repository's working tree has unrelated Phase 2 WIP that must not be touched.

### Expected setup

```
main repo:    /Users/nicolasduarte/Documents/Claude/Projects/The 45 Percent Problem/the-45-percent-problem/
worktree:     /Users/nicolasduarte/Documents/Claude/Projects/The 45 Percent Problem/wt-scenario-simulator/
branch:       feat/scenario-simulator-phase-a
base:         origin/main (not the Phase 2 branch)
```

If the worktree directory does not exist at the path above, check sibling locations or `git worktree list` from the main repo. The previous session may have placed it elsewhere.

### Repository hygiene rules (from the project's CLAUDE.md)

- The pre-push hook checks for git conflict markers and aborts pushes that contain them. If it is not installed in the worktree, run `scripts/install-hooks.sh` from the worktree before any push.
- Prefer `git fetch origin && git rebase origin/main` over `git stash + pull --rebase + stash pop`. The stash-pop pattern has historically corrupted this repo's working tree with conflict markers; it is forbidden when the rebase target touches lockfiles or generated files.
- Always run `git status` after any operation that touches the working tree.
- Push frequently. The worktree directory is ephemeral; the remote branch is the source of truth.

---

## 5. Your task

You are not writing code yet. You are investigating and reporting.

### Step 1: read the six required documents (§2 above).

### Step 2: locate and inspect the worktree.

From the main repo, run:

```
git worktree list
```

Identify the worktree path for `feat/scenario-simulator-phase-a`. Change directory into it.

### Step 3: determine current state. Run, in this order, inside the worktree:

```
git status
git log --oneline origin/main..HEAD
git diff --stat origin/main..HEAD
git diff --stat                         # uncommitted changes
ls -la drizzle/
ls -la src/lib/sim/ 2>/dev/null
ls -la src/lib/email/
ls -la src/app/api/predictions/ 2>/dev/null
ls -la src/app/\(simulator\)/ 2>/dev/null
ls -la src/components/simulator/ 2>/dev/null
ls -la src/emails/ 2>/dev/null
```

For each file or directory that exists, read it. Note its size and apparent completeness.

### Step 4: run the gates that are runnable.

```
pnpm install                                  # in case dependencies have shifted
pnpm tsc --noEmit                             # type check
pnpm lint                                     # lint check
pnpm test                                     # unit tests
pnpm prebuild                                 # forbidden-vocab grep + other prebuild gates
```

Capture which gates pass, which fail, and which fail in ways that look like in-progress work versus broken work.

### Step 5: produce a status report covering:

A. **What is committed.** List commits on the branch in chronological order with one-line summaries. Identify the implementation phase each commit belongs to (schema, service layer, route handlers, email template, components, tests).

B. **What is uncommitted but on disk.** Group by file, summarize what each contains and whether it appears complete, in-progress, or stub.

C. **What is not started.** Compare the approved plan (IMPL_PROMPT §4 through §17 plus the surfaces named in the previous session's file-by-file plan) against what exists. List the gaps.

D. **What appears broken.** Any failing gates, type errors, lint errors, test failures, or files in inconsistent states (e.g. a route handler referencing a helper that does not yet exist).

E. **The recommended next concrete step.** A single, narrow, testable next action that resumes the implementation order from where it stopped. Not a list of three things; one thing, named precisely. For example: *"Complete `src/lib/sim/computeRealityScoreMock.ts` (currently a stub) so that all five rarity-band thresholds are exercised, then add the unit tests in `tests/unit/simulator/computeRealityScoreMock.test.ts`. After these pass, commit and continue with the next item in the service layer."*

F. **Stop-and-ask points.** Anything you discovered during investigation that you believe should be raised with the user before continuing. Examples: a deviation in the migration SQL from what was approved, a new dependency added in the worktree, a forbidden-vocab grep failure, a column name that does not match the resolutions in §3.

### Step 6: stop. Wait for the user to ratify your status report and confirm or revise the recommended next step.

**Do not write code beyond this point until the user responds.** Do not commit. Do not push. Do not refactor anything you happen to see while inspecting. The investigation is the deliverable for this turn.

---

## 6. Acceptance gates for the eventual PR

These were approved by the previous session and are listed here so you know the bar before you resume implementation. Do not run them all in step 4; that is the eventual exit criterion, not the resume criterion.

| Gate | Command |
|------|---------|
| Forbidden-vocab grep (global + simulator-aware) | `pnpm prebuild` |
| Type check | `pnpm tsc --noEmit` |
| Lint | `pnpm lint` |
| Vitest unit + integration | `pnpm test` |
| Migration replay vs Phase 1 schema | `pnpm db:migrate` against a fresh DB seeded from `0000_*` and `0001_*` |
| Single Resend instantiation | `grep -rn "new Resend(" src/` returns exactly one (existing `src/lib/email/resend.ts`) |
| No new subscribers tables | `grep -rn 'pgTable("subscribers' src/` returns exactly one |
| No second subscribe-style routes | `find src/app/api -name "route.ts" \| xargs grep -l "subscribe"` returns the existing path only |
| Landing-hero zero-visual check | grep the LandingHero block in `(simulator)/scenario/page.tsx` for `<img>`, `<svg>`, `<canvas>`, `background-image`, `background:` with image references — must return zero |
| Visual regression | `pnpm test:visual` |
| Playwright e2e | `pnpm playwright test tests/e2e/scenario-final-four.spec.ts` |

---

## 7. Forbidden patterns (selected; full list in IMPL_PROMPT §15)

These are immutable. Do not violate any of them, even in temporary code.

- No new Resend client. Use the existing `src/lib/email/resend.ts`.
- No second `subscribers` table. No parallel subscribe / verify / unsubscribe routes.
- No betting language anywhere (full forbidden vocabulary list in IMPL_PROMPT §15.2 and the email-system spec).
- No team commercial logos (national flags only, already in `public/assets/flags/`).
- No exclamation marks in any system copy.
- No new design tokens. Use the existing prism palette and canvas tokens. The simulator canvas is `[data-canvas="simulator"]` and aliases existing tokens; it does not introduce new colors.
- No cyan as fill or button background. Cyan (`--prism-cyan`) is reserved for `accentQuant` in the existing quant canvas.
- No hero visual on the landing.

---

## 8. Closing

The work is well-scoped, the architecture is settled, and the previous session left the implementation in a known state. Your job is to find that state, report it cleanly, and resume from the precise next step. The user will tell you to proceed.

Begin with §2 (read the six documents), confirm absorption, then move to §5 (investigate, report, stop).
