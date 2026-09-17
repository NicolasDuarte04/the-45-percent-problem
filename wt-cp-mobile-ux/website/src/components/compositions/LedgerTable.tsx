"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { LedgerRecord } from "@/lib/data/schemas";
import { NumericCell } from "@/components/primitives/NumericCell";
import { EdgeBadge } from "@/components/primitives/EdgeBadge";
import { GateStatusPill } from "@/components/primitives/GateStatusPill";
import { HashChip } from "@/components/primitives/HashChip";
import { formatMono, formatProbability, formatUtcShort } from "@/lib/formatters";
import { LABEL_STYLES, type LedgerLabel } from "@/lib/labels";

// ── Label chip ────────────────────────────────────────────────────────────────
// §7.2 invariant: the ONLY visual delta between hit and miss rows.
// Font size, padding, and weight are identical to each other.

function LabelChip({ label }: { label: LedgerLabel }) {
  const s = LABEL_STYLES[label];
  return (
    <span
      data-ledger-label={label}
      className="mono inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px]"
      style={{ color: s.color, backgroundColor: s.bg, border: `1px solid ${s.color}20` }}
      aria-label={label.toLowerCase()}
    >
      <span aria-hidden>{s.glyph}</span>
      {label}
    </span>
  );
}

// ── Column sort header ─────────────────────────────────────────────────────

type SortKey = "settled_at_utc" | "model_id" | "market" | "p_model_on_realized" | "edge_E_at_close" | "brier_contribution" | "hit_miss_label";
type SortDir = "asc" | "desc";

function SortHeader({
  col,
  label,
  active,
  dir,
  onClick,
}: {
  col: SortKey;
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: (col: SortKey) => void;
}) {
  return (
    <th
      scope="col"
      className="pb-2 px-2 text-right text-[11px] font-normal whitespace-nowrap cursor-pointer select-none"
      style={{ color: active ? "var(--text-primary)" : "var(--text-tertiary)" }}
      onClick={() => onClick(col)}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      {label}
      {active && (
        <span className="ml-1" aria-hidden>
          {dir === "asc" ? "▲" : "▼"}
        </span>
      )}
    </th>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface LedgerTableProps {
  records: LedgerRecord[];
}

export function LedgerTable({ records }: LedgerTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("settled_at_utc");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [modelFilter, setModelFilter] = useState<string>("ALL");

  const allModels = useMemo(
    () => ["ALL", ...Array.from(new Set(records.map((r) => r.model_id))).sort()],
    [records]
  );

  function handleSort(col: SortKey) {
    if (col === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col);
      setSortDir("desc");
    }
  }

  const sorted = useMemo(() => {
    const filtered =
      modelFilter === "ALL" ? records : records.filter((r) => r.model_id === modelFilter);

    return [...filtered].sort((a, b) => {
      let av: string | number, bv: string | number;
      switch (sortKey) {
        case "settled_at_utc":
          av = a.settled_at_utc ?? "";
          bv = b.settled_at_utc ?? "";
          break;
        case "model_id":
          av = a.model_id;
          bv = b.model_id;
          break;
        case "market":
          av = a.market;
          bv = b.market;
          break;
        case "p_model_on_realized":
          av = a.p_model_on_realized;
          bv = b.p_model_on_realized;
          break;
        case "edge_E_at_close":
          av = Math.abs(a.edge_E_at_close ?? 0);
          bv = Math.abs(b.edge_E_at_close ?? 0);
          break;
        case "brier_contribution":
          av = a.brier_contribution;
          bv = b.brier_contribution;
          break;
        case "hit_miss_label":
          av = a.hit_miss_label ?? "";
          bv = b.hit_miss_label ?? "";
          break;
        default:
          return 0;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [records, sortKey, sortDir, modelFilter]);

  if (records.length === 0) {
    return (
      <div
        className="flex items-center justify-center py-16 border rounded text-[12px]"
        style={{
          borderColor: "var(--border-subtle)",
          color: "var(--text-tertiary)",
        }}
      >
        No settled forecasts in this snapshot. Ledger populates as matches complete.
      </div>
    );
  }

  return (
    <section aria-label="Forecast ledger table">
      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center gap-3 mb-3 text-[11px]"
        style={{ color: "var(--text-secondary)" }}
      >
        <span>Filter model:</span>
        {allModels.map((m) => (
          <button
            key={m}
            onClick={() => setModelFilter(m)}
            className="mono px-2 py-0.5 rounded border transition-colors duration-[120ms]"
            style={{
              borderColor:
                modelFilter === m ? "var(--accent-focus)" : "var(--border-subtle)",
              color:
                modelFilter === m ? "var(--accent-focus)" : "var(--text-tertiary)",
              backgroundColor: "transparent",
            }}
            aria-pressed={modelFilter === m}
          >
            {m === "M_STAR" ? "M★" : m}
          </button>
        ))}
        <span
          className="ml-auto"
          style={{ color: "var(--text-tertiary)" }}
          aria-live="polite"
        >
          {sorted.length} record{sorted.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto no-scrollbar">
        <table
          className="w-full text-[12px] min-w-[1100px]"
          style={{ color: "var(--data-neutral)", borderCollapse: "collapse" }}
        >
          <thead>
            {/*
              §7.2: column headers use uniform weight/padding.
              The only per-row visual delta is the LabelChip in the Label column.
            */}
            <tr style={{ borderBottom: "1px solid var(--border-default)" }}>
              <SortHeader col="settled_at_utc" label="Settled (UTC)" active={sortKey === "settled_at_utc"} dir={sortDir} onClick={handleSort} />
              <th scope="col" className="pb-2 px-2 text-left text-[11px] font-normal" style={{ color: "var(--text-tertiary)" }}>Match</th>
              <SortHeader col="model_id" label="Model" active={sortKey === "model_id"} dir={sortDir} onClick={handleSort} />
              <th scope="col" className="pb-2 px-2 text-left text-[11px] font-normal" style={{ color: "var(--text-tertiary)" }}>Market / Outcome</th>
              <SortHeader col="p_model_on_realized" label="p (model)" active={sortKey === "p_model_on_realized"} dir={sortDir} onClick={handleSort} />
              <th scope="col" className="pb-2 px-2 text-right text-[11px] font-normal" style={{ color: "var(--text-tertiary)" }}>q (mkt devigged)</th>
              <SortHeader col="edge_E_at_close" label="E at close" active={sortKey === "edge_E_at_close"} dir={sortDir} onClick={handleSort} />
              <th scope="col" className="pb-2 px-2 text-right text-[11px] font-normal" style={{ color: "var(--text-tertiary)" }}>Gate</th>
              <SortHeader col="brier_contribution" label="Brier" active={sortKey === "brier_contribution"} dir={sortDir} onClick={handleSort} />
              <th scope="col" className="pb-2 px-2 text-right text-[11px] font-normal" style={{ color: "var(--text-tertiary)" }}>Log-loss</th>
              <th scope="col" className="pb-2 px-2 text-right text-[11px] font-normal" style={{ color: "var(--text-tertiary)" }}>RPS</th>
              <th scope="col" className="pb-2 px-2 text-right text-[11px] font-normal" style={{ color: "var(--text-tertiary)" }}>CLV (bps)</th>
              <SortHeader col="hit_miss_label" label="Label" active={sortKey === "hit_miss_label"} dir={sortDir} onClick={handleSort} />
              <th scope="col" className="pb-2 px-2 text-right text-[11px] font-normal" style={{ color: "var(--text-tertiary)" }}>Audit</th>
            </tr>
          </thead>

          <tbody>
            {sorted.map((r) => (
              /*
                §7.2 invariant: every row uses IDENTICAL padding (py-1.5 px-2),
                font size (text-[12px]), and grid structure regardless of label.
                No className differs between HIT and MISS rows except the LabelChip.
                This is enforced by the visual regression test in tests/visual/ledger-parity.spec.ts.
              */
              <tr
                key={r.forecast_id}
                data-ledger-row={r.forecast_id}
                data-ledger-label={r.hit_miss_label}
                style={{ borderTop: "1px solid var(--border-subtle)" }}
              >
                {/* Settled timestamp */}
                <td className="py-1.5 px-2 text-right whitespace-nowrap">
                  <span
                    className="mono"
                    aria-label={`settled at ${r.settled_at_utc ?? "unknown"}`}
                  >
                    {r.settled_at_utc ? formatUtcShort(r.settled_at_utc) : "-"}
                  </span>
                </td>

                {/* Match */}
                <td className="py-1.5 px-2 whitespace-nowrap">
                  <Link
                    href={`/match/${r.match_id}`}
                    className="transition-colors duration-[120ms]"
                    style={{ color: "var(--accent-focus)" }}
                  >
                    {r.match_id.replace(/^\d{4}-\d{2}-\d{2}_/, "").replace(/_/g, " vs ")}
                  </Link>
                </td>

                {/* Model pill */}
                <td className="py-1.5 px-2 text-center">
                  <span
                    className="mono text-[11px] px-1.5 py-0.5 rounded border"
                    style={{
                      borderColor:
                        r.model_id === "M_STAR"
                          ? "var(--accent-focus)"
                          : "var(--border-subtle)",
                      color:
                        r.model_id === "M_STAR"
                          ? "var(--accent-focus)"
                          : "var(--text-tertiary)",
                    }}
                    aria-label={r.model_id === "M_STAR" ? "M-star champion model" : r.model_id}
                  >
                    {r.model_id === "M_STAR" ? "M★" : r.model_id}
                  </span>
                </td>

                {/* Market / Outcome */}
                <td className="py-1.5 px-2 whitespace-nowrap">
                  <span className="mono" style={{ color: "var(--text-secondary)" }}>
                    {r.market}
                  </span>{" "}
                  <span className="mono text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                    {r.outcome_realized}
                  </span>
                </td>

                {/* p model on realized */}
                <td className="py-1.5 px-2 text-right">
                  <NumericCell
                    value={r.p_model_on_realized}
                    formatter={(p) => formatProbability(p, 1)}
                    ariaLabel={`${(r.p_model_on_realized * 100).toFixed(1)} percent`}
                  />
                </td>

                {/* q market devigged on realized · null until odds ingestion */}
                <td className="py-1.5 px-2 text-right">
                  {r.q_market_devigged_on_realized !== null ? (
                    <NumericCell
                      value={r.q_market_devigged_on_realized}
                      formatter={(p) => formatProbability(p, 1)}
                      ariaLabel={`${(r.q_market_devigged_on_realized * 100).toFixed(1)} percent`}
                    />
                  ) : (
                    <span
                      className="mono"
                      style={{ color: "var(--text-tertiary)" }}
                      aria-label="market pending"
                    >
                      -
                    </span>
                  )}
                </td>

                {/* Edge at close · null until odds ingestion */}
                <td className="py-1.5 px-2 text-right">
                  {r.edge_E_at_close !== null ? (
                    <EdgeBadge edge={r.edge_E_at_close} threshold={0.03} />
                  ) : (
                    <span
                      className="mono"
                      style={{ color: "var(--text-tertiary)" }}
                      aria-label="market pending"
                    >
                      -
                    </span>
                  )}
                </td>

                {/* Gate · null until odds ingestion */}
                <td className="py-1.5 px-2 text-right">
                  {r.gate_status_at_close !== null ? (
                    <GateStatusPill
                      status={r.gate_status_at_close}
                      rulesTripped={[]}
                    />
                  ) : (
                    <span
                      className="mono"
                      style={{ color: "var(--text-tertiary)" }}
                      aria-label="market pending"
                    >
                      -
                    </span>
                  )}
                </td>

                {/* Brier */}
                <td
                  className="py-1.5 px-2 text-right"
                  aria-label={`Brier contribution ${r.brier_contribution.toFixed(4)}`}
                >
                  <NumericCell
                    value={r.brier_contribution}
                    formatter={(v) => formatMono(v, 4)}
                  />
                </td>

                {/* Log-loss */}
                <td
                  className="py-1.5 px-2 text-right"
                  aria-label={`Log-loss contribution ${r.log_loss_contribution.toFixed(4)}`}
                >
                  <NumericCell
                    value={r.log_loss_contribution}
                    formatter={(v) => formatMono(v, 4)}
                  />
                </td>

                {/* RPS */}
                <td
                  className="py-1.5 px-2 text-right"
                  aria-label={`RPS contribution ${r.rps_contribution.toFixed(4)}`}
                >
                  <NumericCell
                    value={r.rps_contribution}
                    formatter={(v) => formatMono(v, 4)}
                  />
                </td>

                {/* CLV bps · M★ only */}
                <td
                  className="py-1.5 px-2 text-right"
                  aria-label={
                    r.clv_bps !== null
                      ? `CLV ${r.clv_bps >= 0 ? "positive" : "negative"} ${Math.abs(r.clv_bps)} basis points`
                      : "CLV not applicable"
                  }
                >
                  {r.clv_bps !== null ? (
                    <span
                      className="mono"
                      style={{
                        color:
                          r.clv_bps >= 0
                            ? "var(--edge-positive)"
                            : "var(--edge-negative)",
                      }}
                    >
                      {r.clv_bps >= 0 ? "+" : "−"}
                      {Math.abs(r.clv_bps)}
                    </span>
                  ) : (
                    <span className="mono" style={{ color: "var(--text-tertiary)" }}>
. 
                    </span>
                  )}
                </td>

                {/* Label: the ONLY visual delta between HIT and MISS · null
                    (market pending) renders a neutral marker, not a verdict */}
                <td className="py-1.5 px-2 text-center">
                  {r.hit_miss_label !== null ? (
                    <LabelChip label={r.hit_miss_label} />
                  ) : (
                    <span
                      className="mono text-[11px]"
                      style={{ color: "var(--text-tertiary)" }}
                      aria-label="market pending"
                    >
                      pending
                    </span>
                  )}
                </td>

                {/* Audit hash chips */}
                <td className="py-1.5 px-2">
                  <div className="flex gap-1.5 justify-end">
                    <HashChip sha={r.code_sha} kind="code_sha" />
                    <Link
                      href={`/ledger/${r.forecast_id}`}
                      className="mono text-[10px] px-1.5 py-0.5 rounded border transition-colors duration-[120ms]"
                      style={{
                        borderColor: "var(--border-subtle)",
                        color: "var(--text-tertiary)",
                      }}
                      aria-label={`View full audit record for forecast ${r.forecast_id}`}
                    >
                      audit →
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p
        className="mt-3 text-[11px]"
        style={{ color: "var(--text-tertiary)" }}
      >
        Default sort: reverse-chronological. HIT / MISS / NEUTRAL rows share identical grid, padding, and type size. §7.2 invariant.
        No &ldquo;win rate&rdquo; or ROI sorting is exposed.{" "}
        <Link
          href="/vault/glossary"
          className="underline underline-offset-2 transition-colors duration-[120ms]"
          style={{ color: "var(--text-tertiary)" }}
        >
          Glossary
        </Link>
      </p>
    </section>
  );
}
