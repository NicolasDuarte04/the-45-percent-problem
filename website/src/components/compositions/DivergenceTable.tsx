"use client";

import {
  useRef,
  useState,
  useMemo,
  useCallback,
  useTransition,
  useEffect,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { DivergenceRow } from "@/lib/data/schemas";
import { NumericCell } from "@/components/primitives/NumericCell";
import { EdgeBadge } from "@/components/primitives/EdgeBadge";
import { GateStatusPill } from "@/components/primitives/GateStatusPill";
import { DivergenceBar } from "@/components/primitives/DivergenceBar";
import { EdgeSparkline } from "@/components/primitives/EdgeSparkline";
import { Flag } from "@/components/primitives/Flag";
import {
  formatCI,
  formatMono,
  formatProbability,
  formatUtcShort,
} from "@/lib/formatters";
import { MARKET_LABELS } from "@/lib/markets";
import { gateRuleLabel } from "@/lib/gateCoverage";
import { divergenceMatchHref } from "@/lib/data/divergenceFilter";

// ── Constants ─────────────────────────────────────────────────────────────────

// CSS grid template columns: shared by header row and every data row so columns align.
// 95% CI and Age columns are omitted from the main view (available in row disclosure)
// so the table fits the 1056px container without horizontal scroll.
const COL_GRID =
  "6rem 2.5rem minmax(0,1fr) 4.5rem 3rem 5rem 5rem 5rem 5.5rem 3rem 5rem";

// A row is "settled / in-progress" (and drops to the collapsible reference
// section) once its kickoff is more than this far in the past. The 4h buffer
// keeps an in-progress match visible in the live table during its game window.
const SETTLED_BUFFER_MS = 4 * 60 * 60 * 1000;

// ── One-shot client clock (external store) ────────────────────────────────────
// The live/settled partition needs the client's wall clock, which is impure and
// must not be read during render. useSyncExternalStore is the sanctioned
// boundary: its getSnapshot must return a CACHED value (a fresh Date.now() each
// call would trip the "getSnapshot should be cached" guard and re-run the
// partition memo every render), so we capture the mount-time clock once, at
// module scope, on the first client read and return it stably thereafter. The
// server snapshot is null, so SSR and the first hydration paint render every row
// as live (matching the prerendered HTML); the settled section materialises once
// hydration completes and the client snapshot takes over.
let clientNowSnapshot: number | null = null;
function subscribeClientNow(): () => void {
  // One-shot value; never notifies a change after mount.
  return () => {};
}
function getClientNowSnapshot(): number | null {
  if (clientNowSnapshot === null) {
    clientNowSnapshot = Date.now();
  }
  return clientNowSnapshot;
}
function getServerNowSnapshot(): number | null {
  return null;
}

// ── Sort model ────────────────────────────────────────────────────────────────

type SortKey =
  | "kickoff_utc"
  | "round"
  | "p_model"
  | "q_market_devigged"
  | "absEdge"
  | "gate_status";
type SortDir = "asc" | "desc";

const DEFAULT_SORT: { key: SortKey; dir: SortDir } = {
  key: "absEdge",
  dir: "desc",
};

function sortValue(row: DivergenceRow, key: SortKey): string | number {
  switch (key) {
    case "absEdge":
      return Math.abs(row.edge_E);
    case "kickoff_utc":
      return row.kickoff_utc;
    case "round":
      return row.round;
    case "p_model":
      return row.p_model;
    case "q_market_devigged":
      return row.q_market_devigged;
    case "gate_status":
      return row.gate_status;
  }
}

// Team-search debounce window (§12.5 terminal UX). Keeps URL mutations rare
// enough to preserve Back/Forward without losing keystrokes.
const TEAM_SEARCH_DEBOUNCE_MS = 200;

// ── Props ─────────────────────────────────────────────────────────────────────

interface DivergenceTableProps {
  rows: DivergenceRow[];
  snapshotId: string;
  isStale: boolean;
  initialParams: Record<string, string | string[] | undefined>;
}

// ── Filter bar ────────────────────────────────────────────────────────────────

function FilterBar({
  allTeams,
  onParamChange,
  onClearAll,
  activeRound,
  activeMarket,
  activeGate,
  activeEdge,
  teamInput,
  onTeamInputChange,
}: {
  allTeams: string[];
  onParamChange: (key: string, value: string) => void;
  onClearAll: () => void;
  activeRound: string;
  activeMarket: string;
  activeGate: string;
  activeEdge: string;
  teamInput: string;
  onTeamInputChange: (v: string) => void;
}) {
  const selectCls =
    "mono text-[11px] px-2 py-1 rounded border bg-transparent transition-colors duration-[120ms] focus:outline-none focus:ring-1";
  const selectStyle = {
    borderColor: "var(--border-default)",
    color: "var(--text-secondary)",
    backgroundColor: "var(--bg-panel)",
  };

  return (
    <div
      className="sticky top-0 z-20 flex flex-wrap items-center gap-2 px-4 py-3 border rounded-md text-[11px]"
      style={{
        backgroundColor: "var(--bg-panel-elev)",
        borderColor: "var(--border-default)",
        marginBottom: 12,
      }}
      role="search"
      aria-label="Terminal filters"
    >
      <span style={{ color: "var(--text-tertiary)" }}>Filter:</span>

      {/* Round */}
      <select
        className={selectCls}
        style={selectStyle}
        value={activeRound}
        aria-label="Filter by round"
        onChange={(e) => onParamChange("round", e.target.value)}
      >
        <option value="">All rounds</option>
        {["GRP", "R32", "R16", "QF", "SF", "3P", "FIN"].map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>

      {/* Market */}
      <select
        className={selectCls}
        style={selectStyle}
        value={activeMarket}
        aria-label="Filter by market"
        onChange={(e) => onParamChange("market", e.target.value)}
      >
        <option value="">All markets</option>
        {Object.entries(MARKET_LABELS).map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </select>

      {/* Gate status */}
      <select
        className={selectCls}
        style={selectStyle}
        value={activeGate}
        aria-label="Filter by gate status"
        onChange={(e) => onParamChange("gate", e.target.value)}
      >
        <option value="all">All gate states</option>
        <option value="open">Open only</option>
      </select>

      {/* Edge band */}
      <select
        className={selectCls}
        style={selectStyle}
        value={activeEdge}
        aria-label="Filter by edge band"
        onChange={(e) => onParamChange("edge", e.target.value)}
      >
        <option value="all">All |E|</option>
        <option value="3">|E| ≥ 3%</option>
        <option value="5">|E| ≥ 5%</option>
      </select>

      {/* Team autocomplete (debounced · URL syncs after TEAM_SEARCH_DEBOUNCE_MS). */}
      <input
        type="search"
        className={selectCls}
        style={{ ...selectStyle, minWidth: 120 }}
        placeholder="Team…"
        value={teamInput}
        aria-label="Filter by team name"
        onChange={(e) => onTeamInputChange(e.target.value)}
        list="terminal-teams-list"
      />
      <datalist id="terminal-teams-list">
        {allTeams.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>

      {/* Clear all */}
      {(activeRound || activeMarket || activeGate !== "all" || activeEdge !== "all" || teamInput) && (
        <button
          className="mono text-[11px] px-2 py-1 rounded border transition-colors duration-[120ms]"
          style={{
            borderColor: "var(--border-default)",
            color: "var(--accent-focus)",
            backgroundColor: "transparent",
          }}
          onClick={onClearAll}
          aria-label="Clear all filters"
        >
          Clear
        </button>
      )}
    </div>
  );
}

// ── Row disclosure panel ──────────────────────────────────────────────────────

function RowDisclosure({ row }: { row: DivergenceRow }) {
  return (
    <div
      className="px-4 py-3 border-t grid grid-cols-1 sm:grid-cols-2 gap-4 text-[12px]"
      style={{
        backgroundColor: "var(--bg-panel-elev)",
        borderColor: "var(--border-subtle)",
        color: "var(--text-secondary)",
      }}
    >
      {/* Left column: model breakdown */}
      <div className="space-y-2">
        <div
          className="text-[11px] font-medium uppercase tracking-wide"
          style={{ color: "var(--text-tertiary)" }}
        >
          Model breakdown
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          <DisclosureRow label="p (model)" mono>
            <NumericCell
              value={row.p_model}
              formatter={(p) => formatProbability(p, 3)}
              ariaLabel={`${(row.p_model * 100).toFixed(3)} percent`}
            />
          </DisclosureRow>
          <DisclosureRow label="q (market)" mono>
            <NumericCell
              value={row.q_market_devigged}
              formatter={(p) => formatProbability(p, 3)}
              ariaLabel={`${(row.q_market_devigged * 100).toFixed(3)} percent`}
            />
          </DisclosureRow>
          <DisclosureRow label="q (raw decimal)" mono>
            <NumericCell
              value={row.q_market_raw_decimal}
              formatter={(v) => formatMono(v, 4)}
            />
          </DisclosureRow>
          <DisclosureRow label="Edge E" mono>
            <EdgeBadge edge={row.edge_E} threshold={row.edge_threshold} />
          </DisclosureRow>
          <DisclosureRow label="Threshold ε" mono>
            <span className="mono">{formatMono(row.edge_threshold * 100, 1)}%</span>
          </DisclosureRow>
          <DisclosureRow label="95% CI" mono>
            <NumericCell<[number, number]>
              value={row.confidence_band}
              formatter={([l, h]) => formatCI(l, h)}
              ariaLabel={`95 percent confidence interval, ${(row.confidence_band[0] * 100).toFixed(1)} to ${(row.confidence_band[1] * 100).toFixed(1)} percent`}
            />
          </DisclosureRow>
          <DisclosureRow label="Source book" mono>
            <span className="mono">{row.source_book}</span>
          </DisclosureRow>
          <DisclosureRow label="Model version" mono>
            <span className="mono text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              {row.model_version}
            </span>
          </DisclosureRow>
          <DisclosureRow label="Snapshot age" mono>
            <span className="mono">{row.snapshot_age_minutes}m</span>
          </DisclosureRow>
        </div>

        {row.pinnacle_bias_applied.draw_delta !== 0 || row.pinnacle_bias_applied.host_delta !== 0 ? (
          <div
            className="text-[11px] mt-1 pt-1 border-t"
            style={{ borderColor: "var(--border-subtle)", color: "var(--text-tertiary)" }}
          >
            Pinnacle bias applied: draw{" "}
            <span className="mono">{row.pinnacle_bias_applied.draw_delta >= 0 ? "+" : ""}{(row.pinnacle_bias_applied.draw_delta * 100).toFixed(1)}pp</span>{" "}
            · host{" "}
            <span className="mono">{row.pinnacle_bias_applied.host_delta >= 0 ? "+" : ""}{(row.pinnacle_bias_applied.host_delta * 100).toFixed(1)}pp</span>
          </div>
        ) : null}

        {row.gate_status === "FIRED" && row.gate_rules_tripped.length > 0 && (
          <div
            className="text-[11px] mt-1 pt-1 border-t"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <span style={{ color: "var(--gate-fired)" }}>Gate rules tripped:</span>{" "}
            <span className="mono" style={{ color: "var(--text-secondary)" }}>
              {row.gate_rules_tripped.join(", ")}
            </span>
          </div>
        )}

        {row.gate_coverage && (
          <div
            className="text-[11px] mt-1 pt-1 border-t"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <span style={{ color: "var(--text-tertiary)" }}>Gate coverage:</span>{" "}
            <span className="mono" style={{ color: "var(--text-secondary)" }}>
              {row.gate_coverage.evaluated.length > 0
                ? `${row.gate_coverage.evaluated.map(gateRuleLabel).join(", ")} evaluated`
                : "no rule evaluable this snapshot"}
            </span>
            {Object.keys(row.gate_coverage.unavailable).length > 0 && (
              <ul className="list-none mt-1 space-y-0.5">
                {Object.entries(row.gate_coverage.unavailable).map(([k, reason]) => (
                  <li key={k} style={{ color: "var(--text-quiet)" }}>
                    ◦ <span className="mono">{gateRuleLabel(k)}</span>: {reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Right column: edge history sparkline */}
      <div className="space-y-2">
        <div
          className="text-[11px] font-medium uppercase tracking-wide"
          style={{ color: "var(--text-tertiary)" }}
        >
          Edge history ({row.history.length} snapshots)
        </div>
        {row.history.length > 0 ? (
          <>
            <EdgeSparkline
              history={row.history}
              currentEdge={row.edge_E}
              width={200}
              height={48}
            />
            <table
              className="w-full text-[11px] border-collapse"
              aria-label="Edge history per snapshot"
            >
              <thead>
                <tr style={{ color: "var(--text-tertiary)" }}>
                  <th className="text-left font-medium pb-0.5">Snapshot</th>
                  <th className="text-right font-medium pb-0.5">p (model)</th>
                  <th className="text-right font-medium pb-0.5">q (mkt)</th>
                  <th className="text-right font-medium pb-0.5">E</th>
                </tr>
              </thead>
              <tbody>
                {row.history.map((h) => (
                  <tr key={h.snapshot_id} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                    <td className="mono py-0.5" style={{ color: "var(--text-tertiary)" }}>
                      {h.snapshot_id.slice(0, 10)}
                    </td>
                    <td className="mono py-0.5 text-right">
                      {(h.p_model * 100).toFixed(1)}%
                    </td>
                    <td className="mono py-0.5 text-right">
                      {(h.q_market_devigged * 100).toFixed(1)}%
                    </td>
                    <td className="mono py-0.5 text-right">
                      <span
                        style={{
                          color: h.edge_E >= 0 ? "var(--edge-positive)" : "var(--edge-negative)",
                        }}
                      >
                        {h.edge_E >= 0 ? "+" : "−"}{Math.abs(h.edge_E * 100).toFixed(1)}pp
                      </span>
                    </td>
                  </tr>
                ))}
                <tr
                  style={{
                    borderTop: "1px solid var(--border-default)",
                    fontWeight: 500,
                  }}
                >
                  <td className="mono py-0.5" style={{ color: "var(--accent-focus)" }}>
                    {row.history[0]?.snapshot_id.slice(0, 5) ?? ""}current
                  </td>
                  <td className="mono py-0.5 text-right">
                    {(row.p_model * 100).toFixed(1)}%
                  </td>
                  <td className="mono py-0.5 text-right">
                    {(row.q_market_devigged * 100).toFixed(1)}%
                  </td>
                  <td className="mono py-0.5 text-right">
                    <span
                      style={{
                        color: row.edge_E >= 0 ? "var(--edge-positive)" : "var(--edge-negative)",
                      }}
                    >
                      {row.edge_E >= 0 ? "+" : "−"}{Math.abs(row.edge_E * 100).toFixed(1)}pp
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </>
        ) : (
          <p style={{ color: "var(--text-tertiary)" }}>No history snapshots available.</p>
        )}
      </div>
    </div>
  );
}

function DisclosureRow({
  label,
  mono,
  children,
}: {
  label: string;
  mono?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <span style={{ color: "var(--text-tertiary)" }}>{label}</span>
      <span className={mono ? "mono text-right" : "text-right"}>{children}</span>
    </>
  );
}

// ── Sort header ───────────────────────────────────────────────────────────────

function SortHeader({
  label,
  colId,
  sortKey,
  sortDir,
  onSort,
  align = "left",
}: {
  label: string;
  colId: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (id: SortKey) => void;
  align?: "left" | "right";
}) {
  const isActive = sortKey === colId;
  const indicator = isActive ? (sortDir === "desc" ? " ▼" : " ▲") : "";

  return (
    <button
      className={`w-full text-[11px] font-medium flex items-center gap-0.5 transition-colors duration-[120ms] ${align === "right" ? "justify-end" : "justify-start"}`}
      style={{ color: isActive ? "var(--text-primary)" : "var(--text-tertiary)" }}
      onClick={() => onSort(colId)}
      aria-label={`Sort by ${label}${isActive ? (sortDir === "desc" ? ", descending" : ", ascending") : ""}`}
    >
      {label}
      {indicator && (
        <span className="mono text-[10px]" aria-hidden>
          {indicator}
        </span>
      )}
    </button>
  );
}

// ── Reusable grid ─────────────────────────────────────────────────────────────
// The header + virtualized body, rendered identically by both the live table
// and the collapsible settled section. Each instance owns its own virtualizer
// and scroll container but shares sort state, expand state, and handlers with
// the parent so the two sections behave as one table split in two.

function DivergenceGrid({
  rows,
  sortKey,
  sortDir,
  onSort,
  expandedIds,
  onToggleExpand,
  containerStyle,
  ariaLabel,
}: {
  rows: DivergenceRow[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (colId: SortKey) => void;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  containerStyle?: CSSProperties;
  ariaLabel: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: (i) => (expandedIds.has(rows[i]?.row_id ?? "") ? 280 : 52),
    overscan: 8,
    measureElement:
      typeof window !== "undefined"
        ? (el) => el?.getBoundingClientRect().height ?? 52
        : undefined,
  });

  const virtualItems = virtualizer.getVirtualItems();

  useEffect(() => {
    virtualizer.measure();
  }, [expandedIds, virtualizer]);

  return (
    <div
      className="overflow-x-auto"
      role="grid"
      aria-label={ariaLabel}
      aria-rowcount={rows.length}
    >
      {/* ── Column header row; outside the vertical scroll container */}
      <div
        role="row"
        aria-label="Column headers"
        className="border-b text-[11px] font-medium"
        style={{
          display: "grid",
          gridTemplateColumns: COL_GRID,
          minWidth: "920px",
          alignItems: "center",
          backgroundColor: "var(--bg-panel)",
          borderColor: "var(--border-subtle)",
          color: "var(--text-tertiary)",
        }}
      >
        <div role="columnheader" className="py-3 pl-3 pr-2">
          <SortHeader label="Kickoff (UTC)" colId="kickoff_utc" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
        </div>
        <div role="columnheader" className="py-3 px-2">
          <SortHeader label="Round" colId="round" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
        </div>
        <div role="columnheader" className="py-3 px-2">Matchup</div>
        <div role="columnheader" className="py-3 px-2">Market</div>
        <div role="columnheader" className="py-3 px-2">Outcome</div>
        <div role="columnheader" className="py-3 px-2">
          <SortHeader label="p (model)" colId="p_model" sortKey={sortKey} sortDir={sortDir} onSort={onSort} align="right" />
        </div>
        <div role="columnheader" className="py-3 px-2">
          <SortHeader label="q (mkt)" colId="q_market_devigged" sortKey={sortKey} sortDir={sortDir} onSort={onSort} align="right" />
        </div>
        <div role="columnheader" data-guide-id="col-divergence" className="py-3 px-2">Divergence</div>
        <div role="columnheader" data-guide-id="col-edge" className="py-3 px-2">
          <SortHeader label="Edge E" colId="absEdge" sortKey={sortKey} sortDir={sortDir} onSort={onSort} align="right" />
        </div>
        <div
          role="columnheader"
          className="py-3 px-2 text-right"
          aria-label="Pre-registered edge threshold"
        >
          ε
        </div>
        <div role="columnheader" data-guide-id="col-gate" className="py-3 px-2">
          <SortHeader label="Gate" colId="gate_status" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
        </div>
      </div>

      {/* ── Vertical scroll container; div height is respected, unlike tbody */}
      <div
        ref={containerRef}
        style={{
          maxHeight: "calc(100vh - 300px)",
          overflowY: "auto",
          minWidth: "920px",
          ...containerStyle,
        }}
      >
        <div
          style={{
            height: virtualizer.getTotalSize(),
            position: "relative",
            width: "100%",
          }}
        >
          {virtualItems.map((vItem) => {
            const row = rows[vItem.index];
            if (!row) return null;
            const isExpanded = expandedIds.has(row.row_id);
            const isFired = row.gate_status === "FIRED";

            return (
              <div
                key={row.row_id}
                data-index={vItem.index}
                ref={virtualizer.measureElement}
                role="row"
                aria-expanded={isExpanded}
                aria-rowindex={vItem.index + 1}
                style={{
                  position: "absolute",
                  top: 0,
                  transform: `translateY(${vItem.start}px)`,
                  width: "100%",
                  borderBottom: "1px solid var(--border-subtle)",
                  ...(isFired ? { borderLeft: "2px solid var(--gate-fired)" } : {}),
                }}
              >
                {/* ── Clickable data row ─────────────────────────────── */}
                <div
                  role="presentation"
                  className="divergence-row transition-colors duration-[120ms] cursor-pointer text-[12.5px]"
                  data-pinned={isExpanded ? "" : undefined}
                  style={{
                    display: "grid",
                    gridTemplateColumns: COL_GRID,
                    alignItems: "center",
                    backgroundColor: isExpanded ? "var(--bg-panel-elev)" : undefined,
                  }}
                  onClick={() => onToggleExpand(row.row_id)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onToggleExpand(row.row_id);
                    }
                  }}
                  aria-label={`${isExpanded ? "Collapse" : "Expand"} details for ${row.home.display_name} vs ${row.away.display_name} ${MARKET_LABELS[row.market] ?? row.market} ${row.outcome}`}
                >
                  {/* Kickoff */}
                  <div role="gridcell" className="py-3.5 pl-3 pr-2">
                    <span
                      className="mono"
                      aria-label={`kickoff ${formatUtcShort(row.kickoff_utc)}`}
                    >
                      {formatUtcShort(row.kickoff_utc)}
                    </span>
                  </div>
                  {/* Round */}
                  <div role="gridcell" className="py-3.5 px-2 mono text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                    {row.round}
                  </div>
                  {/* Matchup */}
                  <div role="gridcell" className="py-3.5 px-2 min-w-0 overflow-hidden">
                    <Link
                      href={divergenceMatchHref(row)}
                      className="transition-colors duration-[120ms] block truncate font-medium"
                      style={{ color: "var(--text-primary)" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="mono text-[11px] font-normal" style={{ color: "var(--text-quiet)" }}>
                        {row.home.fifa_code}
                      </span>{" "}
                      <Flag code={row.home.fifa_code} size={16} />{" "}
                      {row.home.display_name}{" "}
                      <span style={{ color: "var(--text-quiet)" }}>‒</span>{" "}
                      {row.away.display_name}{" "}
                      <Flag code={row.away.fifa_code} size={16} />{" "}
                      <span className="mono text-[11px] font-normal" style={{ color: "var(--text-quiet)" }}>
                        {row.away.fifa_code}
                      </span>
                    </Link>
                  </div>
                  {/* Market */}
                  <div role="gridcell" data-cell="market" className="py-3.5 px-2 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                    {MARKET_LABELS[row.market] ?? row.market}
                  </div>
                  {/* Outcome */}
                  <div role="gridcell" className="py-3.5 px-2 mono text-[11px]" style={{ color: "var(--text-secondary)" }}>
                    {row.outcome}
                  </div>
                  {/* p_model */}
                  <div role="gridcell" className="py-3.5 px-2 text-right">
                    <NumericCell
                      value={row.p_model}
                      formatter={(p) => formatProbability(p, 1)}
                      ariaLabel={`${(row.p_model * 100).toFixed(1)} percent`}
                    />
                  </div>
                  {/* q_market */}
                  <div role="gridcell" className="py-3.5 px-2 text-right">
                    <NumericCell
                      value={row.q_market_devigged}
                      formatter={(p) => formatProbability(p, 1)}
                      ariaLabel={`${(row.q_market_devigged * 100).toFixed(1)} percent`}
                    />
                  </div>
                  {/* Divergence bar */}
                  <div role="gridcell" className="py-3.5 px-2">
                    <DivergenceBar p_model={row.p_model} q_market={row.q_market_devigged} />
                  </div>
                  {/* Edge E */}
                  <div role="gridcell" data-cell="edge" className="py-3.5 px-2 text-right">
                    <EdgeBadge edge={row.edge_E} threshold={row.edge_threshold} />
                    <div
                      className="divergence-edge-bps mono"
                      aria-label={`exact edge ${(row.edge_E * 10000).toFixed(0)} basis points, ${(row.edge_E * 100).toFixed(3)} percentage points`}
                    >
                      <span className="divergence-edge-bps-value">
                        {row.edge_E >= 0 ? "+" : "−"}
                        {Math.round(Math.abs(row.edge_E) * 10000)} bps
                      </span>
                      <span className="divergence-edge-bps-sep">·</span>
                      <span className="divergence-edge-bps-pct">
                        {(Math.abs(row.edge_E) * 100).toFixed(3)}%
                      </span>
                    </div>
                  </div>
                  {/* Threshold ε */}
                  <div role="gridcell" className="py-3.5 px-2 text-right mono text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                    <span aria-label={`threshold ${(row.edge_threshold * 100).toFixed(0)} percent`}>
                      {formatMono(row.edge_threshold * 100, 0)}%
                    </span>
                  </div>
                  {/* Gate */}
                  <div role="gridcell" className="py-3.5 px-2 text-center">
                    <GateStatusPill
                      status={row.gate_status}
                      rulesTripped={row.gate_rules_tripped}
                      coverage={row.gate_coverage}
                    />
                  </div>
                </div>

                {/* Disclosure panel */}
                {isExpanded && <RowDisclosure row={row} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DivergenceTable({
  rows,
  snapshotId,
  isStale,
  initialParams,
}: DivergenceTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // ── Filter state from URL ──────────────────────────────────────────────────
  const activeRound  = searchParams.get("round")  ?? "";
  const activeMarket = searchParams.get("market") ?? "";
  const activeGate   = searchParams.get("gate")   ?? "all";
  const activeEdge   = searchParams.get("edge")   ?? "all";
  const activeTeam   = searchParams.get("team")   ?? "";

  // ── Sort state ─────────────────────────────────────────────────────────────
  const [sortKey, setSortKey] = useState<SortKey>(DEFAULT_SORT.key);
  const [sortDir, setSortDir] = useState<SortDir>(DEFAULT_SORT.dir);

  // ── Expanded rows ──────────────────────────────────────────────────────────
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Live/settled partition clock ───────────────────────────────────────────
  // The route is force-static, so `now` must come from the client to avoid a
  // hydration mismatch. It is null through SSR + the first hydration paint
  // (everything renders as "live", matching the prerendered HTML), then becomes
  // the mount-time client clock, which partitions played matches into the
  // settled section below. Sourced from the one-shot external store above (no
  // setState-in-effect, cached snapshot), so `now` is stable across renders and
  // the partition memo does not re-run every render. Client-side only, as the
  // brief specifies.
  const now = useSyncExternalStore(
    subscribeClientNow,
    getClientNowSnapshot,
    getServerNowSnapshot,
  );

  // Settled reference section is collapsed by default.
  const [settledOpen, setSettledOpen] = useState(false);

  // ── URL update helpers ─────────────────────────────────────────────────────
  // Single-key change: used by all filter <select>s.
  const onParamChange = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname]
  );

  // Atomic clear: one URLSearchParams rebuild, one router.replace. Prevents
  // the race where five sequential onParamChange calls clobber each other.
  const clearAllFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("round");
    params.delete("market");
    params.delete("gate");
    params.delete("edge");
    params.delete("team");
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }, [searchParams, router, pathname]);

  // ── Debounced team search ──────────────────────────────────────────────────
  // `teamInput` tracks the literal textbox value; the URL syncs after
  // TEAM_SEARCH_DEBOUNCE_MS so "Brazil" triggers one router.replace, not six.
  const [teamInput, setTeamInput] = useState<string>(activeTeam);

  // Re-sync when the URL changes from elsewhere (Clear, Back/Forward, etc.).
  // React's "adjust state when a prop changes" pattern: compare the URL value
  // against the value we last synced from and reset during render, rather than
  // in an effect (which would trip react-hooks/set-state-in-effect and add an
  // extra render pass). Keystroke edits leave activeTeam unchanged, so they are
  // never clobbered; only an external URL change (Clear, Back/Forward) resets
  // the textbox.
  const [syncedTeam, setSyncedTeam] = useState<string>(activeTeam);
  if (activeTeam !== syncedTeam) {
    setSyncedTeam(activeTeam);
    setTeamInput(activeTeam);
  }

  useEffect(() => {
    if (teamInput === activeTeam) return;
    const handle = setTimeout(() => {
      onParamChange("team", teamInput);
    }, TEAM_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [teamInput, activeTeam, onParamChange]);

  // ── Derived team list ──────────────────────────────────────────────────────
  const allTeams = useMemo(() => {
    const names = new Set<string>();
    for (const r of rows) {
      names.add(r.home.display_name);
      names.add(r.away.display_name);
    }
    return [...names].sort();
  }, [rows]);

  // ── Filtered rows ──────────────────────────────────────────────────────────
  // Filter reads `teamInput` (the live textbox value) rather than `activeTeam`
  // (URL) so the list responds to keystrokes before the debounce flushes.
  const filteredRows = useMemo(() => {
    const teamQ = teamInput.toLowerCase();
    const edgeMin = activeEdge === "3" ? 0.03 : activeEdge === "5" ? 0.05 : 0;

    return rows.filter((r) => {
      if (activeRound && r.round !== activeRound) return false;
      if (activeMarket && r.market !== activeMarket) return false;
      if (activeGate === "open" && r.gate_status !== "OPEN") return false;
      if (edgeMin > 0 && Math.abs(r.edge_E) < edgeMin) return false;
      if (
        teamQ &&
        !r.home.display_name.toLowerCase().includes(teamQ) &&
        !r.away.display_name.toLowerCase().includes(teamQ) &&
        !r.home.fifa_code.toLowerCase().includes(teamQ) &&
        !r.away.fifa_code.toLowerCase().includes(teamQ)
      ) {
        return false;
      }
      return true;
    });
  }, [rows, activeRound, activeMarket, activeGate, activeEdge, teamInput]);

  // ── Partition (live vs settled) + sort ─────────────────────────────────────
  // Presentation-only: every filtered row is rendered in exactly one of the two
  // sections — no divergence row is dropped. Each section is sorted by the same
  // active sort key/dir. Filters (round/market/gate/edge/team) already applied
  // upstream in `filteredRows`, so both partitions reflect them.
  const { liveSorted, settledSorted } = useMemo(() => {
    const cmp = (a: DivergenceRow, b: DivergenceRow) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    };

    // Pre-hydration (now === null): render everything as live so SSR markup is
    // stable; the settled section materialises after mount.
    if (now === null) {
      return { liveSorted: filteredRows.slice().sort(cmp), settledSorted: [] as DivergenceRow[] };
    }

    const threshold = now - SETTLED_BUFFER_MS;
    const live: DivergenceRow[] = [];
    const settled: DivergenceRow[] = [];
    for (const r of filteredRows) {
      const ko = Date.parse(r.kickoff_utc);
      // Unparseable kickoff → keep it live so a row never silently disappears.
      if (Number.isNaN(ko) || ko >= threshold) live.push(r);
      else settled.push(r);
    }
    live.sort(cmp);
    settled.sort(cmp);
    return { liveSorted: live, settledSorted: settled };
  }, [filteredRows, sortKey, sortDir, now]);

  // ── Column sort handler ────────────────────────────────────────────────────
  // Cycle: new column → desc → asc → reset to default (absEdge desc).
  const handleSort = useCallback(
    (colId: SortKey) => {
      if (colId !== sortKey) {
        setSortKey(colId);
        setSortDir("desc");
        return;
      }
      if (sortDir === "desc") {
        setSortDir("asc");
        return;
      }
      // Third click on the same column; reset.
      setSortKey(DEFAULT_SORT.key);
      setSortDir(DEFAULT_SORT.dir);
    },
    [sortKey, sortDir],
  );

  // ── Derived flags ──────────────────────────────────────────────────────────
  const allVisibleGated =
    filteredRows.length > 0 &&
    filteredRows.every((r) => r.gate_status === "FIRED");

  const staleStyle = isStale ? { opacity: 0.6 } : {};
  const isEmpty = filteredRows.length === 0;

  const noEdgeAboveThreshold =
    !activeRound && !activeMarket && activeGate === "all" && activeEdge === "all" && !teamInput &&
    rows.length > 0 &&
    rows.every((r) => Math.abs(r.edge_E) < r.edge_threshold);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      <style>{rowCrosshairStyles}</style>
      {/* ── Stale warning ───────────────────────────────────────────────── */}
      {isStale && (
        <div
          className="px-4 py-2 text-[12px]"
          style={{ color: "var(--gate-fired)", backgroundColor: "var(--bg-panel)" }}
          role="alert"
        >
          Snapshot stale: re-render pending. Data may be more than 26h old.
        </div>
      )}

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <FilterBar
        allTeams={allTeams}
        onParamChange={onParamChange}
        onClearAll={clearAllFilters}
        activeRound={activeRound}
        activeMarket={activeMarket}
        activeGate={activeGate}
        activeEdge={activeEdge}
        teamInput={teamInput}
        onTeamInputChange={setTeamInput}
      />

      {/* ── No-edge-above-threshold note ────────────────────────────────── */}
      {noEdgeAboveThreshold && (
        <div
          className="px-4 py-4 text-[12.5px] border-b"
          style={{
            borderColor: "var(--border-subtle)",
            color: "var(--text-tertiary)",
            backgroundColor: "var(--bg-panel)",
          }}
        >
          No markets meet the{" "}
          <span className="mono">ε = 3%</span> threshold at snapshot{" "}
          <span className="mono">{snapshotId}</span>. Zero-edge days are expected; see
          the{" "}
          <Link href="/ledger" style={{ color: "var(--accent-focus)" }}>
            Transparency Ledger
          </Link>{" "}
          for the distribution of observed{" "}
          <span className="mono">|E|</span>.
        </div>
      )}

      {/* ── Empty state (filtered) ──────────────────────────────────────── */}
      {isEmpty && !noEdgeAboveThreshold && (
        <div
          className="px-4 py-8 text-center text-[12.5px] border-b"
          style={{
            borderColor: "var(--border-subtle)",
            color: "var(--text-tertiary)",
            backgroundColor: "var(--bg-panel)",
          }}
        >
          No rows match the current filters.{" "}
          <button
            className="transition-colors duration-[120ms]"
            style={{ color: "var(--accent-focus)" }}
            onClick={clearAllFilters}
          >
            Clear filters
          </button>{" "}
          to see all {rows.length} rows.
        </div>
      )}

      {/* ── All-gated visible-rows notice ───────────────────────────────── */}
      {allVisibleGated && !isEmpty && (
        <div
          className="px-4 py-1.5 text-[11px]"
          style={{ color: "var(--gate-fired)", backgroundColor: "var(--bg-panel)" }}
        >
          ◆ All {filteredRows.length} visible rows have gate status{" "}
          <span className="mono">FIRED</span>. No row is hidden: the gate annotates.
        </div>
      )}

      {/* ── Live table + settled reference ──────────────────────────────── */}
      {!isEmpty && (
        <>
          {/* ── Live + upcoming markets ───────────────────────────────────── */}
          {liveSorted.length > 0 ? (
            <DivergenceGrid
              rows={liveSorted}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              expandedIds={expandedIds}
              onToggleExpand={toggleExpand}
              containerStyle={staleStyle}
              ariaLabel={`Divergence terminal, published markets. ${liveSorted.length} rows`}
            />
          ) : (
            <div
              className="px-4 py-6 text-[12.5px] border-b"
              style={{
                borderColor: "var(--border-subtle)",
                color: "var(--text-tertiary)",
                backgroundColor: "var(--bg-panel)",
              }}
            >
              No hay partidos en vivo o próximos en este snapshot. Los partidos ya
              jugados aparecen abajo como referencia histórica.
            </div>
          )}

          {/* ── Settled / in-progress reference (collapsible) ─────────────── */}
          {settledSorted.length > 0 && (
            <div className="border-t" style={{ borderColor: "var(--border-subtle)" }}>
              <button
                type="button"
                onClick={() => setSettledOpen((o) => !o)}
                aria-expanded={settledOpen}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-[12px] font-medium transition-colors duration-[120ms]"
                style={{ backgroundColor: "var(--bg-panel)", color: "var(--text-secondary)" }}
              >
                <span className="mono text-[10px]" aria-hidden>
                  {settledOpen ? "▾" : "▸"}
                </span>
                Partidos jugados (referencia histórica)
                <span
                  className="mono text-[10px] rounded px-1.5 py-0.5"
                  style={{ backgroundColor: "var(--bg-panel-elev)", color: "var(--text-tertiary)" }}
                  aria-label={`${settledSorted.length} partidos jugados`}
                >
                  {settledSorted.length}
                </span>
              </button>
              {settledOpen && (
                <DivergenceGrid
                  rows={settledSorted}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  expandedIds={expandedIds}
                  onToggleExpand={toggleExpand}
                  containerStyle={{ opacity: isStale ? 0.6 : 0.7 }}
                  ariaLabel={`Settled and in-progress markets. ${settledSorted.length} rows`}
                />
              )}
            </div>
          )}

          {/* ── Row count footer ────────────────────────────────────────── */}
          <div
            className="px-4 py-2 text-[11px] border-t"
            style={{
              borderColor: "var(--border-subtle)",
              color: "var(--text-tertiary)",
              backgroundColor: "var(--bg-panel)",
            }}
          >
            <span className="mono">{liveSorted.length}</span> live{" · "}
            <span className="mono">{settledSorted.length}</span> settled
            {rows.length !== filteredRows.length && ` (filtered from ${rows.length})`}
            {" · "}snapshot{" "}
            <span className="mono">{snapshotId}</span>
            {" · "}click any row to expand model breakdown and edge history
          </div>
        </>
      )}
    </div>
  );
}

// Row-level crosshair: hovering any data row lifts the row background and
// emphasises the Market and Edge cells. Click-to-pin (= expand) reveals the
// unrounded basis points beside the EdgeBadge so a researcher can cite the
// exact figure without opening the disclosure panel.
const rowCrosshairStyles = `
.divergence-row {
  transition: background-color 150ms ease;
}
.divergence-row:hover {
  background-color: var(--bg-panel-elev);
}
.divergence-row [data-cell="market"],
.divergence-row [data-cell="edge"] {
  transition: background-color 150ms ease;
}
.divergence-row:hover [data-cell="market"],
.divergence-row:hover [data-cell="edge"] {
  background-color: color-mix(in oklch, var(--bg-panel-elev) 55%, var(--text-secondary) 8%);
}
.divergence-edge-bps {
  font-size: 10px;
  letter-spacing: -0.005em;
  color: var(--text-tertiary);
  margin-top: 2px;
  display: inline-flex;
  gap: 4px;
  align-items: baseline;
  justify-content: flex-end;
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition:
    max-height 200ms ease,
    opacity 150ms ease,
    margin-top 200ms ease;
  pointer-events: none;
}
.divergence-row[data-pinned] .divergence-edge-bps {
  max-height: 16px;
  opacity: 1;
}
.divergence-edge-bps-sep {
  color: var(--text-quiet);
}
.divergence-edge-bps-pct {
  color: var(--text-tertiary);
}
`;
