# Checkpoint 7a: promoCards.ts docstring rarity-band correction

## Context

Follow-up to checkpoint 7 (PR #42). The catalog file `website/src/lib/sim/promoCards.ts` has correct runtime data, but the rarity-band labels in its top docstring are out of sync with the actual bands `getRarityBand` produces at the current snapshot. Your own checkpoint 7 report had the correct numbers; only the comment got out of sync.

## What to fix

In `website/src/lib/sim/promoCards.ts`, the docstring at lines 12 to 16 currently reads:

```
 * Rarity coverage at the current snapshot (M0 marginals, 2026-05-04):
 *   favorites  Rare              the model's top tier holds the semifinals
 *   euro-four  Rare              UEFA dominance scenario
 *   conmebol   Vanishingly rare  a South American sweep
 *   host-trio  Vanishingly rare  all three 2026 hosts plus a favourite
```

The actual bands at the current snapshot (per your verification and per `getRarityBand` thresholds at `website/src/lib/sim/getRarityBand.ts:25-39`) are:

- favorites: 1 in 88 = ~1.14% = **Uncommon** (threshold ≥ 1% and < 5%)
- euro-four: 1 in 10,000 = 0.01% = **Vanishingly rare**
- conmebol: 1 in 189 = ~0.53% = **Rare** (threshold ≥ 0.1% and < 1%)
- host-trio: 1 in 10,000 = 0.01% = **Vanishingly rare**

Update the docstring to match. The new block should read:

```
 * Rarity coverage at the current snapshot (M0 marginals, 2026-05-04):
 *   favorites  Uncommon          the model's top tier holds the semifinals
 *   conmebol   Rare              a South American sweep
 *   euro-four  Vanishingly rare  UEFA dominance scenario
 *   host-trio  Vanishingly rare  all three 2026 hosts plus a favourite
```

Note the reordering so the catalog reads from least rare to most rare top-to-bottom. Catalog data (the actual `PROMO_CARDS` array) is unchanged.

## Acceptance criteria

- The docstring at the top of `promoCards.ts` accurately reflects the rarity bands `getRarityBand` produces for each slug at the current snapshot.
- No other change.
- TypeScript build clean.
- Existing tests pass.

## Workflow

- Continue on the same branch `ux/checkpoint-07-promo-og-cards`. Add this as a follow-up commit on the existing PR.
- Do not push to main. Wait for the user to approve the corrected comment.

## End-of-task report

Append to the existing checkpoint 7 report:

```
## Checkpoint 7a Correction: promoCards.ts docstring bands

### Files changed (since checkpoint 7)
- website/src/lib/sim/promoCards.ts (modified): docstring rarity bands corrected to match getRarityBand output

### Ready for review
Y / N. If N, what is blocking.
```
