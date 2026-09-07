# CP-00 · Foundation. Prompt for Claude Code session

> Hand this entire file to a fresh Claude Code session as the user message. Attach `website/UI_IMPROVEMENT_ARCHITECTURE_V3.md` and `website/CLAUDE.md` to the session. Do not paraphrase or trim this prompt; the acceptance criteria below are exact.

---

## 1. Context

You are picking up a single sequenced checkpoint in the **Tournament Scenario Simulator** of the 45analytics website (the simulator is the "virality engine" sibling of an academic quant terminal). The full project is the FIFA World Cup 2026 probabilistic-pricing research programme described in `website/CLAUDE.md`; you should treat that file as the ground truth on coding conventions, motion rules, palette, voice, and forbidden vocabulary.

The simulator has three modes (Final Four, Champion's Path, Full Bracket) plus a post-submit permalink reveal page at `/scenario/p/[id]`. Prior visual / motion work shipped under `UX_POLISH_PLAN_SIMULATOR_PHASE_D.md`, `UX_POLISH_PLAN_PHASE_E_GAME_FEEL.md`, and `VIRAL_LOOP_PIVOT.md`. This checkpoint kicks off a new sequence (V3) defined in `website/UI_IMPROVEMENT_ARCHITECTURE_V3.md`. **Read that document end-to-end before writing any code.** Your CP scope is §4 / CP-00; the locked guardrails in §1 of that document override anything that contradicts them in this prompt.

Two cross-cutting rules to internalise before you start:

- **No em dashes anywhere.** Use period, semicolon, colon, or parentheses. This applies to code comments, copy, commit messages, and the report.
- **CP-00 ships no visible change to any existing user surface.** Foundation only. If you find yourself editing a component that any user route renders, you are out of scope. Stop and reread §4 / CP-00 of the architecture document.

## 2. Task

Implement **CP-00. Foundation. Tokens, motion presets, copy deck.** Verbatim from the architecture document, this means:

1. Extend `src/lib/motion/vocabulary.ts` with three new presets: `bandReveal`, `tickRoll`, `toastIn`.
2. Add five new design tokens to `src/app/globals.css` for the rarity-band fill spectrum: `--band-common`, `--band-plausible`, `--band-uncommon`, `--band-rare`, `--band-vanishing`. Define them in both the editorial (light) and quant (dark) variants in the same blocks where the existing palette is defined. Add a companion `--band-vanishing-glow` token for the post-submit border-glow treatment (CP-08 will consume it).
3. Create a new module `src/lib/sim/bandCopy.ts` exporting the canonical band labels and three string constants the downstream CPs will consume.
4. Create a new module `src/lib/ui/toast.ts` plus a `src/components/ui/Toast.tsx` mounting component. The toast is the inline status surface that CP-04, CP-07, CP-10, and CP-11 will dispatch into.
5. Create a hidden dev review page at `src/app/dev/tokens/page.tsx` that renders all five band tokens, the three new motion presets, and a live toast example so a reviewer can eyeball them on the dark canvas. Gate the page with a `process.env.NODE_ENV` check so production returns `notFound()`.
6. Add unit tests for the toast primitive under `tests/unit/ui-toast.test.tsx`.

No other file is in scope. Tagged `out-of-scope` below is the explicit do-not-touch list.

### 2.1. File-by-file guidance

**`src/lib/motion/vocabulary.ts`**. Extend the existing `motion` object; do not refactor it. The existing presets (`micro`, `drop`, `layout`, `entry`, `exit`, `gaugeFill`, `bracketDraw`) stay byte-for-byte unchanged. Append:

```ts
// Band reveal: the gauge fill on the permalink's first beat. One-shot
// per prediction view, gated by sessionStorage. Lands inside the
// 450ms gaugeFill envelope; named separately so CP-08 can stage it
// independently of the build-mode gauge.
bandReveal: {
  duration: 0.6,
  ease: [0.22, 1, 0.36, 1],
} satisfies Transition,

// Tick roll: the 1-in-N count-up on the permalink and any future
// tabular-nums roll surface. Short, decisive, ease-out.
tickRoll: {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1],
} satisfies Transition,

// Toast in: the inline status surface used by CP-04, CP-07, CP-10,
// CP-11. Slide-up + opacity, 240ms ease-out. Exit is symmetric via
// the `exit` preset already defined above.
toastIn: {
  duration: 0.24,
  ease: [0.22, 1, 0.36, 1],
} satisfies Transition,
```

The `Vanishingly rare` border-glow is intentionally *not* a single motion preset; the lifecycle is three phases (`fade-in` ≤ 600ms, static hold via a class, `fade-out` ≤ 600ms) so no single transition exceeds the locked motion bound. Implement the glow as a CSS-only treatment (no Framer preset) in CP-08; CP-00 only adds the colour token (next bullet).

**`src/app/globals.css`**. Add five band tokens plus the glow companion. The values below are *suggested starting points*; tune by eye against the dark canvas using the new `/dev/tokens` page before committing. Use `color-mix` so the tokens compose against the existing `--bg-panel-elev` surface where the gauge sits.

In the editorial (light, paper) block:

```css
/* Rarity band fills · CP-00 (V3). Used by the live gauge (build mode)
   and the post-submit reveal. Common / Plausible mute toward bone;
   Uncommon / Rare / Vanishing reach toward --accent-warm. */
--band-common:        color-mix(in srgb, var(--text-tertiary) 50%, transparent);
--band-plausible:     color-mix(in srgb, var(--text-primary) 60%, transparent);
--band-uncommon:      color-mix(in srgb, var(--accent-warm) 30%, var(--bg-panel-elev));
--band-rare:          color-mix(in srgb, var(--accent-warm) 60%, var(--bg-panel-elev));
--band-vanishing:     var(--accent-warm);
--band-vanishing-glow: color-mix(in srgb, var(--accent-warm) 70%, transparent);
```

In the quant (dark) block, repeat the same six lines. The tokens reference cascade-respecting variables (`--text-primary`, `--accent-warm`, `--bg-panel-elev`), so the same definitions resolve correctly to each surface's palette without further branching. Verify on the dev page that all five read as legible against the dark canvas; if `--band-common` or `--band-plausible` are unreadable on dark, adjust the percentages on the dark block (it is acceptable to diverge per-surface).

**`src/lib/sim/bandCopy.ts`** (new). Re-export the existing 5-band label set so downstream CPs reference a single string source. Also define three new strings the architecture document anchors:

```ts
/**
 * Canonical band labels and downstream-CP string constants.
 *
 * The 5-band rarity vocabulary itself was locked in Phase D and lives
 * in `getRarityBand.ts`; this file is a re-export plus three new
 * strings introduced in V3. Centralising them here lets CP-04, CP-06,
 * CP-08, and CP-10 reference one source instead of inlining.
 */
import { BAND_LABELS as RARITY_BAND_LABELS } from "@/lib/sim/getRarityBand";

export const BAND_LABELS = RARITY_BAND_LABELS;

/** Row label inserted above WATCH in PredictionAlertConfigurator (CP-10). */
export const RARITY_ROW_LABEL = "RARITY";

/** Toast string fired by the [ Reset ] button in all three modes (CP-04). */
export const RESET_TOAST_MESSAGE = "Cleared.";
export const RESET_TOAST_ACTION_LABEL = "Undo";

/** Inline copy shown inside a Champion's Path stage card after an L (CP-06). */
export const DEAD_PATH_LINE = "Path ends here.";
```

If `BAND_LABELS` is not yet exported from `getRarityBand.ts`, export it from there (this counts as an unavoidable re-export, not a structural change). Confirm the existing label strings before re-exporting; they must match `Common` / `Plausible` / `Uncommon` / `Rare` / `Vanishingly rare` exactly.

**`src/lib/ui/toast.ts`** + **`src/components/ui/Toast.tsx`** (new). API:

```ts
// src/lib/ui/toast.ts
export interface ToastAction {
  label: string;        // shown inside [ brackets ] by the renderer
  onClick: () => void;
}

export interface ToastMessage {
  id: string;
  message: string;
  action?: ToastAction;
  durationMs?: number;  // default 6000
}

export function dispatchToast(message: string, options?: {
  action?: ToastAction;
  durationMs?: number;
}): void;
```

Behaviour:

- **Single-toast queue.** A new dispatch replaces the current toast immediately (no stacking). The previous toast's `onClick` is discarded silently.
- **Duration.** Default 6000ms. Auto-dismisses via fade-out using the existing `exit` motion preset. While the toast is visible, hovering pauses the dismiss timer; leaving resumes it. Coarse-pointer devices skip the hover-pause.
- **Action.** When provided, renders to the right of the message as `[ {label} ]` in mono uppercase. Tapping fires `onClick` and dismisses immediately.
- **Position.** Bottom-centre on viewports above sm; bottom-full-width on narrower. 16px from the viewport edge. Above the footer, below any sticky bottom UI.
- **Reduced motion.** No slide. Instant in / out. The hover-pause still applies (it is logic, not motion).
- **Implementation.** Use Framer Motion's `AnimatePresence` with `mode="wait"` for the swap. The dispatcher is a plain pub-sub: a module-level array of subscribers and a `dispatch` function that fans out. No React context needed; the `ToastHost` component subscribes on mount.

Mount the `ToastHost` once at the *root* layout (`src/app/layout.tsx`), placed after the main outlet so its fixed positioning composes with the existing chrome. Do not mount it inside `SimulatorChrome`; the toast is generic infrastructure, not simulator-specific.

**`src/app/dev/tokens/page.tsx`** (new). A single server component that renders:

1. A header strip mirroring `SimulatorChrome`'s eyebrow style: `45ANALYTICS / DEV / TOKENS · CP-00`.
2. A swatch grid with the five band tokens (`--band-common` through `--band-vanishing`) on the dark canvas. Label each swatch with its token name in mono.
3. A second swatch row showing `--band-vanishing-glow` over the `--bg-panel-elev` surface so the eventual CP-08 border treatment can be eyeballed.
4. A motion-preset row with three small client-component playgrounds: a button that triggers `bandReveal` on a placeholder rectangle, a button that triggers `tickRoll` on a `0 → 1247` counter, and a button that triggers a toast dispatch (this exercises `toastIn` end-to-end).
5. The three copy-deck strings printed verbatim.

Gate the page:

```ts
import { notFound } from "next/navigation";
export default function DevTokensPage() {
  if (process.env.NODE_ENV === "production") notFound();
  // ... rest
}
```

**`tests/unit/ui-toast.test.tsx`** (new). Use Vitest + React Testing Library. Minimum coverage:

- `dispatchToast` shows the message.
- A second `dispatchToast` replaces the first; the first's `onClick` is *not* called.
- The toast auto-dismisses after `durationMs`.
- Clicking the action runs `onClick` and dismisses immediately.
- Reduced-motion (`matchMedia` mocked to `prefers-reduced-motion: reduce`) skips transitions but still respects the dismiss timer.

### 2.2. Out-of-scope (hard guardrails)

Do NOT, under any circumstances:

- Modify any file under `src/components/simulator/**` except via the toast mount in `src/app/layout.tsx` (and that mount is just `<ToastHost />`, no logic).
- Modify any file under `src/components/compositions/**`, `src/components/layout/**`, `src/components/primitives/**`.
- Add a new dependency. Framer Motion, Tailwind, React Testing Library, Vitest, and Next.js are already installed; this CP uses only those.
- Change `getRarityBand.ts` beyond *adding* an export for `BAND_LABELS` if it does not already exist. Do not touch its rarity-band threshold logic.
- Touch any file under `src/lib/sim/` other than the new `bandCopy.ts`.
- Touch any file under `src/app/api/**`, `src/lib/db/**`, `src/lib/email/**`, `drizzle/**`, or `scripts/**`.
- Run `pnpm db:*` for any reason. CP-00 does not touch the database.
- Use the `--no-verify` flag on git. The pre-push hook is mandatory.
- Use em dashes anywhere (code, comments, copy, commit messages, PR description, report).
- Add any text that would be flagged by `scripts/check-forbidden-words.mjs` (already runs in `prebuild`).

If you find yourself wanting to edit a file outside this scope to "make CP-00 work," stop. The CP scope is correct; the workaround is wrong. Note the friction in the report's "Open questions" section and proceed without the cross-scope edit.

## 3. Pre-merge checkpoints

These are the gates you must pass before claiming CP-00 complete. Each item is a literal command or check; do not paraphrase.

**Branch and hygiene**

- [ ] Branch named `cp-00-foundation` off `main`.
- [ ] `scripts/install-hooks.sh` has been run once locally (verify the pre-push hook symlink exists at `.git/hooks/pre-push`).
- [ ] No conflict markers anywhere (`grep -rn "<<<<<<<\|=======\|>>>>>>>" src` returns nothing).
- [ ] No em dashes in any added file (`grep -rn "—\|–" src/lib/ui src/lib/sim/bandCopy.ts src/components/ui src/app/dev` returns nothing).

**Tooling**

- [ ] `pnpm install` (no new deps expected; verify the lockfile diff is empty).
- [ ] `pnpm tsc --noEmit` passes with zero errors.
- [ ] `pnpm lint` passes with zero new warnings on the files added or modified in this CP.
- [ ] `pnpm test` passes; `tests/unit/ui-toast.test.tsx` is included in the run.
- [ ] `pnpm build` succeeds; the `prebuild` forbidden-words check passes.

**Scope verification**

- [ ] `git diff --stat main..` lists *only* the files named in §2 (plus `src/app/layout.tsx` for the `<ToastHost />` mount, plus possibly `src/lib/sim/getRarityBand.ts` if `BAND_LABELS` had to be exported).
- [ ] `grep -rn "band-common\|band-plausible\|band-uncommon\|band-rare\|band-vanishing" src` returns matches *only* in `globals.css` and `src/app/dev/tokens/page.tsx`. (No existing component consumes the tokens yet; that is the CP-00 contract.)
- [ ] `grep -rn "bandReveal\|tickRoll\|toastIn" src` returns matches *only* in `src/lib/motion/vocabulary.ts`, the dev tokens page, and the toast component / hook.
- [ ] `grep -rn "dispatchToast" src` returns matches *only* in `src/lib/ui/toast.ts`, `src/components/ui/Toast.tsx`, the dev tokens page, and the toast test file.

**Bundle and perf**

- [ ] Bundle delta is under 2KB gzipped against `main`. Run `pnpm build` on `main`, capture the route-by-route bundle sizes, then re-run on this branch and diff. Report the delta in the report's "Bundle and perf" section even if it is well under the cap.
- [ ] No new font, no new image, no new font-loader import.

**Manual eyeball**

- [ ] `pnpm dev`, navigate to `http://localhost:3000/dev/tokens`. All five band swatches read legibly against the dark canvas. The three motion-preset playgrounds fire correctly. The toast dispatcher fires, replaces on second dispatch, dismisses on action click and on timer.
- [ ] Verify `prefers-reduced-motion: reduce` in DevTools removes the slide on toast but keeps the dismiss timer and action click working.
- [ ] Verify the dev page returns 404 when `NODE_ENV=production` (test by running `pnpm build && pnpm start` locally and visiting the route).

**Accessibility**

- [ ] The toast container has `role="status"` and `aria-live="polite"`.
- [ ] The toast action button is focusable, has `aria-label` if the visual label is just `[ Undo ]` (the brackets are decorative).
- [ ] No new a11y test failures: `pnpm test:a11y` if any a11y test touches the root layout.

## 4. Report

When all pre-merge checkpoints pass, open a PR with the following description verbatim (filling in the values). This is what the human reviewer reads to decide on merge.

```markdown
## CP-00. Foundation. Tokens, motion presets, copy deck

### What shipped
- Added three motion presets (bandReveal, tickRoll, toastIn) to motion/vocabulary.ts
- Added five rarity-band fill tokens + one glow companion to globals.css
- Created src/lib/sim/bandCopy.ts with canonical band-label re-export and three new V3 string constants
- Created src/lib/ui/toast.ts (dispatch API) and src/components/ui/Toast.tsx (host)
- Mounted <ToastHost /> at the root layout
- Created /dev/tokens hidden review page, NODE_ENV-gated
- Added tests/unit/ui-toast.test.tsx with five assertions

### Files touched
- {path}: {one-line summary}
- ...

### Tests added or updated
- tests/unit/ui-toast.test.tsx: dispatch, replace, auto-dismiss, action click, reduced-motion

### Acceptance criteria status
- [✓ / ✗] All new tokens render on /dev/tokens against the dark canvas
- [✓ / ✗] No existing component consumes the new tokens (grep evidence pasted below)
- [✓ / ✗] Toast honours prefers-reduced-motion
- [✓ / ✗] Bundle delta under 2KB gzipped

### Reduced-motion verification
{one screenshot or one paragraph confirming the reduced-motion fallback on the toast}

### Bundle and perf
- Bundle delta vs main: {X.X KB gzipped}
- Largest route delta: {route} {+Y KB}
- No image / font additions

### Grep evidence (CP-00 contract)
$ grep -rn "band-common\|band-plausible\|band-uncommon\|band-rare\|band-vanishing" src
{paste output here, must show only globals.css + dev page}

$ grep -rn "dispatchToast" src
{paste output here, must show only toast module + dev page + test}

### Out-of-scope deviations
{describe any file edit outside §2 with reasoning; if none, write "None."}

### Open questions for review
{anything ambiguous in the spec or the architecture document you had to interpret; if none, write "None."}
```

## 5. After you finish

- Push the branch.
- Open the PR with the description above.
- Stop. **Do not start CP-01.** Wait for the human review and the explicit "merge" signal. CP-01's prompt will be generated separately once CP-00 lands on `main`.

If the review comes back with revisions, address only the items called out. Do not creep scope. If the reviewer raises a question that suggests a deeper architectural issue, surface it back to the orchestrator (the assistant that gave you this prompt) rather than fixing it inside the PR.

Good. Begin.
