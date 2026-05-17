# Checkpoint 8: Returning-user dashboard at /me

## Context

You are working on the 45 Analytics codebase (`the-45-percent-problem` repo). The attached file `APP_UX_EVALUATION_2026-05-13.md` is the evaluation that motivates this work. This task implements recommendation **P0.3 (Returning-user dashboard at /me)** from that evaluation.

Checkpoints 1 through 7 have already landed on main:

- Plausible custom events are wired, including `simulator_opened` (with `surface`), `first_pick`, `submit_success`, `share_action` (with `copy_post`), `alert_armed`, `promo_card_landed`.
- Final Four has a `[ Start from the model's call ]` ghost-fill button and is mounted inline on the home page above the fold.
- The Reality Score reveal has an anticipation beat.
- A neutral `ModelCallPanel` sits between the hero and the share strip on the permalink.
- `TicketShareButton` has a `Copy as post` affordance.
- Evergreen promo OG cards live at `/api/og/promo/[slug]` with a curated catalog.

This is the last of the eight P0 checkpoints. After it lands, every line item in the P0 set is shipped.

## Why this matters

Behavioural pattern: competence (Pattern 6) and longitudinal calibration. The evaluation flagged this as the biggest retention leak: today a user with a verified email and one or more submitted predictions has no surface to come back to. Their only access to their forecasts is the permalink URL they bookmarked or screenshotted. For roughly 90% of users this means the simulator is one-shot.

A returning-user dashboard at `/me` closes that loop. The user lands, sees their chronological list of forecasts with current state (alive, dead, promoted), and can click any row to revisit the reveal. Over the tournament, this is the surface where calibration feedback accumulates: as matches settle, rows transition from alive to dead or promoted, and the user starts to see how their forecasting actually performed.

## What to build

A new page at `/me` plus a conditional nav link to it. Roughly 300 to 500 lines of new code.

### Files to add or modify

- **Add**: `website/src/app/(simulator)/me/page.tsx` (server component, `force-dynamic`).
- **Add**: `website/src/components/simulator/ForecastDesk.tsx` (the table composition; client or server component, your call).
- **Possibly add**: `website/src/lib/sim/getUserPredictions.ts` (shared query helper used by both the `/api/predictions` GET endpoint and the new /me page).
- **Modify**: `website/src/components/layout/EditorialMasthead.tsx` (conditional `Desk` tab for verified users).
- **Modify**: `website/src/lib/analytics/track.ts` (new `desk_viewed` event).

### Authentication

The `/me` page uses the same `45a:sim:owner` signed cookie the `/api/predictions` GET handler validates today (see `website/src/app/api/predictions/route.ts:189` and `website/src/lib/sim/ownerCookie.ts`).

Server-side flow:

1. Read the cookie via the existing owner-cookie helper.
2. If missing or invalid: render the unauthenticated empty state (see "Empty states" below).
3. If valid: extract the email from the cookie, query the predictions for that email (see "Data fetching" below), render the table.

Do not redirect on missing cookie. The /me page should always render something; redirecting would break direct-link sharing and would feel hostile.

### Data fetching

The existing `/api/predictions` GET handler runs a Drizzle query and serialises through `toOwnerPredictionView` (see `website/src/app/api/predictions/route.ts:225-234`). Extract that query into a shared helper:

```ts
// website/src/lib/sim/getUserPredictions.ts
export async function getUserPredictions(
  email: string
): Promise<OwnerPredictionView[]> { ... }
```

Both the API route and the /me page consume the same helper. The API route's response shape stays unchanged.

If extraction is awkward in 30 minutes of work, fall back to duplicating the query inline in the /me page and flag the deferred refactor in the report. Prefer extraction; this is the second consumer and the third will be a future calibration endpoint.

### The Forecast Desk view

Page heading: `Forecast Desk`. Not "Profile", not "Account", not "Dashboard". The brand is operator-centric.

Eyebrow above the heading: `OPERATOR · {email_hint}` where `email_hint` masks the email per the existing pattern (e.g., the `emailHint(email)` helper referenced in `PredictionAlertConfigurator.tsx`). Looks like `n***@gmail.com`. The user can verify they are on the right desk; the visible characters are minimal.

Body: a chronological table of the user's predictions, newest first.

Columns:

1. `SUBMITTED` — ISO timestamp formatted as `YYYY-MM-DD HH:MM UTC` (same format as the permalink page masthead at `scenario/p/[id]/page.tsx:152`).
2. `MODE` — short uppercase mono badge: `FINAL FOUR`, `CHAMP PATH`, or `FULL BRACKET`.
3. `SCENARIO` — the story line, visually truncated with CSS so the table does not balloon. Show full text on hover via `title` attribute.
4. `REALITY SCORE` — the 1-in-N integer (use `getOneInN(count, total)` from `website/src/lib/sim/getOneInN.ts`).
5. `STATE` — `ALIVE`, `DEAD`, or `PROMOTED` (existing vocabulary from `PublicPredictionView.state`). Visual treatment:
   - `ALIVE`: default mono, `--text-primary`.
   - `DEAD`: muted, `--text-quiet`, with the same 1px diagonal strikethrough rule the `RealityScorePanel` applies in dead state (`RealityScorePanel.tsx:122-127`). If a clean strikethrough on a small label is awkward, render as `--text-quiet` with the label `DEAD` in italic; document the choice.
   - `PROMOTED`: `--accent-warm` (peach), matching the existing promoted state on the reveal panel.

Each row is a clickable link to `/scenario/p/{id}`. Cursor pointer on hover. Quiet `--accent-warm` accent on the left border of the hovered row (matching the `ModelCallPanel` match-row accent).

Visual chrome: re-use the existing terminal-table primitives. Look at `DivergenceTable.tsx` and `ModelCallPanel.tsx` for the existing pattern (1px `--border-default` borders, mono uppercase column headers, `--bg-panel-elev` cells, etc.). Do not introduce new primitives.

Provenance footer below the table (quiet 11px mono in `--text-quiet`):

```
{N} forecasts on this desk · operator session active
```

Where `N` is the row count. If `N === 0`, show the empty state instead of the table.

### Empty states

There are two distinct empty states. Treat them carefully; they read differently.

**Unauthenticated** (no cookie or invalid cookie). The page heading still renders ("Forecast Desk") but no eyebrow with an email hint. The body says:

```
No operator session on this device.

Each prediction can arm an alert email. The same email verifies
your operator session for this desk. Submit a scenario and arm the
email; this page becomes your forecast register.

[ Submit a scenario → ]   (links to /scenario)
```

Mono / serif typography matching the rest of the site. No CTA pressure. No "Sign up now" banner.

**Authenticated but zero predictions** (cookie valid, query returns empty). The page heading + eyebrow render normally. The body says:

```
No forecasts on this desk yet.

When you submit a scenario and arm its email, the prediction
appears here.

[ Submit a scenario → ]   (links to /scenario)
```

Subtle distinction: the unauthenticated state mentions the alert-arming flow as the path to a desk; the authenticated-empty state assumes the user already knows about it.

### Nav integration

Add a `Desk` tab to `EditorialMasthead` that only appears for users with a valid `45a:sim:owner` cookie.

The masthead is currently a client component (uses `usePathname`). The cookie check must happen server-side. Two acceptable patterns:

**Pattern A**: Make the parent layout a server component that reads the cookie and passes `isOperator: boolean` to the (client) masthead. The masthead conditionally renders the Desk tab.

**Pattern B**: Server-render a tiny placeholder slot in the layout and inject the Desk tab through it via a separate server component. More indirection.

Prefer Pattern A. The layout already has access to cookies via the Next 16 cookies API.

Position the Desk tab rightmost in the existing tab list (after `Scenario Simulator`). Label: `Desk` (short, fits in the masthead). Match path: `(p) => p.startsWith("/me")`. No `beta` badge.

### Logout affordance (small inclusion)

Add a quiet text link at the bottom of the authenticated /me page that clears the operator cookie and reloads the page (so the next render shows the unauthenticated empty state). Label: `[ Clear operator session ]`. Mono uppercase, `--text-quiet`, hover to `--text-tertiary`.

This is a minimal "sign out" affordance. P2.3 in the evaluation listed a richer logout flow; for this checkpoint, a single quiet link is enough to close the obvious UX gap (shared device, switching emails, etc.).

To clear the cookie: add a small POST route at `/api/me/logout` that clears the `45a:sim:owner` cookie and returns 204. The link does a POST + reload, or a Next.js Server Action does it inline if that pattern is in use elsewhere on the site.

### Analytics

Add a new event: `desk_viewed`. Fires once per session per cookie-valid /me page load. Use a session-scoped flag (mirroring `claimFirstPick` / `claimPromoLanded`) to dedupe within a session.

The unauthenticated empty state does not fire this event.

```
// In track.ts EventMap:
desk_viewed: undefined;
```

No props. The volume of this event over the tournament is the retention signal.

## Acceptance criteria

- `/me` renders a Forecast Desk for users with a valid `45a:sim:owner` cookie.
- The chronological table renders all five columns (SUBMITTED, MODE, SCENARIO, REALITY SCORE, STATE) sorted newest-first.
- Each row is a clickable link to the corresponding `/scenario/p/{id}` permalink.
- STATE column shows ALIVE / DEAD / PROMOTED with the visual treatments specified.
- Unauthenticated visitors see the "No operator session" empty state.
- Authenticated visitors with zero predictions see the "No forecasts on this desk yet" empty state.
- `EditorialMasthead` shows a Desk tab only for verified users.
- A quiet `[ Clear operator session ]` link clears the cookie and reloads the page.
- `desk_viewed` event fires once per session for cookie-valid loads.
- The existing `/api/predictions` GET endpoint behaviour is unchanged. If you extracted the query helper, the endpoint uses it.
- The /me page is `force-dynamic` and uncached (no stale per-user data).
- `robots: { index: false, follow: false }` on /me metadata.
- TypeScript build clean.
- Existing tests pass.
- No SSR or hydration warnings.
- Verify end-to-end: submit a prediction, arm an email, verify, land on /me, see the prediction row, click it, land on the permalink.

## Brand-discipline guardrails (non-negotiable)

- No em-dashes or en-dashes in any new or modified file, including code comments. Use periods, semicolons, colons, parentheses.
- No betting language in any new copy.
- No vanity stats. Do not render `Your forecasts: 12 | accuracy: 67%`, leaderboard rank, win/loss ratio, or any aggregate the user can read as a personal score.
- No celebratory framing on PROMOTED rows. The peach accent is descriptive, not congratulatory. No emoji, no "Great call!", no "You nailed it!".
- No judgmental framing on DEAD rows. DEAD is descriptive operator vocabulary (the scenario is no longer alive because a match outcome contradicted it); not a critique. No "Better luck next time", no red colour.
- Page heading is `Forecast Desk` exactly. Do not rephrase to "My Predictions", "Your Profile", "Dashboard", etc.
- The masthead nav label is `Desk` exactly. Do not use `Account`, `Profile`, `Me`, etc.
- The empty state copy is the locked text above. Do not rephrase to sales-style "Get started!" or "Sign up to track your forecasts!".

## Workflow conventions (from CLAUDE.md)

- Work on a feature branch named `ux/checkpoint-08-forecast-desk`.
- Open a pull request when complete. Do not push directly to main.
- Run `scripts/install-hooks.sh` once if you have not already; the pre-push hook blocks conflict markers.
- If a merge conflict appears during rebase, use `git fetch origin && git reset --hard origin/main` then re-apply your work; do not use `git stash pop`.
- Verify end-to-end on the dev server: arm an alert email, click the verification link, land on /me, see the prediction row.

## End-of-task report

When the work is complete, produce a report in exactly this format:

```
## Checkpoint 8 Report: Forecast Desk

### Branch
ux/checkpoint-08-forecast-desk

### Files changed
- path/to/file (added | modified): one-line summary
- ...

### Diff size
Lines added: N
Lines removed: M
Files touched: K

### What landed
- Whether the predictions query was extracted into a shared helper (location) or duplicated (with TODO)
- How the cookie check flows from layout to masthead (Pattern A or B)
- How the logout link is wired (Server Action, POST endpoint, etc.)
- How desk_viewed dedup works
- Any visual treatment decisions for the STATE column (strikethrough vs italic for DEAD, etc.)

### Manual verification
- [ ] Unauthenticated /me shows the "No operator session" empty state
- [ ] After verifying an email, /me shows the user's prediction row
- [ ] Clicking a row navigates to /scenario/p/{id}
- [ ] STATE column renders ALIVE / DEAD / PROMOTED with the right visual treatment
- [ ] Desk nav tab appears only for verified users
- [ ] [ Clear operator session ] link clears the cookie and reloads to the empty state
- [ ] desk_viewed fires once per session for cookie-valid loads
- [ ] /api/predictions GET endpoint behaviour unchanged (verified by exercising the existing path)
- [ ] /me is force-dynamic; no stale cached data
- [ ] robots: noindex on /me metadata
- [ ] TypeScript build clean
- [ ] Existing tests pass
- [ ] No SSR or hydration warnings

### Vocabulary self-check
Paste the output of grepping the new files for each banned word/phrase:
- accuracy: [count]
- score (in vanity-stat sense): [count]
- profile: [count]
- account: [count]
- dashboard (as a heading, not a route name): [count]
- great call / nice / good guess / better luck: [count]
All should be 0 in user-facing strings.

### Follow-ups / open questions
- Anything you flagged but did not implement, with one-line rationale.

### Ready for review
Y / N. If N, state what is blocking.
```

Do not push to main. Wait for the user to review the report and approve.
