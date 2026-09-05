# Pre-launch audit, 2026-05-28

T-14 days to WC kickoff. Three items audited on `cp-07-prelaunch-audit-and-fix` off main at `2054377` (cp-06 #72). Items 1 and 2 are read-only audits; Item 3 is investigate-then-stop. No production code or data changed.

---

## 1. Data freshness

### Live snapshot meta (verbatim)

`https://45analytics.com/data/latest/snapshot_meta.json`:

```json
{
  "schema_version": "9.0",
  "snapshot_id": "2026-05-28T01:51Z",
  "generated_at_utc": "2026-05-28T01:51:30Z",
  "code_sha": "8b1188b2343cca09",
  "data_sha": "sha256:49974caa284edc2eb31524afb92aca4b",
  "pre_reg_tag": "v1.0.0-MSTAR-LOCKED",
  "champion_model": "M_STAR",
  "mc_runs": 10000,
  "tournament_phase": "pre_tournament",
  "matches_settled": 0,
  "matches_remaining": 104,
  "kill_criteria_active": false,
  "notes": "Phase 7 M_STAR (= M2_fifa) snapshot under amendment v1.1; per-team probabilities aggregated from batch batch_20260512_013228Z; see osf/amendments/amendment_v1.1_data_completeness.md.",
  "active_batch_id": "batch_20260512_013228Z",
  "amendment_pointer": "osf/amendments/amendment_v1.1_data_completeness.md"
}
```

### `active_batch_id` lineage

| Source | Value |
|---|---|
| Live `snapshot_meta.json` | `batch_20260512_013228Z` |
| Local `data/calibration/active_batch.json` | `batch_20260512_013228Z` |

Match. The deployed nightly is aggregating from the same locked batch the OSF lockfile points at.

Note on the model label: the prompt expected `champion_model = "M2_fifa"`, but the live string is `M_STAR`. The `notes` field documents that the two are the same (`Phase 7 M_STAR (= M2_fifa) snapshot under amendment v1.1`); `M_STAR` is the post-lockdown public name and `M2_fifa` is the internal model-roster identifier. Same underlying batch, same Monte Carlo output. Not a regression - a relabel that landed before cp-04.

### Top-of-table p_champion (live vs cp-05 expected)

| Team | Live `p_champion` | cp-05 expected | Match |
|---|---|---|---|
| Spain | 0.1824 | ~18.2% | ✓ |
| France | 0.1488 | ~14.9% | ✓ |
| Argentina | 0.1374 | ~13.7% | ✓ |
| England | 0.0830 | ~8.3% | ✓ |
| Morocco | 0.0642 | - | (next bucket) |

All four named teams sit within rounding of the cp-05 dry-run values. No drift.

### Day-over-day diffs

Compared the prior snapshot (`2026-05-27T19:39Z`, the cp-05a probe run) against today's (`2026-05-28T01:51Z`).

`tournament.json` (file size identical at 20,325 bytes):

```diff
< "generated_at_utc": "2026-05-27T19:39:17Z",
> "generated_at_utc": "2026-05-28T01:51:30Z",
< "snapshot_id": "2026-05-27T19:39Z",
> "snapshot_id": "2026-05-28T01:51Z",
```

`freshness.json`:

```diff
< "generated_at_utc": "2026-05-27T19:39:17Z",
> "generated_at_utc": "2026-05-28T01:51:30Z",
< "snapshot_id": "2026-05-27T19:39Z",
> "snapshot_id": "2026-05-28T01:51Z",
```

`evaluation_metrics.json` (size identical at 843 bytes):

```diff
< "snapshot_id": "2026-05-27T19:39Z"
> "snapshot_id": "2026-05-28T01:51Z"
```

The cp-04 dual-SE block is present and intact on the live file:

```json
"kill_criteria_check": {
  "tripped": false,
  "gap_se": 1.75,
  "threshold_se": 2.0,
  "marginal_gap_se": 6.22,
  "status": "pre_tournament_locked",
  "condition": "M2 vs M0 stratified CV log-loss",
  "timestamp": "2026-04-23T00:00:00Z",
  "action_taken": "M_STAR_LOCKED"
}
```

### Plain-language summary for Nicolás

The data is the OSF-locked M2 batch (live system calls it `M_STAR`, same thing under the post-lockdown relabel), and the nightly is correctly refreshing only the timestamps. The per-team probabilities won't change until either a new Monte Carlo batch is generated or real match outcomes start flowing in on June 11. Site is faithful to the preregistration.

---

## 2. Historical snapshots picker

### Available snapshots (live manifest)

```
2026-05-07T00:00Z
2026-05-12T12:44Z
2026-05-27T19:39Z
2026-05-28T01:51Z
```

Four snapshots. Note the gap: no snapshot between 2026-05-13 and 2026-05-26 (the period the cron was disabled by hand on 2026-05-12 pending the cp-05 rewire). cp-05a's first successful nightly is the 2026-05-27 probe.

### Picker constants

`website/src/lib/data/snapshotPicker.ts`:

```
WEEK_DAYS = 7
WEEK_TOLERANCE_DAYS = 2
```

The window for "7 days ago" is therefore `[now - 9 days, now - 5 days]`. The picker iterates available snapshots, filters by `Math.abs(age - 7) <= 2`, and keeps the closest match.

### Today's resolution (2026-05-28)

| Snapshot | Age | In `[5, 9]`? |
|---|---|---|
| 2026-05-28T01:51Z | 0 days | excluded (= current) |
| 2026-05-27T19:39Z | 1 day | no (too recent) |
| 2026-05-12T12:44Z | 16 days | no (too old) |
| 2026-05-07T00:00Z | 21 days | no (too old) |

Result: `weekAgo = null`. The bracket page accordingly renders `[ HISTORICAL SNAPSHOTS UNAVAILABLE ]`. The `selected` snapshot falls through to `current` on a fresh visit (no `?snapshot=` param).

### Self-heal date

Once a snapshot ages into the `[5, 9]` window the picker starts returning it. The 2026-05-27 probe enters the window when it turns 5 days old, which is approximately 2026-06-01 (mid-day UTC; depends on `Math.round` boundary). The 2026-05-28 nightly enters approximately 2026-06-02.

So the bracket page's historical UI heals itself on or around **2026-06-01**, assuming the cron keeps writing nightlies (cp-05a's drop of the PAT dependency makes that more likely than before). The prompt's "2026-06-04" estimate was conservative - it assumed only the 05-28 snapshot would count and didn't account for the 05-27 probe.

### Plain-language summary for Nicolás

This is not a bug. It's a direct consequence of the 2026-05-12 → 2026-05-27 cron gap. By June 1 the picker heals itself. No action needed unless you want to backfill a synthetic 7-day-ago snapshot, which is risky (the file would have to look like a real snapshot to a future auditor) and not recommended.

### Optional sanity check

Skipped. The diagnosis is unambiguous (manifest gap + picker logic both inspected); synthesizing a snapshot in dev to prove the picker works when its data is present would not change the conclusion and carries a small risk of accidentally committing the synthetic file.

---

## 3. Scenario simulator UI

### What cp-03 shipped (commit fd3a869, PR #67)

cp-03 introduced `StickyProgressMeter`, a shared bottom-of-viewport bar mounted on the three mode pages (`/scenario/final-four`, `/scenario/champions-path`, `/scenario/full-bracket`). Left column reads `[ STEP n OF N : MODE_LABEL ]` while picks are in progress and swaps to `[ READY ]` in mint once the mode considers itself submittable. Right column carries the `[ ARM ALERT ]` CTA, which is enabled only when ready and which reuses each mode's existing `handleSubmit`. Each mode's `page` variant deleted its in-flow submit button so the sticky CTA is the only submit affordance on the dedicated routes; the home-page inline variant of `ModeFinalFour` kept its legacy button because the meter is not mounted there.

PR self-report claims `paddingBottom: var(--sticky-meter-h, 96px)` was added to each mode's page `<section>` to keep the picker controls above the meter. That part works. The site footer was not given the equivalent compensation - that is the structural source of the overlap (see "Cause of the overlap" below).

### Sticky footer component

| Field | Value |
|---|---|
| File | `website/src/components/simulator/ui/StickyProgressMeter.tsx` |
| Component | `StickyProgressMeter` |
| Mount sites | `ModeFinalFour.tsx` (page variant only), `ModeChampionsPath.tsx`, `ModeFullBracket.tsx` |
| CSS positioning | `fixed inset-x-0 bottom-0 z-40` |
| Background | `var(--bg-panel-elev)` (opaque) |
| Unmount condition | `isSubmitted === true` |

### What `[ ARM ALERT ]` actually does

It calls `handleSubmit` - the same submit handler that the deleted in-flow `[ See how the model reacts ]` button used to call. There is no separate alert / email / notification API behind it; the verb "ARM" is metaphorical, framing the act of locking in your scenario as arming the model-comparison reveal. Confirmed by reading `StickyProgressMeter.tsx:81` (`onClick={isReady ? onSubmit : undefined}`) and the three mode files where `onSubmit={handleSubmit}` is passed in.

### Where the "see how the model reacts" CTA went

It is `website/src/components/simulator/modes/ModeFinalFour.tsx:572`. It still renders, but only on the inline (home-page) embed of Final Four, guarded by `isInline`:

```tsx
{isInline ? (
  <button type="button" onClick={handleSubmit} ...>
    {submitting ? "[ Submitting... ]" : "[ See how the model reacts ]"}
  </button>
) : null}
```

cp-03 removed the equivalent block from the page variants of all three modes; the home-page Final Four embed was preserved because the sticky meter is not mounted there.

So Nicolás's memory is correct: on the dedicated mode pages, the CTA was renamed-and-relocated from in-flow `[ See how the model reacts ]` to sticky `[ ARM ALERT ]`. Same handler. Different copy. Different position.

### Current submit-and-compare flow (on `/scenario/final-four`)

1. User drags 4 teams into the slots.
2. As picks accumulate, the sticky meter at the bottom advances from `[ STEP 0 OF 4 : FINAL FOUR ]` to `[ STEP 4 OF 4 : FINAL FOUR ]` and then flips to `[ READY ]`.
3. The right-column CTA changes from grayed `[ ARM ALERT ]` to active `[ ARM ALERT ]` in peach.
4. User clicks `[ ARM ALERT ]` → `handleSubmit` fires → reveal renders.

The `Pick N more teams to submit.` helper line at the bottom of the picker is informational; it does not auto-submit. Submission is gated only on the user clicking `[ ARM ALERT ]`.

### Cause of the footer overlap

Two contributing facts:

- The meter is `position: fixed; bottom: 0; z-index: 40` with an opaque background.
- The simulator layout (`website/src/app/(simulator)/layout.tsx`) is a vertical stack of `EditorialMasthead`, `<main>`, `SiteFooter`. `SiteFooter` is in document flow with no `padding-bottom` adjustment and no stacking-context override.

When the user scrolls to the bottom of the page, the SiteFooter sits underneath the fixed meter and is occluded. cp-03 added bottom padding to each mode's `<section>` (so picker controls stay visible above the meter), but did not add an equivalent compensation to either the `<main>` or the `SiteFooter` itself. The picker problem was solved; the footer problem was missed.

### Proposed fix options

#### Option A - Compensate the SiteFooter (small, surgical)

Add `padding-bottom: var(--sticky-meter-h, 96px)` to the `SiteFooter` (or a wrapping `<main>`) whenever a sticky meter is mounted on the page. Two ways to implement:

- Pass a prop from the simulator layout that conditionally adds the padding. Verbose because the layout doesn't know whether a mode is mounted; would need a context or a CSS class toggled by the page.
- Add a global rule: `body[data-has-sticky-meter] footer { padding-bottom: ... }`, where the meter component sets `data-has-sticky-meter` on `<body>` in a `useEffect`. Cleaner; localizes the coupling to the meter itself.

Effort: ~30 minutes. Risk: very low. Preserves cp-03's intent.

#### Option B - Hide the meter when the footer is in view (intersection observer)

Mount an `IntersectionObserver` on the SiteFooter. When the footer enters the viewport, fade the meter out (and disable it). When the footer leaves, fade it back in. Behaviorally clean - no occlusion ever - but introduces motion on scroll which can feel busy, and the user loses access to `[ ARM ALERT ]` while the footer is visible (mildly bad if they want to submit while reading the footer).

Effort: ~60 minutes. Risk: low-medium. Adds a behavioral surprise (CTA disappears).

#### Option C - Make the meter shorter / narrower / right-aligned (visual de-conflict)

Replace the full-width fixed bar with a small right-aligned floating chip (e.g. 240px wide, anchored to `bottom-4 right-4`). It would visually overlap the right edge of the footer but not the prose columns; the footer becomes readable. Loses the full-width band design from cp-03.

Effort: ~45 minutes. Risk: low. Changes the visual language cp-03 deliberately chose.

#### Option D - Restore the in-flow `[ See how the model reacts ]` button on page variants and drop the sticky meter

Effectively a partial revert of cp-03 on the page variants. The meter would still exist for the inline embed (if useful there at all). The simplest path back to a layout with no overlap; loses the "always-visible CTA" property cp-03 was trying to achieve.

Effort: ~30 minutes. Risk: low for code, higher for product (undoes a design decision). Worth it only if cp-03's "sticky CTA" hypothesis hasn't borne out in user behavior.

#### Option E - Lower the meter's z-index and let the footer pass over it (do nothing-ish)

`z-index: 0` on the meter, position-relative on the footer with `z-index: 10`. The meter would visually disappear under the footer at scroll-bottom. Simple, but the meter is opaque so the picker controls would no longer see it underneath - they'd still be visible above the meter because of the section padding, but the meter would appear "buried" by the footer, which looks like a layout bug from a different angle.

Effort: ~15 minutes. Risk: low for code, looks broken in a different way. Not recommended; listed for completeness.

### Recommendation

Option A. It is the smallest change that preserves cp-03's design intent. The `body[data-has-sticky-meter]` variant of A is the cleaner implementation because it keeps the coupling inside the meter component and doesn't force the layout to know about it.

Awaiting Nicolás's decision before implementing.

---

## Phase 2 fix (chosen: Option A + rename)

Implemented per Nicolás's pick:

- **Overlap fix.** `StickyProgressMeter` sets `document.body.dataset.hasStickyMeter = "true"` in a `useEffect` on mount and clears it on unmount. A single rule in `website/src/app/globals.css` adds `padding-bottom: var(--sticky-meter-h, 96px)` to `body[data-has-sticky-meter]`. Extending the body's scrollable area pushes the SiteFooter up out from under the fixed meter at scroll-bottom; coupling stays inside the meter (no prop drilling, no layout context). Same `96px` fallback the mode sections already use for picker bottom-padding.
- **Label rename.** `[ ARM ALERT ]` → `[ See how the model reacts ]` in the sticky meter, matching the inline home-embed pattern at `ModeFinalFour.tsx:572`. The submit-in-flight string mirrors the home embed: `[ Submitting... ]`. To support that, a new optional `submitting?: boolean` prop is threaded from each mode (all three mounts already had a `submitting` state); defaults to `false` so existing callers keep working.
- **aria-label** also updated: "See how the model reacts to this scenario" / "See how the model reacts (not ready)" (was "Arm alert for this scenario" / "Arm alert (not ready)").
- **Spec update.** `tests/visual/sticky-progress-meter.spec.ts` updated for the rename (button-role accessible-name regex and CTA-text assertion). 6/6 specs still green.
- **Untouched.** `PredictionAlertConfigurator` (post-submit reveal panel) and its own `[ ARM ALERT ]` button: not modified. That label is accurate there.

### Phase 2 verification (dev, localhost:3000)

| Surface | Effect / data attr | Padding | Meter text | Btn hydrated | Footer visible at scroll-bottom |
|---|---|---|---|---|---|
| `/scenario/final-four` | `body[data-has-sticky-meter]` set | `96px` | `[ READY ] / [ SEE HOW THE MODEL REACTS ]` (4 teams in localStorage) | yes | yes |
| `/scenario/champions-path` | set | `96px` | `[ STEP 0 OF 4 : CHAMPION'S PATH ] / [ SEE HOW THE MODEL REACTS ]` | yes | yes |
| `/scenario/full-bracket` | set | `96px` | `[ STEP 0 OF 75 : FULL BRACKET ] / [ SEE HOW THE MODEL REACTS ]` | yes | yes |
| `/ledger` (no meter) | not set | `0px` | n/a | n/a | n/a (correctly scoped) |
| `/` (no meter) | not set | `0px` | n/a | n/a | n/a |

cp-04 preserved: `/ledger` still reads "AWAITING TOURNAMENT KICKOFF" and "KILL CRITERIA TRIPPED" is absent.
cp-06 preserved: all three `(editorial|quant|simulator)/loading.tsx` files still present and untouched.

### Phase 2 quality gates

| Gate | Command | Result |
|---|---|---|
| TypeScript | `pnpm tsc --noEmit` | exit 0 |
| Lint | `pnpm lint` | 8 errors / 8 warnings, all in pre-existing files (`useDecryptValue.ts`, `useTypewriter.ts`, `db/index.ts`, `email/resend.ts`, `runEvaluator.test.ts`); net delta 0 against main; 0 hits on any touched file |
| Unit | `pnpm test` | 324/324 passed |
| Visual (sticky meter) | `pnpm test:visual tests/visual/sticky-progress-meter.spec.ts` | 6/6 passed |

### Dev-server note (not a code issue)

While verifying, the running dev server entered a streaming-SSR hang state: one Suspense boundary (`B:2`/`S:2`) never resolved, which blocked client hydration of everything below `<body>`. That made the meter render via SSR but never run any client effect. The same SSR output on production hydrates cleanly, confirming this was a stuck dev session rather than a regression. Restarting the dev server cleared it. Worth knowing for the next session.

---

## Phase 1 merge-readiness checklist

```
Y - Item 1 audit complete: live snapshot meta captured, active_batch_id matches, day-over-day diffs show timestamps-only.
Y - Item 1 doc includes the one-sentence plain-language summary for Nicolás.
Y - Item 2 audit complete: available snapshots listed, cron-gap diagnosis explicit, self-heal date named.
Y - Item 2 optional synthetic snapshot test skipped (diagnosis is unambiguous; risk of stray commit outweighs sanity-check value).
Y - Item 3 investigation complete: cp-03 diff read, sticky footer component identified, "see how the model reacts" history traced (still alive on inline home embed at ModeFinalFour.tsx:572), current submit flow documented.
Y - Item 3 proposes 5 options with effort estimates. Stopped before implementing.
Y - Audit doc is the only material file added; no production code changes; no production data file changes.
Y - Branch is cp-07-prelaunch-audit-and-fix, off latest main (2054377), ready to PR (draft).
```

## Phase 2 merge-readiness checklist

```
Y - Phase 2: Item 3 fix implemented per Nicolás's chosen option (A + rename).
Y - Phase 2: dev verification of the fix (no overlap, submit flow active, no console errors). Required restarting the dev server once to clear a streaming-SSR hang in the prior session.
Y - Phase 2: pnpm tsc --noEmit clean; pnpm lint net delta 0 vs main; pnpm test 324/324; pnpm test:visual sticky-progress-meter 6/6.
Y - Phase 2: cp-04 preserved (Ledger pill reads "AWAITING TOURNAMENT KICKOFF") and cp-06 preserved ((editorial|quant|simulator)/loading.tsx all present).
Y - Phase 2: screenshot of the fixed simulator at scroll-bottom (footer visible above meter) attached via the session preview.
```
