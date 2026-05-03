# Design Brief — Animated Trophy for Landing Hero

**Project:** 45analytics / The 45% Problem
**Feature:** Tournament Scenario Simulator — landing page hero
**Audience:** UI/UX Design Agent (new chat, self-contained)
**Deliverable:** A single animated component, drop-in for the simulator landing page right column.

---

## 0. Context

45analytics is a probabilistic pricing framework for the FIFA World Cup 2026. The product runs 10,000 Monte Carlo simulations of the tournament and compares model probabilities against de-vigged bookmaker odds. The Tournament Scenario Simulator is a public feature that lets users build a tournament outcome and receive a "Reality Score" (the fraction of those 10,000 simulations matching their prediction).

The landing page for the simulator already has a serif headline ("Call the World Cup. See if the model agrees.") and a CTA ("[ START YOUR PREDICTION ]"). It needs one more element: a visual signature in the right column that earns the credibility of the page in under three seconds.

That visual signature is the **trophy**, animated.

---

## 1. The Metaphor (Do Not Break)

A static version of this trophy already exists as the project's favicon. It is built from exactly **10,000 dots** sampled from a parametric 3D trophy manifold. This number is not arbitrary. It matches the model's Monte Carlo run count.

**Each dot is one simulation. 10,000 dots is what 10,000 simulations look like when they agree on the same form.**

This metaphor is the entire thesis of the project rendered as one image. The animation must preserve it absolutely:

- N = 10,000 dots, exactly. Not 9,000. Not 12,000. (Mobile may degrade to 4,000 only as a performance fallback; see §5.)
- The trophy shape comes from the existing favicon's parametric sampling code (provided in §A below). Do not redesign the trophy. The shape is fixed.
- No additional shapes (no flags, no cups, no medals, no text labels overlaid on the form).

---

## 2. Animation Concept — Posterior Convergence

On first page load, the 10,000 dots emerge from random positions scattered across the canvas (representing chaos / unconstrained outcomes / the prior distribution before any model has run). Over ~2.4 seconds, they converge to their final positions in the trophy form (the posterior).

The convergence is the visual statement: *what looks like noise resolves into a form when the model runs enough times.*

After convergence, the trophy holds. Optional very-low-amplitude breathing keeps the form alive (see §7).

---

## 3. Technical Specification

### 3.1 Dot positions

For each of the 10,000 dots:

- **Target position:** computed by the parametric trophy sampler in §A. Use the existing seed (`0x2A2A2A2A`) and xorshift32 RNG verbatim. This guarantees the same trophy as the favicon.
- **Start position:** sampled uniformly within a 1.4× canvas bounding box, using a separate random stream so the start positions are visually scrambled and not correlated with the targets.
- **Stagger:** each dot has an independent delay sampled uniformly from `[0, 600ms]` and an independent duration sampled uniformly from `[1200ms, 1800ms]`. This prevents the form from "snapping" into existence and instead lets it crystallize organically.
- **Easing:** `cubic-bezier(0.22, 0.61, 0.36, 1)` (smooth deceleration; settles confidently).

Total animation length: ~2.4 seconds (max delay + max duration).

### 3.2 Optional counter

Below the trophy, render a small monospace counter:

```
n = 0
```

During the convergence, the counter ticks up to:

```
n = 10,000
```

Once the convergence completes, the counter fades to its final state and updates its label:

```
n = 10,000 simulated tournaments
```

11pt monospace, 60% opacity, centered below the trophy. The counter is the only text in the component. It locks in the metaphor without needing a caption.

This counter is optional. If the design agent finds it visually noisy, omit it. The trophy alone carries the message.

### 3.3 Color and opacity

The static favicon is deep slate ink on cream. The animated landing version inverts:

- Dot fill: bone white (use the project's `--text-primary` or `--bone` token, whichever exists; if neither, `#F4F1EA` is a safe default).
- Dot opacity: 0.78 (matches the static favicon's stacking behavior).
- Background: transparent. The component sits on top of the simulator's existing dark canvas (`--bg-root`).

No accent color. The warm terracotta (`--accent-warm`) is reserved for three other places in the simulator and must not appear here.

### 3.4 Sizing and placement

- Desktop: 480px square, positioned in the right column of the landing page two-column layout. Headline and CTA in the left column; trophy in the right.
- Mobile: 320px square, centered, positioned above the headline.

The trophy is **not** the visual hero of the page. The serif headline is. The trophy is a visual signature that gives the headline its weight.

---

## 4. Run-Once Behavior

The convergence animation runs on first visit only. Use `localStorage`:

```js
const KEY = '45a:landing-trophy-animated';
const hasSeen = localStorage.getItem(KEY) === '1';
if (hasSeen) {
  // Render trophy in final settled state immediately. Skip convergence.
} else {
  // Run the convergence animation, then set the flag.
  localStorage.setItem(KEY, '1');
}
```

Returning visitors land on the settled trophy without the convergence replay. This protects the magic of the moment from getting stale, and it keeps the page fast on repeat visits.

A small developer-only "replay" hook is acceptable (e.g. `window.__replayTrophy()`) for testing, but no user-facing replay button.

---

## 5. Performance

10,000 animated SVG circles is at the upper edge of what browsers handle smoothly. Honor the following:

- **Do not** animate via CSS transitions on 10,000 individual SVG elements. This will tank performance.
- **Do** use a single `requestAnimationFrame` render loop that updates positions in batch each frame.
- **Strongly prefer Canvas 2D** over SVG for this volume. Canvas can render 10,000 dots per frame at 60fps comfortably; SVG cannot reliably. WebGL is also acceptable if the agent is comfortable with instanced rendering.
- **Mobile fallback:** detect frame rate over the first 200ms; if below 30fps, drop N to 4,000 (the trophy form still reads at this density, just with less weight). Do this silently; do not surface to the user.
- The static favicon (the cream version that exists today) does not animate and is unaffected by this work.

---

## 6. Reduced Motion

Honor `prefers-reduced-motion: reduce`:

- Skip the convergence entirely. Render the trophy in its final settled state on first paint.
- Suppress the ambient breathing (§7).
- The counter, if implemented, shows `n = 10,000 simulated tournaments` immediately, no tick.

---

## 7. Settled-State Breathing (Optional, Subtle)

After convergence, the trophy may breathe at very low amplitude to stay alive without distracting:

- Per-dot Gaussian jitter, amplitude 0.5px, frequency 0.1Hz (one full breath every 10 seconds).
- Per-dot phase offset (each dot breathes on its own clock).
- Honor `prefers-reduced-motion: reduce` (suppress breathing).

If breathing introduces any visible distraction, omit it. The standard for "too much" is: if a user reading the headline sees motion in their peripheral vision, the breathing is too strong. The trophy should feel alive only on direct attention.

---

## 8. Forbidden Patterns

Do not add any of the following:

- Color cycling, glow effects, particle trails, gradient fills.
- Continuous motion after settling, beyond the optional breathing in §7.
- Sound or audio cues.
- A "play again" button or any user-facing replay control.
- A tooltip, popover, or label explaining the metaphor. Let the metaphor land silently.
- Hover or click interactions on the trophy. This is a passive visual signature, not an interactive element.
- Any shape other than the trophy (no flags, no cups, no medals, no decorative elements).
- Any modification to the trophy's proportions or sampling code. The shape is fixed by §A.

---

## 9. Deliverable

A single self-contained component:

1. **One source file** (HTML + inline JS, or a single `.jsx`/`.tsx`, agent's choice) that drops into the simulator's landing page.
2. **Comments** explaining the convergence logic, the run-once flag, the reduced-motion handling, and the canvas vs. SVG choice.
3. **Performance check** documented in a comment: state the frame rate observed during convergence on a mid-range laptop and a mid-range phone.
4. **Integration notes** in a short README block: where this component plugs into the existing landing page (right column on desktop, above headline on mobile), and which tokens it consumes (`--text-primary` / `--bone`, `--bg-root`).

No new design tokens. No new dependencies beyond what is already used in the simulator (the project uses React 18 and inline styles; do not introduce a animation library unless it is already in the bundle).

---

## §A — Trophy Sampling Code (Source of Truth)

This is the parametric sampler from the existing favicon. Reproduce verbatim. Each call to `samplePoint()` returns one `[x, y, z]` in normalized world coordinates. After sampling 10,000 points, project orthographically with a 10° tilt around the X axis (also reproduced below) to get 2D target positions, then map to canvas pixels.

```js
// ── Deterministic RNG ────────────────────────────────────────
let _s = 0x2A2A2A2A;
function rand() {
  let x = _s | 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  _s = x;
  return ((x >>> 0) / 4294967296);
}
function randn() { // Box-Muller
  const u1 = Math.max(rand(), 1e-9), u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ── Geometry: globe + two ribbons + stem + base ──────────────
const GLOBE = { cx: 0, cy: 0.62, cz: 0, r: 0.30 };
const RIBBON = { yStart: -0.78, yEnd: 0.32, turns: 1.05 };

function ribbonRadius(u) {
  const belly = 0.32 * Math.exp(-Math.pow((u - 0.30) / 0.22, 2));
  const foot  = 0.10 * Math.exp(-Math.pow((u - 0.00) / 0.10, 2));
  const neck  = -0.05 * Math.exp(-Math.pow((u - 0.78) / 0.10, 2));
  const base  = 0.10;
  return Math.max(0.02, base + belly + foot + neck);
}

function sampleRibbon(idx, t, s) {
  const y = RIBBON.yStart + (RIBBON.yEnd - RIBBON.yStart) * t;
  const phase0 = idx === 0 ? 0 : Math.PI;
  const theta = phase0 + 2 * Math.PI * RIBBON.turns * t;
  const R = ribbonRadius(t);
  const cx0 = R * Math.cos(theta);
  const cz0 = R * Math.sin(theta);
  const tubeR = 0.045
              + 0.035 * Math.exp(-Math.pow((t - 0.30) / 0.30, 2))
              - 0.020 * Math.exp(-Math.pow((t - 0.78) / 0.08, 2));
  const phi = 2 * Math.PI * s;
  const radX = Math.cos(theta), radZ = Math.sin(theta);
  const px = cx0 + tubeR * Math.cos(phi) * radX;
  const py = y    + tubeR * Math.sin(phi);
  const pz = cz0 + tubeR * Math.cos(phi) * radZ;
  return [px, py, pz];
}

function sampleGlobe() {
  const u = rand(), v = rand();
  const phi = 2 * Math.PI * u;
  const cosTheta = 2 * v - 1;
  const sinTheta = Math.sqrt(Math.max(0, 1 - cosTheta * cosTheta));
  const r = GLOBE.r * (1 - 0.10 * rand() * rand());
  return [
    GLOBE.cx + r * sinTheta * Math.cos(phi),
    GLOBE.cy + r * cosTheta,
    GLOBE.cz + r * sinTheta * Math.sin(phi),
  ];
}

function sampleBase() {
  const a = 2 * Math.PI * rand();
  const r = 0.30 * Math.sqrt(rand());
  const y = -0.85 - 0.05 * rand();
  return [r * Math.cos(a), y, r * Math.sin(a)];
}

function sampleStem() {
  const a = 2 * Math.PI * rand();
  const r = 0.06 + 0.02 * rand();
  const y = -0.85 + 0.10 * rand();
  return [r * Math.cos(a), y, r * Math.sin(a)];
}

// Mixture proportions (tuned so mass roughly matches volume)
function samplePoint() {
  const k = rand();
  if (k < 0.62) {
    const idx = rand() < 0.5 ? 0 : 1;
    const t = Math.pow(rand(), 0.85) * 0.95 + 0.025;
    const s = rand();
    return sampleRibbon(idx, t, s);
  } else if (k < 0.86) {
    return sampleGlobe();
  } else if (k < 0.95) {
    return sampleStem();
  } else {
    return sampleBase();
  }
}

// ── Orthographic projection with 10° tilt around X axis ──────
const TILT = 10 * Math.PI / 180;
const cosT = Math.cos(TILT), sinT = Math.sin(TILT);
function project(p) {
  const [x, y, z] = p;
  const y2 = y * cosT - z * sinT;
  const z2 = y * sinT + z * cosT;
  return [x, y2, z2];
}
```

After projection, depth-sort by `z2` (back to front) so closer points render on top. This reinforces the 3D core density and matches the static favicon's depth read.

For canvas mapping:

```
const VB = canvas.width;            // assume square
const PAD = 30 * (VB / 1000);
const X_MIN = -0.42, X_MAX = 0.42;
const Y_MIN = -0.95, Y_MAX = 0.95;
const Y_VIS_MIN = Y_MIN * cosT - 0.32 * sinT - 0.04;
const Y_VIS_MAX = Y_MAX * cosT + 0.32 * sinT + 0.04;
const sx = (VB - 2 * PAD) / (X_MAX - X_MIN);
const sy = (VB - 2 * PAD) / (Y_VIS_MAX - Y_VIS_MIN);
const s  = Math.min(sx, sy);  // preserve aspect (strict square)
const ox = VB / 2;
// SVG y grows down, so flip: cy = (VB / 2) - py * s
```

Dot radius: `1.35 * (VB / 1000)` pixels. Same as the favicon at scale.

---

## 10. Closing Note

The trophy already exists. We are not designing a new visual; we are showing the user what it looks like for ten thousand simulations to converge on a single form. This is the project's thesis as motion. The animation earns the headline. The headline earns the page.

Build it once. Run it once per visitor. Make it feel inevitable.
