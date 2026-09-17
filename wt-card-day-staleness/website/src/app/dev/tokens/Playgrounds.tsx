"use client";

/**
 * Client-side motion playgrounds for /dev/tokens · CP-00 (V3).
 *
 * Three small triggers a reviewer can use to eyeball the new presets
 * against the dark canvas:
 *   - bandReveal: a width animation on a placeholder rectangle.
 *   - tickRoll:   a 0 → 1247 count-up using tabular-nums.
 *   - toastIn:    a live toast dispatch exercising the dispatcher end-to-end.
 */

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { motion as motionVocab } from "@/lib/motion/vocabulary";
import { dispatchToast } from "@/lib/ui/toast";
import {
  RESET_TOAST_ACTION_LABEL,
  RESET_TOAST_MESSAGE,
} from "@/lib/sim/bandCopy";

const COUNT_TARGET = 1247;

export function MotionPlaygrounds() {
  const prefersReduced = useReducedMotion();
  const [bandKey, setBandKey] = useState(0);
  const [count, setCount] = useState(0);
  const [tickKey, setTickKey] = useState(0);
  const [toastCount, setToastCount] = useState(0);

  const bandTransition = prefersReduced ? { duration: 0 } : motionVocab.bandReveal;
  const tickTransition = prefersReduced ? { duration: 0 } : motionVocab.tickRoll;

  return (
    <div className="space-y-6">
      <Row label="bandReveal">
        <div
          className="h-3 w-full overflow-hidden border"
          style={{
            borderColor: "var(--border-default)",
            backgroundColor: "var(--bg-panel-elev)",
          }}
        >
          <motion.div
            key={bandKey}
            initial={{ width: "0%" }}
            animate={{ width: "100%", transition: bandTransition }}
            className="h-full"
            style={{ backgroundColor: "var(--band-rare)" }}
          />
        </div>
        <button
          type="button"
          onClick={() => setBandKey((k) => k + 1)}
          className="mt-2 border px-2 py-1 font-mono text-[11px]"
          style={{
            borderColor: "var(--border-default)",
            color: "var(--text-primary)",
          }}
        >
          [ play bandReveal ]
        </button>
      </Row>

      <Row label="tickRoll">
        <motion.div
          key={tickKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: tickTransition }}
          className="font-mono text-[28px] tabular-nums"
          style={{ color: "var(--text-primary)" }}
        >
          {count}
        </motion.div>
        <button
          type="button"
          onClick={() => {
            setCount((c) => (c === 0 ? COUNT_TARGET : 0));
            setTickKey((k) => k + 1);
          }}
          className="mt-2 border px-2 py-1 font-mono text-[11px]"
          style={{
            borderColor: "var(--border-default)",
            color: "var(--text-primary)",
          }}
        >
          [ play tickRoll ]
        </button>
      </Row>

      <Row label="toastIn">
        <p
          className="font-mono text-[11px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          dispatched: {toastCount}
        </p>
        <button
          type="button"
          onClick={() => {
            setToastCount((c) => c + 1);
            dispatchToast(RESET_TOAST_MESSAGE, {
              action: {
                label: RESET_TOAST_ACTION_LABEL,
                onClick: () => {
                  // Eyeball-only. The dev page does not roll back state.
                },
              },
            });
          }}
          className="mt-2 border px-2 py-1 font-mono text-[11px]"
          style={{
            borderColor: "var(--border-default)",
            color: "var(--text-primary)",
          }}
        >
          [ dispatch toast ]
        </button>
      </Row>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div
        className="font-mono text-[10px] uppercase tracking-wider"
        style={{ color: "var(--text-quiet)" }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
