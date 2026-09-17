# Checkpoint 7: Evergreen promo OG cards for social channels

## Context

You are working on the 45 Analytics codebase (`the-45-percent-problem` repo). The attached file `APP_UX_EVALUATION_2026-05-13.md` is the evaluation that motivates this work. This task implements recommendation **P0.7 (Evergreen OG cards for social channels)** from that evaluation.

Checkpoints 1 through 6 have already landed on main:

- Plausible custom events are wired (`website/src/lib/analytics/track.ts`), including `simulator_opened` with a `surface` discriminant.
- Final Four has a `[ Start from the model's call ]` ghost-fill button.
- The Reality Score reveal has an anticipation beat.
- A neutral `ModelCallPanel` sits between the hero and the share strip on the permalink.
- `TicketShareButton` has a `Copy as post` affordance.
- Final Four is mounted inline on the home page above the fold.

This checkpoint is the channel-alignment piece. The social-media campaigns need OG unfurl cards that point at the engagement instrument; right now any social link unfurls to the homepage trophy point-cloud, which has no immediate hook.

## Why this matters

Behavioural pattern: channel/landing alignment. A cold visitor who sees a social post with a rarity-reveal style OG card ("1 in 33,000. All three host nations reach the semifinals.") is primed for the simulator before they even click. When they click, they land directly on a Final Four picker pre-filled with that scenario; they can edit, submit, or just see the curated rarity. The friction from social impression to first interaction collapses to one click.

The cards are evergreen, meaning they are curated once and can be re-used in many social posts across the tournament without going stale; the 1-in-N number rendered on each card is computed live from the current snapshot, so it updates naturally as the model evolves.

## What to build

Four pieces, all coupled tightly enough that they should land in one PR.

### 1. Promo card catalog

Add `website/src/lib/sim/promoCards.ts` with a typed catalog of 3 to 5 hand-curated Final Four scenarios. Each entry contains:

- `slug`: lowercase, hyphen-separated, URL-safe. Stable forever (used as the cache key for OG images and as the redirect target).
- `semifinalists`: a `TeamCode[]` of length 4.
- `storyLine`: a single descriptive present-tense sentence. No exclamation marks, no marketing copy, no "Will X beat Y?" cliffhanger framing.

The catalog must span the rarity spectrum. Required coverage:

- At least one entry that lands in the **Common** or **Plausible** band at the current snapshot. Suggestion: the four top-probability teams (ESP, FRA, ARG, BRA).
- At least one entry that lands in the **Rare** or **Vanishingly rare** band. Suggestion: the three host nations plus a favourite (USA, MEX, CAN, ESP), or a CONMEBOL sweep (ARG, BRA, URU, COL).
- One or two in between for narrative variety.

Each storyLine should answer the question "what is the scenario?" in 8 to 14 words. Examples:

- `Spain, France, Argentina, and Brazil in the semifinals`
- `Morocco and the United States both reach the semifinals`
- `All three host nations reach the semifinals`
- `Europe's big four in the semifinals`

Do not write copy like "The Cinderella story!", "Defying the odds!", "Can they pull it off?". Descriptive present tense, neutral, set-theoretic.

Export a `PROMO_CARDS` constant and a `getPromoCard(slug: string): PromoCard | null` lookup. Slugs not in the catalog return `null`.

### 2. OG image route

Add `website/src/app/api/og/promo/[slug]/route.tsx` that renders a 1200x630 PNG using the same visual language as the existing scenario OG route (`website/src/app/api/og/scenario/[id]/route.tsx`).

Visual elements that must match the existing OG card:

- Brutalist dark background.
- 1px peach signature rule on the right edge.
- 5-pip rarity bar reflecting the current snapshot's computed rarity for this scenario.
- "1 in N" hero in mono with tabular figures, using `getOneInN(count, total)` from `website/src/lib/sim/getOneInN.ts`.
- StoryLine in the same serif as the scenario OG.
- Four flag + code chips for the semifinalists.
- Provenance footer.

Compute the 1-in-N for each scenario at render time using `computeRealityScore("final_four", canonical, { semifinalists })` (same call site as the live simulator). This means the rarity updates automatically as the snapshot changes; you do not store a frozen rarity in the catalog.

Provenance footer must indicate this is a curated scenario, not a user prediction. Suggested format:

```
PROMO · {snapshot_id} · {code_sha_8}
```

Where `snapshot_id` and `code_sha_8` come from `loadSnapshotMeta()` (same source the homepage SiteFooter uses).

Cache headers: `Cache-Control: public, max-age=3600, s-maxage=3600` (one hour, matching the existing scenario OG route). The image refreshes as the snapshot rotates.

Invalid slug: return 404 with a small JSON body. Social platforms expect a non-200 to treat as a missing unfurl; do not fall back to a generic image.

### 3. OG primitive sharing

The existing scenario OG route is around 720 lines of Satori JSX. Extract the shared rendering bits (peach rule, rarity bar, hero number, flag tile, provenance footer) into a single module so both the scenario route and the promo route render identical visuals.

Suggested location: `website/src/app/api/og/_lib/scenarioOG.tsx` (the `_lib` directory keeps it out of the route resolver; Next.js ignores directories that start with an underscore for routing). Or `website/src/lib/og/scenarioOG.tsx` if you prefer; pick whichever is more natural for the existing codebase layout.

If a clean extraction is awkward in 2 to 3 hours of work, fall back to careful copy-paste of the relevant render logic with a clear TODO at the top of the promo route. Flag the deferred refactor in the report. Either way, the two OG cards must look indistinguishable except for the provenance footer text and the curated content.

### 4. Card pre-fill on the simulator

Wire the `?card=<slug>` query parameter so a click on a social-post link lands the user on a pre-filled Final Four picker.

Canonical promo URL: `/scenario/final-four?card=<slug>`. This is what goes in the social post.

Implementation:

- `website/src/app/(simulator)/scenario/final-four/page.tsx` reads `searchParams.card`. If present and valid (via `getPromoCard`), pass the scenario's `semifinalists` array to `ModeFinalFour` as a new prop `initialScenario?: TeamCode[]`.
- `ModeFinalFour` accepts `initialScenario`. When the prop is present, the slots hydrate from it on mount (overriding any inflight buffer for this session). `hasInteracted` stays `false`, so the ghost-fill button rules continue to apply; since all four slots are filled, the picker auto-collapses and the ghost-fill button does not render (existing logic).
- The user can then submit immediately (one click to the reveal), or click any slot to edit, or click Reset to clear everything and start over.

Also handle the convenience entry at `/scenario?card=<slug>`:

- `website/src/app/(simulator)/scenario/page.tsx` reads `searchParams.card`. If present and the slug is valid, redirect (server-side) to `/scenario/final-four?card=<slug>`. If invalid or absent, render the landing page as today. This lets the marketing team use the shorter URL in social posts without breaking anything.

Update OG metadata for both pages when `?card=<slug>` is present:

- `og:image` points at `/api/og/promo/<slug>`
- `og:title` and `twitter:title` use the storyLine prefixed by `1 in N. `
- `twitter:card` stays `summary_large_image`

Use `generateMetadata` (async, reads `searchParams`) on both pages. This is the only way social-media platforms get the right unfurl image when they fetch the page URL.

### 5. Analytics

Add a new event: `promo_card_landed`. Fires once on the Final Four page when the page hydrates with a valid `initialScenario` from a card slug. Props: `{ slug: string }`.

This goes in `website/src/lib/analytics/track.ts` as a new entry in the `EventMap` discriminated union. Fire from the same `useEffect` that hydrates the inflight buffer on mount, gated on `initialScenario` being present and the slug being known.

Do not double-fire if the user reloads the page on the same URL (the existing inflight buffer survives reloads; once the slots are populated, the slug is "consumed" for this session and the event should not re-fire). The simplest dedup: a session-scoped flag (`45a:track:promo_landed:<slug>`), mirroring `claimFirstPick`.

The existing `simulator_opened` event with `surface: "page"` continues to fire as normal on the Final Four page; promo cards do not change that.

## Acceptance criteria

- 3 to 5 curated scenarios in a typed catalog at `website/src/lib/sim/promoCards.ts`.
- At least one card lands in Common or Plausible band; at least one lands in Rare or Vanishingly rare. Verified at the current snapshot.
- `/api/og/promo/[slug]` returns a 1200x630 PNG for each catalog slug.
- The promo OG image is visually indistinguishable from the existing scenario OG except for the provenance footer text.
- Invalid slug returns 404 with a small JSON body.
- `Cache-Control: public, max-age=3600, s-maxage=3600` on successful promo OG responses.
- `/scenario/final-four?card=<slug>` renders the Final Four page with the slots pre-filled and the picker collapsed.
- `/scenario?card=<slug>` server-side redirects to `/scenario/final-four?card=<slug>` for valid slugs; for invalid slugs, the landing page renders normally.
- `og:image`, `og:title`, `twitter:title`, `twitter:card` are correctly set on both pages when `?card=<slug>` is valid. Verify with a manual fetch + a head-of-document inspection.
- `promo_card_landed` event fires once per session per slug.
- The existing scenario OG route (`/api/og/scenario/[id]`) continues to render identically. If you extracted primitives, the existing route uses them.
- TypeScript build clean.
- Existing tests pass.
- No SSR or hydration warnings on `/scenario/final-four?card=<slug>`.

## Brand-discipline guardrails (non-negotiable)

- No em-dashes or en-dashes in any new or modified file, including code comments. Use periods, semicolons, colons, parentheses.
- No betting language anywhere.
- No celebratory or imperative copy on the OG cards. The card surfaces a rarity number and a descriptive scenario; it does not say "Try it!" or "Click to find out!".
- StoryLines are descriptive present tense. No exclamation marks. No question marks framed as marketing ("Will Morocco shock the world?"). No "shock", "stun", "upset" sentiment language.
- The 1-in-N on the card is the actual computed value from the current snapshot. Never hardcode a rarity; never round in a way that exaggerates rarity.
- The "PROMO" indicator on the provenance footer is mandatory. It distinguishes curated scenarios from real predictions and is a trust signal.
- Slug names are descriptive and brand-neutral. Acceptable: `favorites`, `host-trio`, `euro-four`, `outsiders`, `conmebol`. Not acceptable: `bombshell`, `shocker`, `lock`, `wow-pick`.

## Workflow conventions (from CLAUDE.md)

- Work on a feature branch named `ux/checkpoint-07-promo-og-cards`.
- Open a pull request when complete. Do not push directly to main.
- Run `scripts/install-hooks.sh` once if you have not already; the pre-push hook blocks conflict markers.
- If a merge conflict appears during rebase, use `git fetch origin && git reset --hard origin/main` then re-apply your work; do not use `git stash pop`.

## End-of-task report

When the work is complete, produce a report in exactly this format:

```
## Checkpoint 7 Report: Evergreen promo OG cards

### Branch
ux/checkpoint-07-promo-og-cards

### Files changed
- path/to/file (added | modified): one-line summary
- ...

### Diff size
Lines added: N
Lines removed: M
Files touched: K

### Catalog
List the slugs you shipped, each on its own line:
- slug=favorites · teams=ESP/FRA/ARG/BRA · 1 in N at current snapshot · band=Plausible
- slug=host-trio · teams=USA/MEX/CAN/ESP · 1 in N at current snapshot · band=Vanishingly rare
- ...

### What landed
- Whether the OG primitives were extracted (where to) or copy-pasted (with TODO location)
- Where the card pre-fill state machine lives
- How the /scenario?card= redirect is implemented
- Analytics dedup approach for promo_card_landed

### Manual verification
- [ ] Each catalog slug returns a 1200x630 PNG from /api/og/promo/<slug>
- [ ] Invalid slug returns 404
- [ ] Promo card visually indistinguishable from scenario OG (paste links or note the comparison method)
- [ ] /scenario/final-four?card=<slug> pre-fills slots
- [ ] /scenario?card=<slug> redirects to /scenario/final-four?card=<slug>
- [ ] og:image, og:title, twitter:title, twitter:card all correct on both pages when ?card is valid
- [ ] promo_card_landed fires once per session per slug
- [ ] Existing /api/og/scenario/<id> route renders identically
- [ ] simulator_opened still fires with surface: page on /scenario/final-four
- [ ] first_pick still fires correctly when user edits a pre-filled slot
- [ ] TypeScript build clean
- [ ] Existing tests pass
- [ ] No SSR or hydration warnings

### Sample OG image URLs
Paste the full URLs of each catalog slug's PNG so they can be quickly eyeballed:
- https://[deploy or local]/api/og/promo/favorites
- ...

### Follow-ups / open questions
- Anything you flagged but did not implement, with one-line rationale.

### Ready for review
Y / N. If N, state what is blocking.
```

Do not push to main. Wait for the user to review the report and approve.
