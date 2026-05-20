"use client";

/**
 * Toast host · CP-00 (V3).
 *
 * Mounts once at the root layout and renders the current message from
 * the `dispatchToast` dispatcher in `src/lib/ui/toast.ts`. The
 * lifecycle (replace, auto-dismiss, action-invoke, pause / resume on
 * hover) lives in the dispatcher; this component is the render layer.
 *
 * Position: bottom-centre above sm; bottom-full-width below sm; 16px
 * from the viewport edge.
 *
 * Motion: 240ms slide-up + opacity on entry (toastIn preset), 220ms
 * fade on exit (exit preset). Under prefers-reduced-motion, both
 * transitions collapse to instant (no slide, no opacity ramp).
 */

import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { motion as motionVocab } from "@/lib/motion/vocabulary";
import {
  invokeToastAction,
  pauseDismissTimer,
  resumeDismissTimer,
  subscribeToToasts,
  type ToastMessage,
} from "@/lib/ui/toast";

const COARSE_POINTER_QUERY = "(pointer: coarse)";

function subscribeCoarsePointer(callback: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) {
    return () => {};
  }
  const mql = window.matchMedia(COARSE_POINTER_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getCoarsePointerSnapshot(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(COARSE_POINTER_QUERY).matches;
}

function getCoarsePointerServerSnapshot(): boolean {
  return false;
}

function useIsCoarsePointer(): boolean {
  return useSyncExternalStore(
    subscribeCoarsePointer,
    getCoarsePointerSnapshot,
    getCoarsePointerServerSnapshot,
  );
}

export function ToastHost() {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const prefersReduced = useReducedMotion();
  const coarsePointer = useIsCoarsePointer();

  useEffect(() => subscribeToToasts(setToast), []);

  const entry = prefersReduced ? { duration: 0 } : motionVocab.toastIn;
  const exit = prefersReduced ? { duration: 0 } : motionVocab.exit;
  const slideY = prefersReduced ? 0 : 8;

  const handlePointerEnter = () => {
    if (coarsePointer) return;
    pauseDismissTimer();
  };
  const handlePointerLeave = () => {
    if (coarsePointer) return;
    resumeDismissTimer();
  };

  return (
    <div
      aria-live="polite"
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4"
    >
      <AnimatePresence mode="wait">
        {toast ? (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: slideY }}
            animate={{ opacity: 1, y: 0, transition: entry }}
            exit={{ opacity: 0, y: slideY, transition: exit }}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
            className="pointer-events-auto w-full max-w-md"
            style={{
              backgroundColor: "var(--bg-panel-elev)",
              borderColor: "var(--border-default)",
              color: "var(--text-primary)",
            }}
          >
            <div
              className="flex items-center gap-3 border px-3 py-2 text-[12px] font-mono"
              style={{ borderColor: "var(--border-default)" }}
            >
              <span className="flex-1">{toast.message}</span>
              {toast.action ? (
                <button
                  type="button"
                  onClick={() => invokeToastAction()}
                  className="font-mono uppercase tracking-wide"
                  aria-label={toast.action.label}
                  style={{ color: "var(--accent-warm)" }}
                >
                  <span aria-hidden="true">[ </span>
                  {toast.action.label}
                  <span aria-hidden="true"> ]</span>
                </button>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
