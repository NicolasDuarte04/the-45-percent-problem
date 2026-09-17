# Claude Code Implementation Prompt: 45analytics Email System

## Mission

Build the email capture, daily brief, archive, and team-page surfaces for the 45analytics website, plus the Python pipeline addition that produces the daily brief JSON, plus the Vercel cron route that dispatches the email. The design is fully specified by three briefs and one interactive design canvas, all in this folder. Do not relitigate design. Implement against the contract.

You are working in an existing Next.js 16 / React 19 / pnpm scaffold at `website/`. The Python pipeline lives at the repo root. Both halves of the work are part of one PR-shaped delivery.

## Read these first (in order)

1. `website/email-capture-design-brief.md` (original brief, full spec)
2. `website/email-capture-design-brief-addendum.md` (v1 addendum: live data block, archive, audience line v1, CTA wording)
3. `website/email-capture-design-brief-addendum-v2.md` (v2 addendum: dual-register audience line, serif lead-in, team chips, dispatch rename note) **this supersedes v1 where they conflict**
4. `website/45analytics Email System-2.html` (interactive design canvas with all states, themes, fallbacks; treat as visual reference for token values, layout, exact copy)
5. `CLAUDE.md` at the repo root (project conventions, Python style, hashing, append-only logs, snapshot registry)

## Architecture decisions (locked, do not relitigate)

- **Database**: Supabase Postgres (use the connection-pooler URL for the runtime, the direct URL for migrations only)
- **Email provider**: Resend with `react-email` templates
- **Spam control**: deferred in v1; build the form to accept an optional Turnstile token but skip server-side verification with a `TODO(turnstile)` comment. Re-enable in Phase 5 by adding `TURNSTILE_*` env vars.
- **Rate limiting**: Upstash Redis (still in v1; the Turnstile defer is the only spam-control gap, and rate limiting closes most of it)
- **Daily dispatch trigger**: Vercel Cron pull (decoupled from Python pipeline)
- **Brief artifact storage**: Vercel Blob (Python pipeline writes the daily JSON; Vercel Cron reads and dispatches)
- **Unsubscribe**: HMAC-signed token, RFC 8058 compliant, one-click via List-Unsubscribe-Post header
- **Verification**: double opt-in, 24h token expiry
- **Themes**: light + dark, both ship, respect `prefers-color-scheme`, no toggle in v1

## Secret hygiene (read before any env work)

Never paste API keys, database passwords, or HMAC secrets into source files, commit history, or this conversation. The implementation flow is:

1. The user populates secrets directly in Vercel project env vars (Production/Preview) and a local `.env.local` (gitignored, Development).
2. Code reads only `process.env.VAR_NAME`. The prompt only needs to know variable **names**, never **values**.
3. If you (Claude Code) ever see a real secret value pasted in this conversation, treat it as exposed: do not commit it, suggest the user rotate it, and continue with the variable name only.

The user has already rotated the initial Resend key after exposure; assume the values are unknown to you.

## Tech stack constraints

- Next.js 16 App Router, React 19, TypeScript strict, pnpm
- Tailwind via design tokens (provided in v1 brief and design canvas)
- Three font families only: JetBrains Mono, Source Serif 4, Inter (load via `next/font`)
- Zero SVG icon libraries; ASCII / Unicode glyphs only (`▲ ▼ ◆ → ✕ ⚠ ✓ ▮ ▯`)
- No client-side localStorage / sessionStorage in artifacts (use `cookies()` server-side or React state)
- Drizzle ORM for Postgres
- `zod` for validation on every API boundary
- Python 3.9+, follow CLAUDE.md conventions: `from __future__ import annotations`, `get_logger`, `DataSnapshotHasher`, `SnapshotRegistry`

## Global rename: "dispatch" to "brief"

Before starting any phase, do this rename across the design briefs and any new code you write:

- User-facing copy: `Dispatch` to `Brief`, `dispatch` to `brief`, `DISPATCH` to `BRIEF` (preserve case)
- JSON field `next_dispatch_utc` to `next_brief_utc`
- Route `/api/cron/dispatch-brief` to `/api/cron/send-brief` (clearer)
- Subject line bracket prefix stays `[45A | DATE]`

Exception: do **not** touch the source design briefs (`email-capture-design-brief*.md`); they are historical artifacts. The rename applies only to the implemented product.

## Phased implementation

Work through phases in order. Each phase ends in a working state. Open a draft PR after Phase 1; push commits per phase; mark ready for review after Phase 5.

### Phase 1: Foundations

**Scope**

- Verify the Next.js scaffold builds (`pnpm dev`, `pnpm build`)
- Add design tokens as a single CSS file at `website/app/styles/tokens.css` using CSS custom properties keyed off `prefers-color-scheme`
- Load the three fonts via `next/font/google`
- Drizzle setup pointing at Supabase Postgres. Use `postgres-js` driver. Two connection strings are required:
  - `DATABASE_URL`: the **pooler** URL (port 6543, `?pgbouncer=true&connection_limit=1`) for runtime serverless connections
  - `DIRECT_URL`: the **direct** URL (port 5432) for migrations only
- Migration runner (`drizzle-kit`) configured to use `DIRECT_URL`
- Schema migration: `subscribers`, `send_log`, `unsubscribe_log`, `suppression_list` tables (SQL below)
- Resend client wrapper at `website/lib/resend.ts` (singleton, env-loaded API key)
- Upstash Redis client at `website/lib/ratelimit.ts` (sliding window, 10 req/min/IP)
- HMAC token utility at `website/lib/tokens.ts` (sign, verify, RFC 8058 list-unsubscribe header)
- `.env.example` updated with all required vars (list below)
- Sentry wired for both Next.js and the Python `build_daily_brief.py`

**Files created**

```
website/
├── app/styles/tokens.css
├── app/fonts.ts
├── lib/db/schema.ts
├── lib/db/index.ts
├── lib/resend.ts
├── lib/ratelimit.ts
├── lib/tokens.ts
├── drizzle.config.ts
└── .env.example
```

**Acceptance**

- `pnpm build` passes with no errors
- `pnpm drizzle-kit generate && pnpm drizzle-kit migrate` creates the four tables in the Supabase project (use a separate Supabase project or schema for dev vs production)
- `tokens.css` produces correct CSS for both themes; verify by adding a temp page that renders `bg`, `ink`, `graphite`, `edge_positive`, `edge_negative`, `suppression` swatches and screenshots match design canvas hex values
- Three fonts render (Mono, Serif, Sans); verify with a temp page

### Phase 2: Subscribe flow + form (Surfaces 1 to 4)

**Scope**

- `POST /api/subscribe`: zod-validate email, accept an optional Turnstile token (do **not** verify it server-side in v1; leave a `TODO(turnstile)` comment at the verification call site), rate-limit, insert subscriber row with status `pending`, generate verification token, send verification email via Resend, return 202. If a subscriber row already exists with status `unsubscribed`, reactivate it (new pending token) rather than creating a duplicate row.
- `GET /api/verify?token=...`: validate token, set status to `active`, redirect to `/confirmed`
- `GET /api/unsubscribe?u=...&s=...`: verify HMAC, set status to `unsubscribed`, render success page (per Surface 4 spec)
- `POST /api/unsubscribe/feedback`: optional anonymous feedback capture
- Surface 1 component (`<EmailCaptureForm />`) at `website/app/_components/EmailCaptureForm.tsx` with all four states (idle, validating, pending, error variants) and both layouts (desktop horizontal, mobile vertical)
- Surface 2 page at `website/app/verify/page.tsx` (verifying, expired states; success path redirects)
- Surface 3 page at `website/app/confirmed/page.tsx` (uses live data block from Phase 3 stub initially, real data in Phase 3)
- Surface 4 pages at `website/app/unsubscribe/page.tsx` (success, invalid)
- Verification email template at `website/emails/VerificationEmail.tsx` (small react-email, terminal aesthetic, single CTA link)
- Server-rendered Turnstile widget wrapper, but rendered behind a `NEXT_PUBLIC_TURNSTILE_ENABLED` flag (default off in v1). When the flag is off, the widget is not mounted and the form submits without a Turnstile token. When it is on, the widget mounts and the token flows to the API. The server-side verification path is stubbed with the `TODO(turnstile)` mentioned above.

**Files created**

```
website/
├── app/api/subscribe/route.ts
├── app/api/verify/route.ts
├── app/api/unsubscribe/route.ts
├── app/api/unsubscribe/feedback/route.ts
├── app/verify/page.tsx
├── app/confirmed/page.tsx
├── app/unsubscribe/page.tsx
├── app/_components/EmailCaptureForm.tsx
├── app/_components/Turnstile.tsx
├── emails/VerificationEmail.tsx
└── lib/email/verification.ts
```

**Acceptance**

- Submit a real email through the form; receive verification email; click link; land on `/confirmed`
- Resubmit same email: returns "already pending" error variant
- Submit invalid email: returns "invalid format" error variant
- Click unsubscribe link in any test email: lands on `/unsubscribe` success state, DB row updated to `unsubscribed`
- Tampered unsubscribe link returns invalid state, no DB write
- Lighthouse accessibility score on form page above 95
- Playwright test covering happy path (subscribe to confirmed) passes

### Phase 3: Public surfaces (Surfaces 5 to 7) and live data block

**Scope**

- `<LiveDataBlock />` component reading from `/api/brief/latest` (server route that fetches latest brief JSON from Vercel Blob)
- Insert `<LiveDataBlock />` above `<EmailCaptureForm />` on home page; same module also rendered on `/methodology` and any future `/divergence/[match_id]` page
- `<TeamChipStrip />` component, reads from same `/api/brief/latest` payload, renders 5 default teams with rotation logic, "SHOW ALL" link
- Surface 5: full daily brief react-email template at `website/emails/DailyBriefEmail.tsx` with all sections (masthead, reproducibility block, lead-in, top divergences table, tournament movers, volatility gate panel, methodology footer, disclaimer, unsubscribe footer); plain-text version included
- Surface 6: `/briefs` index at `website/app/briefs/page.tsx` listing all past issues from `briefs/` blob directory; reverse chronological; populated + empty states
- `/briefs/[date]` route at `website/app/briefs/[date]/page.tsx` rendering the same `DailyBriefEmail` component as a Next.js page (web view)
- Surface 7: `/teams/[country]` placeholder page at `website/app/teams/[country]/page.tsx` (lo-fi, light theme only in v1; reads `team_history.json` if present, otherwise renders "coming soon" panel with the team's current title prob)
- `/teams` index page listing all 48 qualified teams alphabetically
- Empty / fallback state handling for `<LiveDataBlock />` per the JSON contract (no_mover, no_divergence, no_matches; show `◆ FALLBACK` marker only when `fallback_used: true` AND a debug query param is present; do not show to general readers)

**Files created**

```
website/
├── app/_components/LiveDataBlock.tsx
├── app/_components/TeamChipStrip.tsx
├── app/api/brief/latest/route.ts
├── app/api/brief/[date]/route.ts
├── app/api/teams/route.ts
├── app/briefs/page.tsx
├── app/briefs/[date]/page.tsx
├── app/teams/page.tsx
├── app/teams/[country]/page.tsx
├── emails/DailyBriefEmail.tsx
└── lib/blob.ts (Vercel Blob client wrapper)
```

**Acceptance**

- Home page renders the live data block above the form
- Live data block correctly renders all three states (populated, no_divergence, no_matches) by feeding sample JSON via query param `?preview=populated|empty|no_matches` (debug-only)
- `/briefs` lists test issues seeded into Blob storage
- `/briefs/2026-06-12` renders the full email as a web page, identical to the email rendering
- `<DailyBriefEmail />` renders correctly when sent through Resend test send (use Resend's preview tool)
- `<TeamChipStrip />` rotates teams based on JSON input; "SHOW ALL" links to `/teams`
- `/teams/[country]` resolves for all 48 qualified teams (placeholder content acceptable for v1)
- Mobile breakpoints match design canvas

### Phase 4: Pipeline integration

**Scope**

- Python module `evaluation/build_daily_brief.py` that reads `data/snapshots/forecast_log.jsonl`, latest market snapshots, and yesterday's tournament probabilities, then writes `data/snapshots/daily_brief_YYYY-MM-DD.json` and uploads to Vercel Blob at `briefs/YYYY-MM-DD.json`
- Lead-in sentence builder: deterministic templates that produce `tournament_sentence` and `match_sentence` from the data; sets `fallback_used` flag when data is thin
- Vercel Cron route `/api/cron/send-brief` runs at 12:00 UTC: reads today's brief from Blob, queries active subscribers, renders `DailyBriefEmail`, dispatches via Resend Batch API in chunks of 100, writes `send_log` rows
- Cron auth: verify `Authorization: Bearer <CRON_SECRET>` (Vercel sets this automatically when configured)
- Manual replay route `POST /api/admin/send-brief?date=YYYY-MM-DD` gated by separate admin token
- Resend webhook handler at `/api/webhooks/resend` (delivered, opened, clicked, bounced, complained) writes events to `send_log` and `suppression_list`
- GitHub Actions step at end of nightly pipeline calls `python evaluation/build_daily_brief.py` and uploads to Blob

**Files created**

```
the-45-percent-problem/
├── evaluation/
│   ├── build_daily_brief.py
│   └── lead_in_builder.py
└── website/
    ├── app/api/cron/send-brief/route.ts
    ├── app/api/admin/send-brief/route.ts
    ├── app/api/webhooks/resend/route.ts
    └── lib/email/dispatch.ts
```

**Acceptance**

- `python evaluation/build_daily_brief.py --date 2026-06-12` produces a valid JSON file matching the contract; SHA registered in `data/snapshots/snapshot_registry.jsonl`
- All three lead-in fallback states fire correctly under synthetic data inputs (write a unit test)
- Manual replay route, called with a known date, dispatches the brief to a single test subscriber successfully
- Resend webhook events arrive and write rows to `send_log`
- Cron route, when invoked manually with valid auth header, completes in under 30 seconds for 1000 subscribers
- Cron route returns 200 + no-op if today's brief blob is missing or older than 26 hours, and Sentry-pages the failure

### Phase 5: Acceptance and launch

**Scope**

- E2E Playwright test: subscribe to confirmed to receive test brief to unsubscribe
- Email rendering tested across: Gmail web, Apple Mail (mac + iOS), Outlook desktop, ProtonMail web (use Litmus or Mailtrap)
- Light + dark mode verified in clients that support `prefers-color-scheme`
- Plain-text version verified
- DKIM, SPF, DMARC records pass (manual setup; document in roadmap)
- Disclaimer copy verified verbatim on `/confirmed`, every email, archive pages
- Lighthouse run on `/`, `/confirmed`, `/briefs`, `/briefs/[date]`: scores published in PR description
- Load test: cron route handles 10,000 subscribers without timing out
- Smoke test in production: send first real brief to internal test list of 5 addresses
- Turnstile re-enablement: user populates `NEXT_PUBLIC_TURNSTILE_*` env vars and flips `NEXT_PUBLIC_TURNSTILE_ENABLED=true`. Replace the `TODO(turnstile)` block in `/api/subscribe/route.ts` with a real verification call to `https://challenges.cloudflare.com/turnstile/v0/siteverify`. Confirm widget renders in both themes.

**Acceptance**

- All Playwright tests green
- All email clients render correctly (provide screenshots in PR)
- Disclaimer text matches the verbatim version in the original brief
- Production smoke test confirms delivery, open tracking, unsubscribe round trip
- README updated with operational runbook (how to manually replay a brief, how to suppress a subscriber, how to roll back a deploy)

## Database schema (Postgres, Drizzle)

```sql
CREATE TABLE subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','active','unsubscribed','bounced','complained')),
  verification_token TEXT,
  verification_sent_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ,
  source TEXT,
  locale TEXT DEFAULT 'en',
  preferences JSONB DEFAULT '{}'::jsonb,
  consent_text TEXT NOT NULL,
  consent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_subscribers_status ON subscribers(status);
CREATE INDEX idx_subscribers_verification_token ON subscribers(verification_token);

CREATE TABLE send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES subscribers(id),
  brief_date DATE NOT NULL,
  message_id TEXT,
  status TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  complained_at TIMESTAMPTZ,
  meta JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX idx_send_log_subscriber ON send_log(subscriber_id);
CREATE INDEX idx_send_log_brief_date ON send_log(brief_date);

CREATE TABLE unsubscribe_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID REFERENCES subscribers(id),
  email TEXT NOT NULL,
  reason TEXT,
  feedback_text TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE suppression_list (
  email TEXT PRIMARY KEY,
  reason TEXT NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## JSON contracts

### Daily brief JSON (full, written by `build_daily_brief.py`)

```json
{
  "brief_date": "2026-06-12",
  "issue_number": 14,
  "model_variant": "M0",
  "code_sha": "a3f2c1d",
  "data_snapshot_sha": "9b7e2f4",
  "mc_runs": 10000,
  "next_brief_utc": "2026-06-13T12:00:00Z",
  "latest_archive_url": "https://45analytics.com/briefs/2026-06-12",
  "lead_in": {
    "tournament_sentence": "Brazil is still the title favorite at 14.2%, down 240 bps overnight after Argentina's win.",
    "match_sentence": "Today's largest match-day gap is USA vs Mexico, where the model gives the US a 6.3-point edge over bookmaker odds.",
    "fallback_used": false
  },
  "headline": {
    "summary_line": "Largest divergence today: USA vs MEX home side, model 42.3%, market 36.0%, edge +630 bps.",
    "movers_line": "Three teams shifted >2% in title probability overnight."
  },
  "teaser": {
    "has_divergence": true,
    "match_label": "United States vs Mexico",
    "side": "HOME",
    "model_prob": 0.423,
    "market_prob": 0.360,
    "edge_bps": 630,
    "edge_direction": "positive"
  },
  "featured_teams": ["BRAZIL", "ARGENTINA", "USA", "GERMANY", "SPAIN"],
  "top_divergences": [/* per original brief contract */],
  "tournament_movers": [/* per original brief contract */],
  "suppressed_today": [/* per original brief contract */],
  "methodology_links": {
    "model_card": "https://45analytics.com/methodology/m-star",
    "devig_method": "https://45analytics.com/methodology/power-devig",
    "this_brief_archive": "https://45analytics.com/briefs/2026-06-12"
  }
}
```

### Subscriber-side rendering payload

The email template injects this small extra envelope at render time:

```json
{
  "subscriber": {
    "email": "user@firm.com",
    "unsubscribe_url": "https://45analytics.com/unsubscribe?u=...&s=..."
  }
}
```

## Required env vars

```
# Database (Supabase)
DATABASE_URL=                     # pooler URL, port 6543, includes ?pgbouncer=true&connection_limit=1
DIRECT_URL=                       # direct URL, port 5432, used by drizzle-kit only

# Resend
RESEND_API_KEY=
RESEND_FROM_ADDRESS=brief@45analytics.com
RESEND_REPLY_TO=hello@45analytics.com
RESEND_WEBHOOK_SECRET=

# Cloudflare Turnstile (deferred in v1; populate when re-enabling)
NEXT_PUBLIC_TURNSTILE_ENABLED=false
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# HMAC + admin
UNSUBSCRIBE_HMAC_SECRET=          # 32+ bytes random; generate via: openssl rand -hex 32
ADMIN_DISPATCH_TOKEN=             # 32+ bytes random
CRON_SECRET=                      # auto-set by Vercel Cron

# Vercel Blob
BLOB_READ_WRITE_TOKEN=

# Sentry
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=

# Site
NEXT_PUBLIC_SITE_URL=https://45analytics.com
```

The user populates these directly in Vercel and `.env.local`. Do not request the values in this conversation; assume they are present at runtime and reference them by name only.

## Things to confirm with the user before starting Phase 4

You will already have produced Phases 1 to 3 in a draft PR. Before Phase 4:

1. Has the `45analytics.com` domain been added to Resend with DKIM/SPF/DMARC verified? (Required before any production send.)
2. Is the GitHub Actions workflow for the nightly Python pipeline already in place, or do you need to create it? (If yes, this is the file you need to extend.)
3. Are there any existing `forecast_log.jsonl` rows you can build the first lead-in sentences from, or is this a synthetic-data Phase 4?

## Done definition

The PR is ready for review when:

1. All five phases pass their acceptance criteria
2. `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm e2e` all pass
3. `pytest evaluation/test_build_daily_brief.py` passes
4. Email rendering screenshots from at least 4 clients are attached to the PR
5. Disclaimer text matches verbatim
6. README updated with operational runbook
7. No `print()` calls in Python; no em dashes or en dashes in any user-facing copy
8. All API routes have zod validation; no untyped JSON bodies
9. Lighthouse scores published, all above 90 for performance and accessibility

## Constraints to honor throughout

- No betting advice language anywhere; vocabulary forbidden: tip, pick, play, lock, predict, profit, returns
- No social proof counters, testimonials, urgency timers, exit-intent overlays
- No SVG icon libraries; ASCII / Unicode only
- No em dashes or en dashes; pipe `|`, colon, period, parentheses
- Disclaimer copy verbatim, italic serif, 11px, graphite, never collapsed
- Dual-register: every public surface must work for both a quant and a fan
- Aesthetic: hairlines only, no shadows, no border radius above 2px
- Pipeline outputs are append-only; never overwrite `forecast_log.jsonl` or `event_log.jsonl`
- Snapshot SHAs registered for every Parquet or JSON the pipeline writes
