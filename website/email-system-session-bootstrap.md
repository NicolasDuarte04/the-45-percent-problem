# Session Bootstrap: 45analytics Email System

You are a fresh Claude Code session picking up an in-progress email system implementation for 45analytics, a probabilistic pricing framework for the 2026 FIFA World Cup. This document is your starting context. Read it fully, then read the files it references, then begin work.

## What 45analytics is (one paragraph)

A probabilistic model that runs 10,000 nightly Monte Carlo simulations on a Bivariate Poisson + Dixon-Coles match model, compares the resulting probability distributions to bookmaker odds (de-vigged via the power method), and surfaces market mispricings called "divergences" or "edges". It is a research artifact, not a betting product. Two final deliverables: an academic paper, and a public website that publishes the daily output. The email system you are working on is the daily delivery channel for that website's output.

## State of the repo right now

- `main` is clean and green. Last commit `a292793` added the workflow conventions section to `CLAUDE.md`, append-only log enforcement rules, git hygiene notes, and a pre-push hook (committed at `scripts/git-hooks/pre-push` with installer at `scripts/install-hooks.sh`).
- Phase 1 (foundations: design tokens, fonts, Drizzle setup against Supabase Postgres, schema migrations for `subscribers` / `send_log` / `unsubscribe_log` / `suppression_list`, Resend client, Upstash rate limiter, HMAC token utility, Sentry) is **complete and merged to main**.
- A feature branch named `feat/email-system-phase-2-subscribe` is checked out somewhere with **uncommitted Phase 2 work-in-progress**: modifications to `package.json`, `pnpm-lock.yaml`, `src/app/(editorial)/page.tsx`, and a `.env.example` deletion. The form is partially implemented and rendering on the editorial page in dev, but it diverges from spec in five places (audit list at the bottom of this document).
- A separate Claude Code session built and shipped Vercel Analytics on the website. That session has stopped. You do not investigate or touch its work.

## Read these files before touching code (mandatory, in this order)

1. `CLAUDE.md` at the repo root. Workflow conventions, append-only log discipline, git hygiene, pre-push hook setup. The rules in this file are non-negotiable.
2. `website/email-capture-design-brief.md`. Original brief. Full visual identity, all four form states, all four supporting pages (verify, confirmed, unsubscribe, archive), the daily brief email template layout, the disclaimer (verbatim), the design tokens, and the forbidden-vocabulary list.
3. `website/email-capture-design-brief-addendum.md`. V1 addendum. Adds the live data block, the public archive page, the audience line (v1 wording, since superseded), and the CTA wording change.
4. `website/email-capture-design-brief-addendum-v2.md`. V2 addendum. Adds the dual-register audience line (Option A is the chosen wording), the serif lead-in panel inside the live data block, the team chip strip, the subject line variants, the microcopy revision, and the "dispatch to brief" rename note. **This supersedes v1 where they conflict.**
5. `website/45analytics Email System-2.html`. Interactive design canvas. Open in a browser to see all states, themes, fallback variants, and exact pixel/copy values rendered as React components. Treat this as the visual source of truth.
6. `website/email-system-implementation-prompt.md`. Full implementation spec across five phases. Phase 1 is done. Your work continues in Phase 2 and beyond.
7. `website/email-system-integration-roadmap.md`. Manual setup steps the user has either completed or deferred (Cloudflare Turnstile is deferred to launch).

The combined context across these files is roughly 35 to 40 pages. Do not skip reading them; the design has been iterated on three times and the rationale lives in those documents, not here.

## First action before any code

Run `bash scripts/install-hooks.sh`. This installs the repo-managed pre-push hook into your local `.git/hooks/`. The hook greps for git conflict markers and aborts the push if found. Required per `CLAUDE.md`.

## Workflow rules (cannot be overridden)

Read these in `CLAUDE.md` for the canonical version; summarized here for orientation:

1. Any change beyond a single-file lint fix or a tightly-confined hotfix goes through branch + PR + user review. "Small enough to skip" is not a category.
2. Never push to `main` directly. Direct push is reserved for typo fixes and bot pushes.
3. Always confirm `git branch --show-current` before committing. The previous analytics session committed onto the wrong branch by accident; the recovery worked but the habit failed.
4. After any `git stash pop`, run `git status` to check for unmerged paths. The reason this rule exists is in the git hygiene section of `CLAUDE.md`.
5. Local invocations of any script that writes to `data/snapshots/forecast_log.jsonl` or `data/snapshots/event_log.jsonl` must use a `--dev-sandbox` flag that redirects writes to `tmp/`. Production writes happen only from CI.
6. No em dashes or en dashes anywhere in user-facing copy. Use pipes (`|`), colons, periods, parentheses, semicolons. This is a user preference recorded as project memory.
7. No betting advice language. Forbidden vocabulary: tip, pick, play, lock, predict, profit, returns. The product is a research artifact.
8. The disclaimer copy specified in the original brief is verbatim, on every email, on every page where it appears. Do not abbreviate or hide behind "click to expand".

## Cross-session boundary

This is the email system session. Two other Claude Code sessions exist in this repo:

- An analytics session (Vercel Web Analytics, match pages, vault, etc.). Stopped after committing the workflow rules.
- Possibly other sessions the user spins up for unrelated tasks.

You do not investigate, touch, or comment on their work. If you encounter something outside the email system that looks broken or wrong, surface it to the user in chat but do not act on it. The user is the integrator across sessions.

## Architecture decisions (locked, do not relitigate)

- Database: Supabase Postgres. Use the **pooler** connection string (port 6543, `?pgbouncer=true&connection_limit=1`) for runtime via `DATABASE_URL`. Use the **direct** string (port 5432) for migrations only via `DIRECT_URL`.
- Email provider: Resend with `react-email` templates.
- Spam control: Cloudflare Turnstile is **deferred in v1**. Build the form to accept an optional Turnstile token but skip server-side verification with a `TODO(turnstile)` comment. Wire a `NEXT_PUBLIC_TURNSTILE_ENABLED` flag (default off). Re-enable in Phase 5.
- Rate limiting: Upstash Redis (already wired in Phase 1).
- Daily dispatch trigger: Vercel Cron pull, decoupled from the Python pipeline.
- Brief artifact storage: Vercel Blob.
- Unsubscribe: HMAC-signed token, RFC 8058 compliant, one-click via List-Unsubscribe-Post header.
- Verification: double opt-in, 24h token expiry.
- Themes: light + dark, both ship, respect `prefers-color-scheme`, no toggle in v1.

## Secret hygiene

Never paste API keys, database passwords, HMAC secrets, or any production credential into source files, commit messages, or chat. Reference environment variable names only. The user populates secrets directly in Vercel project env vars (production/preview) and a local `.env.local` (gitignored). Code reads only `process.env.VAR_NAME`.

If the user pastes a secret value into chat, treat it as exposed: suggest rotation and continue with the variable name only.

## Your immediate task: Phase 2 spec divergence audit

The form currently rendering on the editorial page diverges from spec in five places. Your first deliverable is fixing these, on the existing feature branch (or a fresh branch off main if the WIP is unsalvageable; your call after inspecting it). Open as a PR, do not push to main.

**Audit items:**

1. **Forced dark background.** The form panel is rendering dark on a light page. The spec is `prefers-color-scheme`, not forced dark. Fix the component so it inherits the page's theme context, not overrides it. The form should be paper/cream on a light page, charcoal on a dark page.

2. **Missing live data block.** The `<LiveDataBlock />` component from Addendum v1 (Addition 1) plus the serif lead-in panel inside it from Addendum v2 (Addition 2) are absent. Add the monospace block above the form with the `TODAY | DATE | ISSUE N` masthead row, the largest-divergence data table, and the serif lead-in paragraph above the data table. For Phase 2, stub the JSON contract with a hardcoded sample issue stored as a static file in `public/sample-brief.json`. The cron-written real data is not in scope until Phase 4.

3. **Missing team chip strip.** The `<TeamChipStrip />` component from Addendum v2 (Addition 3) is missing. Add five chips plus "SHOW ALL" below the form, monospace 12px, hairline borders, no fill. Same static-stub approach. Hover state: ink-colored border only, no other change.

4. **Unauthorized eyebrow numbering.** The eyebrow label currently reads `§ 0.9 · DAILY BRIEF`. The `§ 0.9 ·` prefix is academic-section numbering not present in any design document. Drop it. The eyebrow is `DAILY BRIEF` or `DAILY RESEARCH BRIEF` (consistent with the `DAILY RESEARCH DISPATCH` in the original brief, post-rename).

5. **CTA wording.** The form currently shows `SUBSCRIBE →`. The spec proposed `RECEIVE BRIEF`. `SUBSCRIBE` is acceptable but a deviation. Pick one, apply it consistently everywhere the CTA appears, and note the choice in the PR description.

Items that are **already correct** (do not change):

- Audience line (Option A from Addendum v2): `How likely is your team to win? How likely does the market think? / Track both, every day, with the methodology in plain view.`
- Microcopy below the form: `Daily, 12:00 UTC. Methodology open. Unsubscribe one click.`
- The error state copy ("That email does not look right. Check the address and try again.") is reasonable.

When the audit is fixed, post screenshots of the home page in both light and dark mode (toggle via OS-level `prefers-color-scheme`) before marking Phase 2 ready for review.

## What follows Phase 2

Phases 3 through 5 are defined in `email-system-implementation-prompt.md`:

- Phase 3: Public surfaces. Real wiring of `<LiveDataBlock />` and `<TeamChipStrip />` against `/api/brief/latest`. The `/briefs` archive index. The `/briefs/[date]` route. The `/teams/[country]` placeholder. The full `<DailyBriefEmail />` react-email template.
- Phase 4: Pipeline integration. Python `evaluation/build_daily_brief.py`. Vercel Cron route at `/api/cron/send-brief`. Resend webhook handlers at `/api/webhooks/resend`. Manual replay route at `/api/admin/send-brief`.
- Phase 5: Acceptance and launch. Cross-client email QA (Gmail, Apple Mail, Outlook, ProtonMail). Lighthouse runs on all public routes. Playwright E2E tests. Turnstile re-enablement (config flip, not a code change).

Each phase is a separate PR. Stop at the end of each phase for user review. Do not chain phases without explicit go-ahead.

## Done definition for your first deliverable (Phase 2 audit)

- All five audit items fixed against the spec
- Light and dark screenshots of the home page attached to the PR
- CTA wording chosen and noted in the PR description
- All Phase 2 acceptance criteria from the implementation prompt are met (subscribe to confirmed flow works end to end, error variants render, unsubscribe round trip works)
- PR open against `main`, no direct main pushes
- Pre-push hook installed and active in your local clone
- The user has tested subscribe-to-confirmed against their own email and confirmed it works

## Start sequence

1. Read this document fully
2. Read `CLAUDE.md`
3. Run `bash scripts/install-hooks.sh`
4. Read the six design and spec files listed above, in the order given
5. Check out the existing `feat/email-system-phase-2-subscribe` branch and inspect the WIP. Decide whether to continue on it or branch fresh from `main`.
6. Run `pnpm install` and `pnpm dev` to see the current rendered state
7. Begin the five-item audit
8. Stop and ping the user when the Phase 2 PR is ready for review

When in doubt about the design, the design canvas (`45analytics Email System-2.html`) is the visual source of truth. When in doubt about the rules, `CLAUDE.md` is the procedural source of truth. When in doubt about either, ask the user before acting.
