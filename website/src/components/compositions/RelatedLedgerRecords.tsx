import Link from "next/link";
import type { LedgerRecord, MatchDetail } from "@/lib/data/schemas";
import { ProbabilityCell } from "@/components/primitives/ProbabilityCell";
import { EdgeBadge } from "@/components/primitives/EdgeBadge";

interface RelatedLedgerRecordsProps {
  match: MatchDetail;
  records: LedgerRecord[];
}

export function RelatedLedgerRecords({
  match,
  records,
}: RelatedLedgerRecordsProps) {
  const related = records.filter((r) => r.match_id === match.match_id);

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
            style={{
              fontFamily: "var(--font-sans)",
              color: "var(--text-primary)",
            }}
          >
            Related ledger records
          </h3>
          <div
            className="mono text-[11px] mt-[3px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            settled forecasts tied to this fixture · deterministic replay available
          </div>
        </div>
        <span
          className="mono text-[10px] uppercase tracking-[.08em]"
          style={{ color: "var(--text-quiet)" }}
        >
          {related.length} records
        </span>
      </div>

      {related.length === 0 ? (
        <div
          className="px-4 py-6 mono text-[12px] text-center"
          style={{
            borderTop: "1px solid var(--border-subtle)",
            color: "var(--text-tertiary)",
          }}
        >
          No settled forecasts yet. Records appear once the fixture is played
          and reconciled against the pre-registered pipeline.
        </div>
      ) : (
        <div>
          <div
            className="grid px-4 pb-1.5 text-[10px] uppercase tracking-[.08em] mono"
            style={{
              gridTemplateColumns: "1fr 1fr 1fr 0.8fr 0.8fr 1fr",
              gap: 12,
              color: "var(--text-quiet)",
            }}
          >
            <span>forecast</span>
            <span>model · market</span>
            <span className="text-right">p @ close</span>
            <span className="text-right">q @ close</span>
            <span className="text-right">E</span>
            <span className="text-right">outcome</span>
          </div>
          {related.map((r) => (
            <Link
              key={r.forecast_id}
              href={`/ledger/${r.forecast_id}`}
              className="grid items-center transition-colors duration-[120ms]"
              style={{
                gridTemplateColumns: "1fr 1fr 1fr 0.8fr 0.8fr 1fr",
                gap: 12,
                padding: "10px 16px",
                borderTop: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
              }}
            >
              <span
                className="mono text-[12px] truncate"
                style={{ color: "var(--accent-focus)" }}
              >
                {r.forecast_id}
              </span>
              <span
                className="mono text-[12px]"
                style={{ color: "var(--text-secondary)" }}
              >
                {r.model_id} · {r.market}
              </span>
              <span className="text-right">
                <ProbabilityCell p={r.p_model_on_realized} decimals={2} />
              </span>
              <span className="text-right">
                <ProbabilityCell p={r.q_market_devigged_on_realized} decimals={2} />
              </span>
              <span className="text-right">
                <EdgeBadge edge={r.edge_E_at_close} />
              </span>
              <span className="text-right">
                <HitMissChip label={r.hit_miss_label} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function HitMissChip({ label }: { label: "HIT" | "MISS" | "NEUTRAL" }) {
  const color =
    label === "HIT"
      ? "var(--ledger-hit)"
      : label === "MISS"
        ? "var(--ledger-miss)"
        : "var(--text-tertiary)";
  const bg =
    label === "HIT"
      ? "color-mix(in oklch, var(--ledger-hit) 18%, transparent)"
      : label === "MISS"
        ? "color-mix(in oklch, var(--ledger-miss) 18%, transparent)"
        : "color-mix(in oklch, var(--text-tertiary) 10%, transparent)";

  return (
    <span
      className="mono text-[11px] inline-block px-1.5 py-px rounded-sm"
      style={{ color, background: bg }}
    >
      {label}
    </span>
  );
}
