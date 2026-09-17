# Checkpoint 1a: alert_armed correction

## Context

This is a follow-up to checkpoint 1 (Plausible Event Instrumentation). Four of the five events are correctly wired. The fifth event, `alert_armed`, is sitting on the wrong page.

You correctly flagged this in your report: the `/api/verify` route always redirects successful verifications to `/confirmed` (verified at `website/src/app/api/verify/route.ts:74`), so the beacon you mounted on `/verify/page.tsx` (which is now the failure / expired surface for brief subscriptions) almost never fires in the real flow.

This patch moves the beacon to `/confirmed` and adds discrimination so it does not over-count daily-brief verifications.

## Why source discrimination matters

`/confirmed` is the shared success destination for both flows:

- Daily brief verifications: subscribers signed up via `/brief`
- Alert arming verifications: subscribers attached an email to a prediction via `PredictionAlertConfigurator`

The signal that tells them apart is already in the database. `subscribers.subscriptionTypes` (`website/src/lib/db/schema.ts:42-45`) contains `['daily_brief']` for the brief flow and `['prediction_tracking']` for the alert flow. The `/api/verify` route can read that column on the verified row and append a `?source=alert` query parameter when it is the alert flow.

## What to do

1. **Update `/api/verify/route.ts`** to detect alert verifications and route them with a `?source=alert` query parameter.
   - After the successful `db.update(subscribers)...returning({id})` at line 38 to 52, also `returning` `subscriptionTypes` (or read it back via a follow-up query).
   - If the verified subscriber's `subscriptionTypes` includes `prediction_tracking`, redirect to `/confirmed?source=alert`.
   - Otherwise (the common brief case), redirect to `/confirmed` unchanged.
   - Keep the expired-token redirect to `/verify?state=expired` as-is.

2. **Move `AlertArmedBeacon` from `/verify` to `/confirmed`**.
   - Delete the `<AlertArmedBeacon />` mount and import from `website/src/app/verify/page.tsx`.
   - Delete `website/src/app/verify/AlertArmedBeacon.tsx`.
   - Create `website/src/app/confirmed/AlertArmedBeacon.tsx` with the same effect: fires `track("alert_armed")` on mount.
   - Mount it inside `/confirmed/page.tsx`, gated on `searchParams.source === "alert"`. The /confirmed page is currently a pure server component with no searchParams; add `searchParams: Promise<{ source?: string }>` to the page props, await it, and pass the discriminated boolean to the beacon (or mount the beacon conditionally).

3. **Verify the beacon does not fire for brief verifications**. Pure code check: only render when `searchParams.source === "alert"`.

## Acceptance criteria

- `alert_armed` fires when a user verifies an alert email (via the prediction tracking flow).
- `alert_armed` does **not** fire when a user verifies a daily-brief subscription.
- `/verify/page.tsx` no longer mounts any analytics beacon.
- TypeScript build clean.
- Existing tests pass.

## Brand-discipline guardrails

- No em-dashes or en-dashes in any new or modified file, including code comments.
- No betting language anywhere.
- No new user-visible UI; the search param is invisible to the user.

## Workflow

- Continue on the same branch `ux/checkpoint-01-plausible-instrumentation`. Add this as a follow-up commit on the existing PR.
- Do not push to main. Wait for review.

## End-of-task report

Append to the existing checkpoint 1 report:

```
## Checkpoint 1a Correction: alert_armed source-discriminated

### Files changed (since checkpoint 1)
- path/to/file (added | modified | deleted): one-line summary

### What landed
- /api/verify now redirects alert verifications to /confirmed?source=alert
- /confirmed mounts AlertArmedBeacon only when source=alert
- /verify no longer mounts any beacon

### Verification
- [ ] alert_armed fires on alert email verification
- [ ] alert_armed does not fire on daily-brief verification
- [ ] TypeScript build clean
- [ ] Existing tests pass

### Ready for review
Y / N. If N, what is blocking.
```
