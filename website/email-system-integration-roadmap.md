# Integration Roadmap: 45analytics Email System

## What this document is

A step-by-step plan for taking the email system from "design done" to "first real brief lands in 5 inboxes" without surprises. Organized by who does what.

The implementation prompt for Claude Code is in `email-system-implementation-prompt.md`. This roadmap covers everything outside the codebase: accounts to create, DNS records to set, secrets to provision, what to test before launch.

## Overview of the moving parts

```
[ Python pipeline (nightly, GitHub Actions) ]
        |
        | writes daily_brief_YYYY-MM-DD.json
        v
[ Vercel Blob storage ]
        |
        | read at 12:00 UTC
        v
[ Vercel Cron route on Next.js site ] ----> queries [ Neon Postgres ] for active subscribers
        |                                                |
        | renders react-email template                   |
        |                                                |
        v                                                v
[ Resend Batch API ] -----> [ Subscriber inboxes ] -----> webhooks to /api/webhooks/resend ----> [ Neon send_log ]
```

## What you (Nicolás) do, in order

These are the manual steps that cannot be automated. Knock them out before pointing Claude Code at Phase 1, except where noted.

### Step 1: Account creation

Sign up for, in this order:

1. **Vercel** (you already have this; confirm the project is connected to the website Git repo)
2. **Supabase** (https://supabase.com); free tier is sufficient through the tournament. Create a project; the Database settings page exposes both the **pooler** connection string (port 6543, used at runtime) and the **direct** string (port 5432, used by migrations). You will paste both into Vercel env vars (`DATABASE_URL` and `DIRECT_URL` respectively).
3. **Resend** (https://resend.com); free tier covers 3,000 sends/month and 100/day; upgrade to the Pro plan ($20/month) when you cross 50 active subscribers, since you will hit the daily cap fast.
4. **Cloudflare** account: deferred for v1. Skip this step for now. The form is built to accept a Turnstile token but does not require one until you flip `NEXT_PUBLIC_TURNSTILE_ENABLED=true` in env vars. Re-enable in Phase 5 once everything else is working; rate limiting via Upstash covers most of the spam-control gap until then.
5. **Upstash** (https://upstash.com); free Redis tier is enough for the rate limiter.
6. **Sentry** (https://sentry.io); free developer tier; create one project for "45analytics-web" and one for "45analytics-pipeline".

Cost summary for v1: Vercel free, Supabase free, Resend $20/mo at scale, Upstash free, Sentry free. Turnstile is deferred (free when added). Expect roughly $20 to $40/month total at active-tournament scale, scaling with Resend send volume.

### Step 2: Domain and DNS

Required before any production email send.

1. Add `45analytics.com` to Resend (Domains tab, "Add Domain")
2. Resend will give you four DNS records: SPF (TXT), DKIM (CNAME × 2), DMARC (TXT). Add all four to the DNS provider for `45analytics.com` (Cloudflare DNS, GoDaddy, wherever the domain lives)
3. Wait 10 to 30 minutes; Resend will mark the domain as verified
4. Set the `From` address you want to use: recommend `brief@45analytics.com`. Verify it can send.
5. In Vercel project settings, add `45analytics.com` as the production domain if not already present

If DKIM/SPF/DMARC are not green, **do not skip this**. Mail without proper auth lands in spam at every major provider.

### Step 3: Secrets

Generate and store in Vercel project env vars (Settings to Environment Variables):

```
RESEND_API_KEY                    (from Resend dashboard)
RESEND_WEBHOOK_SECRET             (from Resend webhooks tab; generate)
RESEND_FROM_ADDRESS               brief@45analytics.com
RESEND_REPLY_TO                   hello@45analytics.com (or your support address)

TURNSTILE_SITE_KEY                (Cloudflare Turnstile)
TURNSTILE_SECRET_KEY              (Cloudflare Turnstile)

UPSTASH_REDIS_REST_URL            (Upstash dashboard)
UPSTASH_REDIS_REST_TOKEN          (Upstash dashboard)

UNSUBSCRIBE_HMAC_SECRET           (generate locally: openssl rand -hex 32)
ADMIN_DISPATCH_TOKEN              (generate locally: openssl rand -hex 32)

BLOB_READ_WRITE_TOKEN             (auto-set by Vercel Blob integration)

SENTRY_DSN                        (from Sentry pipeline project)
NEXT_PUBLIC_SENTRY_DSN            (from Sentry web project)

NEXT_PUBLIC_SITE_URL              https://45analytics.com
```

Set them for Production, Preview, and Development scopes. Use a separate Neon branch DB for Preview and Development.

For the GitHub Actions secrets (used by the Python pipeline to upload to Blob):

```
BLOB_READ_WRITE_TOKEN             (same value as Vercel)
SENTRY_DSN                        (pipeline project DSN)
```

### Step 4: Vercel Blob

Activate Vercel Blob storage on the project (Storage tab, Create Blob Store). This auto-injects `BLOB_READ_WRITE_TOKEN`. Cost: $0.15 per GB-month; one daily brief is ~5KB, so storage cost is negligible.

### Step 5: Vercel Cron

After Phase 4 of implementation (Claude Code adds `vercel.json` with the cron config), confirm the cron is registered in the Vercel dashboard under "Crons". Set the schedule to `0 12 * * *` (12:00 UTC daily). The first scheduled run will not happen until you deploy and the schedule lands.

### Step 6: Resend webhook

In Resend dashboard to Webhooks, add an endpoint pointing at `https://45analytics.com/api/webhooks/resend`. Subscribe to all event types: `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`, `email.complained`, `email.delivery_delayed`. Copy the signing secret into `RESEND_WEBHOOK_SECRET`.

### Step 7: Cloudflare Turnstile (deferred to launch)

Skip during build. After Phase 5 acceptance, before opening public signups: in Cloudflare dashboard to Turnstile, add a site for `45analytics.com` and `*.45analytics.com`. Mode: managed challenge. Theme: auto (lets us match `prefers-color-scheme`). Save the site key (public) and secret key (server-only). Set `NEXT_PUBLIC_TURNSTILE_ENABLED=true`, populate the keys, redeploy. Claude Code's Phase 5 task already includes wiring the server-side verification, so this is a config flip not a code change.

## What Claude Code does

Hands `email-system-implementation-prompt.md` to Claude Code. Claude Code works through five phases in order, each phase ending in a working state with passing tests. After each phase, you review and merge to a long-running feature branch. Final merge to main happens after Phase 5.

Phase 1: foundations (DB, fonts, tokens, infrastructure)
Phase 2: subscribe flow (form, verification, unsubscribe)
Phase 3: public surfaces (live data block, archive, team pages, daily brief template)
Phase 4: pipeline integration (Python brief builder, cron dispatcher, Resend webhooks)
Phase 5: acceptance and launch (cross-client email testing, lighthouse, e2e)

Estimated time, assuming Claude Code runs nights/weekends with you reviewing each phase:

- Phase 1: 1 day
- Phase 2: 2 to 3 days
- Phase 3: 3 to 4 days
- Phase 4: 2 to 3 days
- Phase 5: 1 to 2 days

Total: about 10 to 14 working days end to end.

## Order of operations (fully sequenced)

| Day | Action | Owner |
|---|---|---|
| 1 | Create Vercel + Supabase + Upstash + Sentry accounts; connect to repo | You |
| 1 | Add `45analytics.com` to Resend; set DKIM/SPF/DMARC records | You |
| 1 | (Skip Turnstile setup; deferred to launch) | You |
| 2 | DNS verifies (wait time) | Passive |
| 2 | Generate secrets, populate Vercel env vars | You |
| 2 | Hand implementation prompt to Claude Code; start Phase 1 | Claude Code |
| 3 | Review Phase 1 PR; merge to feature branch | You |
| 3 | Claude Code starts Phase 2 | Claude Code |
| 5 | Review Phase 2 PR; manually test subscribe and verify with your own email | You |
| 6 | Claude Code starts Phase 3 | Claude Code |
| 9 | Review Phase 3 PR; manually browse `/briefs` with seeded test data | You |
| 10 | Claude Code starts Phase 4 | Claude Code |
| 12 | Review Phase 4 PR; manually trigger admin replay route to send test brief to yourself | You |
| 13 | Claude Code starts Phase 5 | Claude Code |
| 14 | Review final PR; cross-client email QA; Lighthouse | You + Claude Code |
| 14 | Add 5 internal addresses to subscriber list (yours + 4 collaborators) | You |
| 15 | Wait for first 12:00 UTC cron run; verify all 5 receive the brief | Passive |
| 15 | Smoke test: open, click, unsubscribe round trip | You |
| 16 | Open public signups by linking the form from the homepage | You |

## Testing checkpoints

After each phase, before marking it merged:

**Phase 1 checkpoint**

- `pnpm build` clean
- Migrations run on a Neon dev branch without error
- Both themes render the design canvas color values correctly (eyeball against canvas screenshots)
- Three fonts visibly load (no FOIT, no fallback)

**Phase 2 checkpoint**

- Submit your own email, receive verification, click link, land on `/confirmed`
- Submit again, get "already pending" error
- Verify after 24h delay (or fake the timestamp via DB) shows expired state
- Click unsubscribe link, see success state
- Hit unsubscribe link with tampered signature, see invalid state

**Phase 3 checkpoint**

- Home page shows the live data block above the form, populated with seeded data
- Live data block fallback variants render correctly via `?preview=` debug query
- `/briefs` lists seeded issues; `/briefs/[date]` renders the email as a web page
- Team chip strip rotates teams; `/teams/[country]` resolves
- `<DailyBriefEmail />` rendered through Resend test send arrives in your inbox and looks like the design canvas

**Phase 4 checkpoint**

- Run `python evaluation/build_daily_brief.py --date 2026-06-12` locally; produces valid JSON
- Synthetic-data unit tests for all three lead-in fallback states pass
- Trigger admin replay route with valid token; brief lands in your inbox
- Trigger Resend webhook (use Resend's webhook test tool); `send_log` row updates

**Phase 5 checkpoint**

- Cross-client screenshots from Gmail web, Apple Mail (mac + iOS), Outlook desktop, ProtonMail
- Light + dark mode confirmed in clients that support it
- Lighthouse on `/`, `/confirmed`, `/briefs`: all scores above 90
- Playwright e2e test green
- Full disclaimer text appears verbatim everywhere it should

## Launch checklist (the day you open public signups)

In order:

1. Production DNS green (DKIM, SPF, DMARC all verified)
2. Production env vars all populated (no missing vars)
3. Production Postgres has the tables
4. Production Vercel Blob has at least one daily brief seeded (so the live data block renders for the first visitor)
5. Production cron is scheduled and visible in Vercel dashboard
6. Resend webhook endpoint is reachable in production (test with curl)
7. Internal test list (5 addresses) has received at least one real brief through the cron
8. The disclaimer text is verbatim everywhere
9. The unsubscribe path works end to end against the production DB
10. Sentry is receiving events from both web and pipeline
11. Update the homepage to surface the form prominently
12. Push to social / your network

Only after all 11 are green: open public signups.

## Failure modes to watch for

These are the gotchas that bite people on launch day. Prebuilt mitigations.

**The first cron run fires before any brief JSON exists in Blob.** Mitigation: the cron route checks for today's brief and no-ops with a Sentry warning if missing or stale. It does not send a stale brief. The first dispatch only happens once the Python pipeline has run end to end.

**DKIM not propagated when first send fires.** Mitigation: do not put production traffic on the form until you have manually sent yourself a test brief and confirmed it lands in inbox, not spam.

**Subscriber complains via Gmail "report spam"** which auto-suppresses on Resend's end. Mitigation: the webhook handler writes to `suppression_list`; the cron skips suppressed addresses on every send. Watch the complaint rate in Resend dashboard; if it crosses 0.1%, stop and audit. If it crosses 0.3%, Resend will throttle you.

**Pipeline produces a brief with bad lead-in sentences** (math wrong, sentence ungrammatical). Mitigation: the lead-in builder uses deterministic templates, not LLM generation. Add unit tests against known-bad inputs.

**Vercel Cron silently fails.** Mitigation: every cron invocation writes a row to a `cron_log` table or pings Sentry on success and failure. If you do not see a success ping at 12:05 UTC, something is wrong.

**The form's Turnstile widget visually breaks the aesthetic.** Mitigation: Turnstile supports `theme=dark` and `theme=light`. The agent confirmed this in Phase 2. If it still looks off, switch to invisible mode (Cloudflare supports it) and rely on server-side verification only.

**Subscriber drift between Resend's audience and your Postgres.** Mitigation: do not use Resend Audiences. The Postgres `subscribers` table is the single source of truth. Resend is dispatch-only, never the system of record.

**The "dispatch to brief" rename misses a corner.** Mitigation: Phase 1 includes a global rename pass; grep the codebase before merge for any remaining `dispatch` strings outside of Resend webhook payloads (Resend uses "dispatch" internally; that is fine since it is provider-side).

**A subscriber unsubscribes, then resubscribes via the form.** Mitigation: the subscribe handler should detect an existing `unsubscribed` row by email and offer to reactivate (set status back to `pending` with a fresh verification token). Do not silently create a duplicate row.

## What success looks like at launch

- Form on the homepage above the fold with the live data block above it
- A real divergence visible to anyone who lands, before any signup
- An archive at `/briefs` going back to whichever date you flip on the cron
- Team pages reachable from the chip strip
- The first 5 internal addresses have received at least one real brief
- The unsubscribe round trip works
- Sentry is quiet
- You can sleep through the 12:00 UTC dispatch and wake up to the brief in your inbox
