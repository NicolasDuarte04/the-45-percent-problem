# Checkpoint 14: Calibration digest emails

## Context

You are working on the 45 Analytics codebase (`the-45-percent-problem` repo). Three attached documents motivate this work:

- `APP_UX_EVALUATION_2026-05-13.md`: the original UX evaluation that introduced P1.2 (calibration-update email cadence).
- `EMAIL_INFRASTRUCTURE_EVALUATION_2026-05-17.md`: the email-side inventory that confirmed what to reuse and what to add.
- `PHASE_B_DATA_PIPELINE_EVALUATION_2026-05-17.md`: the data-side inventory that explained why this work had to wait for the foundation.

Checkpoint 13 shipped the foundation: match outcomes can be entered, predictions are re-evaluated against settled matches, and every state transition is written to `prediction_state_log`. The audit log is the source-of-truth this checkpoint reads from.

This is the original P1.2. The data path now exists; the email layer is the last piece to close the calibration loop. Expect 500 to 800 lines plus one database migration.

## Why this matters

Behavioural pattern: competence (Pattern 6 in the UX evaluation) and longitudinal calibration. The evaluation flagged this as the recurring-engagement hook the simulator needs after kickoff. Without it, every prediction is one-shot; with it, users come back every match day to see how their forecasts shifted against reality.

The infrastructure already exists for most of what is needed. Resend is wired (`lib/email/resend.ts`). Two production email templates with snapshot tests already use the brand design system. Suppression and unsubscribe enforcement is rigorous and applies at every entry point. The audit log from checkpoint 13 records exactly which predictions transitioned and why. This checkpoint stitches those pieces together.

## What to build

Seven pieces, all coupled. They should land in one PR.

### 1. Schema migration: sendLog.eventType

Per the email infrastructure evaluation (decision 3), extend the `sendLog` table to support non-brief sends. Add an `eventType` column and make `briefDate` nullable.

```ts
sendLog (
  id uuid primary key default gen_random_uuid(),
  subscriberId uuid not null references subscribers(id),
  eventType text not null,                    // 'brief' | 'calibration_digest'
  briefDate date,                             // nullable; only set for eventType='brief'
  digestDate date,                            // nullable; only set for eventType='calibration_digest'
  messageId text,
  status text not null,
  sentAt timestamptz not null default now(),
  deliveredAt timestamptz,
  openedAt timestamptz,
  clickedAt timestamptz,
  bouncedAt timestamptz,
  complainedAt timestamptz,
  meta jsonb default '{}'::jsonb
)
```

The migration:

1. Adds `eventType` column with default `'brief'` for existing rows (none exist today, but the default keeps the migration forward-compatible).
2. Makes `briefDate` nullable.
3. Adds `digestDate` column (nullable).
4. Adds an index on `(eventType, subscriberId, digestDate)` so the dispatcher can efficiently check "did this subscriber already get today's digest?".

Existing rows (if any) keep working unchanged.

### 2. Email template

`website/src/emails/CalibrationDigestEmail.tsx`. New React Email template. Same design system as `VerificationEmail.tsx` and `PredictionVerificationEmail.tsx` (cream background `#F4F1EA`, serif lead, mono CTA, hairline borders, three font families).

Props:

```ts
interface CalibrationDigestEmailProps {
  digestDate: string;              // YYYY-MM-DD
  subscriberEmail: string;
  transitions: Array<{
    predictionId: string;
    mode: "final_four" | "champions_path" | "full_bracket";
    storyLine: string;             // the same field from predictions table
    previousState: "alive" | "dead" | "promoted";
    newState: "alive" | "dead" | "promoted";
    reason: string;                // from prediction_state_log
    permalinkUrl: string;          // https://45analytics.com/scenario/p/{predictionId}
  }>;
  deskUrl: string;                 // https://45analytics.com/me
  methodologyUrl: string;          // https://45analytics.com/methodology
  unsubscribeUrl: string;          // pre-built HMAC-signed URL
  unsubscribeHeaders: {            // for List-Unsubscribe + List-Unsubscribe-Post headers
    listUnsubscribe: string;
    listUnsubscribePost: string;
  };
}
```

Body structure (locked):

```
[45A] FORECAST DESK · DAILY UPDATE
2026-06-15

{N} forecasts on your desk changed state.

──────────────────────────────────────

#1 · FINAL FOUR
Spain, France, Argentina, Morocco
ALIVE → DEAD
GER eliminated in R32 vs ITA (0-2). Scenario contradicted.

[ View this forecast → ]

──────────────────────────────────────

#2 · CHAMPION'S PATH
Argentina's path to the final
ALIVE → PROMOTED
ARG R16 W confirmed. Scenario promoted.

[ View this forecast → ]

──────────────────────────────────────

(repeat per transition)

──────────────────────────────────────

[ View all forecasts → ]
View methodology: https://45analytics.com/methodology

──────────────────────────────────────

45analytics publishes probabilistic estimates and model-versus-market
divergences. Nothing on this site is advice of any kind. Probabilities
are subject to revision as new data arrives.

──────────────────────────────────────

You are receiving this email because you armed an alert on a forecast
at 45analytics.com.

[ Unsubscribe in one click ]
```

Use the existing `LEGAL_DISCLAIMER` constant from `website/src/emails/_disclaimer.ts`. Do not retype the disclaimer text.

The `ALIVE → DEAD` and similar transition arrows use the brand-compliant ASCII arrow (`→`) which is already used elsewhere in the site (`[ View this forecast → ]` mirrors the existing button patterns).

State labels use the existing vocabulary: `ALIVE`, `DEAD`, `PROMOTED` (matching ForecastDesk and the predictions schema). Visual treatment in the email:

- `ALIVE`: default text color
- `DEAD`: muted text color, no strikethrough (line-through does not render reliably across email clients)
- `PROMOTED`: brand accent color (`#F9B88A`, the peach used in the OG cards and live gauge)

Snapshot test: `tests/unit/emails/CalibrationDigestEmail.test.ts` with at least 12 content-invariant specs covering: no exclamation marks, no betting language, no sentiment words in any rendered string, design tokens (cream background, serif/mono font family), disclaimer verbatim, transition arrows present, unsubscribe link present, mode labels uppercase, state labels uppercase, permalink and desk URLs render, methodology URL renders, eyebrow text matches.

### 3. Send function

`website/src/lib/email/calibrationDigest.ts`. New module. Exports:

```ts
export async function sendCalibrationDigest(args: {
  to: string;                      // subscriber email
  subscriberId: string;
  digestDate: string;              // YYYY-MM-DD
  transitions: Array<TransitionRecord>;
}): Promise<{ messageId: string }>;
```

Follows the exact pattern of `sendPredictionVerificationEmail` in `lib/email/predictionVerification.ts`:

1. Build the unsubscribe URL using `signUnsubscribeToken` from `lib/email/hmac.ts`.
2. Build the `List-Unsubscribe` + `List-Unsubscribe-Post` headers via `buildListUnsubscribeHeaders`.
3. Render the `CalibrationDigestEmail` template to HTML and plain text via React Email.
4. Dispatch via the shared Resend client from `lib/email/resend.ts`.
5. On success: insert into `sendLog` with `eventType='calibration_digest'`, `digestDate`, `messageId`, `status='sent'`, `subscriberId`.
6. On failure: throw; the dispatcher catches and records `status='failed'` in sendLog with the error in `meta`.

Subject line pattern:

- `[45A] 1 forecast changed state today` (for N=1)
- `[45A] {N} forecasts changed state today` (for N>1)

The subject uses the brand `[45A]` prefix already established by the other templates.

From address: same as the other templates (`brief@45analytics.com` via `RESEND_FROM_ADDRESS`).

### 4. Suppression check before send

Before dispatching to Resend, the send function must verify:

1. The subscriber's `status === 'active'` (not unsubscribed, bounced, or complained).
2. The subscriber's `subscriptionTypes` includes `'prediction_tracking'`.
3. The email is not in the `suppressionList` table.

If any check fails, the function returns without sending and records `status='skipped_suppression'` (or similar) in `sendLog`.

This mirrors the existing `subscribeService` suppression discipline. Do not duplicate the suppression query logic; if a shared helper exists or is natural to extract, use it.

### 5. Digest dispatcher

`website/src/lib/email/calibrationDispatcher.ts`. New module. Exports:

```ts
export async function dispatchCalibrationDigests(args: {
  digestDate: string;              // YYYY-MM-DD, the digest's nominal date
  sinceCutoff: Date;               // typically 24 hours before the cron run
}): Promise<{
  dispatchedCount: number;
  skippedCount: number;
  failureCount: number;
}>;
```

Logic:

1. Query `prediction_state_log` for all rows where `evaluatedAt >= sinceCutoff` AND `previousState !== newState` (only real transitions; the count-only-change rows that checkpoint 13's evaluator might log are filtered out).
2. Join to `predictions` to get `subscriberId` and `email` and the prediction details.
3. Group transitions by `subscriberId`.
4. For each subscriber with at least one transition:
   - Check that the subscriber has not already received a digest for `digestDate` (query `sendLog` for `eventType='calibration_digest'` AND `subscriberId=...` AND `digestDate=...`; idempotency safety net for cron re-runs).
   - Build the transitions array for the template.
   - Call `sendCalibrationDigest`.
5. Aggregate counts and return.

Idempotency: re-running the dispatcher on the same `sinceCutoff` and `digestDate` should produce zero new sends (every subscriber who would qualify has already received their digest today).

### 6. Cron route

`website/src/app/api/cron/calibration-digest/route.ts`. POST endpoint.

- **Auth**: same pattern as `/api/cron/eval-predictions` from checkpoint 13 (Vercel cron header or `BRIEF_DISPATCH_TOKEN` for manual trigger).
- **Effect**: computes today's `digestDate` (current UTC date) and `sinceCutoff` (24 hours ago). Calls `dispatchCalibrationDigests`.
- **Response**: `{ ok: true, dispatchedCount, skippedCount, failureCount }`.

If the dispatcher throws, the route returns 500 with the error class but does NOT retry inside the request handler. The next cron run will pick up where this one left off (the idempotency check on `sendLog` prevents double-sends).

### 7. Vercel cron config

Update `vercel.json` to add the calibration-digest cron. It should fire 5 minutes after `eval-predictions`:

```json
{
  "crons": [
    {
      "path": "/api/cron/eval-predictions",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/calibration-digest",
      "schedule": "5 6 * * *"
    }
  ]
}
```

The 5-minute offset ensures the audit log is fully up to date before the dispatcher reads it.

## Decisions locked from the email infrastructure evaluation

Per `EMAIL_INFRASTRUCTURE_EVALUATION_2026-05-17.md`, three decisions are locked:

1. **Cadence**: per-match-day digest. Only send when there is at least one real state transition (`previousState !== newState`) since the cutoff. Skip days with zero transitions; no empty digests.

2. **Subscription topic**: ride on the existing `subscriptionTypes: ['prediction_tracking']` topic. Users who armed any alert on any prediction automatically receive calibration digests. No second consent surface; the existing `PredictionAlertConfigurator` already described the resulting emails as "state change only" notifications, which is precisely what this is.

3. **sendLog schema**: option A (add `eventType` column, null out `briefDate`, add `digestDate`). The column rename through a one-migration cost up front beats perpetual column-name confusion.

The agent should not re-litigate. If there is a strong reason to deviate from any decision, flag it in the report.

## Acceptance criteria

- `CalibrationDigestEmail` template renders correctly with a representative payload (3 transitions across all three modes).
- The template's snapshot test covers at least 12 content invariants and passes.
- `sendCalibrationDigest` follows the same pattern as `sendPredictionVerificationEmail` and writes to `sendLog` with `eventType='calibration_digest'`.
- The suppression check fires before any Resend dispatch and records skipped sends in `sendLog`.
- `dispatchCalibrationDigests` correctly groups transitions by subscriber and skips subscribers who already received today's digest.
- The dispatcher is idempotent: re-running on the same inputs produces zero new sends.
- The cron route is wired and Vercel cron config fires daily at 06:05 UTC.
- Subject line follows the locked pattern.
- The email body uses the locked structure: eyebrow, headline, per-transition blocks, footer, disclaimer, unsubscribe.
- One-click unsubscribe via `List-Unsubscribe` and `List-Unsubscribe-Post` headers works (HMAC-signed token resolves correctly when the user clicks).
- The existing email-system invariants hold: from address `brief@45analytics.com`, `LEGAL_DISCLAIMER` rendered verbatim, no exclamation marks anywhere, no betting language anywhere, all design tokens match the existing two templates.
- TypeScript build clean.
- Existing tests (227 after checkpoint 13) all pass.
- New tests added: at least 12 content invariants on the template, at least 6 dispatcher tests (group-by-subscriber, idempotency, suppression skip, etc.), at least 4 send-function tests (success path, suppression skip, status check, sendLog write).

## Brand-discipline guardrails (non-negotiable)

- No em-dashes or en-dashes in any new or modified file, including code comments, including template strings. Use periods, semicolons, colons, parentheses.
- No betting language anywhere.
- The email body strings are descriptive, not evaluative. Reuse the reason strings verbatim from `prediction_state_log` (those are already brand-compliant per checkpoint 13's vocabulary self-check).
- No celebratory or judgmental copy. No "Great call!", no "Tough luck", no "Better luck next time". The transition arrow (`ALIVE → DEAD`) is the descriptive surface; do not wrap it in sentiment.
- Subject line is exactly the locked pattern. Do not rephrase to `Your forecasts updated`, `Daily report ready`, `Match results inside`, etc.
- The unsubscribe link copy is exactly `[ Unsubscribe in one click ]`. Match the existing one-click pattern from the other templates.
- Reuse `LEGAL_DISCLAIMER` from `_disclaimer.ts`; do not retype the disclaimer.

## Workflow conventions (from CLAUDE.md)

- Work on a feature branch named `ux/checkpoint-14-calibration-digest-emails`.
- Open a pull request when complete. Do not push directly to main.
- Run `scripts/install-hooks.sh` once if you have not already; the pre-push hook blocks conflict markers.
- If a merge conflict appears during rebase, use `git fetch origin && git reset --hard origin/main` then re-apply your work; do not use `git stash pop`.
- Verify end-to-end on the dev server (Postgres required):
  - Enter a fake match outcome that transitions an existing prediction.
  - Trigger the eval-predictions cron manually.
  - Trigger the calibration-digest cron manually.
  - Confirm the subscriber receives the digest with the correct transition.
  - Trigger the calibration-digest cron a second time; confirm zero new sends.

## End-of-task report

When the work is complete, produce a report in exactly this format:

```
## Checkpoint 14 Report: Calibration digest emails

### Branch
ux/checkpoint-14-calibration-digest-emails

### Files changed
- path/to/file (added | modified): one-line summary
- ...

### Diff size
Lines added: N
Lines removed: M
Files touched: K

### Migrations applied
- migration filename: what it adds

### What landed
- Template design notes (any visual decisions that needed judgment)
- Subject line builder
- Dispatcher group-by-subscriber logic
- Idempotency check on sendLog
- Suppression check placement
- Any deviations from the locked decisions, with justification

### Email rendering sample
Paste the actual subject line and the first 30 lines of the rendered plain-text email for a representative 3-transition payload. This is the artifact a brand reviewer should be able to read and approve at a glance.

### Vocabulary self-check
Grep the new files (template, send function, dispatcher, cron route) and the rendered output for: agree, predict, right, wrong, miss, missed, score, scored, accuracy, win, lose, won, lost, great, nice, tough, luck, sorry, congrats. All counts should be 0 in user-facing strings; flag any in code that are genuinely operator vocabulary (e.g., a `won` field in a match-outcome type is fine; a `Great call!` string is not).

### Manual verification
- [ ] Fake match outcome entered; eval-predictions cron transitions a prediction to DEAD
- [ ] calibration-digest cron sends one email with the correct transition
- [ ] Re-running calibration-digest cron sends zero new emails (idempotent)
- [ ] Unsubscribe link in the email resolves correctly (HMAC token valid)
- [ ] Suppression-list email is correctly skipped
- [ ] Email renders correctly in Gmail, Outlook, Apple Mail (at least two of three)
- [ ] TypeScript build clean
- [ ] All existing tests pass
- [ ] New template, dispatcher, send-function, and cron tests pass

### Follow-ups / open questions
- Count-change-only secondary content (mentioned in the eval as P2 polish; the v1 digest is state-changes only) deferred.
- Live outcome scraping (checkpoint 15) still pending.
- Anything else you flagged.

### Ready for review
Y / N. If N, state what is blocking.
```

Do not push to main. Wait for the user to review the report and approve.
