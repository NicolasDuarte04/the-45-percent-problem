# Checkpoint 12: Full-tree brand sweep (em-dash and en-dash removal across website/)

## Context

You are working on the 45 Analytics codebase (`the-45-percent-problem` repo). The attached file `APP_UX_EVALUATION_2026-05-13.md` is the evaluation that motivates this work.

Checkpoint 8a swept em-dashes and en-dashes from the 33 files modified during the P0 rollout. Checkpoints 9, 10, and 11 are each em-dash-free in their own added code. The remaining brand debt lives in files outside the rollout-touched set: legacy components, supporting libraries, scripts, tests, and documentation that the rollout never touched.

This checkpoint closes that debt across the entire `website/` tree before any new feature work (specifically before P1.2 calibration emails) starts. After this lands, every user-facing surface and every developer-facing comment in `website/` will conform to the brand rule.

This is a discipline checkpoint, not a feature checkpoint. No functional changes. No new tests. No new dependencies. Comments, strings, and documentation only.

## What to do

Sweep em-dashes (`—`, U+2014) and en-dashes (`–`, U+2013) from every code, comment, and documentation file under `website/`. Replace each occurrence with brand-compliant punctuation using the same strategy you used in checkpoint 8a.

### Scope

**In scope (sweep these):**

- All files under `website/src/` (TypeScript, TSX, CSS, MDX).
- All files under `website/scripts/` (JS, MJS, TS scripts).
- All files under `website/tests/` (test files, vitest specs, etc.).
- Markdown documentation files anywhere under `website/`: `CLAUDE.md`, `AGENTS.md`, `README.md`, any `*.md` config files.
- TypeScript and JavaScript config files: `tsconfig.json` (if it has comments), `next.config.ts`, `playwright.a11y.config.ts`, `lighthouserc.js`, `vitest.config.ts`.

**Out of scope (do not touch):**

- Anything under `node_modules/` (third-party dependencies).
- Anything under `.next/`, `dist/`, `build/`, `coverage/` (generated artifacts).
- Anything under `website/public/data/` (snapshot data, OG image cache, etc.; data files are not human prose).
- Anything under `website/public/assets/` (SVG flag files, images, trailer mp4, etc.).
- The Python research code at the repo root (`ingestion/`, `models/`, `simulation/`, `market/`, `evaluation/`, `utils/`, root `CLAUDE.md`). That is the research-paper side and is governed by separate conventions.
- The `ux-rollout/` directory (the prompts you have been receiving). These are evaluation artifacts; their em-dashes are mine, not yours.
- Lock files (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`).

**Heuristic when unsure**: if a file lives under `website/` and contains human-readable prose (code comments, JSDoc, JSX strings, MDX, markdown), sweep it. If it is a data file, lock file, binary asset, or generated artifact, leave it alone.

### Replacement strategy (same as checkpoint 8a)

For each em-dash or en-dash, choose one of these brand-compliant replacements based on context:

- **Period** (`.`) when the dash separates two independent clauses.
- **Semicolon** (`;`) when the dash separates two closely related clauses.
- **Colon** (`:`) when the dash introduces a definition, list, or explanation.
- **Parentheses** (`(...)`) when the dash sets off a parenthetical aside.
- **Middle dot** (`·`, U+00B7) when the dash separates labels in a title, breadcrumb, or visual hierarchy. The codebase already uses middle dot heavily for this purpose.
- **ASCII hyphen-minus** (`-`, U+002D) only for range indicators (`1-2 days`, `T1-T8`).

When in doubt, period or middle dot is the safest choice.

### Critical constraints

- **Punctuation-only changes**. Every diff hunk should be inside a comment, JSDoc block, string literal, or markdown prose. Do not touch identifiers, function signatures, exports, type definitions, or any runtime behaviour.
- **Preserve content**. The replacement must say the same thing the original said. If a comment said "Foo bar — this is interesting", the replacement says "Foo bar. This is interesting." Not a rewritten phrase, not a removed sentence.
- **No semantic edits to user-visible strings**. Visual hierarchy (titles, page metadata, etc.) must remain readable; just swap the punctuation.
- **Hyphenated words are not in scope**. `terminal-tertiary`, `pre-tournament`, `set-cookie` use the ASCII hyphen-minus, not en-dashes. Do not touch them.
- **URLs and slugs are not in scope**. Hyphens in URLs and identifiers are ASCII hyphens.
- **Code blocks in markdown stay verbatim**. If a `.md` file has a fenced code block containing an em-dash in commented JavaScript, that em-dash IS in scope because it is still code content under `website/`. But if the markdown shows command-line examples or third-party log output, treat as documentation prose: replace if it is your prose, leave alone if it is verbatim external content.

### Discovery

Start with a single grep to find every em-dash and en-dash under `website/`:

```bash
cd website
grep -rln $'—\|–' \
  --include='*.ts' --include='*.tsx' \
  --include='*.js' --include='*.mjs' --include='*.cjs' \
  --include='*.css' --include='*.md' --include='*.mdx' \
  --include='*.json' \
  src/ scripts/ tests/ \
  *.md *.ts *.mjs *.js 2>/dev/null
```

(Adjust the glob to whatever runs cleanly in your environment.)

The result is the full set of files in scope. Triage:

- For each file, count the em-dashes and en-dashes.
- Read the surrounding context to choose the right replacement per occurrence.
- Edit in place.

Some files will have many occurrences (legacy components, long docstrings). Take them carefully; do not bulk-replace with a single character without context. Each em-dash needs a per-occurrence decision.

### Verification

After the sweep, the following grep across the in-scope directories must return zero matches:

```bash
cd website
grep -rln $'—\|–' src/ scripts/ tests/ *.md 2>/dev/null
```

If any file remains, decide whether it is genuinely out of scope (e.g., a binary file that grep matched, or a code block of verbatim external content) and flag it in the report. Otherwise fix it.

## Acceptance criteria

- Every in-scope file under `website/` contains zero em-dashes (U+2014) and zero en-dashes (U+2013).
- No functional changes. TypeScript build clean.
- Existing tests pass (all currently-green tests should remain green).
- `node scripts/check-forbidden-words.mjs` passes.
- The replacement choices preserve the semantic content of each comment, string, and prose block.
- No file outside the in-scope set is modified.
- No new files are added (this is a sweep, not a feature).

## Brand-discipline guardrails (non-negotiable)

- This entire checkpoint is the brand-discipline enforcement. Apply the same rule to any new comment you write in service of clarification; do not introduce new em-dashes anywhere.
- Faithful translation, not editorial rewriting. The goal is "the same content with brand-compliant punctuation."
- Do not rephrase user-facing copy beyond the punctuation swap.

## Workflow conventions (from CLAUDE.md)

- Work on a feature branch named `ux/checkpoint-12-brand-sweep-full-tree`.
- Open a pull request when complete. Do not push directly to main.
- Run `scripts/install-hooks.sh` once if you have not already; the pre-push hook blocks conflict markers.
- If a merge conflict appears during rebase, use `git fetch origin && git reset --hard origin/main` then re-apply your work; do not use `git stash pop`.

## End-of-task report

When the work is complete, produce a report in exactly this format:

```
## Checkpoint 12 Report: Full-tree brand sweep

### Branch
ux/checkpoint-12-brand-sweep-full-tree

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
- Files swept: K
- Replacement distribution:
  - period: A
  - semicolon: B
  - colon: C
  - parentheses: D
  - middle dot: E
  - hyphen-minus (range indicators): F

### Verification
- [ ] grep U+2014/U+2013 across website/src, website/scripts, website/tests, website/*.md returns zero matches
- [ ] TypeScript build clean
- [ ] All existing tests pass
- [ ] check-forbidden-words.mjs passes
- [ ] No file outside the in-scope set is modified
- [ ] No new files added

### Out-of-scope dashes noted (not edited)
List any em-dashes or en-dashes you found in files that are genuinely out of scope (binary files, third-party content, verbatim external prose) and chose not to edit. Brief explanation per item.

### Examples
Paste 3 to 5 representative before-after pairs from the diff so a reviewer can sanity-check the replacement choices for naturalness.

### Follow-ups / open questions
- Anything you flagged but did not implement.
- Files where you were uncertain about scope (document the call you made).

### Ready for review
Y / N. If N, state what is blocking.
```

Do not push to main. Wait for the user to review the report and approve.
