import { Figure } from "@/components/editorial/Figure";
import { loadLedger, loadSnapshotMeta } from "@/lib/data/loadSnapshot";
import { CLVBridgeChart, type CLVPoint } from "./Chart";

interface Props {
  snapshotId?: string;
  mode?: "interactive" | "static";
}

/**
 * §8.4: CLVBridge.
 * Scatter plot of p_model vs q_market (de-vigged) for every settled M★
 * forecast. Color encodes edge sign: mint = positive, rose = negative, peach
 * = near-zero. The 45° reference line marks p_model = q_market. Closing
 * line value (CLV) available on hover.
 */
export function CLVBridge({ snapshotId = "latest", mode = "interactive" }: Props) {
  const sid = snapshotId === "latest" ? undefined : snapshotId;
  const ledger = loadLedger(sid);
  const meta = loadSnapshotMeta(sid);

  // CLV is a market-divergence figure: it needs de-vigged market lines. Until
  // odds ingestion is live, reconstructed forecasts carry null market fields,
  // so this filter yields zero points and the chart renders an honest n=0
  // rather than fabricating a model-vs-market scatter.
  const mstarRecords = ledger.filter(
    (r) =>
      r.model_id === "M_STAR" &&
      r.q_market_devigged_on_realized !== null &&
      r.edge_E_at_close !== null &&
      r.hit_miss_label !== null,
  );

  const points: CLVPoint[] = mstarRecords.map((r) => ({
    forecastId: r.forecast_id,
    matchId: r.match_id,
    pModel: r.p_model_on_realized,
    qMarket: r.q_market_devigged_on_realized as number,
    edgeE: r.edge_E_at_close as number,
    clvBps: r.clv_bps,
    hitMiss: r.hit_miss_label as "HIT" | "MISS" | "NEUTRAL",
  }));

  const noscriptRows = points
    .map(
      (p) =>
        `  ${p.matchId}: p_model ${(p.pModel * 100).toFixed(2)}%  q_market ${(p.qMarket * 100).toFixed(2)}%  E ${p.edgeE >= 0 ? "+" : ""}${(p.edgeE * 100).toFixed(2)}pp  CLV ${p.clvBps != null ? `${p.clvBps > 0 ? "+" : ""}${p.clvBps}bps` : "-"}  ${p.hitMiss}`
    )
    .join("\n");

  return (
    <Figure
      caption={`p_model vs q_market (de-vigged) for all settled M★ forecasts (n=${points.length}). Each point is one forecast; color encodes edge direction. The dashed diagonal is perfect model-market agreement. Snapshot ${meta.snapshot_id}.`}
      cite={{ href: "/vault/evaluation", label: "§ Evaluation" }}
      ariaLabel="Scatter plot of M★ p_model vs market implied probability for all settled forecasts"
      bleed
    >
      <CLVBridgeChart points={points} mode={mode} />
      <noscript>
        <pre
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            lineHeight: "18px",
            color: "var(--text-tertiary)",
            padding: "16px",
            border: "1px solid var(--border-subtle)",
            borderRadius: 4,
            background: "var(--bg-panel)",
            whiteSpace: "pre-wrap",
          }}
        >
          {points.length
            ? `CLV Bridge; snapshot ${meta.snapshot_id}\n${noscriptRows}`
            : "No settled M★ forecasts yet."}
        </pre>
      </noscript>
    </Figure>
  );
}
