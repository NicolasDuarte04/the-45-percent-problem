# Checkpoint cp-08 — Onboarding Surface A (first-visit homepage variant)

Read `GO_TO_LAUNCH.md` at the repo root first for project context. Prior shipped checkpoints: cp-04 (frontend narrative hotfix), cp-05 + cp-05a (nightly pipeline rewire and PAT drop), cp-06 (nav-perf fix: `loading.tsx` + Recharts dynamic on `/ledger`), cp-07 (pre-launch audit + simulator footer fix). T-12 days to WC kickoff.

Also read these two files end to end before touching any code:

- `website/onboarding-design-brief.md` (the brief that produced the design output you're about to consume)
- `docs/audit/prelaunch-audit-2026-05-28.md` (the foundation audit confirming the live site is in a known-good state)

## Goal

Implement **Surface A only** from the onboarding design package: the first-visit homepage variant. On first visit (no `localStorage.45a.audienceMode`), the homepage hero is replaced by a three-block layout (premise paragraph, fan-vs-quant mode preview, four-cell entry grid) that lets the visitor pick a reading mode. On returning visits, the existing homepage renders unchanged.

**Surface B (the simulator overlay with Beat 3 animation) is explicitly out of scope.** That's cp-09, which ships after cp-08 has shipped and the token-integration approach is validated against production.

## Why this matters

The site is currently good for the OSF / prediction-markets audience who finds it through pre-registration cross-links. It's not good for a football fan who lands on it during a WC search. Surface A is the wedge that lets us serve both audiences without redesigning the existing dashboard. Returning visitors see exactly what they see today; first-visit visitors get an editorial onramp that respects the academic voice (no modal, no "Welcome!", no skippable wizard).

## Branch

`cp-08-onboarding-surface-a`

Pre-work: `git fetch && git checkout main && git pull`. Confirm HEAD includes the cp-07 merge. Working tree clean. Branch off main.

## Stage 1 — Get the design package into the repo and inspect

The design agent published `HANDOFF FINAL · v1.0` separately and Nicolás has placed the package on his Desktop. The package contains: `Onboarding Flow.html` (live HTML mockup), six `.jsx` mockup components (`ofSurfaceA.jsx`, `ofSurfaceB.jsx`, `ofShared.jsx`, `ofRationale.jsx`, `design-canvas.jsx`, `tweaks-panel.jsx`), `colors_and_type.css`, and a `screenshots/` folder with 12 PNG references at three viewport widths.

### Step 1: Locate the package.

Try in order:

```bash
ls -la ~/Desktop/ | grep -i 'onboarding\|design\|45'
ls -la ~/Desktop/Onboarding* 2>/dev/null
ls -la ~/Downloads/ | grep -i 'onboarding'
```

If the package is a zip, extract it to a temp directory first. If it's a folder, you can copy it directly. Ask Nicolás if you can't find it after the obvious paths.

### Step 2: Move into the repo.

```bash
mkdir -p website/design-output/onboarding
cp -R <source>/. website/design-output/onboarding/
ls -la website/design-output/onboarding/
```

Confirm the directory contains all the expected files. If `snapshot.html` is present, delete it (the design agent confirmed it deleted that before handoff; if it's still there, the user's download grabbed an earlier version and we want the clean tree).

### Step 3: Inspect thoroughly. Do not write production code yet.

Read each file end to end. For each, write a one-paragraph summary in a working notes file (`docs/onboarding/cp-08-inspection-notes.md`, create the directory). Specifically capture:

- `Onboarding Flow.html`: what does it render? Open it in a browser via `pnpm dlx serve website/design-output/onboarding/` and observe the live HTML. Confirm the tweaks panel works (six toggles), the audience-mode radio swaps the Block 2 preview, the headline tweak rotates between three options, the viewport switcher actually re-renders at 768 and 375 (per the design agent's Q6 answer).
- `ofSurfaceA.jsx`: what's the component shape? What props does it accept? What's the JSX structure of the three blocks?
- `ofShared.jsx`: what primitives are shared between Surface A and Surface B?
- `colors_and_type.css`: what tokens does it define? Critically, map each one against the existing `website/src/app/globals.css` to identify duplicates, overlaps, and any genuinely new tokens that need to be added.
- `screenshots/`: what compositions are captured at which widths?

### Step 4: Stop and report.

Write a section in the inspection notes titled "Implementation plan for Nicolás review" that proposes:

- Which JSX components from the design package will be **ported into the real Next.js app** vs which are **reference-only** for the implementer (your call; my expectation is most of the JSX is reference and the real implementation lives in new files under `website/src/components/onboarding/`).
- How the **first-visit detection** will work (you have two reasonable options: pure client island with a brief flash, or inline head script that sets `body.dataset.firstVisit` before hydration. Pick one based on what's already in the codebase; if there's no established pattern, default to the inline script + CSS class toggle to avoid the flash. Explain your pick.)
- How the **token integration** will work. The brief explicitly forbids a wholesale CSS import. The right answer is a token-equivalence map: read `colors_and_type.css`, identify which tokens duplicate existing `globals.css` definitions (use those), and add only the genuinely new tokens to `globals.css` with names consistent with the existing convention (no `45a-*` prefix or other new namespace; integrate cleanly).
- The **mode-preview Block 2 strategy**: the design agent built their own design-system-based bracket mockups as placeholders for the unshipped `/bracket` fan-mode and quant-mode renderings. Port those mockups as-is for now. When the bracket fan-readability work later ships (the original Checkpoint 3 from `GO_TO_LAUNCH.md`, not yet started), the previews will be swapped for real renderings. Mark the mockup components with a `TODO(post-bracket-fan)` comment so a future agent can find them.
- The **list of files** you'll create and the existing files you'll edit. Conservative scope: minimize edits to existing files; concentrate the new work in a small `components/onboarding/` directory.

**Stop after writing the inspection notes.** Do not start implementation until Nicolás reviews and confirms the plan. If the package contains anything surprising (a Beat 3 mock that bleeds into Surface A, a token that conflicts with brand color, missing files, etc.), surface it explicitly. Better to spend 30 minutes aligning on approach than to rewrite the implementation later.

## Stage 2 — Implementation (after Nicolás confirms the plan)

After Nicolás reviews your inspection notes and gives you the green light, implement Surface A per the plan you proposed. Generic guidance:

### Scope expectations

- One new directory: `website/src/components/onboarding/`
- One new file each for the major pieces (Surface A wrapper, the three blocks, the four-cell entry grid, any new primitive)
- Edits to one existing file: `website/src/app/(editorial)/page.tsx` to mount the wrapper at the top of the page, conditionally replacing the existing hero
- Possibly edits to `website/src/app/globals.css` to add genuinely new tokens (no wholesale import)
- Optionally one or two small primitive additions to `website/src/components/primitives/` if a pattern needs it

### Token integration rules

- Reuse existing `globals.css` tokens wherever they map to the design package's tokens. The site already has a complete colour and type system; the design package is an extension of it, not a replacement.
- For genuinely new tokens, add them to `globals.css` with names consistent with the existing convention. Match the existing dark theme; the site is dark-by-default.
- Do not import `colors_and_type.css` as a CSS file in production. The design package's stylesheet is reference, not deployable code.

### First-visit detection

- The home page is `export const dynamic = "force-static"` at `website/src/app/(editorial)/page.tsx:34`. It must stay static (cp-06 made it fast; we don't regress that).
- The first-visit detection must therefore happen client-side. Two acceptable patterns:
  1. **Client island with brief flash.** Wrap the existing hero in a client component that reads `localStorage.45a.audienceMode` in `useEffect` and conditionally swaps to the variant. Visible flash on first paint for first-visit users (acceptable).
  2. **Inline head script + CSS toggle.** A tiny inline script in `layout.tsx`'s `<head>` reads `localStorage.45a.audienceMode` and sets `document.documentElement.dataset.firstVisit = "true"` before hydration. CSS rules then show the variant when `[data-first-visit]` and hide the original hero. No flash, slightly more complexity in the layout.

Either pattern is fine; your call. Document which you picked in the PR description.

### Mode selection writes

- When the user clicks a mode-preview link in Block 2 (or any of the four-cell entry grid links in Block 3), `localStorage.45a.audienceMode` gets set to `"fan"` or `"terminal"` and the navigation proceeds. On the next page load, the homepage renders the original (no variant).
- When the user closes the variant without picking, set `localStorage.45a.audienceMode = "terminal"` and render the original. (This matches what the design agent confirmed in their Q2 answer.)

### Headline copy

The design package exposes three headline options as a tweak. For production, **pick option 1 by default** ("Structural variables explain 55% of World Cup outcomes. This is a publication about the other 45%."), because it leads with the most concrete claim and matches the project's voice. Leave the three options accessible via a `HEADLINE_VARIANTS` constant in the Block 1 component so we can swap later without re-deploying. Do not expose a tweaks panel in production; that's a reviewer tool.

### Conventions

- No em dashes or en dashes in any code or copy. Use periods, semicolons, colons, parentheses. (Project-wide rule, verified by cp-04 through cp-07.)
- Match existing import conventions (`@/` aliases, named exports).
- Tests live in `tests/**/*.test.ts` (verified in cp-04). If you write tests for the new components, follow that convention.
- Use existing primitives where possible. Check `website/src/components/primitives/` before introducing anything new.

### What NOT to touch

- The simulator routes (`/scenario/*`). Surface B is cp-09.
- The kill-criteria pill or any cp-04-shipped logic.
- The `loading.tsx` files or the Recharts lazy wrapper from cp-06.
- The `StickyProgressMeter` or the simulator footer (cp-07 just shipped those).
- The data pipeline, the simulation engine, the OSF artifacts, the vault content, the email subscribe API.
- The masthead navigation (`EditorialMasthead.tsx`). Don't add an onboarding link.
- Any vault page, brief page, or methodology page.

### Out of scope (do not implement in this checkpoint)

- The audience-mode toggle in the site header for switching modes later. The brief flagged this as a follow-up; don't build it now.
- A separate `/welcome` or `/onboarding` route. Surface A is inline with the existing homepage.
- The audience-mode-aware rendering on `/bracket`, `/ledger`, or any other page. Surface A captures the preference; using the preference to vary other pages is the original Checkpoint 3 work from `GO_TO_LAUNCH.md` (bracket fan-readability), which is separately scoped.
- Surface B (simulator overlay). cp-09.
- Email capture in the entry grid or anywhere on Surface A. The brief routed email capture exclusively through the existing `EmailCaptureForm` in two places: the existing homepage block (unchanged) and the post-Beat-3 prompt in Surface B (cp-09). Don't add a third place.

## Verification

Before marking ready:

- [ ] Inspection notes exist at `docs/onboarding/cp-08-inspection-notes.md` and Nicolás has confirmed the plan.
- [ ] Dev: open `pnpm dev`, clear localStorage, visit `/`. Surface A renders (three blocks, no fallback flash if you picked the inline-script approach).
- [ ] Click any mode-preview link in Block 2. `localStorage.45a.audienceMode` is set. The next visit to `/` shows the original hero, not Surface A.
- [ ] Click an entry-grid link in Block 3 instead. Same behavior: preference set, next visit shows original.
- [ ] Close the Surface A variant via any other path (refresh after dismissing). Preference defaults to `"terminal"`.
- [ ] Mobile viewports (768 and 375): test in Chrome dev tools. Block 2's two-column preview collapses cleanly to a vertical stack below 480px. Tap targets are at least 44pt.
- [ ] Reduced-motion users: Surface A has no animations (per the brief), so this should just work, but confirm nothing fades or slides.
- [ ] cp-04 preservation: `/ledger` still reads `AWAITING TOURNAMENT KICKOFF`.
- [ ] cp-06 preservation: navigation between routes still shows `loading.tsx` skeletons within one frame.
- [ ] cp-07 preservation: `/scenario/final-four` still has the `[ See how the model reacts ]` sticky meter, no footer overlap.
- [ ] Production build: `pnpm build` clean. No new console errors on Surface A in production-style local serve.
- [ ] Tests and lint: `pnpm test` passes; `pnpm lint` clean on touched files; `pnpm tsc --noEmit` clean.
- [ ] Diff is bounded: probably 5 to 10 new files in `components/onboarding/`, 1 to 2 edited existing files, on the order of 300 to 600 lines added.

## Merge-readiness checklist

Answer each with `Y` or `N`. Do not push without all `Y`s (or `N*` with substantive rationale).

```
Y/N — Design package is in the repo at website/design-output/onboarding/.
Y/N — Inspection notes complete; Nicolás confirmed the plan before Stage 2 began.
Y/N — Token integration uses existing globals.css tokens where they exist; only genuinely new tokens added.
Y/N — colors_and_type.css is NOT imported in production; it's reference only.
Y/N — First-visit detection works without server-side cookies (pattern documented in PR).
Y/N — Surface A renders for fresh visitors (no localStorage); original hero renders for returning visitors.
Y/N — Mode preference writes to localStorage on link click, on entry-grid click, and on dismissal default.
Y/N — Default audience mode on dismissal is "terminal" (matches design agent Q2 answer).
Y/N — Headline production default is Option 1; all three variants accessible via constant.
Y/N — Mobile viewports (768, 375) verified.
Y/N — No animations in Surface A; reduced-motion users unaffected.
Y/N — cp-04, cp-06, cp-07 fixes preserved.
Y/N — pnpm test / pnpm lint / pnpm tsc --noEmit clean.
Y/N — No em or en dashes anywhere.
Y/N — Mode-preview mockup components carry TODO(post-bracket-fan) comments.
Y/N — Out of scope items (Surface B, header toggle, /bracket variants, email captures) all untouched.
Y/N — Branch is cp-08-onboarding-surface-a, off latest main, ready to PR.
```

If every item is `Y`, push and open the PR as draft with: a one-paragraph summary, the list of files added/edited, a description of which first-visit-detection pattern you picked and why, before/after screenshots of the homepage (fresh visitor and returning visitor), and a link to the design package at `website/design-output/onboarding/Onboarding Flow.html` for reviewers to compare against.

If any item is `N`, explain the blocker and stop.

## Decision tree if things don't match

- **Inspection reveals the design package is incomplete or significantly different from what the brief expected.** Stop. Report what's missing or different. Do not improvise.
- **`colors_and_type.css` defines tokens that conflict with brand colors in `globals.css`.** Stop. Report the conflict with specific token names and values. Nicolás picks: keep brand colors, keep design's tokens, or define a hybrid.
- **The design's first-visit variant uses interactions or affordances the brief didn't specify.** Implement what the design shows; the design agent had latitude. Document any surprising additions in the PR description so Nicolás can decide whether to keep them.
- **The bracket-mode-preview mockups in Block 2 look noticeably worse than what real `/bracket` renderings would be.** Acceptable for cp-08. The mockups are placeholders. Tag them with `TODO(post-bracket-fan)` and ship; the swap happens later.
- **The four-cell entry grid in Block 3 wants to link to a route that doesn't exist (e.g. `/methodology` is at `/methodology` but the design says `/about/methodology`).** Use the actual existing routes. Don't create new routes to match the design; report the mismatch so we know the design needs updating.

## A note on judgement

This checkpoint has two unusual properties worth flagging:

First, the implementation depends on a deliverable produced by a separate tool (the design agent). The package was produced thoughtfully but it was also produced without access to the codebase, so it can't have known about every existing pattern. Your job is to translate the design into the codebase's idiom, not to re-implement the design's idiom from scratch. When in doubt, use the codebase's pattern.

Second, this is the most visible single change to the production site since launch. First-visit visitors during WC kickoff will land on whatever you ship. Spend the time on the inspection step; it costs almost nothing relative to the implementation and protects against shipping a misalignment between the design and the codebase.

After this ships, cp-09 (Surface B simulator overlay) is the next checkpoint. It will reuse Surface A's localStorage key (`45a.audienceMode`) for audience-aware Beat copy and its own key (`45a.simulatorTour`) for the tour-completion state.
