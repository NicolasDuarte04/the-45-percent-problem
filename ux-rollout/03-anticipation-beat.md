# Checkpoint 3: Anticipation beat before the Reality Score lands

## Context

You are working on the 45 Analytics codebase (`the-45-percent-problem` repo). The attached file `APP_UX_EVALUATION_2026-05-13.md` is the evaluation that motivates this work. This task implements recommendation **P0.4 (Anticipation beat before the Reality Score reveal)** from that evaluation.

Checkpoints 1 and 2 have already landed on main:
- Plausible custom events are wired (`website/src/lib/analytics/track.ts`)
- Final Four mode has a `[ Start from the model's call ]` ghost-fill button

This task adds the multi-stage reveal anticipation. No new tracking events, no new pages.

## Why this matters

Behavioural pattern: multi-stage reveal (Pattern 4 in the evaluation, Gameblazers three-stage anatomy: anticipation, reveal, celebration). The current Reality Score reveal at `/scenario/p/[id]` has reveal and a quiet count-up, but lacks anticipation. The hero number decrypts within ~400ms of page load, which compresses the emotional payoff into a single beat.

The brand-safe form of anticipation is descriptive prose, not theatre. We render a quiet "Counting matches across 10,000 simulated tournaments..." line, typewritten in a quiet mono italic, for roughly 800 to 1100ms before the existing reveal sequence begins. The line then fades and the existing entry transition runs unchanged.

This is a substitution, not an addition: the existing reveal still happens; it is now preceded by ~900ms of typed prose.

## What to do

Add an anticipation phase to `RealityScoreReveal` (`website/src/components/simulator/reality/RealityScoreReveal.tsx`).

### Phase model

Introduce a local `phase` state:

- `"anticipating"`: render only the anticipation line (typewriter, quiet style). No hero, no bar, no count-up.
- `"revealing"`: render the existing reveal contents exactly as today. The entry transition fires when this phase mounts, so the hero fades in and decrypts as before.

Transition timing:

- On mount, `phase = "anticipating"`.
- After roughly 900ms (a value inside the 600 to 1200ms window from the evaluation), transition to `phase = "revealing"`.
- Under `prefers-reduced-motion: reduce`, skip anticipation entirely. Initial state should be `"revealing"` for reduced-motion users; no setTimeout, no typewriter.

### Anticipation line

- **Copy**: `Counting matches across 10,000 simulated tournaments...` (universal across all three modes for this checkpoint; mode-specific copy is a possible later refinement, out of scope here).
- **Style**: mono, italic, `--text-tertiary`, ~12px font size to match the resolution-floor caveat at `RealityScorePanel.tsx:148-152`. Same line height as that caveat.
- **Position**: in the slot that the existing reveal occupies; the parent `StaggeredRevealItem` continues to govern the wrapper-level fade. The anticipation line should not push the layout (i.e. it should reserve roughly the same vertical space the eventual reveal will occupy, or sit in a min-height container, so the page does not jump on phase transition).
- **Typewriter**: use the existing `useTypewriter` hook at `website/src/lib/motion/useTypewriter.ts` (already used in `PredictionAlertConfigurator.tsx:155-156` for the WATCH row). Tune the activation gate so typing begins immediately on mount, not after a delay.
- **Fadeout**: as the phase transitions to `"revealing"`, the anticipation line fades out (a brief 150 to 200ms opacity transition). Crossfade with the reveal entry is fine; sequential is fine; whichever lands cleaner.

### Reveal phase

The existing `motion.div` with `initial={{ opacity: 0, y: 24 }}` and the entry transition (`RealityScoreReveal.tsx:76-80`) runs unchanged when phase flips to `"revealing"`. The rarity bar fill, the `OneInNCountUp`, and the `useDecryptValue` hero all fire as before.

### SSR safety

The permalink page is server-rendered (`scenario/p/[id]/page.tsx` is `force-dynamic`). To avoid a hydration mismatch:

- Initial server render and initial client render should produce the same DOM. The simplest choice: server renders the anticipation phase shell (the typewriter wrapper with empty typed text), and the client takes over to start the typewriter via useEffect.
- Reduced-motion users: their initial server render also shows anticipation, but on mount the client detects reduced motion and immediately transitions to revealing. A brief flicker of the anticipation line is acceptable for reduced-motion users since the reduced-motion bypass should be instant anyway.

If a cleaner hydration pattern is available (e.g. defer the whole reveal subtree to a client-only mount), feel free to use it; just avoid hydration warnings.

## Acceptance criteria

- On a fresh `/scenario/p/[id]` load, the user sees the typed anticipation line for roughly 600 to 1200ms before the hero number appears.
- The anticipation line uses the existing `useTypewriter` hook.
- The line fades out (or crossfades with the reveal entry) so the layout does not jump.
- The existing reveal animations (entry fade, rarity bar fill, count-up, decrypt) fire correctly after the anticipation phase.
- `prefers-reduced-motion: reduce` skips anticipation entirely: the reveal renders immediately, no typewriter.
- No SSR hydration warnings in the dev server console for this surface.
- TypeScript build clean.
- Existing tests pass.
- Keyboard and screen-reader users: the anticipation line has an `aria-live` annotation only if it adds value (a polite live region is probably right since the content is informational, but verify it does not cause double-announcement of the typed text). If unsure, omit the live region; the reveal panel already has its own `aria-labelledby`.

## Brand-discipline guardrails (non-negotiable)

- No em-dashes or en-dashes in any new or modified file, including code comments. Use periods, semicolons, colons, parentheses.
- No betting language in any new copy.
- Anticipation copy is `Counting matches across 10,000 simulated tournaments...` exactly. Do not rephrase to "Running the math", "Crunching numbers", "Drumroll", or anything theatrical. The line is descriptive of an actual computation, not a marketing flourish.
- No celebratory framing, no exclamation marks, no emoji, no progress bar, no spinner. The typewriter itself is the only motion in the anticipation phase.
- Do not add any sound. There is no audio anywhere on the site.

## Workflow conventions (from CLAUDE.md)

- Work on a feature branch named `ux/checkpoint-03-anticipation-beat`.
- Open a pull request when complete. Do not push directly to main.
- Run `scripts/install-hooks.sh` once if you have not already; the pre-push hook blocks conflict markers.
- If a merge conflict appears during rebase, use `git fetch origin && git reset --hard origin/main` then re-apply your work; do not use `git stash pop`.

## End-of-task report

When the work is complete, produce a report in exactly this format:

```
## Checkpoint 3 Report: Anticipation Beat

### Branch
ux/checkpoint-03-anticipation-beat

### Files changed
- path/to/file (added | modified): one-line summary
- ...

### Diff size
Lines added: N
Lines removed: M
Files touched: K

### What landed
- The anticipation duration you chose (e.g., 900ms) and why
- How the typewriter is wired (which hook, activation gate)
- How layout-jump is prevented (min-height, reserved space, etc.)
- How reduced-motion is handled
- SSR / hydration approach

### Manual verification
- [ ] Anticipation line types out on fresh permalink load
- [ ] Hero number, rarity bar, 1-in-N all fire correctly after anticipation
- [ ] Layout does not jump when phase transitions
- [ ] prefers-reduced-motion: reduce bypasses the anticipation entirely
- [ ] No SSR or hydration warnings
- [ ] TypeScript build clean
- [ ] Existing tests pass
- [ ] Keyboard navigation unchanged
- [ ] Screen reader does not double-announce the typed line

### Follow-ups / open questions
- Anything you flagged but did not implement, with one-line rationale.

### Ready for review
Y / N. If N, state what is blocking.
```

Do not push to main. Wait for the user to review the report and approve.
