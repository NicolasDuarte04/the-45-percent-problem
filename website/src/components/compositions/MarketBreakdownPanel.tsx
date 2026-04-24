import type { MatchDetail } from "@/lib/data/schemas";
import { ProbabilityCell } from "@/components/primitives/ProbabilityCell";
import { EdgeBadge } from "@/components/primitives/EdgeBadge";

interface MarketBreakdownPanelProps {
  match: MatchDetail;
}

interface Row {
  key: string;
  label: string;
  p: number;
  q?: number;
  book?: string;
  market?: string;
  edge?: number;
}

export function MarketBreakdownPanel({ match }: MarketBreakdownPanelProps) {
  const p = match.p_model_1x2;

  const divergence = match.market_divergence as Array<Record<string, unknown>>;

  const pick = (outcome: string) =>
    divergence.find((d) => d.market === "1X2" && d.outcome === outcome);

  const qH = pick("H") as { q_market_devigged?: number; edge_E?: number; source_book?: string } | undefined;
  const qD = pick("D") as { q_market_devigged?: number; edge_E?: number; source_book?: string } | undefined;
  const qA = pick("A") as { q_market_devigged?: number; edge_E?: number; source_book?: string } | undefined;

  const rows: Row[] = [
    {
      key: "home",
      label: `${match.home.display_name} win`,
      p: p.H,
      q: qH?.q_market_devigged,
      edge: qH?.edge_E,
      book: qH?.source_book,
      market: "1X2 · H",
    },
    {
      key: "draw",
      label: "Draw",
      p: p.D,
      q: qD?.q_market_devigged,
      edge: qD?.edge_E,
      book: qD?.source_book,
      market: "1X2 · D",
    },
    {
      key: "away",
      label: `${match.away.display_name} win`,
      p: p.A,
      q: qA?.q_market_devigged,
      edge: qA?.edge_E,
      book: qA?.source_book,
      market: "1X2 · A",
    },
  ];

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div className="flex justify-between items-baseline px-4 pt-4 pb-3">
        <div>
          <h3
            className="text-[13px] font-medium"
            style={{ fontFamily: "var(--font-sans)", color: "var(--text-primary)" }}
          >
            Market breakdown · 1X2
          </h3>
          <div
            className="mono text-[11px] mt-[3px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            p · model-implied · q · de-vigged market · E · p − q
          </div>
        </div>
        <div
          className="mono text-[10px] uppercase tracking-[.08em]"
          style={{ color: "var(--text-quiet)" }}
        >
          model · market · edge
        </div>
      </div>

      <div
        className="grid px-4 pb-1.5 text-[10px] uppercase tracking-[.08em] mono"
        style={{
          gridTemplateColumns: "1.3fr 1fr 1fr 1fr 0.9fr",
          gap: 16,
          color: "var(--text-quiet)",
        }}
      >
        <span>Selection</span>
        <span className="text-right">p</span>
        <span className="text-right">q</span>
        <span className="text-right">book</span>
        <span className="text-right">|E|</span>
      </div>

      {rows.map((row) => (
        <MarketRow key={row.key} row={row} />
      ))}
    </div>
  );
}

function MarketRow({ row }: { row: Row }) {
  const pPct = row.p * 100;
  const barColor =
    row.key === "home"
      ? "var(--prism-peach)"
      : row.key === "draw"
        ? "color-mix(in oklch, var(--prism-sun) 60%, var(--bg-panel))"
        : "var(--prism-cyan)";

  return (
    <div
      className="grid items-center"
      style={{
        gridTemplateColumns: "1.3fr 1fr 1fr 1fr 0.9fr",
        gap: 16,
        padding: "11px 16px",
        borderTop: "1px solid var(--border-subtle)",
      }}
    >
      <div>
        <div
          className="text-[13px]"
          style={{
            fontFamily: "var(--font-sans)",
            color: "var(--text-primary)",
          }}
        >
          {row.label}
        </div>
        <div
          className="relative mt-[7px]"
          style={{
            height: 3,
            background: "var(--bg-root)",
            borderRadius: 1,
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              width: `${pPct}%`,
              background: barColor,
              opacity: 0.85,
              borderRadius: 1,
            }}
          />
        </div>
      </div>
      <div className="text-right">
        <ProbabilityCell p={row.p} decimals={2} />
        <div
          className="mono text-[10px]"
          style={{ color: "var(--text-quiet)", letterSpacing: ".04em" }}
        >
          p · model
        </div>
      </div>
      <div className="text-right">
        {row.q !== undefined ? (
          <ProbabilityCell p={row.q} decimals={2} />
        ) : (
          <span
            className="mono text-[13px]"
            style={{ color: "var(--text-quiet)" }}
          >
            —
          </span>
        )}
        <div
          className="mono text-[10px]"
          style={{ color: "var(--text-quiet)", letterSpacing: ".04em" }}
        >
          q · devig
        </div>
      </div>
      <div className="text-right">
        <div
          className="mono text-[13px]"
          style={{ color: "var(--text-secondary)" }}
        >
          {row.book ?? "—"}
        </div>
        <div
          className="mono text-[10px]"
          style={{ color: "var(--text-quiet)", letterSpacing: ".04em" }}
        >
          source
        </div>
      </div>
      <div className="text-right">
        {row.edge !== undefined ? <EdgeBadge edge={row.edge} /> : (
          <span className="mono text-[12px]" style={{ color: "var(--text-quiet)" }}>—</span>
        )}
      </div>
    </div>
  );
}
