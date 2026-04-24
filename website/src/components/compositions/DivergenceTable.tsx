"use client";

import {
  useRef,
  useState,
  useMemo,
  useCallback,
  useTransition,
  useEffect,
} from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { DivergenceRow } from "@/lib/data/schemas";
import { ProbabilityCell } from "@/components/primitives/ProbabilityCell";
import { EdgeBadge } from "@/components/primitives/EdgeBadge";
import { GateStatusPill } from "@/components/primitives/GateStatusPill";
import { MonoNumber } from "@/components/primitives/MonoNumber";
import { ConfidenceInterval } from "@/components/primitives/ConfidenceInterval";
import { DivergenceBar } from "@/components/primitives/DivergenceBar";
import { EdgeSparkline } from "@/components/primitives/EdgeSparkline";
import { formatMono } from "@/lib/formatters";

// ── Constants ─────────────────────────────────────────────────────────────────

// CSS grid template columns — shared by header row and every data row so columns align.
// Fixed columns are kept lean so the matchup 1fr column gets adequate space at 1080px+.
const COL_GRID =
  "6rem 2.5rem minmax(0,1fr) 4.5rem 3rem 5rem 5rem 5rem 5.5rem 3rem 5rem 7rem 3.5rem";

const MARKET_LABELS: Record<string, string> = {
  "1X2": "1X2",
  BTTS: "BTTS",
  OU_2_5: "O/U 2.5",
  "AH_-0.5": "AH −0.5",
  "AH_+0.5": "AH +0.5",
  ADV_KO: "Adv. KO",
};

const ROUND_ORDER: Record<string, number> = {
  GRP: 0,
  R32: 1,
  R16: 2,
  QF: 3,
  SF: 4,
  "3P": 5,
  FIN: 6,
};

function formatKickoff(utc: string): string {
  try {
    const d = new Date(utc);
    const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dy = String(d.getUTCDate()).padStart(2, "0");
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mm = String(d.getUTCMinutes()).padStart(2, "0");
    return `${mo}-${dy} ${hh}:${mm}Z`;
  } catch {
    return utc.slice(0, 16).replace("T", " ");
  }
}

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
  activeRound,
  activeMarket,
  activeGate,
  activeEdge,
  activeTeam,
}: {
  allTeams: string[];
  onParamChange: (key: string, value: string) => void;
  activeRound: string;
  activeMarket: string;
  activeGate: string;
  activeEdge: string;
  activeTeam: string;
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
      className="sticky top-0 z-20 flex flex-wrap items-center gap-2 px-4 py-2 border-b text-[11px]"
      style={{
        backgroundColor: "var(--bg-panel)",
        borderColor: "var(--border-subtle)",
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

      {/* Team autocomplete */}
      <input
        type="search"
        className={selectCls}
        style={{ ...selectStyle, minWidth: 120 }}
        placeholder="Team…"
        value={activeTeam}
        aria-label="Filter by team name"
        onChange={(e) => onParamChange("team", e.target.value)}
        list="terminal-teams-list"
      />
      <datalist id="terminal-teams-list">
        {allTeams.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>

      {/* Clear all */}
      {(activeRound || activeMarket || activeGate !== "all" || activeEdge !== "all" || activeTeam) && (
        <button
          className="mono text-[11px] px-2 py-1 rounded border transition-colors duration-[120ms]"
          style={{
            borderColor: "var(--border-default)",
            color: "var(--accent-focus)",
            backgroundColor: "transparent",
          }}
          onClick={() => {
            onParamChange("round", "");
            onParamChange("market", "");
            onParamChange("gate", "all");
            onParamChange("edge", "all");
            onParamChange("team", "");
          }}
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
            <ProbabilityCell p={row.p_model} decimals={3} />
          </DisclosureRow>
          <DisclosureRow label="q (market)" mono>
            <ProbabilityCell p={row.q_market_devigged} decimals={3} />
          </DisclosureRow>
          <DisclosureRow label="q (raw decimal)" mono>
            <MonoNumber value={row.q_market_raw_decimal} decimals={4} />
          </DisclosureRow>
          <DisclosureRow label="Edge E" mono>
            <EdgeBadge edge={row.edge_E} threshold={row.edge_threshold} />
          </DisclosureRow>
          <DisclosureRow label="Threshold ε" mono>
            <span className="mono">{formatMono(row.edge_threshold * 100, 1)}%</span>
          </DisclosureRow>
          <DisclosureRow label="95% CI" mono>
            <ConfidenceInterval lo={row.confidence_band[0]} hi={row.confidence_band[1]} />
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
  sorting,
  onSort,
  align = "left",
}: {
  label: string;
  colId: string;
  sorting: SortingState;
  onSort: (id: string) => void;
  align?: "left" | "right";
}) {
  const current = sorting.find((s) => s.id === colId);
  const indicator = current ? (current.desc ? " ▼" : " ▲") : "";

  return (
    <button
      className={`w-full text-[11px] font-medium flex items-center gap-0.5 transition-colors duration-[120ms] ${align === "right" ? "justify-end" : "justify-start"}`}
      style={{ color: current ? "var(--text-primary)" : "var(--text-tertiary)" }}
      onClick={() => onSort(colId)}
      aria-label={`Sort by ${label}${current ? (current.desc ? ", descending" : ", ascending") : ""}`}
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
  const [sorting, setSorting] = useState<SortingState>([
    { id: "absEdge", desc: true },
  ]);

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

  // ── URL update helper ──────────────────────────────────────────────────────
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
  const filteredRows = useMemo(() => {
    const teamQ = activeTeam.toLowerCase();
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
  }, [rows, activeRound, activeMarket, activeGate, activeEdge, activeTeam]);

  // ── Tanstack table ─────────────────────────────────────────────────────────
  type RowWithAbsEdge = DivergenceRow & { absEdge: number };
  const tableRows: RowWithAbsEdge[] = useMemo(
    () => filteredRows.map((r) => ({ ...r, absEdge: Math.abs(r.edge_E) })),
    [filteredRows]
  );

  const columns = useMemo<ColumnDef<RowWithAbsEdge>[]>(
    () => [
      { id: "kickoff_utc", accessorKey: "kickoff_utc", enableSorting: true },
      { id: "round",       accessorKey: "round",       enableSorting: true },
      { id: "p_model",     accessorKey: "p_model",     enableSorting: true },
      { id: "q_market_devigged", accessorKey: "q_market_devigged", enableSorting: true },
      { id: "absEdge",     accessorKey: "absEdge",     enableSorting: true },
      { id: "edge_E",      accessorKey: "edge_E",      enableSorting: false },
      { id: "gate_status", accessorKey: "gate_status", enableSorting: true },
    ],
    []
  );

  const table = useReactTable({
    data: tableRows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.row_id,
  });

  const sortedRows = table.getRowModel().rows;

  // ── Virtualizer ────────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: sortedRows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: (i) =>
      expandedIds.has(sortedRows[i]?.original.row_id ?? "") ? 260 : 44,
    overscan: 8,
    measureElement:
      typeof window !== "undefined"
        ? (el) => el?.getBoundingClientRect().height ?? 44
        : undefined,
  });

  const virtualItems = virtualizer.getVirtualItems();

  useEffect(() => {
    virtualizer.measure();
  }, [expandedIds, virtualizer]);

  // ── Column sort handler ────────────────────────────────────────────────────
  const handleSort = useCallback(
    (colId: string) => {
      setSorting((prev) => {
        const existing = prev.find((s) => s.id === colId);
        if (!existing) return [{ id: colId, desc: true }];
        if (existing.desc) return [{ id: colId, desc: false }];
        return [{ id: "absEdge", desc: true }];
      });
    },
    []
  );

  // ── Derived flags ──────────────────────────────────────────────────────────
  const allVisibleGated =
    filteredRows.length > 0 &&
    filteredRows.every((r) => r.gate_status === "FIRED");

  const staleStyle = isStale ? { opacity: 0.6 } : {};
  const isEmpty = filteredRows.length === 0;

  const noEdgeAboveThreshold =
    !activeRound && !activeMarket && activeGate === "all" && activeEdge === "all" && !activeTeam &&
    rows.length > 0 &&
    rows.every((r) => Math.abs(r.edge_E) < r.edge_threshold);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Stale warning ───────────────────────────────────────────────── */}
      {isStale && (
        <div
          className="px-4 py-2 text-[12px]"
          style={{ color: "var(--gate-fired)", backgroundColor: "var(--bg-panel)" }}
          role="alert"
        >
          Snapshot stale — re-render pending. Data may be more than 26h old.
        </div>
      )}

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <FilterBar
        allTeams={allTeams}
        onParamChange={onParamChange}
        activeRound={activeRound}
        activeMarket={activeMarket}
        activeGate={activeGate}
        activeEdge={activeEdge}
        activeTeam={activeTeam}
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
            onClick={() => {
              onParamChange("round", "");
              onParamChange("market", "");
              onParamChange("gate", "all");
              onParamChange("edge", "all");
              onParamChange("team", "");
            }}
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
          <span className="mono">FIRED</span>. No row is hidden — the gate annotates.
        </div>
      )}

      {/* ── Grid table ──────────────────────────────────────────────────── */}
      {!isEmpty && (
        <>
          {/* Outer horizontal scroll wrapper — column header + rows scroll as one unit.
              minWidth on children forces the outer div to create a scrollbar at narrow viewports,
              ensuring the 1fr matchup column always has real space. */}
          <div
            className="overflow-x-auto"
            role="grid"
            aria-label={`Divergence terminal — ${sortedRows.length} rows`}
            aria-rowcount={sortedRows.length}
          >
            {/* ── Column header row — outside the vertical scroll container */}
            <div
              role="row"
              aria-label="Column headers"
              className="border-b text-[11px] font-medium"
              style={{
                display: "grid",
                gridTemplateColumns: COL_GRID,
                minWidth: "1080px",
                alignItems: "center",
                backgroundColor: "var(--bg-panel)",
                borderColor: "var(--border-subtle)",
                color: "var(--text-tertiary)",
              }}
            >
              <div role="columnheader" className="py-2 pl-3 pr-2">
                <SortHeader label="Kickoff (UTC)" colId="kickoff_utc" sorting={sorting} onSort={handleSort} />
              </div>
              <div role="columnheader" className="py-2 px-2">
                <SortHeader label="Round" colId="round" sorting={sorting} onSort={handleSort} />
              </div>
              <div role="columnheader" className="py-2 px-2">Matchup</div>
              <div role="columnheader" className="py-2 px-2">Market</div>
              <div role="columnheader" className="py-2 px-2">Outcome</div>
              <div role="columnheader" className="py-2 px-2">
                <SortHeader label="p (model)" colId="p_model" sorting={sorting} onSort={handleSort} align="right" />
              </div>
              <div role="columnheader" className="py-2 px-2">
                <SortHeader label="q (mkt)" colId="q_market_devigged" sorting={sorting} onSort={handleSort} align="right" />
              </div>
              <div role="columnheader" className="py-2 px-2">Divergence</div>
              <div role="columnheader" className="py-2 px-2">
                <SortHeader label="Edge E" colId="absEdge" sorting={sorting} onSort={handleSort} align="right" />
              </div>
              <div
                role="columnheader"
                className="py-2 px-2 text-right"
                aria-label="Pre-registered edge threshold"
              >
                ε
              </div>
              <div role="columnheader" className="py-2 px-2">
                <SortHeader label="Gate" colId="gate_status" sorting={sorting} onSort={handleSort} />
              </div>
              <div role="columnheader" className="py-2 px-2 text-right">95% CI</div>
              <div role="columnheader" className="py-2 pr-3 pl-2 text-right">Age (m)</div>
            </div>

            {/* ── Vertical scroll container — div height is respected, unlike tbody */}
            <div
              ref={containerRef}
              style={{
                maxHeight: "calc(100vh - 300px)",
                overflowY: "auto",
                minWidth: "1080px",
                ...staleStyle,
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
                const tableRow = sortedRows[vItem.index];
                if (!tableRow) return null;
                const row = tableRow.original;
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
                      className="transition-colors duration-[120ms] cursor-pointer text-[12.5px]"
                      style={{
                        display: "grid",
                        gridTemplateColumns: COL_GRID,
                        alignItems: "center",
                        backgroundColor: isExpanded ? "var(--bg-panel-elev)" : undefined,
                      }}
                      onClick={() => toggleExpand(row.row_id)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleExpand(row.row_id);
                        }
                      }}
                      aria-label={`${isExpanded ? "Collapse" : "Expand"} details for ${row.home.display_name} vs ${row.away.display_name} ${MARKET_LABELS[row.market] ?? row.market} ${row.outcome}`}
                    >
                      {/* Kickoff */}
                      <div role="gridcell" className="py-2.5 pl-3 pr-2">
                        <span
                          className="mono"
                          aria-label={`kickoff ${formatKickoff(row.kickoff_utc)}`}
                        >
                          {formatKickoff(row.kickoff_utc)}
                        </span>
                      </div>
                      {/* Round */}
                      <div role="gridcell" className="py-2.5 px-2 mono text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                        {row.round}
                      </div>
                      {/* Matchup */}
                      <div role="gridcell" className="py-2.5 px-2 min-w-0 overflow-hidden">
                        <Link
                          href={`/match/${row.match_id}`}
                          className="transition-colors duration-[120ms] block truncate"
                          style={{ color: "var(--text-secondary)" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="mono text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                            {row.home.fifa_code}
                          </span>{" "}
                          {row.home.display_name}{" "}
                          <span style={{ color: "var(--text-tertiary)" }}>‒</span>{" "}
                          {row.away.display_name}{" "}
                          <span className="mono text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                            {row.away.fifa_code}
                          </span>
                        </Link>
                      </div>
                      {/* Market */}
                      <div role="gridcell" className="py-2.5 px-2 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                        {MARKET_LABELS[row.market] ?? row.market}
                      </div>
                      {/* Outcome */}
                      <div role="gridcell" className="py-2.5 px-2 mono text-[11px]" style={{ color: "var(--text-secondary)" }}>
                        {row.outcome}
                      </div>
                      {/* p_model */}
                      <div role="gridcell" className="py-2.5 px-2 text-right">
                        <ProbabilityCell p={row.p_model} decimals={1} />
                      </div>
                      {/* q_market */}
                      <div role="gridcell" className="py-2.5 px-2 text-right">
                        <ProbabilityCell p={row.q_market_devigged} decimals={1} />
                      </div>
                      {/* Divergence bar */}
                      <div role="gridcell" className="py-2.5 px-2">
                        <DivergenceBar p_model={row.p_model} q_market={row.q_market_devigged} />
                      </div>
                      {/* Edge E */}
                      <div role="gridcell" className="py-2.5 px-2 text-right">
                        <EdgeBadge edge={row.edge_E} threshold={row.edge_threshold} />
                      </div>
                      {/* Threshold ε */}
                      <div role="gridcell" className="py-2.5 px-2 text-right mono text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                        <span aria-label={`threshold ${(row.edge_threshold * 100).toFixed(0)} percent`}>
                          {formatMono(row.edge_threshold * 100, 0)}%
                        </span>
                      </div>
                      {/* Gate */}
                      <div role="gridcell" className="py-2.5 px-2 text-center">
                        <GateStatusPill
                          status={row.gate_status}
                          rulesTripped={row.gate_rules_tripped}
                        />
                      </div>
                      {/* 95% CI */}
                      <div role="gridcell" className="py-2.5 px-2 text-right">
                        <ConfidenceInterval
                          lo={row.confidence_band[0]}
                          hi={row.confidence_band[1]}
                        />
                      </div>
                      {/* Age */}
                      <div role="gridcell" className="py-2.5 pr-3 pl-2 text-right mono text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                        <span aria-label={`snapshot age ${row.snapshot_age_minutes} minutes`}>
                          {row.snapshot_age_minutes}
                        </span>
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

          {/* ── Row count footer ────────────────────────────────────────── */}
          <div
            className="px-4 py-2 text-[11px] border-t"
            style={{
              borderColor: "var(--border-subtle)",
              color: "var(--text-tertiary)",
              backgroundColor: "var(--bg-panel)",
            }}
          >
            {sortedRows.length} row{sortedRows.length !== 1 ? "s" : ""}
            {rows.length !== sortedRows.length && ` (filtered from ${rows.length})`}
            {" · "}snapshot{" "}
            <span className="mono">{snapshotId}</span>
            {" · "}click any row to expand model breakdown and edge history
          </div>
        </>
      )}
    </div>
  );
}
