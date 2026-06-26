"use client";

import { useState, type ReactNode } from "react";

type View = "frozen" | "live";

interface BracketViewToggleProps {
  frozen: ReactNode;
  live: ReactNode;
}

const TOGGLE_BTN_BASE: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: ".08em",
  textTransform: "uppercase",
  background: "transparent",
  padding: "5px 10px",
  borderRadius: 4,
  cursor: "pointer",
  transition: "border-color 120ms, color 120ms",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

function ToggleButton({
  label,
  badge,
  selected,
  onClick,
}: {
  label: string;
  badge?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      style={{
        ...TOGGLE_BTN_BASE,
        border: `1px solid ${selected ? "var(--accent-warm)" : "var(--border-default)"}`,
        color: selected ? "var(--text-primary)" : "var(--text-secondary)",
      }}
    >
      [ {label} ]
      {badge ? (
        <span
          className="mono"
          style={{
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: ".06em",
            padding: "1px 5px",
            borderRadius: 3,
            color: "var(--text-secondary)",
            backgroundColor: "var(--bg-subtle, rgba(127,127,127,0.12))",
          }}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

/**
 * cp-bracket-ux (FIX B): top-of-page switch between the canonical FROZEN
 * forecast (graded, pre-registered, default) and the UNGRADED live conditional
 * view. Both panels are prerendered (the page is force-static) and passed in as
 * server-rendered subtrees; switching only flips visibility via `display`, so
 * the frozen snapshot-picker island keeps its LATEST / 7 DAYS AGO selection and
 * the live BracketBoard never re-mounts. This component renders ONLY when the
 * live view is available (page passes it solely when `loadLiveBracket` is
 * non-null with the flag on); otherwise the page renders the frozen panel alone
 * with no toggle, leaving the flag gate intact.
 */
export function BracketViewToggle({ frozen, live }: BracketViewToggleProps) {
  const [view, setView] = useState<View>("live");

  const select = (next: View) => {
    if (next === view) return;
    setView(next);
  };

  return (
    <>
      <div
        className="shrink-0 px-4 md:px-6 pt-6 pb-4 border-b"
        style={{ borderColor: "var(--border-default)" }}
      >
        <div className="max-w-[1152px] mx-auto px-0 md:px-12 flex flex-col gap-2">
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
            }}
          >
            View
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <ToggleButton
              label="Frozen forecast"
              selected={view === "frozen"}
              onClick={() => select("frozen")}
            />
            <ToggleButton
              label="Live conditional"
              badge="NOT graded"
              selected={view === "live"}
              onClick={() => select("live")}
            />
          </div>
        </div>
      </div>

      <div style={{ display: view === "frozen" ? "contents" : "none" }}>
        {frozen}
      </div>
      <div style={{ display: view === "live" ? "contents" : "none" }}>
        {live}
      </div>
    </>
  );
}
