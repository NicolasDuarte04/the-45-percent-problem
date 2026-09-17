# Checkpoint 18: Tournament secrets setup (Sonnet is fine)

## Context

The performance rollout is complete (checkpoints 1 through 17 merged). The system is built end-to-end. Before the tournament starts on 2026-06-11, three operational values need to be in place for the live ingestion pipeline to actually run:

1. `INGEST_TOKEN`: a random secret used to authenticate the GitHub Actions ingest job against the website's `/api/ingest/match-outcomes` endpoint.
2. `FOOTBALL_DATA_API_KEY`: the API key from football-data.org for fetching live WC 2026 match results.
3. `POSTGRES_POOL_MAX` (optional): a small integer like 3 that lets the evaluator's `Promise.all` updates actually parallelize.

This task is mechanical, not creative. Sonnet is plenty.

## What to do

Three pieces. Total work should take well under an hour.

### 1. Generate INGEST_TOKEN

Run `openssl rand -hex 32` (or `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` if openssl is unavailable). Produces a 64-character hex string. Store it in your scratch buffer; you will paste it into the setup document and the final report.

Do not commit the token anywhere. Do not write it into any file in the repo. The setup document tells the user where to paste it; only they should know its value.

### 2. Verify the workflow YAML references the right env var names

Open `.github/workflows/ingest_match_outcomes.yml`. Confirm it references exactly:
- `INGEST_TOKEN` (in env, passed to the script)
- `FOOTBALL_DATA_API_KEY` (in env, passed to the script)
- `SITE_URL` or `NEXT_PUBLIC_SITE_URL` (whichever the script reads)

Open `ingestion/fetch_match_outcomes.py` (the script that GitHub Actions runs). Confirm it reads those same env vars under the same names.

Open `website/src/app/api/ingest/match-outcomes/route.ts`. Confirm it validates the bearer token by reading `process.env.INGEST_TOKEN`.

If any of the three names mismatch across these files, that is a bug. Flag it in the report. Do not silently fix; the names were locked in checkpoint 15 and any mismatch is something the user should know about.

### 3. Write the setup document

Add `ux-rollout/18-tournament-secrets-setup-instructions.md`. Copy-paste-ready document the user follows once. Structure:

```
# Tournament secrets setup

You need to add three values across two places (GitHub Actions and Vercel) before the tournament starts. This takes about 10 minutes.

## Step 1: Get the football-data.org API key (5 minutes)

1. Go to https://www.football-data.org/client/register
2. Register with your email; verify the email.
3. Log in. Your dashboard shows your X-Auth-Token at the top.
4. Copy that token. This is your FOOTBALL_DATA_API_KEY.

(The free tier is 10 requests per minute. Hourly ingest uses 1 request per hour, well within limits.)

## Step 2: Use this INGEST_TOKEN

The agent generated this for you:

INGEST_TOKEN=<paste the generated token here>

(64 random hex characters. Do not share. Do not commit. Use only in GitHub and Vercel as documented below.)

## Step 3: Add to GitHub Actions secrets (3 minutes)

1. Go to https://github.com/NicolasDuarte04/the-45-percent-problem/settings/secrets/actions
2. Click "New repository secret".
3. Add:
   - Name: INGEST_TOKEN
     Value: <the token from Step 2>
   - Name: FOOTBALL_DATA_API_KEY
     Value: <the key from Step 1>

That's it for GitHub.

## Step 4: Add to Vercel environment variables (3 minutes)

1. Go to https://vercel.com/<your-team>/<your-project>/settings/environment-variables
2. Click "Add New".
3. Add:
   - Key: INGEST_TOKEN
     Value: <same value as Step 2>
     Environments: Production, Preview, Development
4. Optional: also add POSTGRES_POOL_MAX with value 3 to Production only. This activates the evaluator's parallel-update path. If you are unsure about your Postgres tier's connection headroom, leave it unset; the system defaults to 1 connection.

Save. Redeploy is not strictly required (the next deploy will pick it up) but you can trigger one to verify.

## Step 5: Verify (2 minutes)

1. Go to https://github.com/NicolasDuarte04/the-45-percent-problem/actions/workflows/ingest_match_outcomes.yml
2. Click "Run workflow" (manual trigger).
3. Watch the run. It should succeed and exit 0 with a "no tournament window" log line (since today is before June 11).
4. If it fails with an auth error, the token does not match between GitHub and Vercel. Re-paste both.
5. If it fails with a football-data error, the API key is wrong or the account is not verified. Check the dashboard.

## After June 11

The hourly cron starts firing real data. Watch the GitHub Actions tab. The Vercel logs for /api/ingest/match-outcomes should show successful POSTs each hour. The eval-predictions cron runs daily at 06:00 UTC; the calibration-digest cron at 06:05 UTC.

If the script fails repeatedly, the admin manual entry route at /api/admin/match-outcomes is your fallback. The system degrades gracefully.

## Security notes

- INGEST_TOKEN is a shared secret. If you suspect it leaked, rotate it: generate a new one, update in both GitHub and Vercel simultaneously.
- FOOTBALL_DATA_API_KEY is tied to your free account. If it leaks, log in to football-data.org and reset.
- Never commit either value to the repo. Never paste either into a chat with anyone except internal collaborators.
```

That document goes in the repo. Replace `<paste the generated token here>` with the actual token you generated in step 1.

## Acceptance criteria

- `INGEST_TOKEN` generated (64 hex characters via openssl or equivalent).
- Setup document written at `ux-rollout/18-tournament-secrets-setup-instructions.md` with the actual token pasted in.
- Workflow YAML, Python script, and ingest route confirmed to reference the same env var names. Any mismatch is flagged in the report.
- TypeScript build clean (no code changes, so nothing should break).
- No code changes outside the new markdown file (this is a setup task, not a build task).

## Brand-discipline guardrails

- No em-dashes or en-dashes in the setup document.
- No marketing language. The document is operational; treat it as a runbook.

## Workflow

- Work on a feature branch named `ops/tournament-secrets-setup`.
- Open a pull request when complete.
- The PR's only diff should be the new markdown file.

## End-of-task report

```
## Checkpoint 18 Report: Tournament secrets setup

### Generated INGEST_TOKEN
<paste the actual 64-character hex string here>

The user pastes this into both GitHub secrets and Vercel env vars per the instructions document.

### Env var name verification
- .github/workflows/ingest_match_outcomes.yml uses: <list the names>
- ingestion/fetch_match_outcomes.py reads: <list the names>
- website/src/app/api/ingest/match-outcomes/route.ts validates: <list the names>

All names match: Y / N
If N, list the mismatches and the recommended fix.

### Files added
- ux-rollout/18-tournament-secrets-setup-instructions.md

### Ready for review
Y / N
```

## What this delivers and how to test it

### What the user gets

A 64-character hex string (the INGEST_TOKEN) and a copy-paste-ready document that walks them through registering at football-data.org, adding both secrets to GitHub, adding the INGEST_TOKEN to Vercel, and verifying the workflow runs successfully.

### How the user tests it

1. Open the agent's report; copy the generated INGEST_TOKEN.
2. Open the setup document `ux-rollout/18-tournament-secrets-setup-instructions.md` and follow steps 1 through 5 in order.
3. The verification step (manual workflow run on GitHub) tells the user the setup is correct: green check, "no tournament window" log line.
4. From June 11 onwards, the hourly cron runs against real data.

If something fails at any step, the document's verification step diagnoses the most common issues (auth error = token mismatch, football-data error = API key issue).
