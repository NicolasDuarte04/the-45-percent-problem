# Scenario Simulator Pivot Plan

**Author:** Architect pass
**Date:** 2026-05-06
**Branch context:** Phase E (Game Feel) just merged into `main`. Three product issues surfaced during manual playtest.

---

## Summary

Three missions, ordered by blocking severity:

1. **Fix the broken submit API.** Users hit `SubmitErrorPanel` immediately after clicking `[ SEE HOW THE MODEL REACTS ]`. Nothing else matters until this is green.
2. **Refactor Full Bracket Step 1** from a wall of 12 groups into a focused carousel with an Auto-fill-from-Elo escape hatch.
3. **Lift the single-color restriction** by introducing semantic UI tokens (guidance, success, danger, warning) that alias existing palette colors. No new hex values required.

Each mission ships as its own PR per the repo's PR discipline rule.

---

## Mission 1: Fix the broken submit API

### Flow map

```
ModeFullBracket.tsx (~line 672)
  → submitPrediction()  in src/lib/sim/predictionsApi.ts
  → POST /api/predictions
  → src/app/api/predictions/route.ts
```

The client maps responses to four error kinds: `network`, `invalid`, `rateLimit`, `server`. Today they all collapse to a single panel message ("We couldn't reach the model"), which is hiding signal.

### Five-minute triage (do this before touching code)

1. Open Chrome DevTools, Network tab. Replay the submit. Click the failed POST. Read the status code and the response body. That tells you which of the four kinds you actually hit.
2. Read the `pnpm dev` terminal. Next.js prints server-side stack traces inline when an API route throws. The terminal carries the truth; the panel is the polite UI version.

### Likely root causes (priority order)

1. **Schema validation rejects the payload.** `ScenarioPayloadSchema.safeParse(body)` returns 400 → `kind: "invalid"`. Full Bracket bodies must contain `groupWinners`, `groupRunnersUp`, `bestThirds` (length 8), and `koAdvancers` (one per unresolved match). Most common failure mode for a complex multi-step form.
2. **Meta SHA fields missing.** `MetaSchema.safeParse(body)` requires `modelSha` and `snapshotSha`. If your dev runner doesn't inject them, the submit is structurally invalid before the route computes anything.
3. **DB insert throws.** Returns 500 → `kind: "server"`. If you're running against Postgres / Supabase / SQLite that isn't booted locally, this is the culprit.
4. **`canonicalizeScenario` or `computeRealityScore` throws** on a tied group, a runner-up that equals the winner, or a missing team code.

### Files to modify (in order)

1. `src/app/api/predictions/route.ts`
   * Read the whole file. Identify every `throw` and unhandled `await`.
   * Wrap the DB insert specifically in `try { ... } catch (err) { console.error(err); return jsonError("server", 500); }` so the server log carries the real cause.
   * In dev mode (`process.env.NODE_ENV !== "production"`), include the Zod issues in the 400 response body so the UI can show which field failed.
2. `src/lib/sim/predictionsApi.ts`
   * Confirm the four error kinds are differentiated downstream. Today they collapse.
3. The Zod schema file imported by `ScenarioPayloadSchema` (likely `src/lib/sim/schemas.ts`).
   * Surface field-level error messages instead of a generic "invalid".
4. `SubmitErrorPanel` component
   * Replace the single message with four targeted messages:
     * `network`: "Lost the connection. Try again."
     * `invalid`: "Bracket incomplete: {missing slots}". Use the Zod issues from step 1.
     * `rateLimit`: "Too many submits. Try again in {n}s."
     * `server`: "Model engine threw. We're looking at the logs."
5. The DB / persistence module imported by the route (look under `src/lib/db/` or co-located with the route).
   * Confirm the connection string in `.env.local`.
   * If local persistence is meant to be in-memory or filesystem JSONL for dev, gate it on `NODE_ENV !== "production"` and fall back when the real DB is absent.

### Definition of done

* Submitting a complete Full Bracket scenario from `localhost:3000` returns a `kind: "ok"` and routes to `/scenario/p/{id}`.
* Submitting an intentionally malformed scenario shows a precise field-level error in `SubmitErrorPanel`.
* The dev terminal carries a stack trace for any 500.

---

## Mission 2: Make the Full Bracket actually playable

### Diagnosis

Step 1 currently renders all 12 groups as a 3-column grid. Even with the dimming and the focused-border treatment, it's 48 teams of cognitive load on a single screen. The dimming was a band-aid; the layout is the real problem.

### Proposal: Funnel with an escape hatch

Three layers, all built on the state already in `ModeFullBracket.tsx`. No state-model rewrite. This is a render swap, not a refactor.

#### Layer 1: Single-group "stadium" view as default

Render only the active group at full width. Four teams as large tappable cards. Previous and next groups peek at the edges as 5% slivers, foreshadowing the carousel. On selecting winner+runner-up, auto-advance with a horizontal Framer Motion slide.

`motion` is already imported in `ModeFullBracket.tsx`. Reusing infrastructure, not adding it.

#### Layer 2: Mini-progress strip pinned to the top

Twelve dots labeled A through L. Filled = complete. Ringed = current. Tap-to-jump for power users. This replaces the "I need to see all 12 groups so I know where I am" need that the wall was solving in the wrong way.

#### Layer 3: Two magic buttons in the step header

* **Auto-fill all from Elo.** One click pre-fills winner + runner-up for all 12 groups by sorted Elo. The user can submit immediately ("I trust the chalk pick") or open any group to override. This is the casual-user feature that makes the mode viral.
* **Auto-fill remaining.** Same logic, but only for groups the user has not yet touched. Surfaces after they've filled at least one group themselves, so it respects their work.

#### Critical academic guardrail

**Auto-fill must source from raw Elo only, never from M0 through M★.**

The simulator's value (and the eventual Nyberg test) depends on the user's scenario being independent of the model's prediction. If Auto-fill secretly used M★, you'd be priming the user with the very thing the comparison is meant to surface.

Implementation: bake the latest registered WC2026 Elo snapshot into a static JSON at `src/lib/sim/elo.ts`. No live fetch. No model output.

Caveat copy under the button: "Auto-fill uses pre-tournament Elo. The model's call appears after you submit."

#### Optional Layer 4: "Show all 12" toggle

An icon button that swaps back to the current grid view for users who want the bird's eye. Persist the preference in `localStorage`. Costs almost nothing, respects power users.

### Net effect

| User type | Path | Time to submit |
|---|---|---|
| Casual | Click Auto-fill, glance, submit | ~8 seconds |
| Engaged | Step through 12 groups one at a time, slide momentum | ~2 minutes |
| Quant | Toggle to wall view, audit, submit | ~5 minutes |

### Files to modify

* `src/components/simulator/modes/ModeFullBracket.tsx`. Step 1 only. Steps 2 and 3 untouched.
* `src/lib/sim/elo.ts`. New file. Static JSON import of WC2026 team Elo from latest registered snapshot.
* No changes to other simulator modes (`ModeFinalFour`, `ModeChampionsPath`).

### Definition of done

* Default Full Bracket Step 1 view shows one group, slides to next on selection.
* Mini-progress strip shows 12 dots, current group ringed.
* Auto-fill button populates all unset groups by Elo. Caveat copy visible.
* "Show all 12" toggle works and persists.
* Existing Playwright suite still passes; add one test for Auto-fill correctness.

---

## Mission 3: Lift the color restriction (without inventing a new palette)

### Key insight

You already have the colors. They're sitting in `:root` in `globals.css`. They just aren't being used semantically in the simulator.

Existing tokens worth promoting:

| Token | Hex | Contrast on cream | Today's job |
|---|---|---|---|
| `--accent-focus` | `#0F6B7D` (deep teal) | 6.8:1 | unused on simulator canvas |
| `--edge-positive` | `#2B8A5F` (deep mint) | 4.7:1 | model edge over market (quant canvas) |
| `--edge-negative` | `#C4435E` (deep rose) | 5.2:1 | model edge negative (quant canvas) |
| `--gate-fired` | `#B07A00` (deep amber) | 4.6:1 | Volatility Gate fires (reserved; do not repurpose for general UI) |

### Architectural move: role-aliased tokens

Don't add new hex values. Add four `var()` aliases that name the UI role:

```css
/* In :root, globals.css */
--ui-guidance: var(--accent-focus);   /* teal: focus, active, current step */
--ui-success:  var(--edge-positive);  /* mint: completion, submitted */
--ui-danger:   var(--edge-negative);  /* rose: errors, destructive */
--ui-warning:  var(--gate-fired);     /* amber: caveats only */
```

Then sweep the simulator components per the rebind table.

### Rebind table

| Surface | Today | New |
|---|---|---|
| Active group border | `--accent-warm` | `--ui-guidance` |
| Active step header pill | `--accent-warm` | `--ui-guidance` |
| Mini-progress current dot | (none yet) | `--ui-guidance` |
| Mini-progress filled dot | (none yet) | `--ui-success` |
| "[ Done ]" badge | `--accent-warm` | `--ui-success` |
| `AccentPulse` on group completion | `--accent-warm` | `--ui-success` |
| `RealityScoreReveal` "edge positive" | `--edge-positive` | unchanged |
| Volatility Gate badge | `--gate-fired` | unchanged |
| `[ SEE HOW THE MODEL REACTS ]` CTA | `--accent-warm` | unchanged (brand CTA stays warm) |
| `SubmitErrorPanel` accent | brand | `--ui-danger` |

### Why this is architecture, not paint

1. **Quant canvas semantics stay intact.** `[data-canvas="quant"]` keeps `--edge-positive` and `--edge-negative` meaning "model edge over market", which is the project's load-bearing thesis. Aliasing them to general UI roles on the simulator canvas does not bleed into the quant canvas (CSS variable scoping handles that cleanly).
2. **Accessibility is preserved.** Every alias points at a token already audited for WCAG AA on cream. No new contrast bugs.
3. **Future retheming is cheap.** Dark mode or a mobile-only canvas changes four `var()` indirections, not every component.
4. **`--accent-warm` keeps a clear, narrow job:** brand CTA, simulator entry moments. Defensible split: warm = "act now"; teal = "you are here"; mint = "you completed this".

### Files to modify

* `src/app/globals.css`. Add four `--ui-*` aliases inside `:root`. Optionally also inside `[data-canvas="simulator"]` if that canvas needs to override (it shouldn't, since the aliases already point at canvas-stable colors).
* `src/components/simulator/modes/ModeFullBracket.tsx`. Sweep per rebind table.
* `src/components/simulator/SubmitErrorPanel.tsx`. Use `--ui-danger`.
* `src/lib/tokens.ts`. Add the four new role tokens to the TS export so any component reading tokens programmatically gets them.

### Definition of done

* `:root` contains the four `--ui-*` aliases.
* Simulator components compile and render with the new tokens.
* Quant canvas (`[data-canvas="quant"]`) is visually unchanged.
* No raw hex values introduced anywhere in the diff.

---

## Coding-agent brief (paste-ready)

Three missions, in this order. Each lands as its own PR.

**(1) Fix submit.**
Inspect `src/app/api/predictions/route.ts`. Reproduce the failing Full Bracket submit; capture the actual status code from DevTools Network and the server stack trace from the dev terminal. Wrap the DB insert in `try/catch` returning `jsonError("server", 500)` with `console.error`. In `src/lib/sim/predictionsApi.ts`, expand the `kind: "invalid"` branch to surface which fields the schema rejected (return Zod issues from the route in dev mode). Differentiate the four error messages in `SubmitErrorPanel`.

**(2) Refactor `ModeFullBracket.tsx` Step 1**
from a 12-group grid to a single-group carousel with peek slivers, a 12-dot mini-progress strip, an "Auto-fill all from Elo" button, an "Auto-fill remaining" button, and a "Show all 12" toggle persisted in `localStorage`. Auto-fill must source from raw Elo only (static JSON in `src/lib/sim/elo.ts`), never from M0 through M★. Add a one-line caveat under the button. Reuse the existing `motion` imports for the slide animation.

**(3) Add semantic UI tokens.**
In `globals.css`, add `--ui-guidance`, `--ui-success`, `--ui-danger`, `--ui-warning` as `var()` aliases of the existing `--accent-focus`, `--edge-positive`, `--edge-negative`, `--gate-fired`. Sweep the simulator components per the rebind table in this plan: active = guidance (teal), complete = success (mint), errors = danger (rose), brand CTA stays `--accent-warm`. Do not change any quant-canvas surface; the `[data-canvas="quant"]` overrides remain.

Run the full Playwright suite before each push. PR discipline per `CLAUDE.md`.

---

## Open questions for the architect

These are live-fire decisions that should be made before the coding agent starts:

1. Should the Auto-fill buttons appear before the user has touched any group, or only after the carousel renders? (Recommendation: yes, both, but "Auto-fill remaining" is hidden until at least one group has been filled manually.)
2. Should `localStorage` for the "Show all 12" toggle be scoped per-mode or global? (Recommendation: per-mode. A user who likes wall view in Full Bracket may not want it in Champion's Path.)
3. Should the dev-mode Zod issue surfacing in `route.ts` be gated by an explicit `?debug=1` query param instead of `NODE_ENV`? (Recommendation: yes, safer; production builds run dev mode locally during preview deploys.)
