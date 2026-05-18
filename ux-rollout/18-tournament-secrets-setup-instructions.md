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

```
INGEST_TOKEN=ca5a56e76037fd7f083d25e616792de1e2ac9225b550ec2cd9eae34f83bcd176
```

(64 random hex characters. Do not share. Do not commit. Use only in GitHub and Vercel as documented below.)

## Step 3: Add to GitHub Actions secrets (3 minutes)

1. Go to https://github.com/NicolasDuarte04/the-45-percent-problem/settings/secrets/actions
2. Click "New repository secret".
3. Add:
   - Name: `INGEST_TOKEN`
     Value: the token from Step 2
   - Name: `FOOTBALL_DATA_API_KEY`
     Value: the key from Step 1

That is it for GitHub.

## Step 4: Add to Vercel environment variables (3 minutes)

1. Go to your Vercel project settings, then Environment Variables.
2. Click "Add New".
3. Add:
   - Key: `INGEST_TOKEN`
     Value: same value as Step 2
     Environments: Production, Preview, Development
4. Optional: also add `POSTGRES_POOL_MAX` with value `3` to Production only. This activates the evaluator's parallel-update path. If you are unsure about your Postgres tier's connection headroom, leave it unset; the system defaults to 1 connection.

Save. Redeploy is not strictly required (the next deploy will pick it up) but you can trigger one to verify.

## Step 5: Verify (2 minutes)

1. Go to https://github.com/NicolasDuarte04/the-45-percent-problem/actions/workflows/ingest_match_outcomes.yml
2. Click "Run workflow" (manual trigger).
3. Watch the run. It should succeed and exit 0 with a "no tournament window" log line (since today is before June 11).
4. If it fails with an auth error, the token does not match between GitHub and Vercel. Re-paste both.
5. If it fails with a football-data error, the API key is wrong or the account is not verified. Check the dashboard.

## After June 11

The hourly cron starts firing real data. Watch the GitHub Actions tab. The Vercel logs for `/api/ingest/match-outcomes` should show successful POSTs each hour. The eval-predictions cron runs daily at 06:00 UTC; the calibration-digest cron at 06:05 UTC.

If the script fails repeatedly, the admin manual entry route at `/api/admin/match-outcomes` is your fallback. The system degrades gracefully.

## Security notes

- `INGEST_TOKEN` is a shared secret. If you suspect it leaked, rotate it: generate a new one, update in both GitHub and Vercel simultaneously.
- `FOOTBALL_DATA_API_KEY` is tied to your free account. If it leaks, log in to football-data.org and reset.
- Never commit either value to the repo. Never paste either into a chat with anyone except internal collaborators.
