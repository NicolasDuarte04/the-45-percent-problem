"use client";

/**
 * AccentPulse · Phase E §8 (D.3).
 *
 * One-shot 250ms warm-tint pulse: an absolutely positioned overlay
 * that fades from ~8% `--accent-warm` fill to 0 over the duration.
 * Single fire per `triggerKey` change. Never repeats, never compounds
 * (Phase E §8 D.3 hard rule).
 *
 * Usage: wrap the parent cell with `position: relative` and render
 * `<AccentPulse triggerKey={someNumber} />` inside it. When the parent
 * mutates the relevant state (slot drop, group completion, stage
 * advance), bump the trigger via `setPulseKey(k => k + 1)`.
 *
 * Checkpoint 17 (B1): migrated from Framer Motion to a single CSS
 * keyframe (.ck17-accent-pulse in globals.css). The `key={triggerKey}`
 * still re-mounts the span so the keyframe replays on every bump.
 * Reduced-motion users get an instant zero-opacity flash, identical
 * to the previous Framer Motion behavior. No JS runtime cost.
 */

interface AccentPulseProps {
  /**
   * Bumping this value re-mounts the span and re-fires the fade-out.
   * Defaults to 0 (no pulse on first mount).
   */
  triggerKey: number;
  /**
   * Mission 3: semantic tone. `warm` (default) keeps the original
   * accent-warm tint used for slot drops and pick landings. `success`
   * routes through `--ui-success` for "this group is now complete"
   * moments per the rebind table. Tone is per-call so existing
   * callers (e.g. ModeFinalFour slot drops) keep their warm pulse
   * without a sweep.
   */
  tone?: "warm" | "success";
}

export function AccentPulse({ triggerKey, tone = "warm" }: AccentPulseProps) {
  if (triggerKey === 0) return null;
  const tintClass =
    tone === "success" ? "bg-[var(--ui-success)]" : "bg-[var(--accent-warm)]";
  return (
    <span
      key={triggerKey}
      aria-hidden="true"
      className={`ck17-accent-pulse pointer-events-none absolute inset-0 ${tintClass}`}
    />
  );
}
