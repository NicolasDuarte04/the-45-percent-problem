# Checkpoint 10: Snapshot toggle (current vs 7 days ago)

## Context

You are working on the 45 Analytics codebase (`the-45-percent-problem` repo). The attached file `APP_UX_EVALUATION_2026-05-13.md` is the evaluation that motivates this work. This task implements recommendation **P1.3 ("7 days ago" snapshot toggle on bracket and leaderboard)** from that evaluation.

Eight P0 checkpoints, the brand-cleanup sweep, and the Full Bracket partial submit (checkpoint 9) have all shipped. The simulator side of the rollout is in good shape. This checkpoint adds a small read-only surface to the research side: let users see how the model evolved over the last week.

## Why this matters

Behavioural pattern: competence (Pattern 6) plus the "vs. last week's snapshot of yourself" framing the evaluation called out. The model updates nightly. Without a way to see what it said previously, the user has no surface for the calibration loop that the project's research thesis depends on: "the model and your call differ here; here is why the model lands where it does, and here is how that has changed."

The snapshot toggle is also a paid-social asset. A tweet that says "Last week the model put Argentina at 14%; today it's 16%" is more interesting than a static "Argentina 16%" card. The toggle is what lets that copy land truthfully on a real surface.

This is a research-side enhancement, not a simulator-side one. The simulator stays on the current snapshot (that is the present-tense engagement instrument). The home page leaderboard, the modal bracket, and the `/bracket` page get the picker.

## What to build

Five small pieces. The total PR should be roughly 200 to 350 lines.

### 1. Snapshot discovery

Investigate what snapshots are available at runtime. The codebase already has `loadSnapshot(snapshotId?: string)` and `loadTournament(snapshotId?: string)` (`website/src/lib/data/loadSnapshot.ts`) that accept an optional snapshot ID. Find out:

- What snapshots actually exist on disk in the `website/` deploy.
- How snapshot IDs are formatted (likely a timestamp or hash).
- Whether the loader can resolve "7 days ago" by date.

If snapshots are file-system based and Vercel runtime can read them, this is straightforward. If snapshots are bundled at build time, you may need to expand what gets bundled (include the last 7 days of snapshots, not just the current one).

If only the current snapshot is bundled, do **not** attempt to fetch historical snapshots from a remote source in this checkpoint. Instead, ship the picker UI with a "no historical snapshots available" graceful degradation and document the data-pipeline change needed in the report. The pipeline change becomes a separate ticket.

### 2. API route: /api/snapshots/list

Add `website/src/app/api/snapshots/list/route.ts` that returns the available snapshots as JSON.

Response shape:

```ts
{
  current: { id: string; date: string; codeSha: string };
  available: Array<{
    id: string;
    date: string;          // ISO date, snapshot generation date
    codeSha: string;       // 8-char short SHA
    daysOld: number;       // computed from today
    label: string;         // human-readable label (see below)
  }>;
}
```

Each entry's `label` is one of:
- `"CURRENT"` for the latest snapshot
- `"7 DAYS AGO"` for the snapshot closest to 7 calendar days back (tolerance ±2 days)
- `"YYYY-MM-DD"` for any other available snapshot (raw date)

The MVP picker only shows two options (current and 7-days-ago). Other available snapshots are returned by the route so a future P2 surface can show all of them; they are not rendered in this checkpoint's picker.

Cache headers: `Cache-Control: public, max-age=3600`. Snapshots roll once per day, so a 1-hour cache is safe.

### 3. Snapshot picker component

Add `website/src/components/compositions/SnapshotPicker.tsx`. Client component.

Props:
- `current: SnapshotInfo`
- `weekAgo: SnapshotInfo | null` (null when no snapshot 7 days back is available)
- `selectedId: string` (the currently-rendered snapshot)
- `basePath: string` (where to navigate to with the new query param, e.g., `/` or `/bracket`)

Visual:
- Two buttons in a row: `[ CURRENT ]` and `[ 7 DAYS AGO ]`.
- Mono uppercase, square-bracketed terminal motif.
- The selected button has `--accent-warm` border; the other has `--border-default`.
- When the user clicks the unselected button, navigate via `router.push(basePath + "?snapshot=" + targetId)`.
- If `weekAgo` is null, render only the `[ CURRENT ]` button with the second button replaced by a quiet `[ Historical snapshots unavailable ]` text in `--text-quiet`. No error, no warning, just a degraded affordance.

Above the buttons, a quiet line: `MODEL STATE · {snapshot.date}` in mono `--text-tertiary`. This makes the date explicit so users do not have to guess what they are looking at.

When viewing a non-current snapshot, show a small banner below the picker: `Viewing snapshot from N days ago. [ Return to current ]`. The "Return to current" link clears the query param.

### 4. Wire the picker into the three surfaces

**Home leaderboard** (`§ 1 · Championship pricing`, `website/src/app/(editorial)/page.tsx` around the `TournamentLeaderboard` section):

- Read `searchParams.snapshot` server-side. Pass to `loadTournament(snapshotId)`.
- Mount the picker in the `SectionHead`'s `rightSlot` (where `GhostLink "All 48 teams →"` currently lives). Replace the link or pair it with the picker; whichever lands cleaner. If you replace the link, document the choice.

**Home modal bracket** (`§ 1.5 · Modal path`):

- Same snapshot ID flows through to `MostLikelyBracket`. The picker on the leaderboard above governs both sections (single picker, two consumers); do **not** mount a second picker.

**/bracket page** (`website/src/app/(quant)/bracket/page.tsx`):

- Read `searchParams.snapshot`. Pass to the bracket data loader.
- Mount the picker at the top of the page, just below the page heading and above the matrix.

### 5. Brand and copy

- Picker labels are exactly `[ CURRENT ]` and `[ 7 DAYS AGO ]`. Do not rephrase to `Today` / `Last week` (loses precision) or `Now` / `7d` (loses voice).
- The model-state line is exactly `MODEL STATE · {snapshot.date}`. The middle dot matches the existing provenance footer pattern.
- The "Return to current" link is exactly `[ Return to current ]`. Not "Back to today", not "Reset".
- The graceful-degradation copy is exactly `[ Historical snapshots unavailable ]`. Not "Coming soon", not "No data".

## What stays unchanged

The simulator is unaffected. Specifically:

- `ModeFinalFour`, `ModeChampionsPath`, `ModeFullBracket` continue to read the current snapshot for ghost-fill, Reality Score, and ModelCallPanel.
- The permalink page (`/scenario/p/[id]`) continues to read the current snapshot for the ModelCallPanel comparison. Predictions are timestamped to their submission snapshot; the comparison surface uses the current snapshot, by design.
- The promo OG cards (`/api/og/promo/[slug]`) continue to read the current snapshot.
- The Forecast Desk (`/me`) continues to read the current snapshot.

Do not let the snapshot URL param leak across the simulator/bracket boundary. A user on `/?snapshot=2026-05-04` who clicks through to `/scenario` lands on the simulator with the current snapshot, no query param carried over.

## Plausible event

Add a new event: `snapshot_toggle` with `{ id: string }` prop. Fires once per toggle click. Use the same session-scoped dedup pattern only for the "viewed N days ago" first-occurrence signal; subsequent toggles fire each time.

Actually, on reflection: do not dedupe. The user toggling back and forth IS the signal. Each toggle is a discrete event. Skip the dedup; let each click count.

## Acceptance criteria

- New API route at `/api/snapshots/list` returns the available snapshots with the response shape above. Cache header `public, max-age=3600`.
- New `SnapshotPicker` component renders the two-button group with brand-compliant labels.
- Picker is mounted on the home page (governing leaderboard + modal bracket) and on `/bracket` (governing the matrix).
- URL query param `?snapshot=<id>` drives the rendered snapshot server-side.
- The picker correctly reflects the selected snapshot's state (selected button styled with `--accent-warm` border).
- When viewing a non-current snapshot, the small banner with `[ Return to current ]` link renders.
- If no 7-days-ago snapshot is available, the picker gracefully degrades to a single `[ CURRENT ]` button plus the `[ Historical snapshots unavailable ]` placeholder.
- The simulator (Final Four, Champion's Path, Full Bracket modes, the permalink, promo OG, /me) is unaffected by the snapshot query param; verify by clicking into the simulator from the home page and confirming the current snapshot is used.
- `snapshot_toggle` event fires on each toggle click.
- TypeScript build clean.
- Existing tests pass.
- No SSR or hydration warnings.

## Brand-discipline guardrails (non-negotiable)

- No em-dashes or en-dashes in any new or modified file, including code comments. Use periods, semicolons, colons, parentheses.
- No betting language anywhere.
- Picker labels are exactly the locked phrases above. Do not rephrase.
- No celebratory framing on toggle. The toggle is a quiet read-only surface; no animation beyond the existing 120ms hover transitions used elsewhere.
- No new colour tokens. The picker uses `--accent-warm` for selection state (existing token) and existing `--border-*`, `--text-*` tokens for everything else.

## Workflow conventions (from CLAUDE.md)

- Work on a feature branch named `ux/checkpoint-10-snapshot-toggle`.
- Open a pull request when complete. Do not push directly to main.
- Run `scripts/install-hooks.sh` once if you have not already; the pre-push hook blocks conflict markers.
- If a merge conflict appears during rebase, use `git fetch origin && git reset --hard origin/main` then re-apply your work; do not use `git stash pop`.
- Verify end-to-end on the dev server: toggle on home, observe leaderboard and modal bracket update; toggle on /bracket, observe matrix update; navigate to /scenario from the home page and confirm the simulator is unaffected.

## End-of-task report

When the work is complete, produce a report in exactly this format:

```
## Checkpoint 10 Report: Snapshot toggle

### Branch
ux/checkpoint-10-snapshot-toggle

### Files changed
- path/to/file (added | modified): one-line summary
- ...

### Diff size
Lines added: N
Lines removed: M
Files touched: K

### Snapshot discovery
- What snapshots exist on disk in the website deploy
- How snapshot IDs are resolved (by date, by SHA, by index)
- Whether a 7-days-ago snapshot is actually available for the picker, or whether the picker degrades gracefully

### What landed
- Where the picker mounts on each of the three surfaces
- How the URL query param flows server-side
- Whether the leaderboard's existing `All 48 teams →` link was replaced, paired, or relocated
- Analytics dedup decision for snapshot_toggle (the prompt suggested no dedup; confirm)

### Manual verification
- [ ] /api/snapshots/list returns the documented shape
- [ ] Picker renders on the home page with both buttons
- [ ] Toggling on the home page updates leaderboard and modal bracket
- [ ] Picker renders on /bracket and updates the matrix
- [ ] Non-current snapshot view shows the [ Return to current ] banner
- [ ] If no 7-days-ago snapshot is available, the picker degrades gracefully
- [ ] Simulator is unaffected by the snapshot query param (verified by navigating from home with ?snapshot=... to /scenario)
- [ ] snapshot_toggle fires on each click
- [ ] TypeScript build clean
- [ ] Existing tests pass
- [ ] No SSR or hydration warnings

### Follow-ups / open questions
- Anything you flagged but did not implement, with one-line rationale.
- If only the current snapshot is bundled at build time, describe the data-pipeline change needed to bundle the last 7 days so the picker becomes functional.

### Ready for review
Y / N. If N, state what is blocking.
```

Do not push to main. Wait for the user to review the report and approve.
