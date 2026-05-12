# VIRAL_LOOP_PIVOT.md

> Architect plan for the Scenario Simulator post-result surface.
> Goal: stop the funnel leak between "user got their Reality Score" and "user emailed us / posted us".
> Scope: PNG artifact, email hook, visual hierarchy on the result screen.
> Out of scope: model code, simulation engine, anything upstream of `/scenario/p/[id]`.

---

## 0. Triage and Stakes

The simulator works. The numbers are correct. The page renders. None of that converts.

We are losing the user at three specific seams.

1. **Artifact seam.** The user clicks `↓ PNG`, gets a file MacOS Preview cannot open, and abandons the share. Even if the file opened, the current OG layout reads as a PDF receipt, not as a status symbol. It does not earn a re-share.
2. **Hook seam.** The Track-my-prediction block sits below the fold of the result, looks like a footer newsletter signup, and uses pleading-marketing voice ("Want to see if it actually happens?"). The user has just earned a 1-in-7 reading and the next thing the page asks them to do feels like surrendering an email for spam.
3. **Polish seam.** When the simulation finishes, the page does not visibly *land*. The Reality Score is correctly sized but everything around it competes at the same weight, so the eye has nowhere to come to rest. There is no visual punctuation that says "this is your result, here is what you do next."

Each seam is fixable with a small, well-targeted change. None requires touching the model, the database, or the simulation engine. This document specifies what changes, in what order, and how to verify it landed.

---

## 1. The Artifact

### 1.1 Diagnosis: why the PNG is corrupt

The download path is `<a href="/api/og/scenario/[id]" download="...png">`, and the route at `src/app/api/og/scenario/[id]/route.tsx` returns a `next/og` `ImageResponse`. The browser saves whatever bytes the server returns under the `download` filename, regardless of `Content-Type`. So if the route returns anything other than valid PNG bytes, the user gets a file named `*.png` whose contents are not PNG, and Preview rejects it with "The file could not be opened".

There are four plausible failure modes, ranked by likelihood given the symptom (Preview rejects, file is non-zero size):

1. **Error-page fallthrough.** The route hit a 4xx or 5xx path (DB miss, font load failure, validation failure on `id`) and returned plain text or HTML. The `download` attribute happily wrote that to disk as `45analytics-XXXX.png`. This is the most common cause of "Preview can't open it" because the file is real bytes, just not PNG bytes.
2. **Node-runtime font issue.** The route declares `runtime = "nodejs"` and reads font files via `fs.readFile(path.join(process.cwd(), "public", "fonts", ...))`. On Vercel serverless, `process.cwd()` points to `/var/task`, and Next does not always copy `public/` into the function bundle. If `loadFonts()` throws, the catch block re-runs `ImageResponse` without a `fonts` array. Satori then has no font for `'JetBrains Mono'` or `'Source Serif 4'`, falls back to default, and on Node runtime this fallback can return a malformed buffer when Resvg lacks any glyph for a referenced family.
3. **Truncation under cold-start.** The Node-runtime `ImageResponse` rasterizes via Resvg synchronously. If the function exceeds the 10s default timeout on a cold start (1.2MB serif file, no warm cache), Vercel sends a partial response. Truncated PNGs fail Preview's CRC check.
4. **Buffer-to-ArrayBuffer slice bug.** `loadFonts` does `b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)` to detach a slice. This is correct, but if Node returns a `Buffer` whose underlying pool is reused between the two parallel `readFile` calls, the second slice can overlap the first. Rare, but observed on certain Node versions when reading two files in `Promise.all`.

The fastest way to know which one we are hitting is one curl:

```bash
curl -i -o ticket.png "https://45analytics.com/api/og/scenario/45A-2026-7X9W"
file ticket.png
xxd ticket.png | head -1
```

PNG magic is `89 50 4E 47 0D 0A 1A 0A`. If the first 8 bytes are not those, we know it is not a PNG, and the response headers tell us what it actually is. Run that first; do not guess.

### 1.2 Technical plan: make the export reliable

Three changes, all in `src/app/api/og/scenario/[id]/route.tsx` plus one in `TicketShareButton.tsx`.

**A. Switch to the edge runtime and load fonts via fetch.** This is the canonical configuration for `next/og` and removes failure modes (2), (3), and (4) in one edit. The route already has no Node-only code paths beyond the DB read; the DB read is fine on edge with the existing Drizzle + neon-http or pg-bouncer setup as long as no native bindings are used. If the project's DB driver is incompatible with edge, keep `nodejs` and apply (B) instead.

```ts
// src/app/api/og/scenario/[id]/route.tsx
export const runtime = "edge";

async function loadFonts(): Promise<{ mono: ArrayBuffer; serif: ArrayBuffer }> {
  if (_cachedFonts) return _cachedFonts;
  const [mono, serif] = await Promise.all([
    fetch(new URL("/fonts/JetBrainsMono-Regular.ttf", import.meta.url)).then(r => r.arrayBuffer()),
    fetch(new URL("/fonts/SourceSerif4-Regular.otf", import.meta.url)).then(r => r.arrayBuffer()),
  ]);
  _cachedFonts = { mono, serif };
  return _cachedFonts;
}
```

**B. If the DB driver pins us to Node runtime, harden the Node path.** Make font loading non-fatal in a way that still returns a valid PNG, and fail closed (real 5xx with proper Content-Type) when something else breaks, so the `download` attribute does not write a 500-page to disk.

```ts
export async function GET(_req, ctx) {
  try {
    const { id } = await ctx.params;
    if (!isValidPredictionId(id)) {
      return jsonError(404, "not_found");
    }
    const row = await getPrediction(id);
    if (!row) return jsonError(404, "not_found");
    const view = toPublicPredictionView(row);

    let fonts;
    try { fonts = await loadFonts(); } catch { fonts = null; }

    const response = new ImageResponse(<OGImage view={view} />, {
      width: 1200,
      height: 630,
      ...(fonts ? { fonts: [...] } : {}),
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="45analytics-${view.id}.png"`,
        "Cache-Control": "public, max-age=3600, s-maxage=3600, immutable",
      },
    });
    return response;
  } catch (err) {
    console.error("[og] render failed", err);
    return jsonError(500, "render_failed");
  }
}

function jsonError(status: number, code: string) {
  return new Response(JSON.stringify({ error: code }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
```

The key invariant: any path that returns to the user *must* be either a valid PNG with `image/png`, or a non-PNG response that the client-side download flow will detect and refuse to save under a `.png` name (see C below).

**C. Replace the anchor-with-download with a typed fetch in `TicketShareButton.tsx`.** The current `<a download>` blindly trusts the response. Replace with a fetch that validates `Content-Type` before saving. This is a one-button change with three real benefits:

  1. It catches non-PNG responses and shows the user a friendly error instead of saving a corrupt file.
  2. It lets us wire a small "Generating..." state on the button (~300ms cold-start) so the user does not click twice and end up with two broken downloads.
  3. It opens the door to a client-side variant later (canvas-based, see §1.3) without changing the public surface.

```tsx
const handleDownload = useCallback(async () => {
  setDownloadState("loading");
  try {
    const res = await fetch(ogHref, { cache: "force-cache" });
    if (!res.ok) throw new Error(`http_${res.status}`);
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.startsWith("image/png")) throw new Error("not_png");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = downloadName; a.click();
    URL.revokeObjectURL(url);
    setDownloadState("idle");
  } catch (err) {
    setDownloadState("error");
    setTimeout(() => setDownloadState("idle"), 3000);
  }
}, [ogHref, downloadName]);
```

The button's label cycles `↓ PNG` → `Generating...` → `↓ PNG` (or `Failed, retry` on error). The error state itself is the diagnostic; if the user sees `Failed, retry` we know the route is broken in real time, not three days later from a Twitter complaint.

### 1.3 Design rules for the share artifact

The current OG layout is functional and on-brand, but it reads like a research artifact, not a flex. A re-share happens when the image makes the sharer look smarter, more interesting, or more certain than they were five seconds before clicking share. The current layout buries the most flex-worthy element (the 1-in-N) in 14px text below the rarity band. Fix that, and add three details that make the image instantly identifiable as a 45analytics ticket at thumbnail size.

**The viral checklist.**

1. **Recognizable at 200px wide.** That is the size the image renders at in a Twitter timeline. The wordmark, the hero number, and the country/team must all be readable. Today they are not: the wordmark is 17px and the team chips are 12px.
2. **One word that does the work.** The hero must be one number plus one word, both legible at thumbnail. Right now the hero is the percentage; the word is buried below as the rarity band. Promote the rarity band to be co-equal with the percentage.
3. **Provenance as decoration, not warning label.** The model SHA / snapshot SHA / N=10000 strip is a feature, not a footnote. Treat it like the ISBN on a book jacket; visible enough that a stranger sees it and registers "this is research, not a tipster account."
4. **Asymmetric typography weight.** Two type families fighting for attention reads as muddled. Drive the eye with one serif moment (the story line) and one mono moment (the hero stack). Everything else is supporting.
5. **One signature accent.** The peach `--state-promoted` (#F9B88A) appears only on a 1px rule above the hero, and only when state is alive or promoted. Cyan never appears. This rule is what makes the image *look like* 45analytics from across the room.

**The new OG layout (1200x630).**

```
┌────────────────────────────────────────────────────────────────────────┐
│ 45ANALYTICS                                  TOURNAMENT SCENARIO · WC26 │
│ ───────────────────────────────────────────────────────────────────────│
│                                                                         │
│   🇦🇷                                       ┃ ─── (1px peach accent)   │
│                                              ┃                          │
│   Argentina beats Algeria in the             ┃   1 in 7                 │
│   Round of 16, beats Australia               ┃   ▆▆▆░░ Plausible        │
│   in the Quarterfinal, beats                 ┃                          │
│   Curaçao in the Semifinal,                  ┃   14.1%                  │
│   and wins the World Cup.                    ┃   1,408 / 10,000 sims    │
│                                              ┃                          │
│   ARG  ALG  AUS  CUW  COD                                                │
│ ───────────────────────────────────────────────────────────────────────│
│ 45A-2026-7X9W   Model c8a9c10   N=10,000     45analytics.com/p/7X9W     │
└────────────────────────────────────────────────────────────────────────┘
```

Specific diff against the current layout (`route.tsx::OGImage`):

- **Promote `1 in N` to hero.** Render `1 in 7` at 84pt mono above the percentage. The percentage drops to 48pt and becomes the *unit*. This inverts the current hierarchy: humans hold ratios more easily than percentages, and "1 in 7" is the line a sharer copies into the tweet body.
- **Render the rarity bar as 5 mono pips, not just text.** Use the same five-pip glyph the on-page panel uses. The pips are literally `▆▆▆░░` (3 filled, 2 empty for "Plausible"). Mono, no SVG, fits Satori's flexbox-only constraint. Pips show the band visually so the image registers a "reading" before any text is parsed.
- **Move flag to the top-left as a 56px tile.** Do not stretch country flag emoji. Use the existing `<Flag>` component pattern, but render as an SVG embedded inline (Satori supports `<img>` with data URIs). For Final Four mode, render four 32px flags in a row. For Full Bracket, the champion's flag at 56px.
- **One peach 1px vertical rule between the left and right columns**, only when `state !== "dead"`. This single accent line is the "45analytics signature." Use `--state-promoted` (#F9B88A) at 100% opacity. No drop shadow, no glow.
- **Tighten the team-codes strip** to one row, `letter-spacing: 0.16em`, mono, no panel background. Looks like a Bloomberg "WATCHLIST" line.
- **Provenance footer at 11px, all caps, single line.** `45A-2026-7X9W   MODEL c8a9c10   N=10,000   45ANALYTICS.COM/P/7X9W`. Equal-weight tracking, no separator pipes; rely on whitespace to separate. This reads as machine-printed receipt copy, which is exactly the affect we want.
- **Wordmark to 22px** (from 17px) so it survives the timeline thumbnail.
- **Story line drops from 34px to 32px** but gets one extra line of breathing room. The hero ratio absorbs the reclaimed visual weight.

**Color tokens, locked.**

| Use | Token | Hex |
|---|---|---|
| Background | `--bg-root` | `#0F1216` |
| Hairline rules | `--border-default` | `#262D37` |
| Primary ink | `--text-primary` | `#EEE8DD` |
| Soft ink (denominator, captions) | `--text-tertiary` | `#A8AFBC` |
| Provenance ink | `--text-quiet` | `#6D7585` |
| Signature accent (the 1px rule, promoted hero) | `--state-promoted` / `--accent-warm` | `#F9B88A` |
| Dead state hero | `--state-dead` base | `#E76E8A` |

Cyan is forbidden in the OG output, matching the on-page rule (IMPL_PROMPT §15.2).

**Why this beats the current layout for sharing.** The current OG image is one image with two columns of equal weight. The new layout has a single emotional anchor (the `1 in 7` ratio) supported by a percentage and a five-pip bar. At thumbnail size on Twitter or LinkedIn, what survives is `1 in 7` + `Argentina wins`. That is what gets shared. Everything else is the proof that the number is real.

### 1.3.5 Optional: client-side fallback for the truly stubborn

If the route keeps failing in production for reasons we cannot reproduce locally (Vercel function size limits, regional cold-start variance), add a `html2canvas`-based client fallback that screenshots the on-page `<TradeTicket>` directly. It is a 35KB dep, but it has zero serverless surface area and ships a PNG generated in the user's own browser. Mount it as the *third* fallback after fetch + content-type validation; never as the primary path. Server-rendered OG remains the canonical artifact because it works for unfurl bots that cannot run JS.

---

## 2. The Hook

### 2.1 Why the current email block is invisible

The current Track-my-prediction block has four problems, all fixable with copy and layout, none requiring a backend change.

1. **Position.** It sits below `TicketShareButton` at the *bottom* of the permalink page. The user has to scroll past their result, past the share buttons, past blank space, before seeing the ask. By the time they get there, momentum is gone.
2. **Voice.** "Want to see if it actually happens?" is a marketing question. The user just locked in a probabilistic bet against the model; we should match that tone, not soften it.
3. **Visual class.** The component is sectioned under a top hairline rule with a serif H2 and a sans CTA. Architecturally identical to a newsletter signup at the bottom of a blog post. The user reads it as such.
4. **Reward asymmetry.** The user gave us a click and earned a Reality Score. We give them, in return, a paragraph about how we won't spam them. The exchange feels lopsided in our favor.

### 2.2 The Bloomberg-alert redesign

The pivot: stop selling the email; start *configuring an alert*. The user is not subscribing to a newsletter, they are arming a position monitor. Treat the form as a piece of terminal chrome.

**Component name.** Rename `PredictionEmailGate.tsx` to `PredictionAlertConfigurator.tsx`. The file rename is symbolic but matters: future engineers should not read the file as a marketing component.

**Position.** Lift the form to immediately under the `RealityScorePanel`, *above* the full Trade Ticket scenario block. Treat the alert as the natural next action after seeing the score, not the closing afterthought.

**Layout.** A single bordered panel, 720px wide, mono-driven, terminal aesthetic. The user reads the panel like a config window, not like an email signup.

```
┌─────────────────────────────────────────────────────────────────────┐
│ ALERT  · ARM POSITION                                  [ STATUS: ▍ ]│
│ ───────────────────────────────────────────────────────────────────│
│                                                                     │
│ WATCH    ARG > ALG > AUS > CUW > COD                                │
│ TRIGGER  state change only                                          │
│ NOTIFY   ▍                                                          │
│                                                                     │
│           [ ARM ALERT ]    skip ›                                    │
│                                                                     │
│ ───────────────────────────────────────────────────────────────────│
│ Two emails maximum. One when the scenario becomes impossible.        │
│ One if the model says it became more likely. No marketing.           │
└─────────────────────────────────────────────────────────────────────┘
```

**Design rules.**

- **Eyebrow.** `ALERT · ARM POSITION` in mono 11px, `letter-spacing: 0.10em`. The right side carries a live cursor-style status indicator (`STATUS: ▍`), which switches to `STATUS: ARMED` after submit, in `--ui-success` (#88E0B6).
- **Field rows as a key-value grid.** Three rows, mono labels at left (12px, `--text-tertiary`), values at right (14px, `--text-primary`). The first two rows are *display-only*: WATCH echoes the user's prediction back to them (the team codes from the scenario, rendered exactly as they appear on the ticket); TRIGGER is a fixed string. The third row is the only input: NOTIFY accepts the email.
- **Email input.** Same width as the value column. No placeholder text in the input itself; the WATCH and TRIGGER rows already establish the form's purpose. Caret style: `caret-color: var(--ui-guidance)` so the cursor blinks teal, signaling "this is where you act."
- **Underline the input only on focus**, not in the resting state. Hide-the-affordance brutalism. When focus enters, draw a 1px `--ui-guidance` underline. When the value validates, the underline switches to `--ui-success`.
- **CTA button.** Mono, sharp corners, `[ ARM ALERT ]` with the brackets as part of the label. Resting state border is `--text-primary` at 100%. Hover state: border shifts to `--accent-warm` (#F9B88A), background tints to `--accent-warm` at 8% opacity. Disabled state (invalid email): border drops to `--border-default`, label opacity 50%.
- **Skip link.** `skip ›` in mono 12px, `--text-quiet`. Half-size of the CTA. On hover, `--text-tertiary`. No underline. The chevron is the affordance.
- **Footnote.** Two sentences, sans 12px, `--text-tertiary`. The constraint ("two emails maximum") is the whole pitch; do not pad it with marketing language.

**The success terminal state.**

```
┌─────────────────────────────────────────────────────────────────────┐
│ ALERT · ARMED                                          STATUS: ✓     │
│ ───────────────────────────────────────────────────────────────────│
│                                                                     │
│ Verification email sent to your.email@domain.                       │
│ Click the link inside to finalize. The alert is not active until    │
│ you confirm.                                                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

The `STATUS: ✓` glyph is `--ui-success`. The body sentence inverts the user's mental model: instead of "we sent you an email", it is "the alert is not active yet." That single inversion turns confirmation from a chore into a final step the user wants to complete.

**The dead/skip state.** When the user clicks `skip ›`, do *not* unmount the panel. Replace the body with a single mono line: `ALERT · NOT ARMED` plus a soft "change your mind?" link that rewinds to the form. The panel stays at the same position so the user sees the cost of skipping (an empty block where their alert could have been).

### 2.3 Conversion mechanics

Three small behaviors do most of the lift.

1. **Pre-fill the WATCH row from the scenario.** The user already declared their prediction. Show it back to them in the alert config, as evidence that the alert is *theirs*, not a generic newsletter. This is the line of code that turns a form into a personal artifact.
2. **Validate on blur, not on change.** The current implementation re-runs `emailLooksValid` on every keystroke and disables the button live. That feels like a security check. Validate only when the user blurs the input or presses Enter. The button stays *enabled-looking* until then; on submit-with-invalid we show inline error text and *only then* dim the button. Letting the user feel they can act keeps them moving.
3. **Cap the submit to one click.** Set `aria-busy` and disable the button for 1.2s after submit regardless of network result. Prevents the double-submit "did it work?" loop that is responsible for ~half of bounce in newsletter forms.

### 2.4 Files to touch

| File | Change |
|---|---|
| `src/components/simulator/PredictionEmailGate.tsx` | Rename to `PredictionAlertConfigurator.tsx`. Rebuild markup per §2.2. Keep the existing `attachEmailToPrediction` call and state machine; only the surface changes. |
| `src/app/(simulator)/scenario/p/[id]/page.tsx` | Re-order: move the alert configurator above `TicketShareButton`. The Trade Ticket renders first; the alert renders second; the share buttons render third; the scenario block (already inside the ticket) stays intact. |
| `src/app/globals.css` | Add three classes: `.reveal-alert` (250ms entry, +200ms after the ticket), `.alert-status-pip` (the blinking caret bar), `.alert-armed-glyph` (the success ✓ in `--ui-success`). |

No changes to backend, schema, Resend, or the verification flow.

---

## 3. The Polish

The result screen is currently a dense flat surface; nothing on it claims primacy. Three small visual changes make the Reality Score command the screen, and the Track + Share controls pull the eye next.

### 3.1 Specific hierarchy fixes

**A. Drop opacity on supporting copy from ~70% to 50% across the result screen.** The `--text-tertiary` and `--text-quiet` tokens are already defined for this. The current usage is correct in tokens, wrong in *frequency*: too many lines render at `--text-tertiary` weight, so the eye has nowhere lighter to fall back to. The fix is purely a re-classification: only the denominator and the rarity caption stay at `--text-tertiary`; the prediction ID strip, the model SHA line, and the watermark drop to `--text-quiet`. Result: the hero gains visual weight without changing its size.

**B. Add a single 1px peach scanline above the hero number** when state is `alive` or `promoted`. The line is 64px wide, `--state-promoted`, sits 16px above the `64px` hero, no animation, no glow. This is the same accent the OG image uses (§1.3). Repeating it on the on-page panel makes the on-page surface and the export read as the same artifact.

```tsx
// RealityScorePanel.tsx, before the hero <span>
{state !== "dead" && (
  <div
    aria-hidden
    className="mb-4 h-px w-16 bg-[var(--state-promoted)]"
  />
)}
```

**C. Bump the on-page hero from 64px to 88px on `sm` breakpoint and above.** The current hero is sized to fit alongside the rarity band on narrow screens. On wide screens, there is room to make it land harder. Mobile stays at 48px.

```tsx
className="font-mono tabular-nums text-[48px] leading-[1] sm:text-[88px]"
```

**D. Surface the share + alert CTAs immediately after the rarity band.** Currently the share strip is below the entire Trade Ticket and the alert is below that. On a 1080p laptop the user has to scroll. Restructure the result page into a stack:

```
[ STORY LINE ]
[ HERO STACK: peach line + 88px % + denominator + 5-pip bar + 1-in-N ]
[ SHARE STRIP: ↓ PNG · Share ]            ← lifted up
[ ALERT CONFIGURATOR ]                     ← lifted up
[ FULL TRADE TICKET (scenario detail) ]    ← demoted below the fold
[ FOOTER ]
```

The Trade Ticket card itself does not disappear; it is still the canonical artifact and carries the full scenario block, the prediction ID strip, and the provenance footer. But the page no longer requires the user to scroll past the entire ticket to find the next action. The share + alert get the prime real estate; the ticket gets the long-read real estate below.

**E. Pulse the share buttons after 6 seconds of idle.** A single, slow opacity cycle (1.0 → 0.7 → 1.0 over 1.6s, once, with reduced-motion respect). Not a constant pulse. Triggered by an `IntersectionObserver` so it only fires when the buttons are in viewport. This is the cognitive reward: the page noticed the user was not acting and gently nudges. Implementation lives in `TicketShareButton.tsx` as a `useEffect` with a setTimeout.

```tsx
useEffect(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const el = ref.current;
  if (!el) return;
  const obs = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    const t = setTimeout(() => el.classList.add("nudge-once"), 6000);
    return () => clearTimeout(t);
  }, { threshold: 0.6 });
  obs.observe(el);
  return () => obs.disconnect();
}, []);
```

In `globals.css`:

```css
@keyframes nudge-once {
  0%   { opacity: 1; }
  50%  { opacity: 0.7; }
  100% { opacity: 1; }
}
.nudge-once { animation: nudge-once 1.6s ease-in-out 1; }
@media (prefers-reduced-motion: reduce) {
  .nudge-once { animation: none; }
}
```

### 3.2 What we are not doing

We are not adding confetti. We are not adding sound. We are not animating the team flags. We are not introducing a second accent color. The product is a research tool that happens to have a viral surface; the polish has to match the credibility of the underlying work, or the work itself stops being credible. The five changes above are the maximum dosage before we cross into casino territory.

### 3.3 Files to touch

| File | Change |
|---|---|
| `src/components/simulator/RealityScorePanel.tsx` | Add the peach scanline (§3.1.B). Bump hero size (§3.1.C). Re-classify denominator/SHA/watermark to `--text-quiet` (§3.1.A). |
| `src/components/simulator/TradeTicket.tsx` | The card stays. It moves *down* the page (parent reorders), but its internal markup is unchanged. |
| `src/app/(simulator)/scenario/p/[id]/page.tsx` | Re-stack: Hero, Share, Alert, Ticket, Footer (§3.1.D). |
| `src/components/simulator/TicketShareButton.tsx` | Add the 6s pulse (§3.1.E). Add fetch-based download with content-type validation (§1.2.C). |
| `src/app/globals.css` | Add `.nudge-once` keyframe and reduced-motion guard. |

---

## 4. Implementation Order

Land in three small PRs. Do not bundle them; the diagnostic value of the artifact PR depends on it shipping alone.

**PR 1: artifact reliability (§1.2).** Edge runtime swap, fetch-based loadFonts, fetch-based download in `TicketShareButton`, hardened error response. No visual change. Verification: curl returns valid PNG, button shows real error state when route 5xx's. Ship this first. If the curl smoke test still returns non-PNG bytes after PR 1, we know the issue is environmental (DB driver pinning to Node, fonts missing from bundle) and we apply the §1.2.B variant before moving on.

**PR 2: artifact design (§1.3) + on-page hierarchy (§3.1).** OG layout rebuild, peach scanline, hero bump, hierarchy re-classification, page reorder, pulse-once. Coordinated visual change so the on-page surface and the share image read as one artifact. Verification: visual diff on /scenario/p/45A-2026-TEST in the dev DB; OG playground render at 200px width passes the "thumbnail readability" check (wordmark + 1-in-N + flag all readable).

**PR 3: alert configurator (§2).** File rename, markup rebuild, page reposition. No backend change, no token change. Verification: form submit still hits `/api/predictions/[id]/email`, suppression list still enforced, success/already-pending/already-active states still render correctly.

Order matters because PR 1 unblocks measurement: until the export works, we cannot tell whether PR 2's design lift moves shares. Ship PR 1, wait 48h, watch the conversion data, ship PR 2 + PR 3.

---

## 5. Acceptance Criteria

A change is done when all of the following are true.

**PR 1 (artifact reliability)**
- `curl /api/og/scenario/<valid-id>` returns 200 with `Content-Type: image/png` and the first 8 bytes are `89 50 4E 47 0D 0A 1A 0A`.
- `curl /api/og/scenario/INVALID` returns 404 with `Content-Type: application/json`.
- The `↓ PNG` button on the permalink page downloads a file MacOS Preview opens without error. Verified manually on a clean macOS user.
- The `↓ PNG` button shows `Failed, retry` (not silent corruption) when the route is forced to 500.
- p95 download latency under 800ms on a warm function. (No measurement infra needed; just record three trials in the PR description.)

**PR 2 (artifact design + on-page polish)**
- The exported PNG renders the new layout per §1.3 at 1200x630.
- At 200px wide (Twitter timeline scale), the wordmark, the `1 in N` ratio, and the country flag are all visually distinguishable. Manual check by squint test.
- The on-page hero is 88px on viewports >= 640px and 48px below.
- A 64px peach 1px line renders 16px above the on-page hero when state is `alive` or `promoted`.
- The page stacking order on `/scenario/p/[id]` matches §3.1.D.
- `prefers-reduced-motion: reduce` suppresses the share-button pulse.

**PR 3 (alert configurator)**
- The form sits directly under the share strip.
- The WATCH row echoes back the user's actual scenario (team codes from the prediction).
- The submit button label reads `[ ARM ALERT ]`.
- The success state header reads `ALERT · ARMED   STATUS: ✓` with the checkmark in `--ui-success`.
- Forbidden-vocab grep (no exclamation marks, no "newsletter", no "we won't spam you") passes.
- All four GateState terminal cases (`verification_sent`, `already_pending`, `already_active`, `error`) render in the new aesthetic.
- Suppression-list enforcement and Postgres-as-system-of-record contracts are unchanged. Confirmed by reading the diff: no changes to `/api/predictions/[id]/email` or `subscribeService`.

---

## 6. Open questions

1. **Edge vs Node runtime.** Does the current Drizzle setup work on edge? If `db.select()` uses a Node-only driver (`pg` rather than `@neondatabase/serverless` or `postgres-js` over fetch), PR 1 needs to keep `nodejs` and rely on §1.2.B alone. Please confirm before PR 1 lands.
2. **Story line source for OG.** The OG render currently uses `view.storyLine` directly. Confirm the canonicalizer guarantees this is plain text without HTML; Satori does not sanitize, and a stray `<` would break the layout silently.
3. **Pulse cadence.** 6 seconds is a guess. If we have any session-replay or scroll-depth telemetry on the permalink page, anchor the pulse delay to the observed median time-to-first-action minus 1 second. If we do not, ship 6 and revisit after a week of data.
4. **Mobile alert layout.** The configurator is specced at 720px. On 375px viewports, the WATCH row's team-code chain wraps. Decide whether to truncate ("ARG > ALG > ... +3") or wrap to two lines. I lean truncate; the user's prediction is on the ticket above, redundancy is fine.

These are unblocked by spec but should be answered before code lands so we do not paint ourselves in.

---

## 7. What success looks like

Two weeks after PR 3 ships, with no further changes:

- The `subscribers` table has rows in it. Specifically: at least one row per ten unique `/scenario/p/[id]` page views. (Today: zero rows for any traffic.)
- Twitter / LinkedIn timeline embeds of `/scenario/p/[id]` URLs render the new OG image cleanly. Verified by posting one of each from a private account.
- The `↓ PNG` button has zero reported corruption complaints. (Today: at least one, the one that prompted this document.)
- The next time we look at the result screen as if for the first time, the eye lands on the hero, then the rarity band, then the share strip, then the alert. In that order. No earlier, no later.

If any of those are not true, the seam is still leaking and the next pivot needs a different theory. But each of those is observable, in production, without instrumentation we do not already have. That is what makes this plan worth the engineering hours.
