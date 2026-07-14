"use client";

import { useState } from "react";
import type { MatchDetail } from "@/lib/data/schemas";
import { NumericCell } from "@/components/primitives/NumericCell";
import { formatMono } from "@/lib/formatters";

interface StrengthInputsPanelProps {
  match: MatchDetail;
}

type CardKey =
  | "lambda_home"
  | "lambda_away"
  | "rho"
  | "elo_home"
  | "elo_away"
  | "elo_gap"
  | "form_home"
  | "form_away"
  | "fifa_rank";

interface CardSpec {
  key: CardKey;
  label: string;
  value: string;
  sub: string;
  /** Cards this one *derives from*. Hover/pin lights these up. */
  derivesFrom?: CardKey[];
  /**
   * Symbolic derivation, used in the pinned formula readout.
   * Resolved with the live numeric value of the card itself.
   */
  formula?: string;
}

/**
 * Weighted-form and FIFA-rank inputs are not populated for every fixture; the
 * producer emits a literal 0 as the absent sentinel rather than a real value.
 * Rendering that 0 as "0.00" / "0" reads as a genuine measurement, so treat 0 as
 * missing and show "n/a". A FIFA rank of 0 is structurally impossible (ranks
 * start at 1), and a weighted-form score is never exactly 0 once computed, so
 * this never masks a real value. Elo, which IS always populated, is unaffected.
 */
function formValue(v: number): string {
  return v === 0 ? "n/a" : v.toFixed(2);
}
function rankValue(v: number): string {
  return v === 0 ? "n/a" : String(v);
}

export function StrengthInputsPanel({ match }: StrengthInputsPanelProps) {
  const s = match.strength_inputs;
  const l = match.lambda;
  const home = match.home.fifa_code;
  const away = match.away.fifa_code;

  const cells: CardSpec[] = [
    {
      key: "lambda_home",
      label: `λ · ${home}`,
      value: l.home.toFixed(2),
      sub: "expected goals · home",
      derivesFrom: ["elo_home", "elo_away"],
      formula: `λ_${home} = f(elo_${home}, elo_${away}, home_advantage) = ${l.home.toFixed(2)}`,
    },
    {
      key: "lambda_away",
      label: `λ · ${away}`,
      value: l.away.toFixed(2),
      sub: "expected goals · away",
      derivesFrom: ["elo_home", "elo_away"],
      formula: `λ_${away} = f(elo_${away}, elo_${home}) = ${l.away.toFixed(2)}`,
    },
    {
      key: "rho",
      label: "ρ · Dixon-Coles",
      value: (l.rho >= 0 ? "+" : "−") + Math.abs(l.rho).toFixed(2),
      sub: "low-score correction",
    },
    {
      key: "elo_home",
      label: `elo · ${home}`,
      value: s.elo_home.toFixed(0),
      sub: "current rating",
    },
    {
      key: "elo_away",
      label: `elo · ${away}`,
      value: s.elo_away.toFixed(0),
      sub: "current rating",
    },
    {
      key: "elo_gap",
      label: "elo gap",
      value:
        (s.elo_home - s.elo_away >= 0 ? "+" : "−") +
        Math.abs(s.elo_home - s.elo_away).toFixed(0),
      sub: `${home} − ${away}`,
      derivesFrom: ["elo_home", "elo_away"],
      formula: `elo_gap = elo_${home} − elo_${away} = ${(s.elo_home - s.elo_away).toFixed(0)}`,
    },
    {
      key: "form_home",
      label: `form · ${home}`,
      value: formValue(s.form_home),
      sub: "weighted recent",
    },
    {
      key: "form_away",
      label: `form · ${away}`,
      value: formValue(s.form_away),
      sub: "weighted recent",
    },
    {
      key: "fifa_rank",
      label: "FIFA rank",
      value: `${rankValue(s.fifa_rank_home)} · ${rankValue(s.fifa_rank_away)}`,
      sub: `${home} · ${away}`,
    },
  ];

  // Card-level interactivity: hovering a card with `derivesFrom` lights up
  // its dependency cards. Click pins the source so the formula readout
  // persists. Hover wins for live exploration; pinned shows when nothing
  // is hovered. Clear on container leave so moving across the panel gap
  // never flickers.
  const [hoverKey, setHoverKey] = useState<CardKey | null>(null);
  const [pinnedKey, setPinnedKey] = useState<CardKey | null>(null);
  const activeKey = hoverKey ?? pinnedKey;
  const activeCard = cells.find((c) => c.key === activeKey) ?? null;
  const activeDeps = new Set(activeCard?.derivesFrom ?? []);

  const togglePin = (key: CardKey) =>
    setPinnedKey((prev) => (prev === key ? null : key));

  return (
    <div
      className="rounded-lg"
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border-subtle)",
        padding: "16px 18px",
      }}
    >
      <style>{styles}</style>

      <div className="flex justify-between items-baseline mb-3">
        <h3
          className="text-[13px] font-medium"
          style={{
            fontFamily: "var(--font-sans)",
            color: "var(--text-primary)",
          }}
        >
          Strength inputs
        </h3>
        <span
          className="mono text-[10px] tracking-[.06em]"
          style={{ color: "var(--text-quiet)" }}
        >
          M★ · bivariate Poisson
        </span>
      </div>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
        onMouseLeave={() => setHoverKey(null)}
      >
        {cells.map((c) => {
          const hasDeps = (c.derivesFrom?.length ?? 0) > 0;
          const isSource = activeKey === c.key;
          const isLinked = activeDeps.has(c.key);
          const isPinned = pinnedKey === c.key;
          return (
            <button
              type="button"
              key={c.key}
              className="strength-card mono"
              data-source={isSource ? "" : undefined}
              data-linked={isLinked ? "" : undefined}
              data-pinned={isPinned ? "" : undefined}
              data-derivable={hasDeps ? "" : undefined}
              onMouseEnter={() => setHoverKey(c.key)}
              onFocus={() => setHoverKey(c.key)}
              onBlur={() =>
                setHoverKey((prev) => (prev === c.key ? null : prev))
              }
              onClick={hasDeps ? () => togglePin(c.key) : undefined}
              aria-pressed={hasDeps ? isPinned : undefined}
            >
              <div
                className="strength-card-label"
                style={{ color: "var(--text-tertiary)" }}
              >
                {c.label}
              </div>
              <div
                className="mono text-[15px] mt-[2px]"
                style={{ color: "var(--text-primary)" }}
              >
                {c.value}
              </div>
              <div
                className="mono text-[10px] mt-[1px]"
                style={{ color: "var(--text-quiet)" }}
              >
                {c.sub}
              </div>
              <span
                className="strength-card-chip mono"
                aria-hidden="true"
              >
                → derives {activeCard?.key.startsWith("lambda_") ? "λ" : activeCard?.key === "elo_gap" ? "Δ" : "·"}
              </span>
            </button>
          );
        })}
      </div>

      <div
        className="strength-derivation mono"
        data-active={activeCard?.formula ? "" : undefined}
        data-pinned={
          pinnedKey !== null && hoverKey === null ? "" : undefined
        }
      >
        <span className="strength-derivation-prefix">derivation</span>
        <span className="strength-derivation-formula">
          {activeCard?.formula ??
            "hover or click λ / elo gap to inspect derivation"}
        </span>
      </div>

      {match.shootout_applicable && match.p_shootout_home_if_ko !== null && (
        <div
          className="mono text-[11px] mt-3 pt-3"
          style={{
            color: "var(--text-tertiary)",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          Shootout applicable · P({home} wins shootout | knock-out) ={" "}
          <NumericCell
            value={match.p_shootout_home_if_ko * 100}
            formatter={(v) => formatMono(v, 1)}
          />%
        </div>
      )}
    </div>
  );
}

const styles = `
.strength-card {
  position: relative;
  display: block;
  width: 100%;
  text-align: left;
  background: var(--bg-panel-elev);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  padding: 8px 10px;
  cursor: default;
  transition:
    background 150ms ease,
    border-color 150ms ease,
    box-shadow 150ms ease;
}
.strength-card[data-derivable] {
  cursor: pointer;
}
.strength-card[data-source] {
  background: color-mix(in oklch, var(--text-secondary) 6%, var(--bg-panel-elev));
}
.strength-card[data-linked] {
  border-color: var(--text-tertiary);
}
.strength-card[data-pinned] {
  background: color-mix(in oklch, var(--accent-focus) 8%, var(--bg-panel-elev));
  box-shadow: inset 0 0 0 1px var(--accent-focus);
}
.strength-card:focus-visible {
  outline: 2px solid var(--accent-focus);
  outline-offset: 2px;
}
.strength-card-label {
  font-size: 10px;
  transition: color 150ms ease;
}
.strength-card-chip {
  position: absolute;
  top: 6px;
  right: 8px;
  font-size: 9px;
  letter-spacing: 0.04em;
  color: var(--text-quiet);
  opacity: 0;
  transform: translateY(-2px);
  transition: opacity 150ms ease, transform 150ms ease;
  pointer-events: none;
  white-space: nowrap;
}
.strength-card[data-linked] .strength-card-chip {
  opacity: 1;
  transform: translateY(0);
}

.strength-derivation {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-top: 12px;
  padding: 8px 10px;
  border-top: 1px solid var(--border-subtle);
  font-size: 11px;
  color: var(--text-tertiary);
  min-height: 32px;
  transition: color 150ms ease;
}
.strength-derivation[data-active] .strength-derivation-formula {
  color: var(--text-primary);
}
.strength-derivation[data-pinned] .strength-derivation-prefix {
  color: var(--accent-focus);
}
.strength-derivation-prefix {
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-quiet);
  flex-shrink: 0;
  transition: color 150ms ease;
}
.strength-derivation-formula {
  font-size: 11px;
  color: var(--text-quiet);
  letter-spacing: -0.005em;
  transition: color 150ms ease;
}
`;
