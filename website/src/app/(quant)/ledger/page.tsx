import { Suspense } from "react";
import Link from "next/link";
import { loadLedger, loadEvaluationMetrics } from "@/lib/data/loadSnapshot";
import { LedgerSummaryPanel } from "@/components/compositions/LedgerSummaryPanel";
import { LedgerTable } from "@/components/compositions/LedgerTable";
import { CanvasTour } from "@/components/compositions/CanvasTour";
import { TourTriggerButton } from "@/components/compositions/TourTriggerButton";
import type { LedgerRecord } from "@/lib/data/schemas";
import { LEDGER_STEPS, LEDGER_DURATION_SEC } from "./_steps";

export const dynamic = "force-static";

export const metadata = {
  title: "Transparency Ledger · The 45% Problem",
  description:
    "Append-only record of every forecast M★ has issued, with realized outcomes. Hits and misses treated with equal prominence.",
};

// ── §7.6 Misses narrative ─────────────────────────────────────────────────────
// The three highest-confidence M★ misses; the inverse of a highlight reel.

function TopMissesNarrative({ records }: { records: LedgerRecord[] }) {
  const mstarMisses = records
    .filter((r) => r.model_id === "M_STAR" && r.hit_miss_label === "MISS")
    .sort((a, b) => b.p_model_on_realized - a.p_model_on_realized)
    .slice(0, 3);

  if (mstarMisses.length === 0) {
    return (
      <div
        className="py-6 text-center text-[12px]"
        style={{ color: "var(--text-tertiary)" }}
      >
        No M★ misses recorded in this snapshot. This section populates as matches settle.
      </div>
    );
  }

  return (
    <ol className="space-y-4" aria-label="Three highest-confidence M★ misses">
      {mstarMisses.map((r, i) => {
        const matchLabel = r.match_id
          .replace(/^\d{4}-\d{2}-\d{2}_/, "")
          .replace(/_/g, " vs ");

        // Modal prediction (highest probability outcome)
        const dist = r.outcome_predicted_distribution;
        const modalOutcome = Object.entries(dist).sort(([, a], [, b]) => b - a)[0];
        const modalLabel = modalOutcome ? modalOutcome[0] : "-";
        const modalP = modalOutcome ? (modalOutcome[1] * 100).toFixed(1) : "-";

        const realizedP = (r.p_model_on_realized * 100).toFixed(1);

        return (
          <li
            key={r.forecast_id}
            className="border rounded p-4"
            style={{
              borderColor: "var(--border-default)",
              backgroundColor: "var(--bg-panel)",
            }}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
              <div className="flex items-baseline gap-2">
                <span
                  className="mono text-[11px]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  #{i + 1}
                </span>
                <Link
                  href={`/ledger/${r.forecast_id}`}
                  className="font-medium text-[13px] transition-colors duration-[120ms]"
                  style={{ color: "var(--text-primary)" }}
                >
                  {matchLabel}
                </Link>
                <span className="mono text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                  {r.market}
                </span>
              </div>
              <span
                className="mono text-[11px] px-1.5 py-0.5 rounded border"
                style={{
                  borderColor: "var(--ledger-miss)",
                  color: "var(--ledger-miss)",
                  backgroundColor: "color-mix(in oklch, var(--prism-rose) 8%, transparent)",
                }}
                aria-label="miss"
              >
                ◆ MISS
              </span>
            </div>

            <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
              M★ assigned modal probability{" "}
              <span
                className="mono"
                aria-label={`${modalP} percent to ${modalLabel}`}
              >
                {modalP}%
              </span>{" "}
              to outcome <span className="mono">{modalLabel}</span>, but the realized
              outcome was <span className="mono">{r.outcome_realized}</span>{" "}
              (model probability on realized:{" "}
              <span
                className="mono"
                aria-label={`${realizedP} percent`}
              >
                {realizedP}%
              </span>
              ).
              {r.edge_E_at_close !== null && r.gate_status_at_close !== null ? (
                <>
                  {" "}
                  Edge at close:{" "}
                  <span className="mono">
                    {r.edge_E_at_close >= 0 ? "+" : "-"}
                    {(Math.abs(r.edge_E_at_close) * 100).toFixed(1)}pp
                  </span>
                  . Gate:{" "}
                  <span
                    className="mono"
                    style={{
                      color:
                        r.gate_status_at_close === "FIRED"
                          ? "var(--gate-fired)"
                          : "var(--text-tertiary)",
                    }}
                  >
                    {r.gate_status_at_close === "FIRED" ? "Gate tripped" : "Open"}
                  </span>
                  .
                </>
              ) : null}
            </p>

            <p className="mt-1.5 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              This miss is reported without editorial framing. A miss at high confidence
              is informative: it tests calibration discipline, not model failure. A
              well-calibrated 62% prediction misses 38% of the time by design. See the{" "}
              <Link
                href="/vault/glossary"
                className="underline underline-offset-2"
                style={{ color: "var(--text-tertiary)" }}
              >
                glossary
              </Link>{" "}
              for the HIT/MISS/NEUTRAL definition.
            </p>

            <div className="mt-2 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              <Link
                href={`/ledger/${r.forecast_id}`}
                className="mono transition-colors duration-[120ms]"
                style={{ color: "var(--accent-focus)" }}
              >
                Full audit record →
              </Link>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LedgerPage() {
  const records = loadLedger();
  const metrics = loadEvaluationMetrics();

  const totalHits = records.filter((r) => r.hit_miss_label === "HIT").length;
  const totalMisses = records.filter((r) => r.hit_miss_label === "MISS").length;
  const totalNeutral = records.filter((r) => r.hit_miss_label === "NEUTRAL").length;

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--bg-root)", color: "var(--text-primary)" }}
    >
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div
        className="px-4 md:px-6 pt-6 pb-4 border-b"
        style={{ borderColor: "var(--border-default)" }}
      >
        <div className="max-w-[1152px] mx-auto px-0 md:px-12 flex flex-wrap items-baseline justify-between gap-3">
          <div>
          <h1
            data-guide-id="ledger-masthead-title"
            className="text-[18px] font-medium tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Transparency Ledger
          </h1>
          <p
            className="text-[12px] mt-0.5"
            style={{ color: "var(--text-secondary)" }}
          >
            Append-only forecast record ·{" "}
            <span className="mono">{records.length}</span> records ·{" "}
            <span className="mono" style={{ color: "var(--ledger-hit)" }}>
              {totalHits} HIT
            </span>{" "}
            ·{" "}
            <span className="mono" style={{ color: "var(--ledger-miss)" }}>
              {totalMisses} MISS
            </span>{" "}
            ·{" "}
            <span className="mono" style={{ color: "var(--text-tertiary)" }}>
              {totalNeutral} NEUTRAL
            </span>
          </p>
          </div>
          <Suspense fallback={null}>
            <TourTriggerButton
              steps={LEDGER_STEPS}
              durationSeconds={LEDGER_DURATION_SEC}
            />
          </Suspense>
        </div>
      </div>

      {/* ── Design invariant notice ───────────────────────────────────────── */}
      <div
        className="px-4 py-2 border-b text-[11px]"
        style={{
          borderColor: "var(--border-subtle)",
          backgroundColor: "var(--bg-panel)",
          color: "var(--text-tertiary)",
        }}
      >
        <div className="max-w-[1152px] mx-auto px-0 md:px-12">
          Pre-registration invariant §7.2: hits and misses are rendered with identical
          visual weight. No forecast is ever deleted. Calibration, not accuracy, is the
          evaluation metric. Methodology pre-registered at{" "}
          <a
            href="https://osf.io/spmkg/overview?view_only=b2ba9087b4ac494f8255388d78af0321"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors duration-[120ms]"
            style={{ color: "var(--accent-focus)" }}
          >
            osf.io/spmkg
          </a>
          .
        </div>
      </div>

      <div className="max-w-[1152px] mx-auto px-4 md:px-12 py-6 space-y-8">
        {/* ── §7.3 Summary panel ────────────────────────────────────────── */}
        <LedgerSummaryPanel metrics={metrics} />

        {/* ── §7.4 Ledger table ─────────────────────────────────────────── */}
        <section aria-labelledby="ledger-table-heading">
          <h2
            id="ledger-table-heading"
            className="text-[13px] font-medium mb-3"
            style={{ color: "var(--text-primary)" }}
          >
            Forecast Record
          </h2>
          <LedgerTable records={records} />
        </section>

        {/* ── §7.6 Misses narrative ──────────────────────────────────────── */}
        <section aria-labelledby="misses-heading">
          <div className="mb-3">
            <h2
              id="misses-heading"
              className="text-[13px] font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              Highest-Confidence Misses · M★
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              Pre-registered §7.6: the three forecasts where M★ assigned the highest
              probability to a modal outcome that did not occur. This is the inverse of
              a highlight reel: the strongest statement of calibration discipline the
              ledger makes.
            </p>
          </div>
          <TopMissesNarrative records={records} />
        </section>
      </div>
      <Suspense fallback={null}>
        <CanvasTour steps={LEDGER_STEPS} />
      </Suspense>
    </div>
  );
}
