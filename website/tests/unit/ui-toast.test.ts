/**
 * Toast dispatcher · CP-00 (V3) · unit tests.
 *
 * Exercises the pub-sub dispatcher in `src/lib/ui/toast.ts`. The host
 * component in `src/components/ui/Toast.tsx` is the render layer; its
 * lifecycle behaviour (replace, auto-dismiss, action-invoke, the
 * timer's independence from motion preferences) is owned entirely by
 * the dispatcher tested here. See the PR's Open Questions for why
 * React Testing Library is not used.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetToastForTest,
  dispatchToast,
  invokeToastAction,
  pauseDismissTimer,
  resumeDismissTimer,
  subscribeToToasts,
  type ToastMessage,
} from "@/lib/ui/toast";

describe("toast dispatcher", () => {
  beforeEach(() => {
    __resetToastForTest();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    __resetToastForTest();
  });

  it("dispatches a toast and notifies subscribers with the message", () => {
    const updates: Array<ToastMessage | null> = [];
    subscribeToToasts((t) => updates.push(t));

    dispatchToast("Cleared.");

    const last = updates[updates.length - 1];
    expect(last).not.toBeNull();
    expect(last?.message).toBe("Cleared.");
  });

  it("replaces the current toast on a second dispatch and does not invoke the first action", () => {
    const firstAction = vi.fn();
    const secondAction = vi.fn();

    const updates: Array<ToastMessage | null> = [];
    subscribeToToasts((t) => updates.push(t));

    dispatchToast("First", { action: { label: "Undo", onClick: firstAction } });
    dispatchToast("Second", {
      action: { label: "Undo", onClick: secondAction },
    });

    const last = updates[updates.length - 1];
    expect(last?.message).toBe("Second");
    expect(firstAction).not.toHaveBeenCalled();
    expect(secondAction).not.toHaveBeenCalled();
  });

  it("auto-dismisses after the duration elapses", () => {
    const updates: Array<ToastMessage | null> = [];
    subscribeToToasts((t) => updates.push(t));

    dispatchToast("Cleared.", { durationMs: 1000 });
    expect(updates[updates.length - 1]?.message).toBe("Cleared.");

    vi.advanceTimersByTime(999);
    expect(updates[updates.length - 1]?.message).toBe("Cleared.");

    vi.advanceTimersByTime(1);
    expect(updates[updates.length - 1]).toBeNull();
  });

  it("runs the action onClick and dismisses immediately when the action is invoked", () => {
    const action = vi.fn();
    const updates: Array<ToastMessage | null> = [];
    subscribeToToasts((t) => updates.push(t));

    dispatchToast("Cleared.", {
      action: { label: "Undo", onClick: action },
      durationMs: 5000,
    });

    invokeToastAction();

    expect(action).toHaveBeenCalledTimes(1);
    expect(updates[updates.length - 1]).toBeNull();

    // The dismiss timer must not fire after manual dismiss.
    vi.advanceTimersByTime(5000);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("respects the dismiss timer independently of motion preferences (pause + resume preserves remaining time)", () => {
    // Mock matchMedia to report prefers-reduced-motion: reduce. The
    // dispatcher does not read it (motion is a render concern in the
    // host component), so the timer must still fire on schedule.
    const matchMediaMock = vi.fn().mockReturnValue({
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });
    (globalThis as { matchMedia?: unknown }).matchMedia = matchMediaMock;

    const updates: Array<ToastMessage | null> = [];
    subscribeToToasts((t) => updates.push(t));

    dispatchToast("Cleared.", { durationMs: 1000 });
    vi.advanceTimersByTime(400);
    expect(updates[updates.length - 1]?.message).toBe("Cleared.");

    pauseDismissTimer();
    vi.advanceTimersByTime(5000);
    // While paused the timer must not fire.
    expect(updates[updates.length - 1]?.message).toBe("Cleared.");

    resumeDismissTimer();
    vi.advanceTimersByTime(599);
    expect(updates[updates.length - 1]?.message).toBe("Cleared.");
    vi.advanceTimersByTime(1);
    expect(updates[updates.length - 1]).toBeNull();

    delete (globalThis as { matchMedia?: unknown }).matchMedia;
  });
});
