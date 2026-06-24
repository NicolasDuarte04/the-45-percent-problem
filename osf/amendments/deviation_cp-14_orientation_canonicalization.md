# Deviation: cp-14 settled-row orientation canonicalization (neutral venues)

**Type:** Deviation from the pre-registered pipeline (not an amendment to the
pre-registered model, fixtures, or hypotheses).
**Pre-registration:** osf.io/spmkg.
**Champion model:** M2_fifa (M_STAR), locked. This deviation does NOT unlock,
retrain, or modify the champion model, the simulation engine, the frozen batch
`batch_20260512_013228Z`, or any locked fixture or pre-registered parameter.
**Date filed:** 2026-06-24.
**Builds on:** `deviation_cp-14_live_data.md` (the settled-row scoring pipeline).

---

## 1. Summary

The cp-14 scoring pipeline maps each settled result onto its locked group
fixture by an exact, orientation-sensitive team-pair key (`home_code > away_code`)
and HALTs the nightly regeneration if any in-scope settled row fails to map. On
2026-06-23 the regeneration began halting on one row: the settled result for the
Group K match between DR Congo and Colombia, reported by the upstream results
feed (Football-Data) as `FD537406` with Colombia as home and DR Congo as away.
The locked fixture (`M46`) records the opposite home/away designation: DR Congo
home, Colombia away. The two keys (`COL>COD` versus `COD>COL`) therefore did not
match, the row was rejected as unmapped, and the snapshot correctly froze rather
than publish a result it could not place. Nothing was corrupted; the guard did
its job.

This deviation adds a narrow, deterministic canonicalization step so that a
genuine result reported in the reverse home/away order is scored against the
fixture it truly belongs to, **at neutral venues only**.

## 2. The rule

Settled-row home/away orientation is canonicalized to the pre-registered fixture
orientation for neutral-venue group fixtures only: when a settled result's team
pair matches a locked fixture in reversed order, the row's home/away codes and
goals are swapped together (loss-less, since a neutral venue carries no
home-field term), so the frozen champion forecast is scored against the result
it genuinely belongs to; non-neutral orientation disagreements continue to HALT
the regeneration for human review.

## 3. Why this is loss-less, and why neutral only

All 72 group-stage fixtures of the 2026 World Cup are played at neutral venues
(`is_neutral = True` in the locked fixtures parquet). The frozen champion
distribution for a neutral fixture carries no home-field advantage term: the
home/away labels are a nominal listing order, not a strength input. Swapping the
two team codes **and** the two goal values together is therefore an identity
transformation on the result (a 2-1 win for the team listed home becomes the
same 2-1 win recorded as a 1-2 result for the locked-home team), and the realized
1X2 outcome class is preserved exactly. The frozen forecast is unchanged; only
the row's orientation is reconciled to the locked fixture before scoring.

A non-neutral fixture is different: there the home/away designation carries a
real home-field term, so a reversed row is a substantive disagreement that cannot
be silently swapped. Such a row is **not** canonicalized; it falls through to the
existing unmapped HALT for human review. No non-neutral group fixture exists
under the current locked schedule, so this branch is not reachable with present
data; it is retained as a correct, tested invariant for knockouts and any future
schedule.

## 4. What is NOT weakened

The bijection guard is not relaxed. The canonicalization runs only on rows whose
own forward key is absent, and only when the reversed key matches exactly one
locked **neutral** fixture. Uniqueness is guaranteed because the model-side map is
validated as an exact bijection before any settled row is considered. Every other
hard stop remains armed and unchanged: an unknown team pair, a score conflict on
one fixture, a double-claim, a canonical-id-versus-team disagreement, a settle
timestamp that predates kickoff, and a non-neutral orientation disagreement all
still HALT. A result is never invented, never purged, and never mapped to a
fixture its teams do not genuinely belong to. Each canonicalization is logged
(`FD{id} -> M{NN}`) so the reconciliation is visible in the regeneration record.

## 5. Effect on the published record

For the current settled set this resolves exactly one row (`FD537406` to `M46`)
and adds Colombia's result to the champion calibration ledger scored against
M46's frozen pre-tournament distribution. The previously settled rows are
unaffected: they already mapped in their locked orientation and are byte-for-byte
unchanged. The narrow calibration claim of `deviation_cp-14_live_data.md` is
unchanged in kind; this deviation only lets one already-played group match enter
the same record on the same terms.

---

*Repository record only. The operator files this on OSF.*
