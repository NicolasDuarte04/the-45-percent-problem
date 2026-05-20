/**
 * Toast dispatcher · CP-00 (V3).
 *
 * A single-toast, pub-sub status surface. CP-04, CP-07, CP-10, and
 * CP-11 dispatch into it; the host component in `Toast.tsx` renders
 * the current message.
 *
 * Behaviour:
 *   - One toast at a time. A new dispatch replaces the current one
 *     immediately; the previous toast's `onClick` is discarded.
 *   - Auto-dismisses after `durationMs` (default 6000). The host
 *     pauses the timer on hover via `pauseDismissTimer()` and
 *     resumes via `resumeDismissTimer()`.
 *   - The dismiss timer is independent of motion preferences; the
 *     reduced-motion fallback collapses transitions in the host, not
 *     the lifecycle here.
 *
 * No React, no DOM. The dispatcher is pure TS so the timer and
 * replace semantics can be unit-tested in a node environment.
 */

export interface ToastAction {
  /** Visual label rendered inside `[ ... ]` brackets. */
  label: string;
  onClick: () => void;
}

export interface ToastMessage {
  id: string;
  message: string;
  action?: ToastAction;
  durationMs: number;
}

export interface DispatchToastOptions {
  action?: ToastAction;
  durationMs?: number;
}

type Subscriber = (toast: ToastMessage | null) => void;

const DEFAULT_DURATION_MS = 6000;

const subscribers = new Set<Subscriber>();
let current: ToastMessage | null = null;

// Timer bookkeeping. `remaining` tracks the time left on the currently
// active dismiss schedule so the host can pause and resume on hover
// without dropping or repeating the dismiss.
let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
let scheduledAt: number | null = null;
let remaining: number = 0;

function notify(): void {
  for (const listener of subscribers) {
    listener(current);
  }
}

function clearTimer(): void {
  if (timeoutHandle !== null) {
    clearTimeout(timeoutHandle);
    timeoutHandle = null;
  }
  scheduledAt = null;
}

function arm(durationMs: number): void {
  clearTimer();
  remaining = durationMs;
  scheduledAt = Date.now();
  timeoutHandle = setTimeout(() => {
    timeoutHandle = null;
    scheduledAt = null;
    current = null;
    notify();
  }, durationMs);
}

let nextId = 0;
function generateId(): string {
  nextId += 1;
  return `toast-${nextId}`;
}

export function dispatchToast(
  message: string,
  options?: DispatchToastOptions,
): void {
  const next: ToastMessage = {
    id: generateId(),
    message,
    action: options?.action,
    durationMs: options?.durationMs ?? DEFAULT_DURATION_MS,
  };
  current = next;
  arm(next.durationMs);
  notify();
}

/**
 * Immediately dismiss the current toast. Used by the action-button
 * click path and by tests. The previous toast's `onClick` is NOT
 * invoked from here; the caller is responsible for that.
 */
export function dismissToast(): void {
  if (current === null) return;
  clearTimer();
  current = null;
  notify();
}

/**
 * Run the current toast's action callback (if any) and dismiss the
 * toast. Called by the host component when the action button is
 * activated.
 */
export function invokeToastAction(): void {
  const action = current?.action;
  dismissToast();
  action?.onClick();
}

/**
 * Pause the dismiss timer. Idempotent; calling twice without resuming
 * is a no-op. Used by the host on pointer enter (fine pointers only).
 */
export function pauseDismissTimer(): void {
  if (timeoutHandle === null || scheduledAt === null) return;
  const elapsed = Date.now() - scheduledAt;
  remaining = Math.max(0, remaining - elapsed);
  clearTimeout(timeoutHandle);
  timeoutHandle = null;
  scheduledAt = null;
}

/**
 * Resume the dismiss timer from the remaining duration captured by
 * the last pause. No-op if there is no active toast or the timer is
 * already running.
 */
export function resumeDismissTimer(): void {
  if (current === null) return;
  if (timeoutHandle !== null) return;
  if (remaining <= 0) {
    current = null;
    notify();
    return;
  }
  scheduledAt = Date.now();
  timeoutHandle = setTimeout(() => {
    timeoutHandle = null;
    scheduledAt = null;
    current = null;
    notify();
  }, remaining);
}

export function subscribeToToasts(listener: Subscriber): () => void {
  subscribers.add(listener);
  listener(current);
  return () => {
    subscribers.delete(listener);
  };
}

export function getCurrentToast(): ToastMessage | null {
  return current;
}

/**
 * Reset all internal state. Intended for tests; not used at runtime.
 */
export function __resetToastForTest(): void {
  clearTimer();
  current = null;
  remaining = 0;
  nextId = 0;
  subscribers.clear();
}
