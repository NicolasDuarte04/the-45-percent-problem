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

type Side = "top" | "right" | "bottom" | "left";
type Align = "start" | "center" | "end";

type Step = {
  id: string;
  selector: string;
  side: Side;
  align?: Align;
  title: string;
  body: React.ReactNode;
  footnote?: React.ReactNode;
};

const SIDE_OFFSET = 8;
const ARROW_INSET = 14;

const STEPS: Step[] = [
  {
    id: "scope",
    selector: '[data-guide-id="masthead-title"]',
    side: "bottom",
    align: "start",
    title: "Scope of this terminal",
    body: (
      <>
        Each row reports a single market for which the model&rsquo;s posterior
        probability differs materially from the consensus implied by current
        prices. Rows are not recommendations; they are observations of
        disagreement, recorded for out-of-sample evaluation.
      </>
    ),
  },
  {
    id: "snapshot",
    selector: '[data-guide-id="snapshot-id"]',
    side: "bottom",
    align: "end",
    title: "Snapshot identifier",
    body: (
      <>
        A snapshot is the full row set captured at one wall-clock moment. The
        identifier is content-addressed: identical inputs yield identical IDs.
        Cite this string when referencing a result.
      </>
    ),
    footnote: (
      <>
        Format: <span className="mono">yyyy-mm-dd-HHMM-{`{hash}`}</span>.
      </>
    ),
  },
  {
    id: "edge",
    selector: '[data-guide-id="col-edge"]',
    side: "bottom",
    align: "center",
    title: "Edge",
    body: (
      <>
        <span className="mono">E = p_model &minus; q_devigged</span>. Positive
        values indicate the model assigns higher probability than the de-vigged
        market; negative values, lower. Rows are sorted by{" "}
        <span className="mono">|E|</span> descending so the largest
        disagreements appear first regardless of sign.
      </>
    ),
    footnote: <>See the Research Vault article on de-vigging.</>,
  },
  {
    id: "divergence",
    selector: '[data-guide-id="col-divergence"]',
    side: "bottom",
    align: "center",
    title: "Signed divergence",
    body: (
      <>
        Horizontal extent encodes <span className="mono">|E|</span>; direction
        encodes sign. A bar leaning right indicates the model assigns higher
        probability than the market; left, lower. The zero axis is the
        de-vigged consensus, not 0.5.
      </>
    ),
  },
  {
    id: "gate",
    selector: '[data-guide-id="col-gate"]',
    side: "left",
    align: "center",
    title: "Volatility Gate",
    body: (
      <>
        When the gate fires on a row, it is annotated with a{" "}
        <span style={{ color: "var(--gate-fired)" }}>&#9670;</span> marker, not
        removed from the table. The gate flags conditions under which a
        divergence is less reliable &mdash; stale price, named-event proximity,
        exchange disagreement, low liquidity &mdash; so the reader can discount
        the row, not so the system can hide it.{" "}
        <span className="mono">&epsilon; = 3%</span> mainline.
      </>
    ),
  },
  {
    id: "empty",
    selector: '[data-guide-id="all-gated-banner"]',
    side: "bottom",
    align: "start",
    title: "All rows gated",
    body: (
      <>
        When every row in a snapshot has the gate tripped, this banner is
        shown. Rows remain visible &mdash; the gate annotates, it does not
        filter &mdash; but the reader is warned that no divergence in this
        snapshot is currently in clean conditions.
      </>
    ),
  },
  {
    id: "osf",
    selector: '[data-guide-id="osf-link"]',
    side: "bottom",
    align: "end",
    title: "Pre-registration record",
    body: (
      <>
        Inclusion criteria, scoring rule, and stopping conditions were
        registered with the OSF prior to data collection. The link resolves to
        a timestamped, immutable record. Any divergence between this terminal
        and that document is a bug.
      </>
    ),
  },
];

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

export function TerminalGuide() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const guideParam = params.get("guide");
  const parsed = guideParam ? parseInt(guideParam, 10) : NaN;
  const stepIndex =
    Number.isFinite(parsed) && parsed >= 1 && parsed <= STEPS.length
      ? parsed - 1
      : -1;
  const open = stepIndex >= 0;
  const step = open ? STEPS[stepIndex] : null;

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const reducedMotion = useReducedMotion();

  const setStep = useCallback(
    (n: number | null) => {
      const sp = new URLSearchParams(params.toString());
      if (n === null) sp.delete("guide");
      else sp.set("guide", String(n + 1));
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  // Resolve target on step change; scroll into view; outline.
  // setAnchorEl is invoked from a rAF callback (subscription-style) rather
  // than synchronously in the effect body. The dialog only renders when
  // `step` and `rect` are both truthy, so a stale anchorEl from a previous
  // step is harmless — the cleanup restores its outline on unmount.
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
    // Re-measure each frame for ~400ms to track smooth scroll completion.
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
      } else if (e.key === "ArrowRight" && stepIndex < STEPS.length - 1) {
        e.preventDefault();
        setStep(stepIndex + 1);
      } else if (e.key === "ArrowLeft" && stepIndex > 0) {
        e.preventDefault();
        setStep(stepIndex - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, stepIndex, setStep]);

  if (!step || !rect) return null;

  const isLast = stepIndex === STEPS.length - 1;
  const isFirst = stepIndex === 0;
  const placement = computePlacement(rect, step.side, step.align ?? "center");

  // Portal into the nearest canvas container so canvas-aware CSS variables
  // (--bg-panel, --border-default, --accent-focus, ...) resolve to the
  // surrounding canvas's values rather than the :root editorial fallback.
  const canvasRoot =
    (anchorEl?.closest<HTMLElement>("[data-canvas]")) ?? document.body;

  return createPortal(
    <div
      role="dialog"
      aria-modal="false"
      aria-label={`Guided tour, step ${stepIndex + 1} of ${STEPS.length}`}
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
      <Arrow side={step.side} align={step.align ?? "center"} />
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
          {String(STEPS.length).padStart(2, "0")}
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

function computePlacement(
  r: DOMRect,
  side: Side,
  align: Align,
): { left: number; top: number; transform: string } {
  if (side === "bottom") {
    const top = r.bottom + SIDE_OFFSET;
    if (align === "start") return { left: r.left, top, transform: "none" };
    if (align === "end") return { left: r.right, top, transform: "translateX(-100%)" };
    return { left: r.left + r.width / 2, top, transform: "translateX(-50%)" };
  }
  if (side === "top") {
    const top = r.top - SIDE_OFFSET;
    if (align === "start") return { left: r.left, top, transform: "translateY(-100%)" };
    if (align === "end") return { left: r.right, top, transform: "translate(-100%, -100%)" };
    return { left: r.left + r.width / 2, top, transform: "translate(-50%, -100%)" };
  }
  if (side === "right") {
    const left = r.right + SIDE_OFFSET;
    if (align === "start") return { left, top: r.top, transform: "none" };
    if (align === "end") return { left, top: r.bottom, transform: "translateY(-100%)" };
    return { left, top: r.top + r.height / 2, transform: "translateY(-50%)" };
  }
  // side === "left"
  const left = r.left - SIDE_OFFSET;
  if (align === "start") return { left, top: r.top, transform: "translateX(-100%)" };
  if (align === "end") return { left, top: r.bottom, transform: "translate(-100%, -100%)" };
  return { left, top: r.top + r.height / 2, transform: "translate(-100%, -50%)" };
}

function Arrow({ side, align }: { side: Side; align: Align }) {
  // 1px outlined triangle, matches the card border. Pointed back at the anchor.
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
