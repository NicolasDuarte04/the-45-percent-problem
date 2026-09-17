# Checkpoint 6: Promote Final Four to the home page above the fold

## Context

You are working on the 45 Analytics codebase (`the-45-percent-problem` repo). The attached file `APP_UX_EVALUATION_2026-05-13.md` is the evaluation that motivates this work. This task implements recommendation **P0.1 (Promote Final Four to the home page above the fold)** from that evaluation.

Checkpoints 1 through 5 have already landed on main:

- Plausible custom events are wired (`website/src/lib/analytics/track.ts`).
- Final Four has a `[ Start from the model's call ]` ghost-fill button.
- The Reality Score reveal has an anticipation beat.
- A neutral `ModelCallPanel` sits between the hero and the share strip on the permalink.
- `TicketShareButton` has a `Copy as post` affordance.

This is the highest-leverage single change in the entire UX rollout. The home page is the most-trafficked surface on the site and the primary landing target for the upcoming social-media push. Execute carefully; small mistakes here are visible to everyone.

## Why this matters

Behavioural pattern: completion drive (Pattern 5), reduces cognitive overload (Pattern 2). The evaluation found that the home page currently does its primary job (establish authority, demonstrate the divergence claim) well, but it fails its secondary job for the strategic shift: it does not convert curious arrival into engaged interaction. The simulator is reachable only via the "Scenario Simulator Beta" tab in the masthead, which signals "incomplete" rather than "primary action". A user who skims the leaderboard for 8 seconds and bounces leaves nothing behind.

Promoting Final Four above the fold means a cold social-media visitor lands, immediately sees four empty slots with a 48-team picker, fills them (or clicks the ghost-fill button), and reaches the Reality Score reveal without ever leaving the home page (the submit flow takes them to the permalink). The rest of the home page (leaderboard, modal bracket, divergences, calibration, vault links) remains discoverable below.

## What to do

Insert a new section into the home page that mounts `ModeFinalFour` inline, positioned between the existing header block and the "§ 1 · Championship pricing" section. Then replace the `Watch the trailer` CTA in the header row with `[ Skip to all three modes ]` linking to `/scenario`.

### Files to modify

- `website/src/app/(editorial)/page.tsx` (the home page). Insert the new section. Replace the header CTA. Pass `modalSemifinalists` to `ModeFinalFour` (same data source the dedicated page uses).
- `website/src/components/simulator/modes/ModeFinalFour.tsx`. Add a `variant?: "page" | "inline"` prop. When `variant === "inline"`, suppress the page-level `<h1>` ("Who makes the final four?") so the home page section can provide its own heading.
- Possibly `website/src/lib/analytics/track.ts`. See "Analytics" section below for the decision the agent needs to make.

### Where exactly the new section goes

Looking at `app/(editorial)/page.tsx`, the existing structure is:

```
<div className="mx-auto" ...>
  <header className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] ..."> ... </header>  // around lines 44 to 146
  <section style={{ marginBottom: 56 }}>  // § 1 · Championship pricing (TournamentLeaderboard)
  ...
</div>
```

Insert the new simulator section between the closing `</header>` and the opening of the `§ 1` section. The new section uses the same outer chrome as the other sections (a `<section>` with the standard `marginBottom`) so the page rhythm is unchanged.

Use `SectionHead` (the same component the other home-page sections use). Suggested eyebrow and title:

- Eyebrow: `INTERACTIVE` (or `§ 0 · Scenario` if you want to match the numbering pattern; the agent may pick either, but justify in the report).
- Title: `Who makes the final four?` (same wording as the dedicated /scenario/final-four page so a returning visitor recognises it).

No `rightSlot` link on the SectionHead; the `[ Skip to all three modes ]` CTA already lives in the header above.

### Header CTA replacement

In the CTA row near the bottom of the header block (currently around `app/(editorial)/page.tsx:119-141`), the existing two-item flex row has:

```tsx
<WatchTrailerButton />
<Link href="/brief" ...>Receive the daily brief →</Link>
```

Replace `<WatchTrailerButton />` with a `Link` to `/scenario`. The new link:

- Label: `[ Skip to all three modes ]` (mono uppercase, square-bracketed terminal motif).
- Style: match the existing `Receive the daily brief →` link styling for visual symmetry. Same 1px border, same padding, same font tokens. Adjust only the text content and the href.
- `aria-label`: `Skip the inline simulator and choose another mode at /scenario`.

The `WatchTrailerButton` import and the trailer-section anchor link become unused above the fold; the trailer section itself (around `app/(editorial)/page.tsx:181`) stays in place lower on the page. Users who scroll down still see the trailer. Removing the redundant import is fine; do not delete the `TrailerSection` component.

### The compact variant of ModeFinalFour

`ModeFinalFour` currently renders its own `<h1>` at line 393 (the "Who makes the final four?" heading) and a `[ Reset ]` link at the top-right. On the home page these compete with the SectionHead.

Add a `variant?: "page" | "inline"` prop (default `"page"`). When `variant === "inline"`:

- Suppress the entire top header block (the `<div className="flex items-baseline justify-between gap-4">` wrapping the h1 and Reset button at lines 392-406). The SectionHead in the home page section is the heading.
- Keep the subhead paragraph at line 408-410 (`We compare your scenario against 10,000 simulations of the tournament.`). The subhead is still useful framing.
- Move the `[ Reset ]` affordance into a quieter spot in the inline variant: either remove it entirely (the user has no committed state pre-submit so reset is rarely needed) or render it as a small footer link below the submit button. Pick whichever lands cleaner; document the choice.
- All other behaviour (slot row, ghost-fill button, team picker, live agreement gauge, submit) renders identically. The same submit flow routes the user to `/scenario/p/[id]`.

Do not change the slot row, the team picker grid, the live agreement gauge, or the submit-button copy. Those primitives are the brand; they should look identical on both surfaces.

### Data flow

The home page already calls `loadSnapshot()`, `loadStructuralMaps()`, and derives `tournament` and `divergence`. Reuse this data to compute `modalSemifinalists`. Mirror the helper at `app/(simulator)/scenario/final-four/page.tsx:21-34` (`getModalSemifinalists()`). Either inline the same logic in the home page or extract it into `website/src/lib/sim/modalBracket.ts` (which already exists and exports `deriveModalBracket` plus `topKCodes`-style helpers).

If you extract, update the dedicated page to use the shared helper too. If you inline, duplicate the same dozen lines. Either is fine; prefer extraction since this is the second consumer.

Pass the derived `TeamCode[]` (length 4 or empty) as a prop to the inline `<ModeFinalFour ... modalSemifinalists={...} />`. The component already handles `modalSemifinalists.length !== 4` gracefully (button does not render).

### Analytics

The existing `simulator_opened` event fires on each mode page mount. If the home page also mounts `ModeFinalFour`, the event will fire on every home-page visit, which conflates passive page-view traffic with active simulator engagement.

You need to make a decision here; document it in the report. Three options:

1. **Suppress `simulator_opened` in inline mode.** Pass a `suppressOpenedEvent?: boolean` prop or check the `variant` prop. The Plausible page-view event already tracks home-page traffic. Engagement is then measured by `first_pick`. Cleanest, no schema change.

2. **Extend the event to carry surface.** Change `EventMap.simulator_opened` to `{ mode: SimulatorMode; surface: "page" | "inline" }`. Existing call sites become `{ mode, surface: "page" }`; the new inline call site uses `{ mode, surface: "inline" }`. Cleaner analytics, requires a `track.ts` change.

3. **Add a new event.** `inline_simulator_mounted` with no props. Adds an event but keeps existing events stable.

Option 1 is the lightest touch. Option 2 is the most analytically useful. Pick whichever you can justify; do not skip the decision.

Whatever you pick, ensure `first_pick` still fires correctly on the first manual or drag-drop slot fill from the home page (the existing `claimFirstPick("final_four")` dedup is per-session, so a user who picks inline then navigates to `/scenario/final-four` will not double-fire). Verify this works.

### Above-the-fold consideration

On a typical 1366x768 laptop viewport, the header block alone is roughly 400 to 500px. Add the SectionHead and the simulator slot row plus ghost-fill button: roughly another 250 to 350px before the team picker. So on a typical laptop, the slot row and ghost-fill button should be visible above the fold; the team picker and submit button live just below the fold.

On mobile (375px wide, viewport heights vary), the header stacks vertically and the simulator section should fall naturally beneath it. The slot row at `grid-cols-2` mobile breakpoint and the team picker at its existing responsive layout should remain usable. Do not introduce a "browse all 48 teams" disclosure or any mobile-only collapse; the dedicated page does not have one and the inline version should not either.

### Visual consistency

The inline simulator section should read like one of the home-page sections, not like an embedded ad. Constraints:

- Same outer width as the surrounding sections (the home page's `mx-auto` wrapper handles this).
- Same vertical rhythm (`marginBottom: 56` to match the other sections).
- No new background colour. The simulator inherits the home page's `--bg-root` like every other section does.
- No call-to-action banner, no "Try it now!", no badge, no border highlight to call attention to it. The mere presence of the four empty slots is the call.
- Above the section, the `§ 1 · Championship pricing` section starts. The transition should feel like one section ends and the next begins; do not add a divider rule.

## Acceptance criteria

- A new section renders on the home page between the existing header block and the `§ 1 · Championship pricing` section.
- The section mounts `ModeFinalFour` with `variant="inline"` and `modalSemifinalists` derived server-side from the current snapshot.
- Submitting from the inline simulator routes to `/scenario/p/[id]` and the reveal page renders correctly.
- The header CTA row replaces `Watch the trailer` with `[ Skip to all three modes ]` linking to `/scenario`. The receive-the-daily-brief link remains unchanged.
- The trailer section lower on the home page (around line 181) remains in place; only the above-fold CTA changes.
- `ModeFinalFour` accepts a `variant` prop. When `variant="inline"`, the page-level `<h1>` and the top-right `[ Reset ]` button are suppressed (or relocated). When `variant="page"` (default), the dedicated /scenario/final-four page renders identically to today.
- Analytics: the decision you made (option 1, 2, or 3 above) is implemented, documented, and verified in DevTools.
- `first_pick` still fires correctly on the first slot fill from the home page.
- The home page renders correctly at 375px (mobile), 768px (tablet), and 1280px+ (desktop) viewports. Smoke check each; no horizontal scrollbar, no layout shift.
- TypeScript build clean.
- Existing tests pass.
- No SSR or hydration warnings.
- The dedicated `/scenario/final-four` page still renders exactly as before this change (no visual regression on the standalone surface).

## Brand-discipline guardrails (non-negotiable)

- No em-dashes or en-dashes in any new or modified file, including code comments. Use periods, semicolons, colons, parentheses.
- No betting language in any new copy.
- No marketing copy on the home page section. The eyebrow, title, and subhead are descriptive of the interaction, not sales pitches. Do not write "Try our simulator!", "Discover how rare your call is", "Play now", or any imperative-with-exclamation phrasing.
- The `[ Skip to all three modes ]` link label is exact. Do not rephrase to "See all modes", "More modes", "Other simulators", etc.
- No new colour tokens. The inline simulator uses the exact same palette as the dedicated page.
- The trailer section remains accessible. Do not delete `TrailerSection` or the trailer mp4 asset.

## Workflow conventions (from CLAUDE.md)

- Work on a feature branch named `ux/checkpoint-06-home-page-final-four`.
- Open a pull request when complete. Do not push directly to main.
- Run `scripts/install-hooks.sh` once if you have not already; the pre-push hook blocks conflict markers.
- If a merge conflict appears during rebase, use `git fetch origin && git reset --hard origin/main` then re-apply your work; do not use `git stash pop`.
- This is a higher-stakes change than the previous five. Verify in the dev server preview before committing. Capture a screenshot of the home page at desktop and mobile widths.

## End-of-task report

When the work is complete, produce a report in exactly this format:

```
## Checkpoint 6 Report: Home page Final Four

### Branch
ux/checkpoint-06-home-page-final-four

### Files changed
- path/to/file (added | modified): one-line summary
- ...

### Diff size
Lines added: N
Lines removed: M
Files touched: K

### What landed
- Where the inline section is positioned and how it integrates with the home page sections
- Eyebrow and title choice (e.g., "INTERACTIVE / Who makes the final four?" vs "§ 0 · Scenario / Who makes the final four?") and why
- The variant prop pattern on ModeFinalFour (what is suppressed in inline mode)
- Whether you extracted getModalSemifinalists into modalBracket.ts or duplicated the logic
- Analytics decision (option 1, 2, or 3) and rationale
- Where Reset ended up in the inline variant (removed, relocated to a footer link, etc.)

### Visual verification
- Desktop screenshot at 1280px viewport showing the simulator above the fold
- Mobile screenshot at 375px viewport showing the simulator below the header
- Confirm the leaderboard remains visible just below the simulator on scroll-down

### Manual verification
- [ ] Home page renders the inline simulator above the leaderboard
- [ ] Filling slots manually or via ghost-fill routes to /scenario/p/[id] on submit
- [ ] The reveal page renders correctly from a home-page submission
- [ ] [ Skip to all three modes ] CTA links to /scenario in the header row
- [ ] Receive the daily brief CTA still works
- [ ] The dedicated /scenario/final-four page is visually unchanged
- [ ] simulator_opened decision implemented and verified in DevTools Network tab
- [ ] first_pick fires on first home-page slot fill
- [ ] No horizontal scrollbar at 375px viewport
- [ ] No layout shift on initial load
- [ ] No SSR or hydration warnings
- [ ] TypeScript build clean
- [ ] Existing tests pass

### Follow-ups / open questions
- Anything you flagged but did not implement, with one-line rationale.

### Ready for review
Y / N. If N, state what is blocking.
```

Do not push to main. Wait for the user to review the report and approve.
