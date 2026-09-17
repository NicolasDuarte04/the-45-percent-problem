# June 11 kickoff runbook

Operator guide for transitioning the project state from `pre_tournament` to
`live` on the opening day of the FIFA World Cup 2026. The first match kicks
off on 2026-06-11. This document is the exact sequence the operator runs
that day, plus the verification steps that confirm each transition took
effect.

This runbook is intended for a single operator with shell access to the
project root and write access to `public/data/latest/` and
`data/snapshots/`. It assumes the signed Git tag `v1.0.0-mstar-lock` is
present and verifiable, the snapshot pipeline is healthy, and the
orchestrator service is reachable.

---

## Phase 0: pre-flight checks (run T minus 24 hours)

The goal of these checks is to catch any drift in the locked state before
the operator is under kickoff-day time pressure.

**Step 0.1.** Verify the signed Git tag from the project root:

```
git verify-tag v1.0.0-mstar-lock
```

The tagger identity, GPG fingerprint, and commit SHA must match the values
published on the OSF record at `osf.io/spmkg`. Any mismatch is a
stop-the-line condition. Do not proceed.

**Step 0.2.** Confirm the calibration corpus snapshot SHA matches the
sealed value:

```
sha256sum data/snapshots/cv_battery_2026-04.parquet
```

Compare the output to the value of `data_snapshot_sha` under the `meta`
block in `evaluation/pre_reg_constants.yaml`. The two must be byte-equal.
Any mismatch is a stop-the-line condition.

**Step 0.3.** Confirm the latest snapshot is internally consistent. Read
`public/data/latest/freshness.json` and verify its `snapshot_id` matches
`public/data/latest/snapshot_meta.json::snapshot_id`. Both must equal the
post-Phase-8 lockdown ID `2026-04-22T00:00Z`.

**Step 0.4.** Run the build verification:

```
cd website && pnpm build 2>&1 | tail -30
```

Expect exit 0 with no MDX or schema errors. If anything is red, halt and
fix before kickoff.

---

## Phase 1: state transition (run T minus 1 hour)

**Step 1.1.** Open `public/data/latest/snapshot_meta.json` in an editor.
Locate the `tournament_phase` field. Change the value from
`"pre_tournament"` to `"live"`. Save the file.

Do not change `matches_settled` at this point. It must remain `0` until
the first match settlement handler increments it. The operator's job in
this step is the phase flip only.

**Step 1.2.** Append a phase-transition row to the snapshot registry. Use
the project's existing registry helper rather than editing the JSONL file
by hand:

```
python -c "
from utils.hasher import SnapshotRegistry
r = SnapshotRegistry('data/snapshots/snapshot_registry.jsonl')
r.register(sha=None, manifest={}, notes='phase_transition: pre_tournament -> live')
"
```

If the helper signature differs in the live codebase, fall back to a
hand-appended JSONL row with the fields `timestamp`, `event`, `from`,
`to`, and `operator`. Do not delete or rewrite existing rows.

**Step 1.3.** Re-run the build verification one more time to confirm
nothing in the prose pages or the live components depends on
`pre_tournament` as a literal string match:

```
cd website && pnpm build 2>&1 | tail -30
```

Expect exit 0. If a page now fails to build, the dependency is in the
component or the schema and not in this runbook; halt and fix before
proceeding.

---

## Phase 2: engine cadence verification (run T minus 30 minutes)

The orchestrator reads `tournament_phase` and selects between the
off-hours tick (5 minutes) and the live tick (60 seconds) automatically.
Within the `live` phase, it further selects between the live-match tick
(60 seconds) and the inter-match tick (5 minutes). The operator's role is
to confirm the switch happened.

**Step 2.1.** Query the orchestrator for its current cadence:

```
python orchestrator/cli.py status
```

Expect output that includes:

```
phase: live
tick_interval_seconds: 60
last_forecast_written_at: <recent timestamp>
```

If `phase` is still `pre_tournament`, the orchestrator has not picked up
the phase change. Restart the orchestrator service and re-query:

```
systemctl restart orchestrator
python orchestrator/cli.py status
```

Substitute the actual service name if it differs from `orchestrator`. The
status command must return `phase: live` and `tick_interval_seconds: 60`
within 60 seconds of the restart.

**Step 2.2.** Tail the orchestrator log for one full cycle to confirm the
engine is running and writing forecasts:

```
tail -f logs/pipeline.log
```

Within 60 seconds you should see at least one structured log line
indicating `forecast_written` for an upcoming match, with fields
`match_id`, `model_variant`, `code_sha`, and `data_snapshot_sha`. If the
log is silent for more than 90 seconds, raise an incident and halt.

---

## Phase 3: first-match transition (run when the first match settles)

The first group-stage match settles approximately 2 hours after kickoff.
The orchestrator's `match_settled` handler is the path that mutates state.
The handler does the following automatically; the operator role is
verification only.

**Automatic handler actions:**

1. Increments `matches_settled` in `snapshot_meta.json` from `0` to `1`.
2. Appends one row per model variant to `data/snapshots/forecast_log.jsonl`. Five rows total: M0, M1, M2, M3, and M★. M★ is currently provisionally M0 by the Phase 8 firing, so its row carries the same probability vector as the M0 row; this is expected and is documented at `vault/kill-criteria`.
3. Updates the rolling Brier, log-loss, and RPS values shown on the Transparency Ledger.
4. Recomputes the calibration tile shown on the Divergence Terminal.

**Step 3.1.** Verify the increment:

```
jq '.matches_settled' public/data/latest/snapshot_meta.json
```

Expect `1` after the first match settles. Re-query after the second match
settles and expect `2`. The value is a strictly monotone counter; it
never resets, never decreases, and never skips.

**Step 3.2.** Verify the forecast log is appending and is not overwriting:

```
wc -l data/snapshots/forecast_log.jsonl
```

Run the command, note the line count, wait 60 seconds, run it again. The
count must be the same or larger; never smaller. If the count drops, the
log has been truncated, which is a research-integrity incident. Halt and
investigate before any further forecasts are written.

**Step 3.3.** Verify the new row carries the post-Phase-8 fields. Tail
the most recent five rows:

```
tail -n 5 data/snapshots/forecast_log.jsonl | jq .
```

Each row should carry: `timestamp_utc_ms`, `match_id`, `model_variant`
(one of `M0`, `M1`, `M2`, `M3`, `M_star`), `code_sha`,
`data_snapshot_sha`, `probability_vector`, `mc_seed`, and
`bankroll_mode`. The `data_snapshot_sha` must equal the calibration
corpus SHA from Step 0.2; the live tournament data lands in a separate
file and is not allowed to mutate this SHA.

---

## Phase 4: calibration corpus lock verification (run after the first match settles)

The calibration corpus is `data/raw/historical_matches.parquet` plus the
derived snapshot at `data/snapshots/cv_battery_2026-04.parquet`. Both
must remain byte-identical to the values sealed in the pre-registration.
After the first live match settles, re-run the SHA checks:

```
sha256sum data/raw/historical_matches.parquet
sha256sum data/snapshots/cv_battery_2026-04.parquet
```

The first output must equal the value originally registered when the
historical corpus was hashed at the end of Phase 2.2. The second must
equal `evaluation/pre_reg_constants.yaml::meta.data_snapshot_sha`. Any
mismatch means the calibration corpus has been mutated, which is a
research-integrity incident and requires an OSF amendment to disclose.

**Step 4.1.** Confirm the live tournament data and the calibration corpus
are stored on separate paths. Live tournament results land in
`data/snapshots/live_tournament_2026.parquet`. The calibration corpus is
in `data/raw/historical_matches.parquet`. The orchestrator's write-path
allowlist must not include `data/raw/`. Verify this by inspecting the
orchestrator config:

```
grep -E "write_path|allowed_paths" config.yaml
```

Expect to see `data/snapshots/` and `public/data/latest/` listed; expect
to NOT see `data/raw/`. If `data/raw/` appears in any write-path, halt
and remove it before any further forecasts are written.

---

## Stop-the-line conditions

If any of the following happens during the transition, halt the
orchestrator and open an incident.

* The signed Git tag fails to verify.
* Either of the calibration SHAs mismatches its sealed value.
* The orchestrator does not switch to the 60-second tick within 5 minutes of the phase flip.
* The forecast log fails to append for two consecutive cycles after the first match kicks off.
* The forecast log line count decreases between two consecutive checks.
* The kill-criterion status block on `vault/kill-criteria` reads anything other than the Phase 8 firing badge before the R16 checkpoint resolves.
* `data/raw/` appears in the orchestrator's write-path allowlist.

To halt the orchestrator cleanly without losing in-flight forecasts:

```
systemctl stop orchestrator
```

Confirm it is stopped:

```
systemctl status orchestrator
```

Then page the on-call contact listed in `docs/lockdown_certificate.md`.

---

## Post-transition checklist

After Phases 0 through 4 are complete and at least one match has settled,
the operator confirms the following are all true:

* `tournament_phase` in `snapshot_meta.json` is `"live"`.
* `matches_settled` is incrementing on each match settlement (1 after the first match, 2 after the second, and so on through 64).
* Orchestrator is on its 60-second tick during live match windows and 5-minute tick between matches.
* Forecast log is appending; no row deletions; line count strictly monotone.
* Calibration corpus SHAs match their sealed values.
* The Vault index, the Ledger, and the Terminal all read the same `snapshot_id`.
* The kill-criterion status block continues to display the Phase 8 firing badge.

When all eight items hold, the project is officially in live operation.
The next state transition is the R16 kill-criterion re-run, which fires
automatically when the eighth Round of 16 match settles. That transition
has its own runbook; this one is closed at this point.
