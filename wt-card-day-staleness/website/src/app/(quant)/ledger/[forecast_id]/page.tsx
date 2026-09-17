import { notFound } from "next/navigation";
import Link from "next/link";
import { loadLedger } from "@/lib/data/loadSnapshot";
import { HashChip } from "@/components/primitives/HashChip";
import { NumericCell } from "@/components/primitives/NumericCell";
import { EdgeBadge } from "@/components/primitives/EdgeBadge";
import { GateStatusPill } from "@/components/primitives/GateStatusPill";
import { formatMono, formatProbability } from "@/lib/formatters";
import { LABEL_COLOR } from "@/lib/labels";

export const dynamic = "force-static";

// ── Static params ─────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  const records = loadLedger();
  return records.map((r) => ({ forecast_id: r.forecast_id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ forecast_id: string }>;
}) {
  const { forecast_id } = await params;
  return {
    title: `Forecast ${forecast_id} · Transparency Ledger`,
    description: `Full audit record for forecast ${forecast_id} including reproduction recipe.`,
  };
}

// ── Field row ─────────────────────────────────────────────────────────────────

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <tr style={{ borderTop: "1px solid var(--border-subtle)" }}>
      <td
        className="py-2 pr-6 text-[11px] align-top whitespace-nowrap"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
      </td>
      <td className="py-2 text-[12px]" style={{ color: "var(--data-neutral)" }}>
        {children}
      </td>
    </tr>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ForecastDetailPage({
  params,
}: {
  params: Promise<{ forecast_id: string }>;
}) {
  const { forecast_id } = await params;
  const records = loadLedger();
  const record = records.find((r) => r.forecast_id === forecast_id);

  if (!record) notFound();

  const matchLabel = record.match_id
    .replace(/^\d{4}-\d{2}-\d{2}_/, "")
    .replace(/_/g, " vs ");

  const distEntries = Object.entries(record.outcome_predicted_distribution).sort(
    ([, a], [, b]) => b - a
  );

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--bg-root)", color: "var(--text-primary)" }}
    >
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div
        className="px-6 pt-6 pb-4 border-b"
        style={{ borderColor: "var(--border-default)" }}
      >
        <div className="max-w-[1152px] mx-auto px-12">
          <div className="flex flex-wrap items-baseline gap-3">
            <h1
              className="text-[16px] font-medium tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Forecast Audit Record
            </h1>
            <span
              className="mono text-[12px] px-2 py-0.5 rounded border"
              style={{
                borderColor: record.hit_miss_label
                  ? LABEL_COLOR[record.hit_miss_label]
                  : "var(--border-default)",
                color: record.hit_miss_label
                  ? LABEL_COLOR[record.hit_miss_label]
                  : "var(--text-tertiary)",
              }}
              aria-label={
                record.hit_miss_label
                  ? record.hit_miss_label.toLowerCase()
                  : "market pending"
              }
            >
              {record.hit_miss_label ?? "MARKET PENDING"}
            </span>
          </div>
          <p
            className="mono text-[11px] mt-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            {forecast_id}
          </p>
        </div>
      </div>

      <div className="max-w-[1152px] mx-auto px-12 py-6 space-y-6">
        {/* ── Full schema fields ────────────────────────────────────────── */}
        <section
          aria-label="Forecast fields"
          className="border rounded"
          style={{
            borderColor: "var(--border-default)",
            backgroundColor: "var(--bg-panel)",
          }}
        >
          <div
            className="px-4 py-3 border-b"
            style={{ borderColor: "var(--border-default)" }}
          >
            <h2
              className="text-[13px] font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              Schema Fields
            </h2>
          </div>
          <div className="px-4 py-3">
            <table className="w-full">
              <tbody>
                <FieldRow label="forecast_id">
                  <span className="mono">{record.forecast_id}</span>
                </FieldRow>
                <FieldRow label="match_id">
                  <Link
                    href={`/match/${record.match_id}`}
                    className="mono transition-colors duration-[120ms]"
                    style={{ color: "var(--accent-focus)" }}
                  >
                    {record.match_id}
                  </Link>
                </FieldRow>
                <FieldRow label="match">
                  <span>{matchLabel}</span>
                </FieldRow>
                <FieldRow label="model_id">
                  <span
                    className="mono px-1.5 py-0.5 rounded border text-[11px]"
                    style={{
                      borderColor:
                        record.model_id === "M_STAR"
                          ? "var(--accent-focus)"
                          : "var(--border-subtle)",
                      color:
                        record.model_id === "M_STAR"
                          ? "var(--accent-focus)"
                          : "var(--text-secondary)",
                    }}
                  >
                    {record.model_id === "M_STAR" ? "M★" : record.model_id}
                  </span>
                </FieldRow>
                <FieldRow label="market">
                  <span className="mono">{record.market}</span>
                </FieldRow>

                <FieldRow label="predicted distribution">
                  <div className="space-y-0.5">
                    {distEntries.map(([outcome, p]) => (
                      <div key={outcome} className="flex items-center gap-3">
                        <span
                          className="mono w-16 text-right"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {outcome}
                        </span>
                        <NumericCell
                          value={p}
                          formatter={(x) => formatProbability(x, 1)}
                          ariaLabel={`${(p * 100).toFixed(1)} percent`}
                        />
                        <div
                          className="h-1.5 rounded"
                          style={{
                            width: `${p * 120}px`,
                            backgroundColor: "var(--accent-focus)",
                            opacity: 0.5,
                          }}
                          aria-hidden
                        />
                        {outcome === record.outcome_realized && (
                          <span
                            className="mono text-[10px]"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            ← realized
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </FieldRow>

                <FieldRow label="outcome_realized">
                  <span className="mono">{record.outcome_realized}</span>
                </FieldRow>
                <FieldRow label="p_model_on_realized">
                  <NumericCell
                    value={record.p_model_on_realized}
                    formatter={(x) => formatProbability(x, 1)}
                    ariaLabel={`${(record.p_model_on_realized * 100).toFixed(1)} percent`}
                  />
                </FieldRow>
                <FieldRow label="q_market_devigged_on_realized">
                  {record.q_market_devigged_on_realized !== null ? (
                    <NumericCell
                      value={record.q_market_devigged_on_realized}
                      formatter={(x) => formatProbability(x, 1)}
                      ariaLabel={`${(record.q_market_devigged_on_realized * 100).toFixed(1)} percent`}
                    />
                  ) : (
                    <span
                      className="mono"
                      style={{ color: "var(--text-tertiary)" }}
                      aria-label="market pending"
                    >
                      pending (no odds ingested)
                    </span>
                  )}
                </FieldRow>
                <FieldRow label="edge_E_at_close">
                  {record.edge_E_at_close !== null ? (
                    <EdgeBadge edge={record.edge_E_at_close} threshold={0.03} />
                  ) : (
                    <span
                      className="mono"
                      style={{ color: "var(--text-tertiary)" }}
                      aria-label="market pending"
                    >
                      pending
                    </span>
                  )}
                </FieldRow>
                <FieldRow label="gate_status_at_close">
                  {record.gate_status_at_close !== null ? (
                    <GateStatusPill
                      status={record.gate_status_at_close}
                      rulesTripped={[]}
                    />
                  ) : (
                    <span
                      className="mono"
                      style={{ color: "var(--text-tertiary)" }}
                      aria-label="market pending"
                    >
                      pending
                    </span>
                  )}
                </FieldRow>
                <FieldRow label="brier_contribution">
                  <NumericCell
                    value={record.brier_contribution}
                    formatter={(v) => formatMono(v, 4)}
                  />
                </FieldRow>
                <FieldRow label="log_loss_contribution">
                  <NumericCell
                    value={record.log_loss_contribution}
                    formatter={(v) => formatMono(v, 4)}
                  />
                </FieldRow>
                <FieldRow label="rps_contribution">
                  <NumericCell
                    value={record.rps_contribution}
                    formatter={(v) => formatMono(v, 4)}
                  />
                </FieldRow>
                <FieldRow label="clv_bps">
                  {record.clv_bps !== null ? (
                    <span
                      className="mono"
                      style={{
                        color:
                          record.clv_bps >= 0
                            ? "var(--edge-positive)"
                            : "var(--edge-negative)",
                      }}
                      aria-label={`${record.clv_bps >= 0 ? "positive" : "negative"} ${Math.abs(record.clv_bps)} basis points`}
                    >
                      {record.clv_bps >= 0 ? "+" : "−"}
                      {Math.abs(record.clv_bps)} bps
                    </span>
                  ) : (
                    <span className="mono" style={{ color: "var(--text-tertiary)" }}>
. (shadow model, not M★)
                    </span>
                  )}
                </FieldRow>
                <FieldRow label="hit_miss_label">
                  <span
                    className="mono"
                    style={{
                      color: record.hit_miss_label
                        ? LABEL_COLOR[record.hit_miss_label]
                        : "var(--text-tertiary)",
                    }}
                  >
                    {record.hit_miss_label ?? "pending (market)"}
                  </span>
                </FieldRow>
                <FieldRow label="settled_at_utc">
                  <span className="mono">{record.settled_at_utc}</span>
                </FieldRow>
                <FieldRow label="mc_seed">
                  <span className="mono">{record.mc_seed}</span>
                </FieldRow>
                <FieldRow label="code_sha">
                  <HashChip sha={record.code_sha} kind="code_sha" />
                </FieldRow>
                <FieldRow label="data_sha">
                  <HashChip sha={record.data_sha} kind="data_sha" />
                </FieldRow>
              </tbody>
            </table>
          </div>
        </section>

        {/* ── §7.5 Reproduction recipe ──────────────────────────────────── */}
        <section
          aria-label="Reproduction recipe"
          className="border rounded"
          style={{
            borderColor: "var(--border-default)",
            backgroundColor: "var(--bg-panel)",
          }}
        >
          <div
            className="px-4 py-3 border-b"
            style={{ borderColor: "var(--border-default)" }}
          >
            <h2
              className="text-[13px] font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              Reproduction Recipe
            </h2>
            <p
              className="text-[11px] mt-0.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              Running the command below against the published artifacts should
              reproduce the exact <span className="mono">p_model</span> vector.
            </p>
          </div>
          <div className="px-4 py-4">
            <pre
              className="mono text-[11px] p-4 rounded border overflow-x-auto leading-relaxed"
              style={{
                backgroundColor: "var(--bg-root)",
                borderColor: "var(--border-subtle)",
                color: "var(--data-neutral)",
              }}
              aria-label="Reproduction recipe command"
            >
{`# Reproduce forecast ${record.forecast_id}
#
# Requirements:
#   - Python 3.11+
#   - The 45% Problem research repo at the commit below
#   - Phase 7 evaluation harness installed (pip install -e .)
#
# Step 1: check out the exact code commit
git clone https://github.com/the-45-percent-problem/research.git
cd research
git checkout ${record.code_sha}

# Step 2: verify the data snapshot
# SHA-256 of the input data bundle must match:
# ${record.data_sha}
sha256sum data/snapshots/active.tar.gz

# Step 3: run the reproduction harness
python -m p9.reproduce \\
  --forecast-id ${record.forecast_id} \\
  --code-sha    ${record.code_sha} \\
  --data-sha    ${record.data_sha} \\
  --mc-seed     ${record.mc_seed}

# Expected output: p_model vector
# ${Object.entries(record.outcome_predicted_distribution)
  .map(([k, v]) => `#   ${k}: ${v.toFixed(4)}`)
  .join("\n")}
#
# The realized outcome was: ${record.outcome_realized}
# p_model_on_realized:      ${record.p_model_on_realized.toFixed(4)}
`}
            </pre>

            <div
              className="mt-4 text-[11px] space-y-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              <p>
                Pre-registration invariant: once a forecast is published in{" "}
                <span className="mono">ledger.jsonl</span>, it is never edited. If a
                bug in the upstream emitter produced a wrong snapshot, the correction
                appears as a new snapshot; not a rewrite of this record.
              </p>
              <p>
                The full artifact archive is indexed at{" "}
                <Link
                  href="/api/snapshot/manifest.json"
                  className="mono underline underline-offset-2"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  /api/snapshot/manifest.json
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
