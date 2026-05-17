# Checkpoint 5: One-tap share composer

## Context

You are working on the 45 Analytics codebase (`the-45-percent-problem` repo). The attached file `APP_UX_EVALUATION_2026-05-13.md` is the evaluation that motivates this work. This task implements recommendation **P0.8 (One-tap share composer)** from that evaluation.

Checkpoints 1 through 4 have already landed on main:
- Plausible custom events are wired (`website/src/lib/analytics/track.ts`).
- Final Four has a `[ Start from the model's call ]` ghost-fill button.
- The Reality Score reveal has an anticipation beat.
- A neutral `ModelCallPanel` sits between the hero and the share strip on the permalink.

This is a small, contained change. Expect under 100 lines of net new code.

## Why this matters

Behavioural pattern: viral loop friction reduction. The current share strip on `/scenario/p/[id]` offers two actions: PNG download and a Web Share API "Share" button (which falls back to copying the URL on desktops without Web Share). Neither produces a pre-assembled social post.

If a user wants to post their Reality Score on X, LinkedIn, Threads, or Mastodon today, they have to write the post themselves. The friction is small but real, and at the moment that matters most (right after the reveal lands) it is the difference between a share and a non-share.

The "Copy as post" affordance assembles the string for them: `1 in N. {storyLine}. {permalink}`. One tap, one paste.

## What to do

Add a third button to `TicketShareButton` (`website/src/components/simulator/TicketShareButton.tsx`) that copies the assembled composer string to the clipboard, alongside the existing PNG download and Share buttons.

### Composer string format

Exact format, no variation:

```
1 in {N}. {storyLine}. {permalink}
```

Where:

- `N` is the 1-in-N integer computed from `count` and `total` (same logic as `getOneInN` at `website/src/lib/sim/getOneInN.ts`).
- `storyLine` is the existing `view.storyLine` (already used in the OG image and the page hero).
- `permalink` is the absolute URL to the prediction page (`https://45analytics.com/scenario/p/{id}` or `process.env.NEXT_PUBLIC_SITE_URL + path`).

If `storyLine` already ends with a period, do not double up; collapse to a single period before the URL. If `storyLine` does not end with a period, add one.

Length guard: if the composed string would exceed 280 characters (X's hard limit), truncate the storyLine with a single character ellipsis (`…`, U+2026, one character) so the full string fits. Most stories are well under the limit; this is defensive.

No emoji. No hashtags. No "via @45analytics". No "Posted from 45analytics". The composer is descriptive only.

### Visual

- New button label: `Copy as post`. Default state shows that label preceded by an upward-right arrow glyph in the same style the existing buttons use for affordance hinting (e.g. `↗ Copy as post`, matching the existing `↓ PNG` pattern). Match the existing button chrome: 1px `--border-default`, mono uppercase, square corners, hover transitions to `--accent-warm`.
- Button order in the strip: leave the agent some latitude here. The natural reading is `[ ↗ Copy as post ] [ ↓ PNG ] [ Share ]` so the assembled-post option sits leftmost as the most actionable for text-platform users, the visual artifact sits in the middle, and the Web Share API (most viral on mobile) stays as the rightmost primary action. If a different order reads better in practice, justify in the report.
- On click: copy via `navigator.clipboard.writeText()`. Swap the label to `Copied!` for ~1.5s (mirror the existing "Share" → "Copied!" pattern at `TicketShareButton.tsx:39` and the `Copied!` reset behaviour already in place).
- On error: swap to `Failed, retry` and re-enable on next click (mirror the existing PNG error pattern at `TicketShareButton.tsx:30-36`).
- The existing 6s `nudge-once` opacity pulse already wraps the whole share strip; do not add a separate pulse for the new button.

### Wiring

The component currently receives only `predictionId`. To assemble the composer string it needs `count`, `total`, and `storyLine` as well.

Two options:

1. **Extend the props** of `TicketShareButton` to accept `count`, `total`, `storyLine`. Update the one call site at `website/src/app/(simulator)/scenario/p/[id]/page.tsx:215` to pass them from `view`. Cleanest. Use this approach.
2. Fetch the prediction view inside the component. Don't do this; it adds a needless round-trip.

For the permalink itself, construct from `NEXT_PUBLIC_SITE_URL` (already in env per `website/src/app/api/verify/route.ts:17`) plus `/scenario/p/{id}`. Falling back to `window.location.href` is acceptable on the client side; do whichever is cleaner.

### Analytics

Add `copy_post` as a new `type` value in the `share_action` event.

- Update `website/src/lib/analytics/track.ts` to extend the `share_action` props discriminant: `type: "copy" | "png" | "native" | "copy_post"`.
- Fire `track("share_action", { type: "copy_post" })` on successful clipboard write, the same way `"copy"` fires today on the URL-copy fallback path (`TicketShareButton.tsx:152`).
- Do not consolidate `"copy"` and `"copy_post"`. They are different intents and we want to measure them separately.

## Acceptance criteria

- A third button labelled `Copy as post` (with an arrow glyph) renders in the share strip on `/scenario/p/[id]` for all three modes.
- Clicking it copies a string of the form `1 in N. {storyLine}. {permalink}` to the clipboard.
- The button shows `Copied!` briefly after success, then resets to `Copy as post`.
- Errors show `Failed, retry`; clicking again attempts the copy again.
- Length guard: if the composed string would exceed 280 characters, the storyLine is truncated with a single `…` so the total fits.
- `track("share_action", { type: "copy_post" })` fires on success (verify in DevTools Network tab).
- Existing PNG download, Web Share, and clipboard fallback behaviour all unchanged. The existing `track("share_action", { type })` events with `"png"`, `"native"`, `"copy"` still fire on their respective paths.
- No new user-visible UI besides this one button.
- Composer string contains no emoji, no hashtags, no "via", no "Posted from".
- TypeScript build clean.
- Existing tests pass.
- Keyboard focusable; tab order: `Copy as post` then `PNG` then `Share` (or whichever order you chose, applied consistently).

## Brand-discipline guardrails (non-negotiable)

- No em-dashes or en-dashes in any new or modified file, including code comments. Use periods, semicolons, colons, parentheses.
- No betting language anywhere.
- No celebratory framing on the success state. `Copied!` is the existing pattern and matches the brand; do not change to `Done!`, `Yes!`, `Shared!`, etc.
- Button label is `Copy as post` exactly. Do not rephrase to `Share to X`, `Tweet this`, `Post`, `Copy tweet`, etc. The label is platform-agnostic by design.
- Composer string is the locked format above. Do not add a brand tagline, byline, or attribution beyond the permalink URL.

## Workflow conventions (from CLAUDE.md)

- Work on a feature branch named `ux/checkpoint-05-share-composer`.
- Open a pull request when complete. Do not push directly to main.
- Run `scripts/install-hooks.sh` once if you have not already; the pre-push hook blocks conflict markers.
- If a merge conflict appears during rebase, use `git fetch origin && git reset --hard origin/main` then re-apply your work; do not use `git stash pop`.

## End-of-task report

When the work is complete, produce a report in exactly this format:

```
## Checkpoint 5 Report: One-tap share composer

### Branch
ux/checkpoint-05-share-composer

### Files changed
- path/to/file (added | modified): one-line summary
- ...

### Diff size
Lines added: N
Lines removed: M
Files touched: K

### What landed
- Button order chosen and why
- How the composer string is assembled (where N, storyLine, permalink come from)
- How the 280-char truncation is implemented and tested
- Where copy_post is fired in track.ts and the call site

### Example output (paste actual strings for each mode at the current snapshot)
- Final Four: "1 in N. {actual storyLine}. {actual URL}"
- Champion's Path: "..."
- Full Bracket: "..."

### Manual verification
- [ ] Button renders in the share strip on all three modes
- [ ] Clicking copies the composer string to the clipboard
- [ ] Copied! confirmation appears for ~1.5s
- [ ] Error state shows Failed, retry
- [ ] Existing PNG, Share (native), Share (clipboard fallback) still work
- [ ] share_action fires with type=copy_post on success
- [ ] 280-char truncation triggers when storyLine + boilerplate would exceed limit
- [ ] No SSR or hydration warnings
- [ ] TypeScript build clean
- [ ] Existing tests pass
- [ ] Keyboard tab order reaches the new button

### Follow-ups / open questions
- Anything you flagged but did not implement, with one-line rationale.

### Ready for review
Y / N. If N, state what is blocking.
```

Do not push to main. Wait for the user to review the report and approve.
