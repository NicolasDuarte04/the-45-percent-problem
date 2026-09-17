# V2 Checkpoint 5: Bracket color ramp (reuse the goal matrix ramp)

## Context

V2 Checkpoints 1 through 4 shipped. The simulator UX is in its strongest state. User testing surfaced one more visual concern: the bracket page heat map ramp is visually noisy. The goal matrix heat map ramp (on `/match/[id]`) is clearly better and the operator wants the bracket to match it.

Read this brief in full plus the bracket and goal matrix sections of `APP_UX_EVALUATION_V2_2026-05-17.md` before implementing.

## Why this matters

The current bracket ramp spans three hues: deep purple at high probability, warm coral at mid range, cool teal at low probability. The eye reads it as three competing color zones rather than one continuous gradient. The coral mid-range clashes against both ends. The 30% peach cells look muddy because they fight the cool palette around them.

The goal matrix ramp is a **sequential ramp**: a single continuous axis from dark-cool to light-warm. Dark teal (background-adjacent) at low values, through cyan, into muted coral, ending at soft pink/lavender at high values. The eye reads it as one gradient. The peach cells don't clash because the ramp arrives there continuously, not abruptly.

Replacing the bracket ramp with the goal matrix ramp:
1. Provides visual consistency across the two heat map surfaces on the site.
2. Makes high-probability cells pop (light/bright) rather than recede (currently dark purple).
3. Eliminates the mid-range muddy coral by passing through coral as a continuous gradient point rather than a discrete hue jump.
4. Aligns with the brand's quant-terminal aesthetic better (sequential ramps are the gold standard for data viz).

## What to build

Three pieces, in dependency order.

### 1. Extract a shared probability ramp module

The goal matrix ramp lives in `website/src/components/compositions/GoalMatrixHeatmap.tsx`. Find the function or constant that maps a probability (0 to 1) to an `rgb()` or hex color, plus the text-color decision logic (light vs dark text per band, from V2-04).

Extract into a new shared module at `website/src/lib/viz/probabilityRamp.ts`. Export:

```ts
/**
 * Sequential probability ramp used across heat map surfaces.
 * Dark teal at low probabilities (recedes into bg), through cyan
 * and coral, to soft pink/lavender at high probabilities (pops).
 *
 * Used by:
 *   - GoalMatrixHeatmap (match detail correct-score matrix)
 *   - BracketBoard (per-round marginal probabilities matrix)
 */
export function probabilityToColor(p: number): string;

/**
 * Returns "light" or "dark" for the text color that should overlay
 * a cell of probability p. Uses the same band lookup as V2-04's
 * BracketBoard contrast fix.
 */
export function probabilityTextColor(p: number): "light" | "dark";
```

The actual color stops should mirror the goal matrix ramp exactly. Do not invent new colors. Sample the existing goal matrix output if needed (the legend at the top of `/match/[id]` shows the discrete stops at 0.00, 0.02, 0.04, 0.06, 0.08; map those to the 0 to 1 probability scale).

Add a brief unit test in `website/tests/unit/probabilityRamp.test.ts` covering:
- Boundary values (p = 0, p = 0.5, p = 1) return defined colors
- Monotonic property: probabilityToColor is monotonic in luminance (each higher p has higher or equal luminance)
- Text color matches the V2-04 per-band lookup for sample cells (Spain 78.1%, Spain 18.2%, Ghana 4.9%)

### 2. Refactor BracketBoard to use the shared ramp

Open `website/src/components/compositions/BracketBoard.tsx`. Currently the ramp is defined inline (probably as `cellColor` and `cellTextColor` functions). Replace with imports from the new shared module:

```ts
import { probabilityToColor, probabilityTextColor } from "@/lib/viz/probabilityRamp";
```

Use them in place of the current ramp logic. Delete the now-unused inline ramp definitions.

Verification: cells in the bracket should now look visually consistent with the goal matrix cells. Spain's high-probability cells (78.1% R16, 58.8% QF) should be light/pop. Ghana's low-probability cells (4.9% group qualification and below) should be dark/recede.

### 3. Refactor GoalMatrixHeatmap to use the shared ramp

Open `website/src/components/compositions/GoalMatrixHeatmap.tsx`. The ramp logic currently lives here. Replace the inline definitions with imports from the new shared module. The visible output should be identical to today (since the shared ramp is sourced from this file's existing ramp).

Goal of this refactor: single source of truth for the ramp. Future heat map surfaces (Phase D dashboard charts, evaluation reports, etc.) import from the same module.

## Specific design decisions to confirm with the operator

The agent should NOT just implement blindly. Surface these three in the planning phase before any code:

1. **Direction of the ramp**: high probability = light/pop (proposed) or high probability = dark/intense (current bracket behavior)? The goal matrix uses light/pop. Recommended: switch bracket to light/pop for consistency.

2. **Ramp stops**: how many discrete stops? The goal matrix legend shows 5 (0.00, 0.02, 0.04, 0.06, 0.08). For the bracket (0% to 100% range), we need more stops to give visual differentiation across the wider range. Suggested 8-10 stops mapped non-linearly (more stops in the 0-30% range where most teams live, fewer above 50%).

3. **Background-adjacent low-end color**: the goal matrix's darkest color is approximately the same as the brand `--bg-root`. The bracket's lowest-probability cells (Ghana 4.9%, Iraq 12.4%, etc.) should similarly recede. Confirm the low-end color before committing.

## Acceptance criteria

- New shared module at `website/src/lib/viz/probabilityRamp.ts` with `probabilityToColor` and `probabilityTextColor` exports.
- Unit tests in `website/tests/unit/probabilityRamp.test.ts` covering boundaries, monotonicity, and per-band text-color decisions.
- `BracketBoard` imports from the shared module; no inline ramp definitions remain in this file.
- `GoalMatrixHeatmap` imports from the shared module; no inline ramp definitions remain in this file.
- Visible output of the goal matrix is unchanged (within rounding tolerance for any hex/rgb conversion).
- Visible output of the bracket is visually consistent with the goal matrix: same color language, same direction (light = high probability).
- TypeScript build clean.
- All 285 existing tests pass plus the new probabilityRamp tests.
- No em-dashes or en-dashes in any new or modified file.
- `node scripts/check-forbidden-words.mjs` passes.

## Brand-discipline guardrails (non-negotiable)

- Brutalist quant aesthetic preserved. No new color tokens added to the global stylesheet (the ramp lives in the shared TS module, not CSS variables).
- The ramp is sequential (monotonic in luminance). No multi-hue clashing. No celebratory or emotional color choices.
- No new third-party dependencies.

## Workflow

- Plan first. Same pattern as V2-01 through V2-04. Locate the existing ramp in GoalMatrixHeatmap, sample the actual colors, draft the shared module's API, surface the three design decisions above, wait for operator confirmation.
- Branch: `ux/v2-05-bracket-color-ramp`.
- Open a PR against main. Do not push directly.
- Verify end-to-end on the dev server:
  - `/bracket`: confirm the entire 48 by 6 matrix uses the new ramp. Spain's high-probability cells should be light/pop. Low-probability cells (Ghana, Iraq, etc.) should be dark/recede.
  - `/match/M15` (or any match detail page with a goal matrix): confirm the goal matrix output is visually identical to before (since the shared ramp was sourced from this surface).
  - Hover and pinned interactions on both surfaces work as before.

## End-of-task report

```
## V2 Checkpoint 5 Report: Bracket color ramp

### Branch
ux/v2-05-bracket-color-ramp

### Files changed
- path/to/file (added | modified): one-line summary

### Diff size
Lines added: N
Lines removed: M
Files touched: K

### Design decisions (confirmed with operator)
- Ramp direction: light = high probability (or: dark = high probability)
- Number of ramp stops: N
- Low-end color: <hex value>

### Shared module API
- Function signatures, brief implementation notes

### Refactor impact
- Inline ramp lines removed from BracketBoard: N
- Inline ramp lines removed from GoalMatrixHeatmap: N
- New shared module size: N lines

### Visual diff
- /bracket before/after
- /match/[id] before/after (should be visually identical)

### Manual verification
- [ ] Bracket uses new ramp; high probability cells light/pop
- [ ] Low probability cells (Ghana, Iraq) recede into bg
- [ ] Goal matrix visually unchanged
- [ ] Hover and pinned interactions work on both surfaces
- [ ] TypeScript clean
- [ ] All existing tests pass
- [ ] New probabilityRamp tests pass
- [ ] em-dash grep zero
- [ ] check-forbidden-words pass

### Ready for review
Y / N
```

Do not push to main. Wait for review.

## What this delivers and how to test it

### What changes for the user

The bracket page heat map now reads as one continuous gradient instead of three competing color zones. Spain's high-probability cells (78.1% R16, 58.8% QF, 42.4% SF) are light and pop visually; the user can immediately see "Spain is the favorite at each stage." Low-probability cells (Ghana 4.9%, Iraq 12.4%) are dark and recede; the user can immediately see "these teams have a low chance to advance." Mid-range cells transition smoothly through coral without jumping hues. The whole matrix feels coherent.

The goal matrix heat map on match detail pages looks identical to today; only the underlying ramp definition was moved to a shared module.

### How to test it as the operator

Pre-merge on the Vercel preview deploy:

1. Open `/bracket`. The matrix should look visually cleaner. Sample three cells:
   - Spain R16 (78.1%): should be light pink / lavender (high-end of the ramp). The number should be readable in dark text.
   - Spain SF (42.4%): should be muted coral. Readable.
   - Ghana group (4.9%): should be very dark teal, nearly background. Number readable in light text.
2. Compare side-by-side to `/match/M15` (or any match detail). The color language should match: same dark-teal-to-light-pink ramp, same "low values recede, high values pop" direction.
3. Hover over bracket cells. Confirm hover behavior is unchanged.
4. Click a cell on the goal matrix (or trigger the pinned state). Confirm the pinned-cell highlight still works.

### How to test as a returning user

You should not notice the goal matrix changed. The bracket should feel substantially cleaner: less visually busy, easier to scan top-to-bottom.

### After this lands

V2 is genuinely complete. Five V2 checkpoints shipped. Every visible UX issue surfaced during testing is resolved. The simulator UX, the data viz surfaces, the email pipeline, the live ingestion, the performance optimization, the brand discipline: all in their strongest pre-launch state.

22 days to kickoff. Operational items (marketing execution, staging verification, Lighthouse audit) remain. The build is done.
