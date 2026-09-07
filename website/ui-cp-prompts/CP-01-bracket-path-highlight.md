# CP-01 · Bracket path highlight. Prompt for Claude Code session

> Hand this entire file to a fresh Claude Code session as the user message. Attach `website/UI_IMPROVEMENT_ARCHITECTURE_V3.md` and `website/CLAUDE.md` to the session. Do not paraphrase or trim this prompt; the acceptance criteria below are exact.

---

## 1. Context

You are picking up the second sequenced checkpoint in the **Tournament Scenario Simulator** UI Improvement V3 programme. CP-00 (foundation) merged to `main` and seeded the tokens, motion presets, copy deck, and toast primitive that CP-01 onward consume. Read these three documents before writing any code:

1. `website/CLAUDE.md` (ground truth on coding conventions, motion rules, palette, voice).
2. `website/UI_IMPROVEMENT_ARCHITECTURE_V3.md`, with particular attention to **§1 (locked guardrails) and §7 (Lessons captured from prior checkpoints)**. The CP-00 lessons in §7 are load-bearing for every subsequent CP.
3. The current state of `src/components/simulator/bracket/BracketTree.tsx`, `BracketConnectors.tsx`, and `geometry.ts` on `main`. **Important discovery:** the connector draw-in animation the architecture doc names as part of CP-01 is **already shipped** in Phase E (see `BracketConnectors.tsx` lines ~78-97; sessionStorage-gated, reduced-motion-aware, stroke-dasharray-based). Your job is to **verify** it, not re-implement it. The net-new work in CP-01 is the path-tint on match cells.

Two cross-cutting rules to internalise before you start:

- **No em dashes anywhere.** Use period, semicolon, colon, or parentheses. This applies to code comments, copy, commit messages, and the report.
- **Test files default to `.test.ts`.** Do not introduce React Testing Library; do not change the vitest `include` glob. If you need DOM behaviour at the unit level, defer it to a Playwright test (`tests/visual/` or `tests/a11y/` depending on the assertion).

**Inherited operational note from CP-00.** The Claude Preview MCP's `launch.json` runs `pnpm dev` against the main repo checkout, not against your worktree. If you need an iframe / DOM probe in a preview tab, either (a) point the preview at a `pnpm dev` you started inside your own worktree, or (b) inspect computed styles via Playwright instead. Do not lose time chasing stale CSS in a preview that's reading the wrong tree.

## 2. Task

Implement **CP-01. Bracket path highlight + connector draw-in (verification only).** Per §4 / CP-01 of the architecture document, this means:

1. Add a persistent 12% `--accent-warm` tint to every KO match cell whose `getAdvancer(level, matchIdx)` returns a non-null team. The tint composes against the simulator's `--bg-root` background, not transparent.
2. The visual hierarchy must read as: cell with no winner picked = no tint; cell with a winner picked = 12% peach background; the winning side within that cell continues to show its existing 6% accent-warm fill and `▶` glyph (Phase E behaviour, untouched).
3. Verify the existing connector draw-in animation still plays once per session on first load of any route that mounts `BracketTree`, and snap-renders on subsequent navigations within the same session. Reduced-motion users get the snap-rendered final state. **Do not modify the connector draw-in implementation**; if it regressed, surface that as an open question in the PR rather than fixing it inside this CP.
4. Add a Playwright integration test under `tests/visual/` or `tests/a11y/` that exercises the path-tint behaviour against the Full Bracket mode.

No other file is in scope. Tagged `out-of-scope` below is the explicit do-not-touch list.

### 2.1. File-by-file guidance

**`src/components/simulator/bracket/BracketTree.tsx`**. `MatchCell` is currently defined inline at line ~188. Do not extract it to a separate file; the architecture doc's reference to `MatchCell.tsx` was aspirational, not load-bearing. Modify the inline component:

- Add a new `isPathMember: boolean` prop to `MatchCellProps`. Compute it at the call site (the `ROUNDS.map((round) => Array.from({ length: round.count }, (_, m) => { ... })` block, currently around line 152) as `getAdvancer(round.level, m) !== null`.
- In the `MatchCell` body, add `data-path-member={isPathMember ? "true" : undefined}` to the outermost `<div>` (the `absolute border border-[var(--border-default)]` element on line ~203).
- Change that div's background class from the static `bg-[var(--bg-root)]` to a conditional:
  ```ts
  isPathMember
    ? "bg-[color-mix(in_srgb,var(--accent-warm)_12%,var(--bg-root))]"
    : "bg-[var(--bg-root)]"
  ```
  This composes against the canvas, not transparent, so the cell does not bleed through to the connector layer.
- The cell's border colour stays `--border-default`. The existing per-side `CellSide` styling (6% accent-warm on winner, opacity-70 on loser) is untouched.

Note: the same logic must work for the Final match (level 4), which has no children. The existing `highlightedParents` set in `BracketTree` excludes the Final because it loops `for (let pIdx = 0; pIdx < ROUNDS.length - 1; pIdx++)`. Your path-tint logic does NOT depend on `highlightedParents`; it depends on `getAdvancer(level, m) !== null` for every cell including F. Compute it independently.

**`src/components/simulator/bracket/BracketConnectors.tsx`**. Do not modify. Read it to verify the draw-in animation is intact and the existing `highlightedParents` propagation still works. If you find a regression, flag in Open Questions; do not fix it here.

**`src/components/simulator/bracket/geometry.ts`**. Do not modify.

**`tests/visual/bracket-path-tint.test.ts` (new)**. A Playwright test that:

1. Loads `/scenario/full-bracket` in a desktop viewport.
2. Auto-fills the groups via the `[ Auto-fill all ]` button so the KO tree mounts.
3. Picks the 8 best 3rd-place candidates (any deterministic subset) so the bracket activates.
4. Clicks the home side of R32 match 0 to advance it. Assertion: the R32 match 0 cell's computed `background-color` matches the 12% peach composition against `--bg-root`.
5. Clicks the corresponding R16 cell's home side. Assertion: BOTH the R32 cell AND the R16 cell carry the tint.
6. Clicks the opposite side of the R32 match 0 cell. Assertion: the R32 cell is still tinted (now reflecting the new advancer), and the R16 cell that referenced the old advancer has lost its tint (cascade-clear set its advancer to null).
7. Sets `prefers-reduced-motion: reduce` via `page.emulateMedia()`. Reloads. Assertion: connector draw-in is absent (`stroke-dashoffset` is 0 from first paint), and path tints render at their final values without transition.

Use Playwright's `page.locator('[data-path-member="true"]')` to assert path-member set membership across the seven steps.

### 2.2. Out-of-scope (hard guardrails)

Do NOT, under any circumstances:

- Modify any file outside `src/components/simulator/bracket/BracketTree.tsx`, except the new Playwright test file under `tests/visual/`.
- Modify `BracketConnectors.tsx` or `geometry.ts`. The connector draw-in stays as is. If you observe a regression, document it in Open Questions and stop.
- Extract `MatchCell` or `CellSide` to separate files. The 310-line `BracketTree.tsx` is on the readable side; splitting it now creates churn without payoff and reduces the diff's reviewability.
- Add new tokens, new motion presets, or new copy strings. CP-01 consumes only `--accent-warm` and `--bg-root` from `globals.css`; both already exist.
- Modify the existing per-side `CellSide` styling (the 6% accent-warm fill, the `▶` glyph, the loser opacity). The cell-level tint composes on top of these; they stay untouched.
- Add a new dependency. Playwright is already installed; framer-motion is already installed; everything you need is on disk.
- Run `pnpm db:*` for any reason. CP-01 does not touch the database.
- Use the `--no-verify` flag on git. The pre-push hook is mandatory.
- Use em dashes anywhere (code, comments, copy, commit messages, PR description, report).
- Touch any file under `src/lib/`, `src/app/api/`, `drizzle/`, `scripts/`, or any other simulator mode component.

If you find yourself wanting to edit a file outside this scope to "make CP-01 work," stop. The CP scope is correct; the workaround is wrong. Note the friction in the report's "Open questions" section and proceed without the cross-scope edit.

## 3. Pre-merge checkpoints

These are the gates you must pass before claiming CP-01 complete. Each item is a literal command or check; do not paraphrase.

**Branch and hygiene**

- [ ] Branch named `cp-01-bracket-path-highlight` off `main` (rebase onto `origin/main` immediately before opening the PR so the diff base is current).
- [ ] `scripts/install-hooks.sh` has been run once locally (verify the pre-push hook symlink exists at `.git/hooks/pre-push`).
- [ ] No conflict markers anywhere (`grep -rn "<<<<<<<\|=======\|>>>>>>>" src tests` returns nothing).
- [ ] No em dashes or en dashes in any added or modified file (`grep -rn "—\|–" src/components/simulator/bracket tests/visual` returns nothing).

**Tooling**

- [ ] `pnpm install` (no new deps expected; the lockfile diff is empty).
- [ ] `pnpm tsc --noEmit` passes with zero errors.
- [ ] `pnpm lint` passes against the lint baseline on `main` (no new warnings introduced by your files).
- [ ] `pnpm test` passes; the existing 317 tests stay green.
- [ ] `pnpm test:visual` runs the new bracket-path-tint test and passes. Capture the test name in the report.
- [ ] `pnpm build` succeeds; the `prebuild` forbidden-words check passes.

**Scope verification**

- [ ] `git diff --stat main..` lists *only* `src/components/simulator/bracket/BracketTree.tsx` and `tests/visual/bracket-path-tint.test.ts`.
- [ ] `grep -rn "data-path-member" src` returns matches only in `BracketTree.tsx`.
- [ ] `grep -rn "data-path-member" tests` returns matches only in the new test file.
- [ ] No new exports added to `BracketTree.tsx` (the `BracketTree` export is the same as on `main`).

**Bundle and perf**

- [ ] Bundle delta is under 1KB gzipped against `main` for `.next/static/chunks/*.js`. Capture both raw numbers in the report; acknowledge Turbopack chunk-hashing noise per the CP-00 methodology.
- [ ] No new font, no new image, no new asset.

**Manual eyeball**

- [ ] `pnpm dev`, navigate to `http://localhost:3000/scenario/full-bracket`. Auto-fill groups, pick 8 thirds, then advance one team at R32 through to F. Each cell tints as the team advances. Clearing a downstream pick (by clicking the alternate side at an upstream cell) un-tints the now-orphaned downstream cells.
- [ ] Verify in DevTools that the cell's computed `background-color` matches `color-mix(in srgb, #F9B88A 12%, #0F1216)` (≈ `rgb(34, 27, 25)` on the dark canvas). Paste the actual computed value into the PR.
- [ ] Reload with `prefers-reduced-motion: reduce` in DevTools. Confirm the connector draw-in is absent (already shipped behaviour) and the cell tints render at their final values without transition.

**Accessibility**

- [ ] `pnpm test:a11y` passes on the simulator routes (no new violations introduced).
- [ ] The `data-path-member` attribute is decorative; do NOT add `aria-*` attributes around it. Screen readers should continue to read the cell as before; the tint is purely visual feedback.

**Token-cascade probe (per §1 of the architecture document)**

CP-01 does not introduce new tokens. The iframe-probe requirement does not apply. If your implementation accidentally introduces a new CSS custom property, stop and reconsider; this CP should consume only existing tokens.

## 4. Report

When all pre-merge checkpoints pass, open a PR with the following description verbatim (filling in the values). This is what the human reviewer reads to decide on merge.

```markdown
## CP-01. Bracket path highlight

### What shipped
- Added persistent 12% accent-warm tint on every KO match cell with a non-null advancer
- New `data-path-member` attribute on the cell's outer div
- New Playwright integration test exercising the seven-step path-tint scenario
- Verified the existing Phase E connector draw-in still plays once per session and respects prefers-reduced-motion

### Files touched
- src/components/simulator/bracket/BracketTree.tsx: inline MatchCell extended with isPathMember prop and conditional background class
- tests/visual/bracket-path-tint.test.ts: new

### Tests added or updated
- tests/visual/bracket-path-tint.test.ts: 7-step assertion sequence per §2.1 of the prompt

### Acceptance criteria status
- [✓ / ✗] Clicking Spain at R32 tints Spain's R32 cell at 12% peach
- [✓ / ✗] Clicking Spain at R16 tints both R32 and R16 cells
- [✓ / ✗] Clearing an advance drops the tint on the cleared cell and every downstream cell in that chain
- [✓ / ✗] Connector draw-in plays once per session (verified, not re-implemented)
- [✓ / ✗] Reduced-motion users get instant snap (no draw-in, no fade)
- [✓ / ✗] Lighthouse mobile a11y score does not drop

### Reduced-motion verification
{one screenshot or one paragraph confirming the reduced-motion fallback}

### Bundle and perf
- Bundle delta vs main: {X.X KB gzipped raw, with a sentence on Turbopack hashing noise}
- LCP on /scenario/full-bracket: {before} → {after}

### Token-cascade probe
N/A. CP-01 consumes only existing tokens (--accent-warm, --bg-root).

### Scope verification greps
$ git diff --stat main..
{paste output here}

$ grep -rn "data-path-member" src tests
{paste output here, must show only BracketTree.tsx + the new test file}

### Out-of-scope deviations
{describe any file edit outside §2 with reasoning; if none, write "None."}

### Open questions for review
{anything ambiguous in the spec, any observed regression in the existing draw-in animation, any edge case you had to interpret; if none, write "None."}

### Self-report (Y / N)
- [ ] Would I merge this PR as it stands today, if I were the reviewer? **Y / N**
- [ ] If N, the one thing I would change before merge: {fill in or write "N/A"}
```

## 5. After you finish

- Push the branch.
- Open the PR with the description above.
- Stop. **Do not start CP-02.** Wait for the human review and the explicit "merge" signal. CP-02's prompt will be generated separately once CP-01 lands on `main`.

If the review comes back with revisions, address only the items called out. Do not creep scope. If the reviewer raises a question that suggests a deeper architectural issue, surface it back to the orchestrator (the assistant that gave you this prompt) rather than fixing it inside the PR.

Good. Begin.
