# Checkpoint 8a: Brand-cleanup sweep (em-dash and en-dash removal)

## Context

You are working on the 45 Analytics codebase (`the-45-percent-problem` repo). The eight P0 checkpoints have shipped. Across those checkpoints, you correctly followed PR-scope discipline and left pre-existing em-dashes and en-dashes untouched in files you were editing for other reasons. The debt has now accumulated; this checkpoint clears it before any P1 work starts.

The attached file `APP_UX_EVALUATION_2026-05-13.md` and the project's `CLAUDE.md` both name this rule explicitly: "no em-dashes or en-dashes anywhere; use periods, semicolons, colons, parentheses." The brand survives by trust, and one of the trust mechanisms is consistency of voice. Em-dashes are a tell of LLM-generated writing and the founder is allergic to them. They should not appear anywhere in code or copy that goes through this project.

This is a pure punctuation cleanup. No functional changes. No new tests. No new dependencies. Comments and user-facing strings only.

## What to do

Sweep em-dashes (`—`, U+2014) and en-dashes (`–`, U+2013) from every file modified or added across checkpoints 1 through 8 of the UX rollout. Replace each occurrence with brand-compliant punctuation.

### Files in scope

Treat this as the authoritative list. Do not extend it; do not skip any file on it.

**Files added during the rollout** (should already be clean, but verify):
- `website/src/lib/analytics/track.ts`
- `website/src/lib/sim/modalBracket.ts`
- `website/src/lib/sim/promoCards.ts`
- `website/src/lib/sim/getOperatorSession.ts`
- `website/src/lib/sim/getUserPredictions.ts`
- `website/src/app/api/og/_lib/scenarioOG.tsx`
- `website/src/app/api/og/promo/[slug]/route.tsx`
- `website/src/app/api/me/logout/route.ts`
- `website/src/app/(simulator)/me/page.tsx`
- `website/src/app/confirmed/AlertArmedBeacon.tsx`
- `website/src/components/simulator/ModelCallPanel.tsx`
- `website/src/components/simulator/ForecastDesk.tsx`
- `website/tests/unit/buildComposerString.test.ts`

**Files modified during the rollout** (carry pre-existing em-dashes from earlier work):
- `website/src/app/layout.tsx`
- `website/src/app/verify/page.tsx`
- `website/src/app/confirmed/page.tsx`
- `website/src/app/api/verify/route.ts`
- `website/src/app/api/predictions/route.ts`
- `website/src/app/(editorial)/page.tsx`
- `website/src/app/(editorial)/layout.tsx`
- `website/src/app/(quant)/layout.tsx`
- `website/src/app/(simulator)/layout.tsx`
- `website/src/app/(simulator)/scenario/page.tsx`
- `website/src/app/(simulator)/scenario/final-four/page.tsx`
- `website/src/app/(simulator)/scenario/p/[id]/page.tsx`
- `website/src/app/api/og/scenario/[id]/route.tsx`
- `website/src/components/simulator/modes/ModeFinalFour.tsx`
- `website/src/components/simulator/modes/ModeChampionsPath.tsx`
- `website/src/components/simulator/modes/ModeFullBracket.tsx`
- `website/src/components/simulator/TicketShareButton.tsx`
- `website/src/components/simulator/reality/RealityScoreReveal.tsx`
- `website/src/components/layout/EditorialMasthead.tsx`

The rest of the codebase is out of scope. Do not edit files not on this list, even if they contain em-dashes; that is a separate debt and would expand the PR beyond review-ability.

### Replacement strategy

For each em-dash or en-dash, choose one of these brand-compliant replacements based on context:

- **Period** (`.`) when the dash separates two independent clauses. Example: `Foo bar — the rest of the sentence.` becomes `Foo bar. The rest of the sentence.`
- **Semicolon** (`;`) when the dash separates two closely related clauses where a period would feel too hard.
- **Colon** (`:`) when the dash introduces a definition, list, or explanation. Example: `One thing — clarity.` becomes `One thing: clarity.`
- **Parentheses** (`(...)`) when the dash sets off a parenthetical aside. Example: `The slot row — already responsive — handles this.` becomes `The slot row (already responsive) handles this.`
- **Middle dot** (`·`, U+00B7) when the dash separates labels in a title or visual hierarchy. The codebase already uses middle dot heavily for this purpose (page titles, masthead breadcrumbs, provenance footers). Example: `Final Four — Scenario Simulator` becomes `Final Four · Scenario Simulator`.
- **ASCII hyphen-minus** (`-`, U+002D) is acceptable but rarely the cleanest choice. Use it only when the dash was a range indicator (e.g., `1-2 days` instead of `1 – 2 days`).

When in doubt, the period or middle dot is the safest choice. Avoid the ASCII hyphen for general prose separation; it looks wrong in code comments.

### Critical constraints

- **Comment-only changes**. Every diff hunk should be inside a JSDoc block, an inline comment, or a string literal. If you find yourself touching identifiers, function signatures, exports, or any runtime behaviour, stop and back out the change.
- **No semantic changes to user-visible strings**. The visual hierarchy (e.g., `Title — Subtitle`) must remain readable; just swap the punctuation. Do not rewrite the title.
- **Preserve content**. If a comment said "Foo bar — this is interesting", the replacement says "Foo bar. This is interesting." (or similar), not a removed phrase or a rewritten meaning.
- **Hyphenated words are not in scope**. Words like `terminal-tertiary`, `pre-tournament`, `set-cookie` use the ASCII hyphen-minus, not an en-dash. Do not touch them.
- **URLs and slugs are not in scope**. Hyphens in URLs and identifiers are ASCII hyphens.

### Verification

After the sweep, the following grep across in-scope files must return zero matches:

```bash
grep -rn $'—\|–' \
  website/src/app/layout.tsx \
  website/src/app/verify/page.tsx \
  website/src/app/confirmed/page.tsx \
  ...
```

(Construct the actual command listing each in-scope file. Or run a single grep across `website/src` and manually filter the output to confirm only out-of-scope files remain.)

## Acceptance criteria

- Every file in the in-scope list contains zero em-dashes (U+2014) and zero en-dashes (U+2013).
- No functional changes. TypeScript build clean.
- Existing tests pass (all 199 should remain green).
- The pre-existing forbidden-words check (`node scripts/check-forbidden-words.mjs`) still passes.
- The replacement choices preserve the semantic content of each comment and string. A reviewer skimming the diff should see only punctuation edits.
- No file outside the in-scope list is modified.

## Brand-discipline guardrails (non-negotiable)

- This entire checkpoint is the brand-discipline enforcement. Apply the same rule to your own changes; do not introduce new em-dashes anywhere.
- No new sentence in any code comment may introduce flair that was not in the original. The goal is faithful translation, not editorial rewriting.
- Do not rephrase user-facing copy beyond the punctuation swap. If the original said "Foo — bar", the replacement says "Foo. Bar" or "Foo: bar" or "Foo · bar"; not "A new sentence entirely".

## Workflow conventions (from CLAUDE.md)

- Work on a feature branch named `ux/checkpoint-08a-brand-cleanup`.
- Open a pull request when complete. Do not push directly to main.
- Run `scripts/install-hooks.sh` once if you have not already; the pre-push hook blocks conflict markers.
- If a merge conflict appears during rebase, use `git fetch origin && git reset --hard origin/main` then re-apply your work; do not use `git stash pop`.

## End-of-task report

When the work is complete, produce a report in exactly this format:

```
## Checkpoint 8a Report: Brand-cleanup sweep

### Branch
ux/checkpoint-08a-brand-cleanup

### Files changed
- path/to/file (modified): N em-dashes and M en-dashes replaced
- ...

### Diff size
Lines added: N
Lines removed: M
Files touched: K

### Totals
- Em-dashes (U+2014) replaced: N
- En-dashes (U+2013) replaced: M
- Replacement distribution:
  - period: A
  - semicolon: B
  - colon: C
  - parentheses: D
  - middle dot: E
  - hyphen-minus (rare cases): F

### Verification
- [ ] grep U+2014/U+2013 across in-scope files returns zero matches
- [ ] TypeScript build clean
- [ ] 199/199 tests pass
- [ ] check-forbidden-words.mjs passes
- [ ] No file outside the in-scope list is modified

### Examples
Paste 3 to 5 representative before-after pairs from the diff so a reviewer can sanity-check the replacement choices.

### Follow-ups / open questions
- Any em-dash you found in an out-of-scope file (note location, do not edit). This becomes a future cleanup ticket.
- Anything you flagged but did not implement.

### Ready for review
Y / N. If N, state what is blocking.
```

Do not push to main. Wait for the user to review the report and approve.
