import { loadDivergence, loadFreshness } from "@/lib/data/loadSnapshot";
import { DivergenceTable } from "@/components/compositions/DivergenceTable";
import { SubNav } from "@/components/layout/SubNav";

export const dynamic = "force-static";

export const metadata = {
  title: "Divergence Terminal — The 45% Problem",
  description:
    "Screener for model-vs-market divergence across all upcoming World Cup 2026 markets. Sorted by absolute edge magnitude.",
};

export default async function TerminalPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const divergence = loadDivergence();
  const freshness = loadFreshness();

  const isStale = freshness.status === "STALE" || freshness.status === "BROKEN";

  const allGated =
    divergence.rows.length > 0 &&
    divergence.rows.every((r) => r.gate_status === "FIRED");

  return (
    <div
      className="flex flex-col"
      style={{ backgroundColor: "var(--bg-root)", color: "var(--text-primary)" }}
    >
      {/* ── Sub-nav row ──────────────────────────────────────────────────── */}
      <div className="max-w-[1152px] mx-auto w-full px-12 pt-5 pb-2">
        <SubNav
          links={[
            { href: "/", label: "Overview", direction: "back" },
            { href: "/ledger", label: "Transparency Ledger", direction: "forward" },
          ]}
        />
      </div>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div
        className="shrink-0 px-6 pt-4 pb-4 border-b"
        style={{ borderColor: "var(--border-default)" }}
      >
        <div className="max-w-[1152px] mx-auto px-12 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1
              className="text-[18px] font-medium tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Divergence Terminal
            </h1>
            <p
              className="text-[12px] mt-0.5"
              style={{ color: "var(--text-secondary)" }}
            >
              Model-vs-market divergence · sorted by{" "}
              <span className="mono">|E|</span> descending · snapshot{" "}
              <span className="mono">{divergence.snapshot_id}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Pre-registration disclaimer ───────────────────────────────────── */}
      <div
        className="shrink-0 px-6 py-2 border-b text-[11px]"
        style={{
          borderColor: "var(--border-subtle)",
          backgroundColor: "var(--bg-panel)",
          color: "var(--text-tertiary)",
        }}
      >
        <div className="max-w-[1152px] mx-auto px-12">
          Research publication. Divergences are descriptive statistics — model-implied
          probability minus de-vigged market-implied probability. No content on this
          terminal constitutes investment or gambling advice. Methodology pre-registered
          at{" "}
          <a
            href="https://osf.io/8b5hd"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors duration-[120ms]"
            style={{ color: "var(--accent-focus)" }}
          >
            osf.io/8b5hd
          </a>
          .
        </div>
      </div>

      {/* ── All-gated banner ─────────────────────────────────────────────── */}
      {allGated && (
        <div
          className="shrink-0 px-6 py-2 text-[12px] font-medium"
          style={{
            backgroundColor: "color-mix(in srgb, var(--gate-fired) 12%, transparent)",
            borderBottom: "1px solid var(--gate-fired)",
            color: "var(--gate-fired)",
          }}
          role="alert"
        >
          <div className="max-w-[1152px] mx-auto px-12">
            ◆ Volatility Gate tripped on all {divergence.rows.length} rows in this snapshot.
            All rows remain visible — the gate annotates, it does not filter. Gate rules
            are shown in the Gate column tooltip.
          </div>
        </div>
      )}

      {/* ── Main table ───────────────────────────────────────────────────── */}
      <div className="max-w-[1152px] mx-auto w-full px-12 py-6">
        <DivergenceTable
          rows={divergence.rows}
          snapshotId={divergence.snapshot_id}
          isStale={isStale}
          initialParams={params}
        />
      </div>

      {/* ── Column legend ─────────────────────────────────────────────────── */}
      <div
        className="shrink-0 px-6 py-5 border-t text-[11px] space-y-1"
        style={{
          borderColor: "var(--border-subtle)",
          color: "var(--text-tertiary)",
        }}
      >
        <div className="max-w-[1152px] mx-auto px-12 space-y-1">
          <p>
            <span className="mono" style={{ color: "var(--data-neutral)" }}>p (model)</span>{" "}
            — M&#9733; model-implied probability for the outcome.{" "}
            <span className="mono" style={{ color: "var(--data-neutral)" }}>q (mkt)</span>{" "}
            — de-vigged market-implied probability from{" "}
            <span className="mono">source_book</span>.{" "}
            <span className="mono" style={{ color: "var(--data-neutral)" }}>E</span>{" "}
            — edge: p(model) − q(market). Positive = model implies higher probability than market.
          </p>
          <p>
            Rows where the Volatility Gate tripped are annotated with a{" "}
            <span style={{ color: "var(--gate-fired)" }}>◆</span> dot and remain
            visible — the gate annotates, it does not filter. Gate rules are shown
            in the Gate column hover-card.{" "}
            <span className="mono">ε</span> is the pre-registered edge threshold (3% mainline /
            5% longshot).
          </p>
          <p>
            Click any row to expand the model breakdown and{" "}
            <span className="mono">edge_E</span> history sparkline. URL encodes all active
            filters — copy the address bar to share a specific view.
          </p>
        </div>
      </div>
    </div>
  );
}
