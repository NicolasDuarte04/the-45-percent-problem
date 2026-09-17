"use client";

import { useState, useCallback } from "react";
import { Figure } from "@/components/editorial/Figure";

// De-vigging implementations
function proportional(odds: number[]): number[] {
  const rawProbs = odds.map((o) => 1 / o);
  const overround = rawProbs.reduce((s, p) => s + p, 0);
  return rawProbs.map((p) => p / overround);
}

function power(odds: number[], iterations = 50): number[] {
  const rawProbs = odds.map((o) => 1 / o);
  const overround = rawProbs.reduce((s, p) => s + p, 0);
  if (Math.abs(overround - 1) < 1e-9) return rawProbs;

  // Binary search for k such that sum(p_i^(1/k)) = 1
  let lo = 0.01;
  let hi = 10;
  for (let i = 0; i < iterations; i++) {
    const mid = (lo + hi) / 2;
    const sum = rawProbs.reduce((s, p) => s + Math.pow(p, 1 / mid), 0);
    if (sum > 1) hi = mid;
    else lo = mid;
  }
  const k = (lo + hi) / 2;
  const powered = rawProbs.map((p) => Math.pow(p, 1 / k));
  const total = powered.reduce((s, p) => s + p, 0);
  return powered.map((p) => p / total);
}

interface Props {
  snapshotId?: string;
  mode?: "interactive" | "static";
}

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontVariantNumeric: "tabular-nums",
};

const DEFAULT_ODDS = [2.1, 3.5, 3.8];
const OUTCOME_LABELS = ["Home", "Draw", "Away"];

/**
 * §8.4: DevigDemo.
 * Interactive slider: reader adjusts raw decimal odds and watches proportional
 * vs power-method de-vigging diverge in real time. Pure client component; no
 * snapshot data required.
 */
export function DevigDemo({ mode = "interactive" }: Props) {
  const [odds, setOdds] = useState(DEFAULT_ODDS);

  const handleChange = useCallback(
    (i: number, rawVal: string) => {
      const v = parseFloat(rawVal);
      if (!isNaN(v) && v >= 1.01 && v <= 50) {
        const next = [...odds];
        next[i] = v;
        setOdds(next);
      }
    },
    [odds]
  );

  const prop = proportional(odds);
  const pow = power(odds);
  const overround = odds.reduce((s, o) => s + 1 / o, 0);
  const margin = ((overround - 1) * 100).toFixed(2);

  const canInteract = mode === "interactive";

  return (
    <Figure
      caption="De-vigging methods compared. Adjust the decimal odds to see how proportional and power-method de-vigging diverge. Overround is the bookmaker margin."
      cite={{ href: "/vault/market-layer", label: "§ Market layer" }}
      ariaLabel="Interactive de-vigging demo"
    >
      <div
        style={{
          background: "var(--bg-panel)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 6,
          padding: "20px 24px",
          maxWidth: 520,
        }}
      >
        {/* Odds inputs */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              ...MONO,
              fontSize: 11,
              color: "var(--text-quiet)",
              marginBottom: 8,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Decimal odds
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {OUTCOME_LABELS.map((label, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label
                  htmlFor={`odds-${i}`}
                  style={{
                    ...MONO,
                    fontSize: 11,
                    color: "var(--text-quiet)",
                  }}
                >
                  {label}
                </label>
                {canInteract ? (
                  <input
                    id={`odds-${i}`}
                    type="range"
                    min="1.01"
                    max="15"
                    step="0.01"
                    value={odds[i]}
                    onChange={(e) => handleChange(i, e.target.value)}
                    aria-label={`${label} decimal odds: ${odds[i].toFixed(2)}`}
                    style={{
                      width: 120,
                      accentColor: "var(--prism-peach)",
                    }}
                  />
                ) : null}
                <span
                  style={{
                    ...MONO,
                    fontSize: 15,
                    color: "var(--text-primary)",
                    fontWeight: 500,
                  }}
                >
                  {odds[i].toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Overround */}
        <div
          style={{
            ...MONO,
            fontSize: 12,
            color: "var(--text-tertiary)",
            marginBottom: 20,
          }}
        >
          overround:{" "}
          <span
            style={{
              color: parseFloat(margin) > 5 ? "var(--prism-sun)" : "var(--text-secondary)",
              fontWeight: 500,
            }}
          >
            +{margin}%
          </span>
        </div>

        {/* Comparison table */}
        <table
          style={{
            ...MONO,
            fontSize: 13,
            borderCollapse: "collapse",
            width: "100%",
          }}
          aria-label="De-vigging comparison"
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "left",
                  color: "var(--text-quiet)",
                  fontWeight: 500,
                  padding: "0 16px 8px 0",
                  fontSize: 11,
                }}
              >
                Outcome
              </th>
              <th
                style={{
                  textAlign: "right",
                  color: "var(--text-quiet)",
                  fontWeight: 500,
                  padding: "0 16px 8px 0",
                  fontSize: 11,
                }}
              >
                Raw implied
              </th>
              <th
                style={{
                  textAlign: "right",
                  color: "var(--prism-peach)",
                  fontWeight: 500,
                  padding: "0 16px 8px 0",
                  fontSize: 11,
                }}
              >
                Proportional
              </th>
              <th
                style={{
                  textAlign: "right",
                  color: "var(--prism-indigo)",
                  fontWeight: 500,
                  padding: "0 0 8px 0",
                  fontSize: 11,
                }}
              >
                Power method
              </th>
            </tr>
          </thead>
          <tbody>
            {OUTCOME_LABELS.map((label, i) => {
              const raw = 1 / odds[i];
              const diff = Math.abs(prop[i] - pow[i]);
              return (
                <tr key={i}>
                  <td
                    style={{
                      padding: "4px 16px 4px 0",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {label}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      padding: "4px 16px 4px 0",
                      color: "var(--text-tertiary)",
                    }}
                    aria-label={`${label} raw implied probability ${(raw * 100).toFixed(1)} percent`}
                  >
                    {(raw * 100).toFixed(1)}%
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      padding: "4px 16px 4px 0",
                      color: "var(--prism-peach)",
                    }}
                    aria-label={`${label} proportional de-vigged probability ${(prop[i] * 100).toFixed(2)} percent`}
                  >
                    {(prop[i] * 100).toFixed(2)}%
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      padding: "4px 0",
                      color: "var(--prism-indigo)",
                    }}
                    aria-label={`${label} power method de-vigged probability ${(pow[i] * 100).toFixed(2)} percent`}
                  >
                    {(pow[i] * 100).toFixed(2)}%
                    {diff > 0.005 ? (
                      <span
                        style={{
                          fontSize: 10,
                          marginLeft: 4,
                          color: "var(--text-quiet)",
                        }}
                        title={`Δ = ${(diff * 100).toFixed(2)}pp`}
                      >
                        Δ{(diff * 100).toFixed(2)}pp
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Figure>
  );
}
