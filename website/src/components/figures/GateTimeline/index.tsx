import { Figure } from "@/components/editorial/Figure";
import { loadDivergence } from "@/lib/data/loadSnapshot";
import { GateTimelineChart, type GateTimelineData, type GateTimelinePoint } from "./Chart";

interface Props {
  snapshotId?: string;
  mode?: "interactive" | "static";
  /** Specific row_id to feature. Defaults to the row with the most historical points. */
  rowId?: string;
}

/**
 * §8.4 — GateTimeline.
 * Historical price path (p_model vs q_market_devigged) for a featured market,
 * annotated at any gate trips. Shows how the volatility gate accumulates evidence
 * across consecutive snapshots.
 */
export function GateTimeline({ snapshotId = "latest", mode = "interactive", rowId }: Props) {
  const sid = snapshotId === "latest" ? undefined : snapshotId;
  const divergence = loadDivergence(sid);

  if (!divergence.rows.length) {
    return (
      <Figure caption="Gate timeline — no divergence rows in this snapshot.">
        <div
          style={{
            height: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px dashed var(--border-subtle)",
            borderRadius: 4,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--text-quiet)",
          }}
        >
          No divergence data available.
        </div>
      </Figure>
    );
  }

  // Select featured row: specified id or the one with the most history points
  const featured = rowId
    ? (divergence.rows.find((r) => r.row_id === rowId) ?? divergence.rows[0])
    : divergence.rows.reduce((best, r) =>
        r.history.length > best.history.length ? r : best
      );

  const points: GateTimelinePoint[] = featured.history.map((h) => ({
    snapshotId: h.snapshot_id,
    edgeE: h.edge_E,
    pModel: h.p_model,
    qMarket: h.q_market_devigged,
    gateTripped: featured.gate_status === "FIRED" && featured.gate_rules_tripped.length > 0,
  }));

  // Append current snapshot as final point
  points.push({
    snapshotId: divergence.snapshot_id,
    edgeE: featured.edge_E,
    pModel: featured.p_model,
    qMarket: featured.q_market_devigged,
    gateTripped: featured.gate_status === "FIRED",
  });

  const data: GateTimelineData = {
    matchId: featured.match_id,
    homeTeam: featured.home.display_name,
    awayTeam: featured.away.display_name,
    market: featured.market,
    outcome: featured.outcome,
    threshold: featured.edge_threshold,
    points,
    finalGateStatus: featured.gate_status,
    rulesTripped: featured.gate_rules_tripped,
  };

  const gateNote =
    featured.gate_status === "FIRED"
      ? ` Gate tripped: ${featured.gate_rules_tripped.join(", ")}.`
      : " Gate open.";

  const caption = `Price path for ${featured.home.display_name} vs ${featured.away.display_name} — ${featured.market} ${featured.outcome}. Solid line: M★ p_model. Dashed: de-vigged market probability. ◆ marks gate trips.${gateNote}`;

  return (
    <Figure
      caption={caption}
      cite={{ href: "/vault/volatility-gate", label: "§ Volatility gate" }}
      ariaLabel={`Gate timeline for ${featured.home.display_name} vs ${featured.away.display_name} ${featured.market}`}
    >
      <GateTimelineChart data={data} mode={mode} />
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
          {`Gate timeline — ${featured.market} ${featured.outcome}\n` +
            points
              .map(
                (p) =>
                  `  ${p.snapshotId}: p_model ${(p.pModel * 100).toFixed(2)}%  q_market ${(p.qMarket * 100).toFixed(2)}%  E ${(p.edgeE * 100).toFixed(2)}pp`
              )
              .join("\n")}
        </pre>
      </noscript>
    </Figure>
  );
}
