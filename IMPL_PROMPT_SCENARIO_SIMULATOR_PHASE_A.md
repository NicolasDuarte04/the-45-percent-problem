# Implementation Prompt — Tournament Scenario Simulator (Phase A, revised)

**Project:** 45analytics / The 45% Problem
**Repository:** `the-45-percent-problem/website` (Next.js 16, React 19, TypeScript, Tailwind v4, Drizzle, Supabase Postgres, Resend, Upstash, Vercel Blob)
**Audience:** Claude Code (engineering agent, fresh session)
**Scope of this prompt:** Phase A only. Visual feature live, email capture wired into the existing email subsystem, predictions persisted in Postgres, Reality Score computed from a deterministic mock. State-change cron and real Monte Carlo queries are scoped at the bottom but explicitly out of this prompt.

---

## 0. Mission

Implement the Tournament Scenario Simulator as a public-facing feature on the existing Next.js site. The simulator lets a casual user build a World Cup outcome and receive a **Reality Score** (the fraction of 10,000 simulations matching their prediction), with a **Digital Trade Ticket** they can screenshot and share.

The simulator's email capture must integrate with the project's existing email subsystem rather than duplicating any of it.

There is no landing-hero visual element in this phase. The landing is headline + subhead + CTA, nothing else.

---

## 1. Required Reading (Read Before Writing Code)

Read these files in order. They are the canonical specification:

1. `the-45-percent-problem/DESIGN_BRIEF_SCENARIO_SIMULATOR.md` (v1)
2. `the-45-percent-problem/DESIGN_BRIEF_SCENARIO_SIMULATOR_V2_DELTA.md` (v2 delta; v2 wins on conflicts)
3. `the-45-percent-problem/DESIGN_PATCH_V2_1_COLOR_FIXES.md` (v2.1 color and behavior fixes)
4. **`website/email-system-implementation-prompt.md`** — full email subsystem spec (mandatory)
5. **`website/email-system-session-bootstrap.md`** — current session state of the email subsystem (mandatory)

Do **not** read the trophy animation or the bracket animation briefs. Both are deferred. The Phase A landing has no hero visual.

After reading, confirm in your first response that you have absorbed all five documents and identified any conflicts you intend to resolve.

---

## 2. Architecture Decisions (Pre-Made — Do Not Re-Litigate)

The following are settled. Do not propose alternatives.

**Route placement.** Add a new route group `src/app/(simulator)/` parallel to the existing `(editorial)` and `(quant)` groups. Structure:

```
src/app/(simulator)/
├── layout.tsx               # simulator canvas wrapper, sets data-canvas="simulator"
├── scenario/
│   ├── page.tsx             # landing → mode select → builder → reveal (single-route SPA)
│   ├── dashboard/page.tsx   # user's submitted predictions (auth via signed cookie or email lookup)
│   └── p/[id]/page.tsx      # public permalink, server-rendered from Postgres
```

**Canvas tokens.** Add `[data-canvas="simulator"]` to `globals.css` next to `[data-canvas="quant"]`. Inherit dark slate from quant; remap brief tokens to existing project tokens (see §3). **Do not introduce new colors.** The simulator's "warm accent" is the existing `--prism-peach`.

**Color discipline.** The peach accent appears in **exactly three places**: CTA on hover, PROMOTED state in the dashboard, Trade Ticket flag border. Cyan (`--prism-cyan`) is reserved for its existing chart-accent role across the quant canvas; do not use it on simulator surfaces.

**No landing-hero visual.** The landing is a serif headline + mono subhead + CTA. Centered or left-aligned, designer's call (default centered, max-width ~720px). No trophy. No bracket animation. No image. No icon. The right side of the viewport (or below the CTA, in a stacked layout) is empty negative space.

**Reality Score: Phase A mock.** Deterministic function from a hash of the canonicalized scenario. See §6.

**Persistence: Postgres via Drizzle.** Add a `predictions` table referencing `subscribers` by ID. Use the existing Drizzle schema, not a parallel one. localStorage holds **only** the in-flight scenario during build (so a page refresh mid-build doesn't lose progress); the moment a scenario is submitted it is written to Postgres and localStorage is cleared.

**Email capture: reuse existing infrastructure.** Mount the existing `<EmailCaptureForm />` component inside the simulator's email gate modal. POST to the existing `/api/subscribe` route (extended with a `source` field, see §11). Use the existing verification flow. Add **one new react-email template** for verification copy specific to the simulator. Do not roll a parallel form, handler, client, or table.

---

## 3. Token Reconciliation

The design briefs use token names that do not exist in your codebase. Map them in `globals.css` under the new `[data-canvas="simulator"]` block. Add aliases at the top of the block so component code can reference the brief names without renaming everything:

```css
[data-canvas="simulator"] {
  --bg-root:           var(--slate-canvas);
  --bg-panel:          var(--slate-panel);
  --text-primary:      var(--slate-ink);
  --text-tertiary:     var(--slate-ink-soft);
  --text-quiet:        var(--slate-ink-quiet);
  --border-default:    var(--slate-rule);
  --rule:              var(--slate-rule);
  --accent-warm:       var(--prism-peach);
  --state-dead:        color-mix(in oklab, var(--prism-rose) 60%, transparent);
  --state-promoted:    var(--prism-peach);
}
```

This way the component code matches the design files line-for-line while still using the project's canonical token system.

---

## 4. Database Schema Changes

Add the following to the Drizzle schema. Generate a migration. **Coordinate with the email-system bootstrap doc** to make sure your migration does not collide with any in-flight migration there.

### 4.1 Extend `subscribers`

If the existing `subscribers` table does not yet have a way to express what the user opted into, add a `subscription_types` column:

```ts
subscriptionTypes: text('subscription_types').array().notNull().default(sql`ARRAY['daily_brief']::text[]`),
// allowed values: 'daily_brief', 'prediction_tracking'
```

If the email-system bootstrap doc shows this column already exists under a different name (e.g. `consent_types`, `subscriptions`), use that name and skip this addition. Do not introduce a parallel column.

### 4.2 New `predictions` table

```ts
export const predictions = pgTable('predictions', {
  id: text('id').primaryKey(),                          // public ID, e.g. "45A-2026-KZ8X"
  subscriberId: integer('subscriber_id').references(() => subscribers.id, { onDelete: 'set null' }),
  email: text('email'),                                 // denormalized; nullable when user skips email gate
  mode: text('mode').notNull(),                         // 'final_four' | 'champions_path' | 'full_bracket'
  scenario: jsonb('scenario').notNull(),                // mode-specific structured payload
  storyLine: text('story_line').notNull(),              // the rendered serif sentence
  countOriginal: integer('count_original').notNull(),   // Reality Score numerator at submission
  countCurrent: integer('count_current').notNull(),     // current numerator (== countOriginal in Phase A)
  total: integer('total').notNull().default(10000),
  state: text('state').notNull().default('alive'),      // 'alive' | 'dead' | 'promoted'
  killedBy: text('killed_by'),                          // free-text reason, populated only when state='dead' (Phase B+)
  modelSha: text('model_sha').notNull(),
  snapshotSha: text('snapshot_sha').notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

Indexes:

- `idx_predictions_subscriber_id` on `subscriber_id`
- `idx_predictions_email` on `email` (case-insensitive, lowercase functional index)
- `idx_predictions_state` on `state`

The `id` is the public, human-readable identifier shown on the Trade Ticket and in the URL `/scenario/p/{id}`. Generated via `crypto.randomUUID().slice(0,4).toUpperCase()`-style or a similar collision-resistant short-ID generator. The `subscriberId` may be null if the user dismissed the email gate.

### 4.3 No new email tables

`send_log`, `unsubscribe_log`, and `suppression_list` exist already. Do not parallel them. State-change emails (Phase B+) write to `send_log` like every other transactional email.

---

## 5. Component Structure

Build under `src/components/simulator/`. Mirror the visual file structure from the design uploads:

```
src/components/simulator/
├── SimulatorChrome.tsx
├── LandingHero.tsx              # headline + subhead + CTA only (no visual)
├── OnboardingStrip.tsx
├── ModeSelectorCards.tsx
├── modes/
│   ├── ModeFinalFour.tsx
│   ├── ModeChampionsPath.tsx
│   └── ModeFullBracket.tsx
├── reality/
│   ├── RealityBar.tsx
│   ├── RealityScorePanel.tsx
│   ├── RarityBand.tsx
│   └── OneInN.tsx
├── TeamGrid.tsx
├── TeamSlot.tsx
├── TradeTicket.tsx
├── PredictionEmailGate.tsx      # wraps existing <EmailCaptureForm />, see §11
├── Dashboard.tsx
├── DashboardRow.tsx
├── StateChip.tsx
└── lib/
    ├── computeRealityScoreMock.ts
    ├── canonicalizeScenario.ts
    ├── getRarityBand.ts
    ├── getOneInN.ts
    ├── generatePredictionId.ts
    ├── predictionsApi.ts          # client-side fetch wrappers; see §10
    ├── inflightStore.ts           # localStorage cache of the in-flight scenario only
    └── types.ts
```

Use existing primitives wherever possible:

- `src/components/primitives/Flag.tsx` for national flags.
- `src/components/primitives/MonoNumber.tsx`, `HashChip.tsx`, etc.
- `src/components/ui/*` (shadcn) for chrome.
- **The existing `<EmailCaptureForm />`** is mounted inside `PredictionEmailGate.tsx`. Do not write a second form.

Follow existing conventions: TypeScript, named exports, no default exports, `cn()` from `@/lib/utils` for class composition.

---

## 6. Reality Score Mock (Phase A)

Implement `computeRealityScoreMock(scenario: Scenario): { count: number; total: 10000 }` with these properties:

- **Deterministic.** Same canonicalized scenario produces the same count. Use a stable canonicalization (sort within each round, normalize whitespace, lowercase) and a fast non-cryptographic hash (FNV-1a or xxHash). Map the hash to a count in `[1, 10000]` using a power-distribution skew so most scenarios land in the Uncommon-to-Rare bands.
- **Plausible.** Common scenarios (Brazil and Argentina both reach the SF) land 1500-3000. Rare scenarios (Saudi Arabia wins the World Cup) land below 50. Mode-aware: Full Bracket mocks return very low counts; Final Four returns moderate counts; Champion's Path scales with constraint count.
- **Documented.** Header comment: *"Phase A mock. Replaced in Phase C with real Monte Carlo run queries against the simulation engine output."*

This function runs server-side in the prediction submission action so the value is computed once and persisted, not recomputed on each page load.

---

## 7. Rarity Band

`getRarityBand(count, total)`:

| Reality Score | Label | Caption |
|---------------|-------|---------|
| ≥ 25% | Common | "The model often sees this." |
| 5% to 25% | Plausible | "The model gives this real weight." |
| 1% to 5% | Uncommon | "A bold call." |
| 0.1% to 1% | Rare | "The model rarely runs this tournament." |
| < 0.1% | Vanishingly rare | "Almost no one sees this coming." |

Below count 30, append the resolution-floor caveat in 12pt italic sans: *"Fewer than 30 of 10,000. Almost no one sees this coming."*

---

## 8. One-in-N

`getOneInN(count, total)`:

- count ≥ 1: `"1 in ${Math.round(total / count).toLocaleString()}"`
- count = 0: `"1 in 10,000+"`

Sentence in UI: `"${oneInN} simulated tournaments matched your prediction."`

---

## 9. Reveal Sequence

Apply this exact timing in the post-submit flow:

```
t=0    : Reality Score percentage snaps to value (no animation)
t=100ms: Rarity band fades in (180ms ease-out)
t=200ms: 1-in-N line fades in (180ms ease-out)
t=400ms: Trade Ticket button + scenario block fade in (180ms ease-out)
t=1000ms: Email gate appears (non-blocking modal)
```

Implement via `useRevealSequence(prediction)` returning four boolean flags. Honor `prefers-reduced-motion: reduce` by setting all four to `true` immediately.

---

## 10. Persistence (Postgres + Server Actions)

### 10.1 Submit endpoint

Add `POST /api/predictions` (Next.js route handler in `src/app/api/predictions/route.ts`). Accepts a validated payload (Zod):

```ts
{
  mode: 'final_four' | 'champions_path' | 'full_bracket',
  scenario: ScenarioPayload,            // mode-specific shape, validated per mode
  modelSha: string,                     // pinned in env or read from latest snapshot
  snapshotSha: string,                  // pinned in env or read from latest snapshot
}
```

Server action flow:

1. Validate the payload.
2. Canonicalize the scenario.
3. Compute Reality Score via `computeRealityScoreMock`.
4. Generate prediction ID via `generatePredictionId`.
5. Render the storyLine sentence server-side (so the database row matches what the client renders).
6. Insert into `predictions`. `subscriber_id` and `email` are null at this point.
7. Return the full prediction record.

Rate-limit using the same Upstash setup as `/api/subscribe`. The same client per-IP limits apply.

### 10.2 Attach email endpoint

Add `POST /api/predictions/[id]/email`. Accepts `{ email: string }`. Server action:

1. Validate email format.
2. Call into the **existing** `/api/subscribe` handler logic (extracted into a shared function if not already). Pass `source: 'simulator'` and `predictionId: <id>`.
3. The subscribe handler creates or reactivates the subscriber, sends the verification email (using the new `<PredictionVerificationEmail />` template; see §11), and returns the subscriber row.
4. Update the prediction row: set `subscriber_id` and lowercase `email`.

If the email is on `suppression_list`, the existing subscribe handler returns an explicit `suppressed` status. Surface this to the user as "This email cannot be added to notifications." Do not silently fail.

### 10.3 Read endpoints

- `GET /api/predictions/[id]` — public read by ID. Returns the prediction record. Used by `/scenario/p/[id]` and the dashboard.
- `GET /api/predictions?email=<email>` — list predictions for an email, gated by a signed cookie set during email verification. The dashboard uses this to enumerate the user's predictions cross-device. If no signed cookie is present, return an empty list (the user must verify on this device first).

### 10.4 Client-side caching

`inflightStore.ts` caches **only** the scenario currently being built. Single key: `45a:simulator:inflight`. Cleared on submit success. Cleared on mode change. Not used for storing submitted predictions.

The dashboard reads from the server (`GET /api/predictions?email=...`) and shows whatever the signed cookie reveals. There is no localStorage list of submitted predictions in Phase A.

---

## 11. Email Integration (The Critical Section)

This section interprets and applies the constraints in `email-system-implementation-prompt.md`. Read that doc first; this section is the simulator-specific application of it.

### 11.1 Reuse the form component

Inside `PredictionEmailGate.tsx`, mount the existing `<EmailCaptureForm />` component verbatim. Pass props that customize:

- The headline copy: *"Want to see if it actually happens?"*
- The supporting copy from design v2 §5.9.
- The `source` prop (or whatever the existing form accepts to identify the calling surface). If `<EmailCaptureForm />` does not yet accept a `source`, extend it with that prop in a backwards-compatible way (default `source = 'newsletter'`).
- An `onSuccess` callback that closes the modal, marks the prediction row tracked, and shows the "tracked" confirmation state.

If `<EmailCaptureForm />` does not yet support a per-instance `source`, your job in this PR includes adding that prop (consult the existing email-system docs first; it may already exist). **Do not** copy the form's internal markup into a new component.

### 11.2 Extend `/api/subscribe`

The existing `/api/subscribe` accepts an email and returns a verification flow. Extend it to accept:

- `source: 'newsletter' | 'simulator'` (default `newsletter`)
- `predictionId?: string` (only valid when `source === 'simulator'`)

Behavior changes:

- When `source === 'simulator'`, the subscriber row's `subscription_types` (or equivalent existing column) gets `prediction_tracking` added (without removing `daily_brief` if the user is already subscribed to it).
- When `source === 'simulator'`, the verification email uses `<PredictionVerificationEmail />` instead of `<VerificationEmail />`.
- The `predictionId` is passed into the email template so the verification copy includes the prediction context.

If extending `/api/subscribe` is not possible without breaking the existing contract, instead pass `source` and `predictionId` via the request body and branch internally. Either way: **no second subscribe route.**

### 11.3 New email template

Create `src/emails/PredictionVerificationEmail.tsx` using react-email. Inherits styles from `<VerificationEmail />`. Differs in copy:

- Subject: `45analytics — Confirm tracking for prediction #{id}`
- Body: explains that the user built a prediction in the Tournament Scenario Simulator and that confirming this email will cause them to receive notifications when the prediction's status changes (becomes impossible, or becomes meaningfully more likely). Includes the prediction ID, the rarity band, and the one-line story sentence as context. The verification link is the same `/api/verify?token=...` flow as the existing template.
- Footer: same project signature, same RFC 8058 List-Unsubscribe and List-Unsubscribe-Post headers handled by the existing Resend wrapper.

This is the only new email template in Phase A. State-change templates (`<PredictionDeadEmail />`, `<PredictionPromotedEmail />`) are scoped in Phase B and **must not be added now.**

### 11.4 Verify flow

The existing `/api/verify` flips subscriber status from `pending` to `active`. When the verification was for a simulator subscriber:

- Set a signed cookie on the response that the dashboard uses to enumerate the user's predictions (`GET /api/predictions?email=...`). Cookie name: `45a:sim:owner` or whatever pattern the existing system uses for similar purposes. Sign with the existing HMAC secret.
- Redirect the user to `/scenario/dashboard` instead of the daily-brief landing.

If `/api/verify` cannot easily branch on subscriber type, add a redirect parameter to the verification link. Do not add a new verify route.

### 11.5 Unsubscribe

The existing `/api/unsubscribe` already handles HMAC-signed RFC 8058 one-click unsubscribes. The simulator's emails use this same path. No new unsubscribe route.

When a subscriber unsubscribes, the existing handler removes them from notifications. If they had `subscription_types = ['prediction_tracking']` only, they are fully unsubscribed. If they had both `daily_brief` and `prediction_tracking`, the unsubscribe link's `topic` parameter (existing in the email-system spec, or to be added there if not yet) determines whether one or both subscriptions are dropped. Coordinate with the email-system bootstrap doc on this.

### 11.6 Suppression list integrity

A user on `suppression_list` (bounced, complained, hard-unsubscribed) cannot be re-added. The existing subscribe handler enforces this. The simulator inherits the protection by reusing the route. **Do not** add code that bypasses the suppression check.

### 11.7 Skip path

The email gate's "No thanks, just give me the image" link sets `dismissedEmailGate=true` on the prediction row (add this column if it doesn't conflict with existing schema; otherwise infer from `subscriber_id IS NULL`). The Trade Ticket is downloadable regardless.

---

## 12. Trade Ticket (Phase A: Client-Side Render Only)

Render the Trade Ticket inline using the design from v2 §5.7. Provide a "Download PNG" button using `html2canvas` (add as dependency if not present). The Trade Ticket includes a flag slot per design v2 §5.7; use the existing `Flag` primitive.

Server-side image generation via `@vercel/og` is **Phase B**. Phase A's client-side render is sufficient for sharing.

---

## 13. State Machine (Phase A: ALIVE Only)

In Phase A, every submitted prediction starts and remains `state: 'alive'`. The UI for `dead` and `promoted` states must render correctly when fed seed data, but no automatic state transitions occur.

The eval cron (`/api/cron/eval-predictions`) and the state-change email templates are Phase B/C. **Do not scaffold them in Phase A**, because they depend on data that is not exposed yet (the actual MC run output) and on an email template family that the email-system spec has not yet planned for. The DB column `state` exists and is read by the dashboard; manual state changes are possible via a developer-only admin endpoint (see §16).

---

## 14. Routes and Navigation

Add a top-nav entry to the editorial masthead: `[ SCENARIO SIMULATOR ]` linking to `/scenario`, with a small `BETA` tag in 9pt mono at 60% opacity beside the link.

`/scenario/p/[id]` is server-rendered from Postgres. Render with `<meta name="robots" content="noindex,nofollow">` so prediction permalinks are not indexed by search engines. The page is link-public (anyone with the link can view) but not crawler-indexed.

---

## 15. Forbidden Patterns (Hard Rules)

These are not preferences. They are immutable.

### 15.1 Email subsystem rules (from email-system-implementation-prompt.md)

- **Postgres is the only system of record for subscribers.** No Resend Audiences as primary storage. No second subscribers table.
- **Route names are stable.** Do not rename, duplicate, or shadow `/api/subscribe`, `/api/verify`, `/api/unsubscribe`, `/api/unsubscribe/feedback`, `/api/cron/send-brief`, `/api/admin/send-brief`, `/api/webhooks/resend`, `/api/brief/latest`, `/api/brief/[date]`, `/api/teams`.
- **Reuse `<EmailCaptureForm />`.** Do not write a parallel form.
- **Single Resend client.** Use `website/lib/resend.ts`. No second client.
- **Single Drizzle schema** for subscriber access. No bypass.
- **No parallel cron routes for sending email.** State-change emails (Phase B+) trigger from a server action or extend the existing cron.
- **No duplicate-row logic for subscribers.** The existing `/api/subscribe` already detects re-subscribers and resets to pending.

### 15.2 Simulator rules

- **No betting language.** Never use: bet, wager, stake, lock in, send it, place, moneyline, spread, odds, picks (as a noun), longshot, payout, action, parlay. Vocabulary instead: prediction, scenario, build, see, simulate, model, probability, simulation.
- **No leaderboards. No global ranking. No social comparison surfaces.**
- **No celebratory animations. No confetti. No sound. No haptics. No emoji in copy.**
- **No new design tokens.** Use the existing prism palette and canvas tokens.
- **No cyan as a fill or button background.** Reserved for `accentQuant`.
- **No team commercial logos.** National flags only.
- **No hero visual on the landing.** No trophy, no bracket animation, no image, no icon. Headline + subhead + CTA only.
- **No animations beyond the four fade-ins specified in §9.**
- **No exclamation marks in any system copy.**

---

## 16. Developer-Only Admin Endpoint

Add `POST /api/admin/predictions/[id]/state` gated by an admin secret check (use the same env-var pattern as the existing `/api/admin/send-brief`). Accepts `{ state: 'alive' | 'dead' | 'promoted', killedBy?: string }` and updates the prediction row. This is for visual QA of the dashboard's three state variants until the eval cron arrives in Phase B/C.

Not exposed in any UI. Not documented to users. Do not surface a link.

---

## 17. Definition of Done (Phase A)

A. **Visual.** All surfaces render correctly on desktop and mobile. The three modes work. The reveal sequence fires with the specified timing. The PROMOTED and DEAD states render correctly when seeded via the admin endpoint. The Trade Ticket renders and downloads as a PNG.

B. **Functional.** A user can complete the flow: land → choose mode → build a scenario → submit (writes to Postgres) → see Reality Score → optionally provide email (creates pending subscriber, sends `<PredictionVerificationEmail />`) → click verification link → land on dashboard with signed cookie → see their prediction with state ALIVE.

C. **Email integration verified.** A grep for new `Resend` instantiations returns exactly the existing one. No second `subscribers`-style table. No new subscribe / verify / unsubscribe routes. The `<EmailCaptureForm />` is mounted from its existing path. The new `<PredictionVerificationEmail />` template renders correctly when previewed.

D. **Token-clean.** No hard-coded hex values in simulator components. The peach accent appears in three places only. No cyan on simulator surfaces.

E. **Build-clean.** `pnpm build`, `pnpm lint`, `pnpm test` all pass. New Drizzle migration applied cleanly to a fresh database and to a database with the existing email-system schema already applied.

F. **Mobile-clean.** All three modes work at 375px wide. Bracket scrolls horizontally. No content cut off.

G. **Reduced-motion-clean.** Reveal sequence skipped when `prefers-reduced-motion: reduce`.

H. **Copy-clean.** Forbidden-vocabulary grep across simulator components returns zero results.

I. **No landing-hero visual.** Inspect element shows no `<img>`, `<svg>`, `<canvas>`, or background image in the landing's hero region. Just the headline, subhead, and CTA.

---

## 18. Tests Required

- **Vitest unit:** `computeRealityScoreMock` is deterministic. `getRarityBand` correct for all five thresholds. `getOneInN` handles count=0. `canonicalizeScenario` stable regardless of input order.
- **Vitest integration:** `POST /api/predictions` writes a row, returns the record. `POST /api/predictions/[id]/email` attaches subscriber and triggers the verification email (mock Resend). `GET /api/predictions/[id]` reads. Dashboard cookie flow round-trips.
- **Playwright e2e:** Final Four happy path, end-to-end, including email verification flow against a test SMTP capture (Resend test mode or a local mailcatcher).
- **Visual regression (Playwright):** Trade Ticket at 1080x1080 and 1080x1920.
- **Email template snapshot:** `<PredictionVerificationEmail />` rendered with sample props matches a committed HTML snapshot.

---

## 19. Phase B and Phase C (Out of Scope, For Context)

**Phase B.** Adds:
- Server-side Trade Ticket rendering via `@vercel/og`.
- New email templates: `<PredictionDeadEmail />`, `<PredictionPromotedEmail />`.
- New cron route `/api/cron/eval-predictions` that runs after the daily brief cron, re-evaluates each prediction's state against realized results, updates `predictions.state`, writes state transitions to a new `prediction_state_log` table, and dispatches transactional state-change emails through the existing Resend client.
- Cross-device dashboard improvements (search by email, magic-link sign-in).

**Phase C.** Replaces the Reality Score mock with real Monte Carlo run queries against the simulation engine output (DuckDB-WASM in browser, or a server route reading Parquet via DuckDB). Pre-registers the dataset shape with the academic paper.

Do not pre-build for these phases beyond what is naturally extensible. Specifically: the `predictionsApi.ts` client wrappers and the `predictions` table shape should not require migration when Phases B/C land.

---

## 20. Deliverable

A single PR (or sequence of PRs if you prefer) that ships Phase A. The PR should include:

1. The new route group, route files, and components.
2. The `globals.css` simulator-canvas block.
3. The Drizzle migration adding `predictions` (and extending `subscribers` if needed).
4. The new `<PredictionVerificationEmail />` template.
5. The extension to `/api/subscribe` for `source` and `predictionId` parameters.
6. The new `/api/predictions` and `/api/predictions/[id]/email` routes.
7. The new tests.
8. A short PR description noting:
   - Forbidden-vocabulary grep result
   - Email-subsystem grep results: new Resend instantiations (should be zero), new subscribe-style routes (should be zero), new subscribers tables (should be zero)
   - Migration replay test result (clean apply against existing email-system DB)
9. A screenshot grid: landing (no visual), mode select, Champion's Path mid-build, Reality Score reveal, dashboard with three state variants, the verification email rendered.

PR title: `feat(simulator): scenario simulator phase A — visual + Postgres + email integration`.

---

## 21. Closing Note

The simulator is the project's translation layer between rigorous probabilistic modeling and casual football fans. It also has to be a clean citizen of the existing email subsystem. Both jobs matter equally.

When you face an ambiguous call, ask two questions: (1) "would a Brazilian fan opening this from Instagram understand what is happening, while a researcher reading the methodology page would still trust the framing?", and (2) "does this respect every constraint in the email-system spec, including the ones that aren't in this prompt?" If the answer to both is yes, ship it.

The Reality Score with its denominator is the hero. The rarity band is the bridge. The 1-in-N is the translation. The email integration is invisible scaffolding. Get all four right.
