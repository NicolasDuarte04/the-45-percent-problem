# MOTION_SPEC.md — `/scenario/p/[id]` kinetic layer

> Three brutalist effects to give the result screen kinetic energy without
> crossing into casino territory. Scope: post-prediction permalink only.
> Out of scope: simulator build, Trade Ticket internals (already spec'd by
> Phase E motion vocabulary), bracket and dashboard surfaces.

---

## 0. Brutalist constraints — read before writing animation code

The motion vocabulary in `src/lib/motion/vocabulary.ts` already locks the
project's tone (Phase E §3): durations bounded 150–600 ms, one and only
one ease curve per preset, no overshoots, no rotation, no glow, no
particle effects. These three new effects extend that vocabulary; they
do not break it.

**House rules for this spec:**

1. **No physics.** No springs, no bounces. Everything is linear or
   `steps()`-driven so the eye reads "computed" not "lifestyle".
2. **No translate.** Y-shifts above 8 px feel marketing. Where motion
   needs to land, opacity does the work.
3. **Mono everything that moves on a per-character basis.** The
   typewriter and decrypt effects only ever paint inside JetBrains Mono
   so columns do not jitter.
4. **Reduced-motion is non-negotiable.** Every effect short-circuits to
   the final value when `prefers-reduced-motion: reduce` matches. The
   page reads correctly with motion disabled.
5. **SSR-safe.** Hooks default to the *final* string on the server, then
   replace with the animated frame on first client tick. No layout shift
   on hydration; no flash of the "correct" answer before scrambling.
6. **One source of truth per timing.** New durations land in
   `src/lib/motion/vocabulary.ts` (or a sibling `tickings.ts` for
   non-Framer values), not as inline magic numbers in component code.

---

## 1. The Decrypt Effect — 88 px Reality Score

### 1.1 Intent

When the result screen lands, the hero number reads as if a terminal is
*resolving the calculation*. The user sees digits cycle for ~400 ms and
then snap to the final percentage. The effect is the cognitive
counterpart to "compiling…" — it earns the result.

### 1.2 Specifics

| param | value | rationale |
|---|---|---|
| Total duration | **400 ms** | Phase E §3 ceiling for layout transitions; feels computed, not theatrical. |
| Tick interval | **48 ms** (≈ 21 Hz) | Faster than 60 Hz reads as "noise"; slower than 30 Hz reads as "loading dots". 21 Hz is the terminal-cursor sweet spot. |
| Tick driver | `requestAnimationFrame` with manual throttle | Pauses with the tab; never wakes a sleeping device for animation. |
| Final lock | snap to target on the trailing edge | No fade, no decel — the lock IS the punctuation. |
| Glyph set | `0123456789` only | The non-digit chars (`.`, `%`, `-`) are preserved through every frame so the column never jitters. |
| Sign / "▲ " prefix | preserved verbatim | Promoted-state glyph is part of the hero, not part of the cipher. |
| Reduced motion | render the final string immediately | No partial scramble, no fade. |

### 1.3 New file: `src/lib/motion/useDecryptValue.ts`

```ts
"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

const DIGIT_RE = /[0-9]/g;
const RAND_DIGIT = () => String.fromCharCode(48 + Math.floor(Math.random() * 10));

interface UseDecryptValueOptions {
  /** Total scramble duration in ms. Default 400. Capped at 600 (Phase E §3). */
  durationMs?: number;
  /** Frame interval in ms. Default 48. */
  tickMs?: number;
  /**
   * If `false`, the hook returns the final string and skips the scramble.
   * Use to gate on parent-controlled triggers (e.g. fire only after the
   * page-level entrance has settled).
   */
  enabled?: boolean;
}

/**
 * Cycle the digit positions of `target` through random glyphs for
 * `durationMs`, then snap to `target`. Non-digit characters are
 * preserved untouched on every frame so the column does not jitter.
 *
 * SSR-safe: returns `target` until the first client tick.
 */
export function useDecryptValue(
  target: string,
  { durationMs = 400, tickMs = 48, enabled = true }: UseDecryptValueOptions = {},
): string {
  const prefersReduced = useReducedMotion();
  const [frame, setFrame] = useState<string>(target);
  const startedAtRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled || prefersReduced) {
      setFrame(target);
      return;
    }

    let raf = 0;
    startedAtRef.current = null;
    lastTickRef.current = 0;

    const tick = (now: number) => {
      if (startedAtRef.current === null) startedAtRef.current = now;
      const elapsed = now - startedAtRef.current;

      if (elapsed >= durationMs) {
        setFrame(target);
        return;
      }
      if (now - lastTickRef.current >= tickMs) {
        lastTickRef.current = now;
        setFrame(target.replace(DIGIT_RE, RAND_DIGIT));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      // On unmount mid-scramble, leave the user reading the final value,
      // not a frozen random frame.
      setFrame(target);
    };
  }, [target, durationMs, tickMs, enabled, prefersReduced]);

  return frame;
}
```

### 1.4 Wiring into `RealityScorePanel.tsx`

Replace the bare `formatPercent` call inside the hero with the hook
output:

```tsx
// inside RealityScorePanel
import { useDecryptValue } from "@/lib/motion/useDecryptValue";

const finalPct = formatPercent(count, total);
const heroText = useDecryptValue(`${isPromoted ? "▲ " : ""}${finalPct}`);

// …
<span className="font-mono tabular-nums text-[48px] leading-[1] sm:text-[88px] …">
  {heroText}
</span>
```

`tabular-nums` is already on the span; that is what guarantees the
column stays still as digits cycle. No CSS change required.

### 1.5 Why not a Framer keyframe array

Framer can drive a sequence of values with `animate={[…]}`, but for a
per-character scramble we would still need to pre-compute every frame
and synchronize to the same RAF loop. The hook is shorter, easier to
reason about, and inherits framer-motion's reduced-motion contract via
`useReducedMotion`.

---

## 2. Staggered Reveal — Hero → Share → Alert

### 2.1 Intent

When the page mounts, three regions fade in *one after another* so the
user's eye is led down the page in the order they should act:

1. Hero stack (flag, story line, Reality Score)
2. Share strip (`↓ PNG · SHARE`)
3. Alert configurator (`ALERT · ARM POSITION`)

The Trade Ticket below the fold keeps its existing `.reveal-ticket` CSS
fade — that surface is post-action, so it stays passive.

### 2.2 Specifics

| param | value | rationale |
|---|---|---|
| Per-child duration | **240 ms** | Sits inside Phase E §3's 150–300 ms micro-interaction band. |
| Stagger delay | **180 ms** | Just long enough for the eye to land on the previous element before the next moves; shorter felt simultaneous in tests. |
| Initial state | `opacity: 0, y: 8` | 8 px is the strict ceiling for translate; below that we lose the "settle"; above it reads marketing. |
| Easing | `motion.entry` preset | Already in vocabulary; reuse, do not invent. |
| Reduced motion | skip animation, render at final state | Existing `useReducedMotionAware("entry")` returns `{ duration: 0 }`; the variants resolve instantly. |
| Fire when | on mount (above the fold) | No `whileInView` — the result screen is at the top of the page on this route, so we want to start immediately. |

### 2.3 Replacement for the existing CSS reveal classes

The current `.reveal-ticket` / `.reveal-alert` classes in `globals.css`
(see PR 2 + PR 3) will be **superseded** at the page level by this
Framer wrapper. They stay defined as a no-JS fallback (Next.js streaming
pre-hydration), but the wrapper takes over once mounted. Removing the
classes outright would break the no-JS render.

### 2.4 New file: `src/components/simulator/StaggeredReveal.tsx`

```tsx
"use client";

import { motion, type Variants } from "framer-motion";
import { useReducedMotionAware } from "@/lib/motion/useReducedMotionAware";

const parentVariants: Variants = {
  hidden:  { transition: { staggerChildren: 0 } },
  visible: { transition: { staggerChildren: 0.18 } },
};

const childVariants: Variants = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

interface StaggeredRevealProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Page-level stagger container. Children consume `<StaggeredReveal.Item>`
 * to opt into the chain; non-Item descendants render normally with no
 * animation. Reduced-motion: every variant collapses to `{ duration: 0 }`,
 * making the cascade instant.
 */
export function StaggeredReveal({ children, className }: StaggeredRevealProps) {
  const transition = useReducedMotionAware("entry");
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={parentVariants}
      transition={transition}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface ItemProps {
  children: React.ReactNode;
  className?: string;
}

StaggeredReveal.Item = function Item({ children, className }: ItemProps) {
  const transition = useReducedMotionAware("entry");
  return (
    <motion.div
      variants={childVariants}
      transition={transition}
      className={className}
    >
      {children}
    </motion.div>
  );
};
```

### 2.5 Wiring into `page.tsx`

```tsx
import { StaggeredReveal } from "@/components/simulator/StaggeredReveal";

// …inside the SimulatorChrome…
<StaggeredReveal>
  <StaggeredReveal.Item>
    {/* hero stack: flag + story line + RealityScoreReveal */}
    <section aria-labelledby="hero-story" className="pt-8">…</section>
  </StaggeredReveal.Item>

  <StaggeredReveal.Item className="mt-6 flex justify-end">
    <TicketShareButton predictionId={view.id} />
  </StaggeredReveal.Item>

  <StaggeredReveal.Item className="mt-6">
    {view.hasTracking
      ? <TrackedFootnote />
      : <PredictionAlertConfigurator view={view} />}
  </StaggeredReveal.Item>
</StaggeredReveal>

{/* Trade Ticket stays outside the cascade — its existing
    .reveal-ticket CSS handles the late fade. */}
<div className="mt-12 mb-12">
  <TradeTicket view={view} compact />
</div>
```

### 2.6 Interaction with the Decrypt Effect

The Decrypt hook fires on mount. When the hero's Reveal child finishes
its 240 ms entrance, the scramble has already been running for ~240 ms
of its 400 ms lifecycle — i.e., the digits are still cycling when the
eye arrives, then lock ~160 ms later. The two effects are tuned so the
eye lands on the hero *during* the scramble, not after it. Do not
extend either duration without re-running this calculation.

---

## 3. Terminal Typewriter — `WATCH` row in the alert configurator

### 3.1 Intent

The `WATCH` row in `PredictionAlertConfigurator` echoes the user's
scenario (e.g. `ARG > AUT > AUS > BEL`). Today it renders all at once.
With this effect, when the configurator panel enters the viewport, the
chain types out left-to-right at terminal speed — like the alert is
parsing the user's prediction in real time.

### 3.2 Specifics

| param | value | rationale |
|---|---|---|
| Per-character interval | **22 ms** | Faster than mainstream typewriter effects (40–60 ms) — reads as "command-line echo", not "human typing". |
| Total duration | bounded by string length × tickMs (~440 ms for a 4-team chain) | Stays under the 600 ms ceiling. |
| Trigger | `IntersectionObserver`, fires once on first 50 % visibility | Mounts above the fold? Fires immediately. Below the fold? Waits for the user to scroll. |
| Caret | none | A blinking caret would compete with `STATUS: ▍` in the eyebrow. The mono font's column rhythm is the structural cue. |
| Mobile truncation | unchanged — types out the truncated string `ARG > AUT > … > +2` on `<sm` and the full chain on `sm+` | The truncation logic in `PredictionAlertConfigurator` already runs at the responsive layer; the typewriter sits over the result. |
| Reduced motion | render the full string immediately | No animation, no flicker. |
| Re-renders | hook is keyed on `text`; if the prediction id changes (route nav), the typewriter restarts. Otherwise stable. | |

### 3.3 New file: `src/lib/motion/useTypewriter.ts`

```ts
"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

interface UseTypewriterOptions {
  /** ms between characters. Default 22. */
  tickMs?: number;
  /** Set by the consumer when the trigger condition (e.g. enter viewport) fires. */
  active: boolean;
}

/**
 * Reveal `text` one character at a time once `active` flips to `true`.
 * Returns the currently-typed substring. Final string is the trivial
 * server render (text is already known); the hook just animates the
 * client-side display.
 */
export function useTypewriter(text: string, { active, tickMs = 22 }: UseTypewriterOptions): string {
  const prefersReduced = useReducedMotion();
  const [out, setOut] = useState<string>(active && !prefersReduced ? "" : text);

  useEffect(() => {
    if (!active) {
      setOut("");
      return;
    }
    if (prefersReduced) {
      setOut(text);
      return;
    }
    setOut("");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) {
        window.clearInterval(id);
      }
    }, tickMs);
    return () => window.clearInterval(id);
  }, [text, active, tickMs, prefersReduced]);

  return out;
}
```

### 3.4 Trigger via `useInView`

```ts
import { useInView } from "framer-motion";
import { useRef } from "react";

const ref = useRef<HTMLDivElement>(null);
const inView = useInView(ref, { once: true, amount: 0.5 });
```

`useInView` from framer-motion is a thin wrapper over IntersectionObserver
and returns a boolean — feed it directly to `useTypewriter({ active })`.
We are already a framer-motion consumer; no new dep.

### 3.5 Wiring into `PredictionAlertConfigurator.tsx`

Inside the existing WATCH row:

```tsx
import { useRef } from "react";
import { useInView } from "framer-motion";
import { useTypewriter } from "@/lib/motion/useTypewriter";

// …inside the component…
const watchRef = useRef<HTMLDivElement>(null);
const watchInView = useInView(watchRef, { once: true, amount: 0.5 });
const watchTypedFull = useTypewriter(watchFull,  { active: watchInView });
const watchTypedShort = useTypewriter(watchShort, { active: watchInView });

// …in JSX, replace the existing WATCH `<dd>`…
<dd ref={watchRef} className="min-w-0 font-mono text-[14px] tabular-nums text-[var(--text-primary)] leading-[1.6]">
  <span className="sm:hidden" title={watchFull}>{watchTypedShort}</span>
  <span className="hidden sm:inline">{watchTypedFull}</span>
</dd>
```

Two parallel hook instances is intentional: the truncated mobile string
and the full desktop string are different texts; running one hook and
swapping output via CSS would mid-animate one of them on a viewport
resize. Two hooks, one render, no resize jank.

### 3.6 What the typewriter does *not* do

- It does not type the `WATCH` *label*. The label is a structural cue,
  not a value.
- It does not type `TRIGGER` (always "state change only" — same string
  on every render, would feel like padding).
- It does not type the user's email in the success state. The email is
  the user's input; replaying it visually would read as confirmation
  theater.

---

## 4. Reduced-motion handling, in one place

Every hook and component above gates on `useReducedMotion()` from
framer-motion (or `useReducedMotionAware(preset)` for transition
returns). When the OS preference is set:

- Decrypt → render the final string immediately.
- Stagger → all children visible on first paint; no delay.
- Typewriter → render the full chain immediately.

CSS-side: the existing `@media (prefers-reduced-motion: reduce)` blocks
in `globals.css` for `.reveal-band` / `.reveal-ticket` / `.reveal-alert`
already collapse those entrances to instant. The new effects do not add
any CSS animation, so no new `@media` block is required.

---

## 5. Files touched by this spec

| file | nature |
|---|---|
| `src/lib/motion/useDecryptValue.ts` | new |
| `src/lib/motion/useTypewriter.ts` | new |
| `src/components/simulator/StaggeredReveal.tsx` | new |
| `src/components/simulator/RealityScorePanel.tsx` | edit — replace static hero string with `useDecryptValue` output |
| `src/components/simulator/PredictionAlertConfigurator.tsx` | edit — `useInView` + `useTypewriter` on the WATCH row |
| `src/app/(simulator)/scenario/p/[id]/page.tsx` | edit — wrap hero / share / alert in `<StaggeredReveal>` |
| `src/app/globals.css` | no change. Existing reveal classes stay as no-JS fallback. |

Total new code: ~150 LOC across three new files. No new dependencies.

---

## 6. Acceptance criteria

A change is done when all of the following are true:

1. On `/scenario/p/<id>` first paint with motion enabled: hero scrambles
   for 400 ms then locks; share strip fades 180 ms after hero; alert
   panel fades 180 ms after share; WATCH row types out at 22 ms/char.
2. With macOS "Reduce motion" enabled: every value renders at its final
   state on first paint. No scramble, no stagger, no typing. Verified
   on a clean macOS user.
3. Layout shift = 0. The hero column width does not change between
   scramble frames; the WATCH row column width does not change as
   characters appear (mono + tabular-nums + reserved width).
4. Server-rendered HTML (view-source) shows the final values, not
   placeholder strings. Hydration replaces them with the animated
   frame on first client tick.
5. The 88 px hero, the 5-pip rarity bar, the share strip, the alert
   eyebrow's `STATUS: ▍` cursor, and the OG export are visually
   unchanged. This spec adds motion only — no surface redesign.

---

## 7. What we are explicitly not doing

- No spring physics. No `motion.drop` on entrance.
- No confetti, no sparkles, no particles.
- No sound.
- No re-fire on scroll-back-into-view. Each effect is `{ once: true }`.
- No persistent caret. The terminal cursor lives in the eyebrow's
  `STATUS:` indicator; the typewriter does not get its own.
- No repeating heartbeat on the hero. The decrypt fires once, then the
  number is the number.
- No camera-motion / parallax. The page does not move; only its values
  resolve.

If a future request asks for any of the above, refer back to §0 before
saying yes.
