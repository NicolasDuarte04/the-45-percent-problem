"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type TourSide = "top" | "right" | "bottom" | "left";
export type TourAlign = "start" | "center" | "end";

export type TourStep = {
  id: string;
  selector: string;
  side: TourSide;
  align?: TourAlign;
  title: string;
  body: React.ReactNode;
  footnote?: React.ReactNode;
};

const SIDE_OFFSET = 8;
const ARROW_INSET = 14;

const useReducedMotion = (): boolean =>
  useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
      mql.addEventListener("change", cb);
      return () => mql.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );

export function CanvasTour({
  steps,
  paramName = "guide",
}: {
  steps: TourStep[];
  paramName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const guideParam = params.get(paramName);
  const parsed = guideParam ? parseInt(guideParam, 10) : NaN;
  const stepIndex =
    Number.isFinite(parsed) && parsed >= 1 && parsed <= steps.length
      ? parsed - 1
      : -1;
  const open = stepIndex >= 0;
  const step = open ? steps[stepIndex] : null;

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const reducedMotion = useReducedMotion();

  const setStep = useCallback(
    (n: number | null) => {
      const sp = new URLSearchParams(params.toString());
      if (n === null) sp.delete(paramName);
      else sp.set(paramName, String(n + 1));
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router, paramName],
  );

  // Resolve target on step change; scroll into view; outline.
  // setAnchorEl is invoked from a rAF callback (subscription-style) rather
  // than synchronously in the effect body. The dialog only renders when
  // `step` and `rect` are both truthy, so a stale anchorEl from a previous
  // step is harmless: the cleanup restores its outline on unmount.
  useEffect(() => {
    if (!step) return;
    let el: HTMLElement | null = null;
    let prevOutline = "";
    let prevOffset = "";
    const raf = requestAnimationFrame(() => {
      el = document.querySelector<HTMLElement>(step.selector);
      if (!el) return;
      setAnchorEl(el);
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      el.scrollIntoView({
        block: "center",
        behavior: reduced ? "auto" : "smooth",
      });
      prevOutline = el.style.outline;
      prevOffset = el.style.outlineOffset;
      el.style.outline = "1px solid var(--accent-focus)";
      el.style.outlineOffset = "2px";
    });
    return () => {
      cancelAnimationFrame(raf);
      if (el) {
        el.style.outline = prevOutline;
        el.style.outlineOffset = prevOffset;
      }
    };
  }, [step]);

  // Track anchor rect (resize, scroll, layout shifts).
  useLayoutEffect(() => {
    if (!anchorEl) return;
    const update = () => setRect(anchorEl.getBoundingClientRect());
    update();
    const ro = new ResizeObserver(update);
    ro.observe(anchorEl);
    ro.observe(document.documentElement);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    let raf = 0;
    const tick = () => {
      update();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const stop = window.setTimeout(() => cancelAnimationFrame(raf), 400);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      cancelAnimationFrame(raf);
      window.clearTimeout(stop);
    };
  }, [anchorEl]);

  // Keyboard: "?" opens, Esc closes, ←/→ navigate.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (e.key === "?" && !open) {
        e.preventDefault();
        setStep(0);
        return;
      }
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        setStep(null);
      } else if (e.key === "ArrowRight" && stepIndex < steps.length - 1) {
        e.preventDefault();
        setStep(stepIndex + 1);
      } else if (e.key === "ArrowLeft" && stepIndex > 0) {
        e.preventDefault();
        setStep(stepIndex - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, stepIndex, setStep, steps.length]);

  if (!step || !rect) return null;

  const isLast = stepIndex === steps.length - 1;
  const isFirst = stepIndex === 0;
  const placement = computePlacement(
    rect,
    step.side,
    step.align ?? "center",
    window.innerWidth,
    window.innerHeight,
  );
  const effectiveSide = placement.effectiveSide;

  // Portal into the nearest canvas container so canvas-aware CSS variables
  // (--bg-panel, --border-default, --accent-focus, ...) resolve to the
  // surrounding canvas's values rather than the :root editorial fallback.
  const canvasRoot =
    (anchorEl?.closest<HTMLElement>("[data-canvas]")) ?? document.body;

  return createPortal(
    <div
      role="dialog"
      aria-modal="false"
      aria-label={`Guided tour, step ${stepIndex + 1} of ${steps.length}`}
      style={{
        position: "fixed",
        zIndex: 50,
        left: placement.left,
        top: placement.top,
        transform: placement.transform,
        width: 300,
        maxWidth: 320,
        backgroundColor: "var(--bg-panel)",
        border: "1px solid var(--border-default)",
        borderRadius: 2,
        padding: 12,
        opacity: 1,
        animation: reducedMotion ? undefined : "tg-fade-in 120ms ease-out",
      }}
    >
      <Arrow side={effectiveSide} align={step.align ?? "center"} />
      <div className="flex items-baseline justify-between gap-3">
        <h3
          className="text-[12px] font-medium tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {step.title}
        </h3>
        <span
          className="mono text-[10px] tabular-nums"
          style={{ color: "var(--text-tertiary)" }}
        >
          {String(stepIndex + 1).padStart(2, "0")} /{" "}
          {String(steps.length).padStart(2, "0")}
        </span>
      </div>
      <p
        className="mt-2 text-[11px]"
        style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}
      >
        {step.body}
      </p>
      {step.footnote ? (
        <p
          className="mt-2 text-[10px]"
          style={{ color: "var(--text-tertiary)", lineHeight: 1.5 }}
        >
          {step.footnote}
        </p>
      ) : null}
      <div
        className="mt-3 flex items-center justify-between pt-2"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <button
          type="button"
          onClick={() => setStep(null)}
          className="text-[10px] transition-colors duration-[120ms]"
          style={{ color: "var(--text-tertiary)" }}
        >
          End tour
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setStep(stepIndex - 1)}
            disabled={isFirst}
            className="text-[10px] transition-colors duration-[120ms] disabled:opacity-30"
            style={{ color: "var(--text-tertiary)" }}
          >
            &larr; Prev
          </button>
          <button
            type="button"
            onClick={() => (isLast ? setStep(null) : setStep(stepIndex + 1))}
            className="text-[10px] transition-colors duration-[120ms] hover:underline"
            style={{ color: "var(--accent-focus)" }}
          >
            {isLast ? "Close" : "Next →"}
          </button>
        </div>
      </div>
      <style>{`@keyframes tg-fade-in { from { opacity: 0 } to { opacity: 1 } }`}</style>
    </div>,
    canvasRoot,
  );
}

// Approximate card box, used for one-pass space-fit detection. The actual
// card width is fixed (300, max 320); the height varies with copy length but
// 240 is a generous upper bound for our 7-or-fewer-step tours.
const EST_CARD_W = 320;
const EST_CARD_H = 240;
const VIEWPORT_MARGIN = 8;

function pickEffectiveSide(
  r: DOMRect,
  side: TourSide,
  vw: number,
  vh: number,
): TourSide {
  const m = VIEWPORT_MARGIN;
  const fits = (s: TourSide): boolean => {
    if (s === "left")   return r.left  - SIDE_OFFSET - EST_CARD_W >= m;
    if (s === "right")  return r.right + SIDE_OFFSET + EST_CARD_W <= vw - m;
    if (s === "top")    return r.top   - SIDE_OFFSET - EST_CARD_H >= m;
    /* bottom */        return r.bottom + SIDE_OFFSET + EST_CARD_H <= vh - m;
  };
  if (fits(side)) return side;
  const opposite: Record<TourSide, TourSide> = {
    left: "right",
    right: "left",
    top: "bottom",
    bottom: "top",
  };
  if (fits(opposite[side])) return opposite[side];
  // Cross-axis fallback: prefer bottom, then top, then opposite of original.
  if (fits("bottom")) return "bottom";
  if (fits("top")) return "top";
  return opposite[side];
}

function computePlacement(
  r: DOMRect,
  side: TourSide,
  align: TourAlign,
  vw: number,
  vh: number,
): { left: number; top: number; transform: string; effectiveSide: TourSide } {
  const s = pickEffectiveSide(r, side, vw, vh);
  if (s === "bottom") {
    const top = r.bottom + SIDE_OFFSET;
    if (align === "start") return { left: r.left, top, transform: "none", effectiveSide: s };
    if (align === "end") return { left: r.right, top, transform: "translateX(-100%)", effectiveSide: s };
    return { left: r.left + r.width / 2, top, transform: "translateX(-50%)", effectiveSide: s };
  }
  if (s === "top") {
    const top = r.top - SIDE_OFFSET;
    if (align === "start") return { left: r.left, top, transform: "translateY(-100%)", effectiveSide: s };
    if (align === "end") return { left: r.right, top, transform: "translate(-100%, -100%)", effectiveSide: s };
    return { left: r.left + r.width / 2, top, transform: "translate(-50%, -100%)", effectiveSide: s };
  }
  if (s === "right") {
    const left = r.right + SIDE_OFFSET;
    if (align === "start") return { left, top: r.top, transform: "none", effectiveSide: s };
    if (align === "end") return { left, top: r.bottom, transform: "translateY(-100%)", effectiveSide: s };
    return { left, top: r.top + r.height / 2, transform: "translateY(-50%)", effectiveSide: s };
  }
  // s === "left"
  const left = r.left - SIDE_OFFSET;
  if (align === "start") return { left, top: r.top, transform: "translateX(-100%)", effectiveSide: s };
  if (align === "end") return { left, top: r.bottom, transform: "translate(-100%, -100%)", effectiveSide: s };
  return { left, top: r.top + r.height / 2, transform: "translate(-100%, -50%)", effectiveSide: s };
}

function Arrow({ side, align }: { side: TourSide; align: TourAlign }) {
  const base: React.CSSProperties = {
    position: "absolute",
    width: 10,
    height: 5,
    overflow: "visible",
  };
  if (side === "bottom") {
    base.top = -5;
    base.left =
      align === "start" ? ARROW_INSET : align === "end" ? `calc(100% - ${ARROW_INSET + 10}px)` : "calc(50% - 5px)";
    return (
      <svg style={base} viewBox="0 0 10 5" aria-hidden>
        <path d="M0 5 L5 0 L10 5 L9 5 L5 1 L1 5 Z" fill="var(--bg-panel)" stroke="var(--border-default)" strokeWidth={1} strokeLinejoin="miter" />
      </svg>
    );
  }
  if (side === "top") {
    base.bottom = -5;
    base.left =
      align === "start" ? ARROW_INSET : align === "end" ? `calc(100% - ${ARROW_INSET + 10}px)` : "calc(50% - 5px)";
    return (
      <svg style={base} viewBox="0 0 10 5" aria-hidden>
        <path d="M0 0 L5 5 L10 0 L9 0 L5 4 L1 0 Z" fill="var(--bg-panel)" stroke="var(--border-default)" strokeWidth={1} strokeLinejoin="miter" />
      </svg>
    );
  }
  if (side === "left") {
    base.right = -5;
    base.width = 5;
    base.height = 10;
    base.top =
      align === "start" ? ARROW_INSET : align === "end" ? `calc(100% - ${ARROW_INSET + 10}px)` : "calc(50% - 5px)";
    return (
      <svg style={base} viewBox="0 0 5 10" aria-hidden>
        <path d="M0 0 L5 5 L0 10 L0 9 L4 5 L0 1 Z" fill="var(--bg-panel)" stroke="var(--border-default)" strokeWidth={1} strokeLinejoin="miter" />
      </svg>
    );
  }
  // right
  base.left = -5;
  base.width = 5;
  base.height = 10;
  base.top =
    align === "start" ? ARROW_INSET : align === "end" ? `calc(100% - ${ARROW_INSET + 10}px)` : "calc(50% - 5px)";
  return (
    <svg style={base} viewBox="0 0 5 10" aria-hidden>
      <path d="M5 0 L0 5 L5 10 L5 9 L1 5 L5 1 Z" fill="var(--bg-panel)" stroke="var(--border-default)" strokeWidth={1} strokeLinejoin="miter" />
    </svg>
  );
}

function isEditableTarget(t: EventTarget | null) {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || t.isContentEditable;
}
