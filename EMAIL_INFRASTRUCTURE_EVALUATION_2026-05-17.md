# Email Infrastructure Evaluation

Date: 2026-05-17 (kickoff 2026-06-11, 25 days remaining).
Scope: planning input for P1.2 calibration-email cadence.
Out of scope: the simulator surfaces (covered by `APP_UX_EVALUATION_2026-05-13.md`).
Author: senior infrastructure review, on request.

## Executive summary

The website's email surface is much more built than expected. The Resend integration is production. Two email templates ship today (daily-brief verification and prediction-alert verification) with snapshot tests, full HTML and plain-text rendering, and a shared brand language. The subscribers schema supports multiple subscription types via an array column. The suppression list, the unsubscribe flow with HMAC-signed one-click headers, and the bounce-or-complaint handling are all enforced rigorously at every entry point.

The gap is the recurring sending pipeline. The `DailyBriefEmail` template exists with the full nine-section layout, but no cron job calls it; the `sendLog` table is structured for delivery tracking but has never been written to; there is no Vercel cron config and no scheduled dispatcher. This is the precise piece that P1.2 needs to add.

P1.2 (calibration-update email cadence) should therefore extend, not duplicate. Specifically: write a new template that reuses the design tokens from the existing two; write a dispatcher that scans for affected predictions after each match settlement and triggers sends; write the cron entry point that runs the dispatcher. The schema is already there to support both the sends and the delivery tracking; the suppression and unsubscribe machinery is already in place.

Three decisions P1.2 needs to make before any code is written. Two analytical, one schema-related.

## What exists (production)

### Templates

Two React Email templates, both at `website/src/emails/`:

`VerificationEmail.tsx`. The daily-brief verification email. Cream background (`#F4F1EA`), serif lead paragraph, monospace CTA button. Shows the verify URL twice (clickable plus paste-fallback raw URL). The TTL constant is imported from `verification.ts` so the body text "Verification links last 24 hours" stays in sync with the actual TTL.

`PredictionVerificationEmail.tsx`. The simulator alert-arming verification email. Same design system as VerificationEmail. Includes an optional context block showing predictionId, rarity band, and storyLine, so the user can confirm the verification email is for the right prediction. CTA text: `CONFIRM TRACKING`. Snapshot tested at `tests/unit/emails/__snapshots__/PredictionVerificationEmail.test.ts.snap` with 13 content-invariant specs (no exclamation marks, no betting language, disclaimer verbatim, design tokens enforced).

A third template, `DailyBriefEmail.tsx`, is scaffolded but inactive. Nine-section layout (masthead, reproducibility block, headline, divergence table, tournament movers, volatility gate, methodology three columns, disclaimer, unsubscribe footer). Three font families (JetBrains Mono, Source Serif 4, Inter). Imports the legal disclaimer constant from `_disclaimer.ts`. No code path currently calls it.

The shared design language across the three templates is the key reusable asset: cream background, serif lead, mono CTA, hairline borders, no shadows. A calibration email should adopt the same chrome to feel like part of the same family.

### Sending service

Resend API integration at `website/src/lib/email/resend.ts`. `getResend()` returns a singleton client built from `RESEND_API_KEY`. From address defaults to `brief@45analytics.com` via `RESEND_FROM_ADDRESS`; reply-to defaults to `hello@45analytics.com` via `RESEND_REPLY_TO`. Both can be overridden per env.

Two send functions sit on top of the client:

- `sendVerificationEmail()` in `lib/email/verification.ts:25-62`. Renders the daily-brief verification template to HTML and plain text, dispatches via Resend, throws on failure. Callers (the `/api/subscribe` route) catch the throw and surface a 502.
- `sendPredictionVerificationEmail()` in `lib/email/predictionVerification.ts:14-60`. Same pattern for the prediction-alert template.

Both functions are server-only. No client-side code reaches Resend directly.

### Token and verification flow

Two distinct token systems run side by side.

The verification token (`lib/email/verification.ts:17-19`) is 32 bytes of `randomBytes`, base64url-encoded. TTL is 24 hours via `VERIFICATION_TOKEN_TTL_HOURS = 24`. The token is stored on `subscribers.verificationToken`, looked up by `/api/verify/route.ts`, atomically swapped for `status: 'active'` on a successful match within the TTL window. The route redirects to `/confirmed` (or `/confirmed?source=alert` for prediction-tracking flow, per checkpoint 1a).

The unsubscribe token (`lib/email/hmac.ts:35-44`) is HMAC-SHA256-signed JSON containing `{sub: subscriberId, iat: seconds_since_epoch}`. The signing secret is `UNSUBSCRIBE_HMAC_SECRET` (minimum 32 characters per the file's guard). Verification uses timing-safe comparison. The `buildListUnsubscribeHeaders()` helper produces RFC 8058-compliant `List-Unsubscribe` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers; mail clients that support one-click can unsubscribe without round-tripping a confirmation page.

Both token systems are production and have been exercised by real sign-ups.

### Database schema

Four email-relevant tables in `lib/db/schema.ts`.

`subscribers` (lines 16-51). Email, status enum (pending, active, unsubscribed, bounced, complained), verification token and timestamps, source label for analytics, locale, preferences JSON, consent text stored verbatim, and `subscriptionTypes` as a text array. The default value of `subscriptionTypes` is `['daily_brief']`; the alert flow stores `['prediction_tracking']` per the simulator path. The array column is what enables multiple subscription topics per email address without a separate join table.

`sendLog` (lines 53-75). Per-send tracking with `subscriberId`, `briefDate`, `messageId` (the Resend message ID), `status`, `sentAt`, plus webhook-driven timestamps for `deliveredAt`, `openedAt`, `clickedAt`, `bouncedAt`, `complainedAt`. The `meta` JSON field is for arbitrary per-send context. The schema is ready for a recurring-send pipeline but has zero rows today.

`unsubscribeLog` (lines 77-86). `subscriberId`, `email`, `reason` (enum of `user_link`, `too_frequent`, `not_relevant`, `expected_other`, `other`), free-text `feedbackText`. Written by `/api/unsubscribe/feedback`.

`suppressionList` (lines 88-92). Just three fields: `email` (primary key), `reason`, `addedAt`. The reason is a free text label.

The `predictions` table (lines 195-235) has a `subscriberId` foreign key (nullable, on-delete set-null) and an `email` field (nullable, manually attached when the user opts into tracking via `PredictionAlertConfigurator`). A prediction can therefore be linked to a verified subscriber and to an email address; the same email can have many predictions.

### Suppression and unsubscribe

Three enforcement layers.

`subscribeService` in `lib/email/subscribeService.ts:59-67` queries the `suppressionList` table before any subscription state change. If the email is on the list, the service returns `{kind: "suppressed"}` and the caller surfaces a 409. This is the hard floor: a suppressed email cannot be subscribed to anything, ever, through the normal flow.

Bounce and complaint handling in `subscribeService.ts:121-143`. If the subscriber row exists with `status: 'bounced'` or `status: 'complained'`, the service handles it differently. `bounced` allows reactivation (a re-subscribe re-sends verification). `complained` rejects with `{kind: "complained"}` and the caller returns 409 silently.

The unsubscribe flow at `/api/unsubscribe` handles GET (browser link click) and POST (RFC 8058 one-click). Both verify the HMAC token, set `status: 'unsubscribed'`, and write to `unsubscribeLog`. The companion `/api/unsubscribe/feedback` accepts an optional reason and free-text feedback after the unsubscribe completes.

The `/unsubscribe/page.tsx` shows a confirmation or invalid-link state. The page exists in production today.

### API surfaces

`/api/subscribe/route.ts`. Daily-brief subscription entry point. Email validation, rate-limit 10/min per IP, status-aware (rejects active/pending/complained, reactivates unsubscribed/bounced, sends verification on new). 202 on success, 409 on conflict, 502 on send failure.

`/api/verify/route.ts`. Token validation, TTL check, atomic state update, redirect to `/confirmed` or `/confirmed?source=alert`.

`/api/unsubscribe/route.ts` and `/api/unsubscribe/feedback/route.ts`. Both described above.

`/api/predictions/[id]/email/route.ts`. The "attach email to a submitted prediction" endpoint that powers the `PredictionAlertConfigurator`. Same-origin CSRF check, rate-limit 10/min, calls `subscribeService` with `kind: 'simulator'`. Tested with 13 specs at `tests/integration/api/predictions-email.test.ts`.

### User-visible pages

`/brief/page.tsx`. Landing page for daily-brief signup with `EmailCaptureForm` component.

`/verify/page.tsx`. Verification redirect target. Shows "Verifying..." or "That confirmation link has expired" per `state` query parameter.

`/confirmed/page.tsx`. Success page. Mounts `AlertArmedBeacon` only when `source=alert` in the URL.

`/unsubscribe/page.tsx`. Unsubscribe confirmation page.

`/me/page.tsx`. The Forecast Desk (shipped in checkpoint 8). Currently does not show email-settings UI; just lists the user's predictions.

### Tests

`tests/unit/emails/PredictionVerificationEmail.test.ts`. 13 specs covering content invariants and a committed snapshot.

`tests/integration/api/predictions-email.test.ts`. 13 specs covering the attach-email API flow.

No tests for `subscribeService` directly, no tests for token TTL behaviour, no tests for HMAC signing-verification round-trips, no tests for `DailyBriefEmail` rendering. These gaps are not blockers for P1.2 but are worth knowing.

## What is missing (the gap)

The recurring sending pipeline. Specifically:

**No dispatcher**. There is no module that takes "a list of things that happened" and produces "a list of email sends." The two existing send functions (`sendVerificationEmail`, `sendPredictionVerificationEmail`) are direct user-action triggers, not batched dispatch.

**No cron**. No Vercel cron config, no GitHub Actions scheduled workflow, no external cron service integration. A cron entry point would need to be added (Vercel cron is the natural fit since the deploy is on Vercel).

**No match-settlement scoring path**. P1.2's predicate ("a match settled, recompute affected predictions") requires a job that detects when a match has been played and what the outcome was, then walks each `prediction` row to see whether the outcome affected the scenario's alive/dead/promoted state. This logic does not exist today.

**No write path to `sendLog`**. The table exists; nothing writes to it. The dispatcher will need to add a row per send with the Resend `messageId`. Webhooks for `deliveredAt` etc. are also not wired (Resend webhook handler does not exist).

**No third email template**. The DailyBriefEmail template is for editorial brief content, not per-user calibration. A calibration email needs its own template surface (similar chrome, different body content: which of the user's predictions changed state, what the new probabilities are, what the delta means).

## Overlap risks for P1.2

Three specific risks where a naive P1.2 implementation could damage or duplicate existing infrastructure.

**Risk 1: a parallel "send email" pathway**. Anyone building calibration emails who has not seen the existing `lib/email/` directory might write a new `sendCalibrationEmail()` that calls Resend directly instead of going through the established pattern. The result would be two ways to send, two From-address policies, and the suppression check could be skipped if the new path forgets to call `subscribeService` first. Mitigation: the P1.2 prompt should explicitly require the new send function to live alongside `verification.ts` and `predictionVerification.ts`, follow the same pattern (render to HTML + plain text, dispatch via the shared Resend client), and call the suppression check before sending.

**Risk 2: a parallel template directory**. The agent might create `website/src/components/emails/` or `website/src/lib/emails/calibration/` for the new template instead of using `website/src/emails/`. Three template locations would be brittle. Mitigation: lock the location at `website/src/emails/CalibrationDigestEmail.tsx` (or similar) in the P1.2 prompt.

**Risk 3: re-using `sendLog.briefDate` for non-brief sends**. The `briefDate` column is non-null and currently has no consumers, but the name implies a daily-brief calendar entry. Calibration emails do not have a "brief date"; they have a "trigger event" or a "calendar date" or both. Mitigation: either (a) extend the schema with a new column like `eventType: 'brief' | 'calibration'` plus a nullable `eventDate`, and migrate (cleanest), or (b) loosen `briefDate` to nullable and use the `meta` JSON for calibration-specific fields (zero-migration, but the column name becomes misleading). The P1.2 prompt needs an explicit decision here.

## Decisions P1.2 needs to make before implementation

**Decision 1: cadence**. The evaluation specified "per-match-day rather than daily" (so once per day, summarising all matches that settled since the last digest). This is the right default; it bounds the email volume to roughly 30 emails per subscriber across the tournament rather than 64. The P1.2 prompt should lock this to per-match-day with a fallback: if zero matches settled on a given day, no email goes out.

**Decision 2: subscription topic**. Two options.

   - Option A: calibration emails ride on the existing `subscriptionTypes: ['prediction_tracking']` topic. Every user who armed an alert on any prediction gets a daily digest covering all their tracked predictions.
   - Option B: introduce a new topic `'prediction_calibration'` distinct from `'prediction_tracking'`. Users opt in separately. Lower coupling but doubles the unsubscribe surface.

   Recommendation: option A. The existing arm-alert UX (`PredictionAlertConfigurator`) describes the resulting emails as "state change only" notifications, which is precisely what calibration is. Subscribers who armed an alert have already consented to the right thing. Going with option B would force a second consent surface and split the audience.

**Decision 3: schema for sendLog**. Two options.

   - Option A: alter `sendLog.briefDate` to nullable and add an `eventType` enum column. Migration required.
   - Option B: leave the schema as-is, populate `briefDate` with the calendar date and use `meta` for `eventType: 'calibration'` plus prediction IDs and event timestamps.

   Recommendation: option A. The column-name misalignment in option B becomes a documentation tax over time. A one-migration cost up front is cheaper than perpetual confusion. The P1.2 prompt should specify the migration as part of the checkpoint.

## Recommended P1.2 architecture

Given the inventory, the P1.2 checkpoint can be scoped as:

**Add**:
- `website/src/emails/CalibrationDigestEmail.tsx`. New React Email template. Same design system as the existing two. Per-user digest: list of the user's tracked predictions, each with current state (alive/dead/promoted), 1-in-N rarity now, delta from previous email, optional match-by-match summary of what changed.
- `website/src/lib/email/calibrationDigest.ts`. New send function. Follows the same pattern as `sendPredictionVerificationEmail`: render to HTML and plain text, dispatch via the shared Resend client, write to `sendLog` on success.
- `website/src/lib/email/calibrationDispatcher.ts`. Scans for affected predictions, groups by subscriber, calls `sendCalibrationDigest` once per subscriber per day.
- `website/src/app/api/cron/calibration-digest/route.ts`. Cron entry point. Reads Vercel cron header for auth, calls the dispatcher, returns a small JSON summary.
- `website/vercel.json`. Vercel cron schedule (recommended: 06:00 UTC daily).
- Database migration adding `sendLog.eventType` column and nulling out `briefDate`.

**Reuse**:
- The Resend client at `lib/email/resend.ts`.
- The suppression check inside `subscribeService` (call it before each send).
- The `subscribers` table filter (subscriptionTypes contains `prediction_tracking`).
- The HMAC unsubscribe token and `List-Unsubscribe` headers from `lib/email/hmac.ts`.
- The disclaimer copy from `_disclaimer.ts`.
- The design tokens (cream background, serif/mono, hairlines, three font families) from the existing two templates.

**Out of scope for P1.2** (defer to P2):
- Resend webhook handler for `deliveredAt` / `openedAt` / `clickedAt` (nice to have; not load-bearing for the calibration loop).
- A `/me` page section showing the user's email preferences.
- Per-prediction email cadence (the daily digest aggregates).

This shape is consistent with the existing patterns. A reviewer looking at the post-P1.2 codebase would see: three templates of the same family, three send functions in the same directory, two cron entry points (calibration plus whatever future briefs need), and an unchanged surface for verification, unsubscribe, and suppression.

The total P1.2 scope is roughly 500 to 800 lines of new code plus one migration. The largest individual file is the template; the rest is small composition.

## What this evaluation does not cover

The match-settlement scoring path on the research-paper side (Python). Calibration emails depend on knowing which matches have been played and what the outcomes were. This is the `evaluation/` directory's responsibility per `CLAUDE.md`; the Python pipeline writes the post-match state into the database. The P1.2 checkpoint assumes the data is present; verifying that assumption is a Python-side review, separate from this document.

End of evaluation.
