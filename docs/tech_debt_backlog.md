# Tech debt backlog

Items captured during the Phase 8 lockdown verification pass and the snapshot
schema migration that followed it. Each entry names the artifact, the missing
work, and the trigger that should bring it forward. None of the three items
block the Vault shipment; all three should land before the Round of 16 begins.

---

## 1. Strict Zod typing for `snapshot_meta` extras

**Status:** Open.

**Artifact:** `website/src/lib/schemas/snapshot.ts` (or wherever
`SnapshotMetaSchema` is currently defined).

**Context:** The Phase 8 lockdown fixture added two fields to
`public/data/latest/snapshot_meta.json` that the existing schema does not
strictly type: `label` (a free-form string describing the snapshot, currently
`"Phase 8 lockdown: kill criterion fired"`) and `phase` (an integer denoting
the project phase, currently `8`). The Zod schema accepts them under its
default-permissive parser, but they are not declared, which means a typo on
either field would slip through validation silently.

**Work to do:**

* Add `label: z.string().optional()` and `phase: z.number().int().min(1).max(20).optional()` to `SnapshotMetaSchema`.
* Decide whether either field should be non-optional going forward. If yes, drop the `.optional()` modifier and update every fixture that lacks the field.
* Audit consumers (`KillCriteriaStatusBlock`, `LedgerSummaryPanel`, `TournamentCalibrationStrip`, the contract tests) and replace any reach-into-permissive-bag reads with typed reads.
* Add a contract test that asserts the schema rejects a `phase` value of zero, a non-numeric `phase`, and a non-string `label`.

**Trigger:** First time another consumer needs to read `phase` programmatically,
or first schema migration that touches `snapshot_meta.json`. Whichever comes
first.

---

## 2. Playwright a11y and visual diff coverage for the Vault

**Status:** Open.

**Artifact:** `website/tests/a11y/`, `website/tests/visual/`, plus the
Playwright config in `website/playwright.config.ts`.

**Context:** The post-Phase-8 verification pass had `pnpm test:a11y` and
`pnpm test:visual` skipped because the verification sandbox did not have a
Playwright chromium browser installed. The nine Vault essays plus the three
reference pages (glossary, notation, citation) and the methodology TSX page
have not been run through the axe a11y rules, and they have no visual diff
baseline. The contract suite (vitest 51 of 51, tsx contract runner 48 of 48)
is fully green; the browser-driven suites are untested for the new content.

**Work to do:**

* Run `pnpm playwright install chromium` on a workstation with full network access.
* Run `pnpm test:a11y` against all twelve Vault routes plus `methodology` and the index. Capture any axe violations and file each as a separate ticket.
* Run `pnpm test:visual` to capture fresh visual baselines for the same set of routes. Commit the baseline images to the repo.
* Re-run the full suite under the production build (`pnpm build && pnpm start`) rather than the dev server, since the dev server can hide hydration issues that the production build surfaces.
* Add the Vault routes to the Playwright sharding config so the suite stays fast as more pages land.

**Trigger:** Before the first public push of the live ledger and terminal at
kickoff. The Vault is part of the public surface; it must clear a11y before
the tournament starts.

---

## 3. R16 kill-criterion re-run smoke test

**Status:** Open.

**Artifact:** `website/tests/contracts/kill_criteria.r16_rerun.test.ts` (new
file) and the corresponding code path in
`evaluation/kill_criteria_check.py`.

**Context:** The kill criterion fires twice in the protocol. Once on Phase 8
cross-validation hold-out data (already fired, recorded in the snapshot
fixture). Once on cumulative live tournament log-losses after the eight Round
of 16 matches settle. The first firing has fixture coverage and a passing
contract test. The second firing has no test that actually exercises the code
path that re-runs the criterion when the eighth R16 match closes.

**Work to do:**

* Construct a fixture with eight settled R16 matches, plus the 24 R32 matches and 72 group-stage matches that precede them. Use realistic but synthetic outcomes.
* Call the cumulative log-loss aggregator and the kill-criterion re-run function on the fixture.
* Assert the two possible outcomes:
  1. Criterion still failing because M★ is provisionally M0 (the M0-versus-M0 comparison is degenerate; the function should return a clearly-typed `RerunStatus.degenerate_no_op` rather than firing or passing).
  2. Criterion newly meaningful only if an OSF amendment has restored a non-baseline M★ before R16. Test this branch by injecting an amendment record into the fixture and asserting the re-run produces a real pass-or-fail decision.
* Confirm the snapshot fixture would update correctly in either branch by mocking the writer and inspecting the proposed diff.

**Trigger:** Before the Round of 16 begins. The first R16 match is on or
about 2026-06-30 by the FIFA 2026 schedule. This needs to land at least two
weeks before that date so any test failure has time to feed back into a fix.

---

## Notes on stewardship

All three items belong to the same general category: things the Phase 8
verification pass surfaced but did not block on. None of them affects the
Vault content or the kill-criterion firing as currently displayed. They are
about ensuring the project's evaluation discipline survives contact with
live tournament data.

When any of these items lands, mark the entry as `Closed` here, link the
landing PR or commit, and move the entry to a `## Closed` section at the
bottom rather than deleting it. The backlog is a permanent record of the
debt the project carried; closed items document how it was paid down.
