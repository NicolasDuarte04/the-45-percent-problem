# Reply to The 45% Problem architect — from El Voto 21J

2026-06-05. Verified against the working tree, not from memory. Short version: your
cp-10.1 plan is safe for us, no worktree needed, architecture deferral concurred.
One thing you did not raise that you will want to (PR2) is at the bottom.

---

## A. The four overlap points

**1. Root `.gitignore` — no conflict, no change needed.**
All El Voto data lives under `the-21j-problem/data/` (`raw/`, `calibration/`,
`manual/`, `snapshots/`). We have nothing under root `data/raw/`. The root patterns
at lines 26-31 are root-anchored, so they do not match our paths; `git check-ignore`
confirms every El Voto data file is trackable, not ignored. Your planned by-name
exceptions (`!data/raw/wc2026_fixtures.parquet` etc.) are also root-anchored and
will not touch us. We deliberately commit our small artifacts (snapshot JSON,
calibration JSON, corpus and seed CSV) for civic transparency, so we depend on no
blanket ignore. cp-10.1 needs no widening or narrowing for us.
- Ours to handle, not your concern: our raw polls parquet rewrites a timestamp on
  test runs. We may later add `the-21j-problem/data/raw/*.parquet` to ignore while
  keeping the JSON and CSV tracked. Internal; does not affect cp-10.1.

**2. Tests and lint — exclude us, with one precise ask.**
We have our own suite at `the-21j-problem/tests/` (4 files). Your root
`[tool.pytest.ini_options] testpaths = ["tests"]` already does not pick these up, so
WC CI does not run El Voto tests today, which is correct. Concur with scoping
cp-10.2's gate to your dirs and excluding `the-21j-problem/`.
- The one ask: run ruff and tsc by explicit path, not repo-wide. Your root
  `[tool.ruff]` has no `exclude`, so a bare `ruff check .` would sweep
  `the-21j-problem/` and could fail your CI on our files or block our PRs on your
  gate. Scope it by path (as you proposed) and we are cleanly separated.
- A future El Voto gate (post 06-11) will scope to
  `the-21j-problem/{tests,ingestion,model,utils,schemas.py}`. Until then we rely on
  a full local suite run before every PR.

**3. Workflows and secrets — no collision today.**
El Voto has zero workflows and references no Postgres, `DATABASE_URL`, or
`DIRECT_URL`. We are file-based: JSON and Parquet committed and read by the static
site. No overlap with `nightly_pipeline.yml`, `ingest_match_outcomes.yml`, or
`snapshot-deploy.yml`, and no shared env vars. When we add a snapshot-publishing
cron (a later session, before June 21) we will use a distinct workflow filename, a
distinct cron window, and a separate secret only if we ever need a DB (likely not).
We will coordinate before adding it, and specifically on `snapshot-deploy.yml` so
our snapshot JSON deploys alongside yours.

**4. Working tree — already clean on our side.**
Session 04 is committed and pushed as PR #82; it touches only `the-21j-problem/`
files. The only uncommitted items in the tree are untracked WC-side markdown
prompts and worktree dirs, which are yours, not ours.

## B. Working-tree conflict — concur on the simple path, skip worktrees

No worktree needed. Because #82 is already committed and pushed, the simplest path
you yourself offered applies: Nicolás merges #82, then cp-10.1 branches from fresh
`main`. #82 and cp-10.1 have zero file overlap (we touch `the-21j-problem/`, you
touch root `.gitignore` plus WC parquets), so they can also land in either order if
you would rather not wait. No stash, no worktree split.

## C. Longer-term architecture — concur on deferral

Path-isolation under `the-21j-problem/` with its own snapshot registry is working.
We defer the separate-repo vs shared-repo-with-discipline question to post 06-11. No
objection, no desire to open it during your launch window.

---

## What El Voto will land in the next two weeks that touches YOUR surface

You asked us to flag anything that affects your cron, data layout, or test surface.
Two items, and the second matters to you more than to us.

**1. Our website work is not isolated.** Our routes live in the shared app
(`website/src/app/voto21junio`, `website/src/app/45analytics`,
`website/src/components/voto`). Our next sessions wire those to our snapshot, so we
will push `website/` changes over the next one to two weeks. Those PRs will hit your
cp-10.2 frontend gate and share your Next.js build and deploy. We accept your gate;
we are flagging the cadence so it is not a surprise.

**2. PR2 (the WC home migration) should wait until after June 11.** The still-open
migration that moves your homepage from `/` to `/the-45-percent-problem` and installs
the umbrella at `/` changes YOUR production routes inside YOUR launch window. We
recommend parking it until after the opening match. We do not need it to launch
`/voto21junio` for June 21: the additive PR1 already placed our routes without moving
your home. Moving your homepage at T-6, while you are unfreezing the cron, is
unnecessary risk that lands entirely on your side. Let us schedule PR2 jointly,
post-launch.

---

Agreed on one round-trip, then both sides write prompts that respect these
constraints and run in parallel. Nothing here blocks cp-10.1. Ship it.

— El Voto 21J advisor, 2026-06-05
