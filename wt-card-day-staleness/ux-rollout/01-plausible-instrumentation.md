# Checkpoint 1: Plausible Event Instrumentation

## Context

You are working on the 45 Analytics codebase (`the-45-percent-problem` repo). The attached file `APP_UX_EVALUATION_2026-05-13.md` is the evaluation that motivates this work. This task implements recommendation **P0.6 (Plausible event instrumentation)** from that evaluation.

This is the first of 14 sequenced checkpoints in the UX rollout. It must land before the others so we can measure the impact of each subsequent change. No user-visible UI changes in this checkpoint; this is pure instrumentation.

## Why this matters

The strategic shift toward social-media-driven traffic depends on knowing which posts, channels, and product changes actually convert. The product currently loads Plausible (`website/src/app/layout.tsx`, around line 63) but instruments zero custom events. We cannot measure the funnel without this checkpoint.

## What to do

Add five custom events.

### Events to emit

| Event name | Where it fires | Props |
|---|---|---|
| `simulator_opened` | Each mode page on mount | `mode: "final_four" \| "champions_path" \| "full_bracket"` |
| `first_pick` | First slot fill per session per mode | `mode: "..."`; deduped per-session via `sessionStorage` |
| `submit_success` | Successful prediction submission | `mode: "..."`, `rarity_band: "Common" \| "Plausible" \| "Uncommon" \| "Rare" \| "Vanishingly rare"` |
| `share_action` | Share button interaction success | `type: "copy" \| "png" \| "native"` |
| `alert_armed` | Alert email verified on /verify | (no props) |

### Implementation notes

1. **Shared helper**. Create `website/src/lib/analytics/track.ts` exporting a typed `track(eventName, props?)` function. Guard against SSR (`typeof window === "undefined"`) and against Plausible not being loaded yet (`typeof window.plausible !== "function"`, silent no-op). Use a discriminated union or string-literal union so callers cannot emit free-form event names.

2. **Custom-events script**. The default Plausible `script.js` does not support `window.plausible(...)` calls. Update the script src in `website/src/app/layout.tsx` to a variant that does (e.g. `https://plausible.io/js/script.tagged-events.js`). Confirm that page-view tracking still works after the swap.

3. **`simulator_opened`**. Fire in each mode's client component on mount via `useEffect(() => track("simulator_opened", { mode }), [])`. Files:
   - `website/src/components/simulator/modes/ModeFinalFour.tsx`
   - `website/src/components/simulator/modes/ModeChampionsPath.tsx`
   - `website/src/components/simulator/modes/ModeFullBracket.tsx`

4. **`first_pick`**. Fire on the first slot fill per session per mode. Dedupe via `sessionStorage` with keys like `45a:track:first_pick:final_four`. Fire from the same mode components, inside the existing pick / drop handlers.

5. **`submit_success`**. Fire in each mode's submit handler on the `result.kind === "ok"` branch (e.g. `ModeFinalFour.tsx:317-320`). The server response carries `countCurrent` and `total`; derive `rarity_band` from `getRarityBand(count, total).band` at `website/src/lib/sim/getRarityBand.ts:25-39`.

6. **`share_action`**. Wire in `website/src/components/simulator/TicketShareButton.tsx:86+`. Three call sites:
   - PNG download succeeds: `track("share_action", { type: "png" })`
   - Web Share API path succeeds: `track("share_action", { type: "native" })`
   - Clipboard fallback succeeds: `track("share_action", { type: "copy" })`
   
   Fire on success, not on click attempt.

7. **`alert_armed`**. The user reaches the `verification_sent` state in `PredictionAlertConfigurator.tsx:215-219` when the email has been *sent*, not confirmed. The actual arming happens when the user clicks the link and lands on `/verify`. Fire `alert_armed` on the `/verify` success path. Locate the success branch in `website/src/app/verify/page.tsx`.

## Acceptance criteria

- New module at `website/src/lib/analytics/track.ts`.
- Plausible script source updated to a variant supporting custom events.
- All five events firing in the right places.
- No SSR or hydration errors when running the dev server.
- TypeScript build clean.
- Existing tests pass.
- No new tests required for this checkpoint; verification is functional.
- Manual verification: open each mode page, fill a slot, submit, share, arm an alert; confirm in browser DevTools Network tab that the Plausible event POSTs hit `plausible.io/api/event` with the right names and props.

## Brand-discipline guardrails (non-negotiable)

- No em-dashes or en-dashes anywhere, including code comments. Use periods, semicolons, colons, parentheses.
- No betting language in any new string ("edge", "lock", "pick", "play", "value", "parlay", "tip", etc.).
- No new user-visible UI in this checkpoint. If you find yourself adding a UI element, stop and ask the user first.

## Workflow conventions (from CLAUDE.md)

- Work on a feature branch named `ux/checkpoint-01-plausible-instrumentation`.
- Open a pull request when complete. Do not push directly to main.
- Run `scripts/install-hooks.sh` once if you have not already; the pre-push hook blocks conflict markers.
- If a merge conflict appears during rebase, use `git fetch origin && git reset --hard origin/main` then re-apply your work; do not use `git stash pop` (see CLAUDE.md Git hygiene).

## End-of-task report

When the work is complete, produce a report in exactly this format:

```
## Checkpoint 1 Report: Plausible Event Instrumentation

### Branch
ux/checkpoint-01-plausible-instrumentation

### Files changed
- path/to/file (added | modified): one-line summary
- ...

### Diff size
Lines added: N
Lines removed: M
Files touched: K

### What landed
- One-line summary per event, naming the file and trigger site.

### Manual verification
- [ ] simulator_opened fires on each mode page
- [ ] first_pick fires once per session per mode
- [ ] submit_success fires with correct rarity_band
- [ ] share_action fires with type=copy | png | native
- [ ] alert_armed fires on /verify success
- [ ] No SSR or hydration warnings in dev server console
- [ ] TypeScript build clean
- [ ] Existing tests pass

### Follow-ups / open questions
- Anything you flagged but did not implement, with one-line rationale.

### Ready for review
Y / N. If N, state what is blocking.
```

Do not push to main. Wait for the user to review the report and approve.
