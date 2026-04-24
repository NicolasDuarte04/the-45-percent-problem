import Link from "next/link";
import { EdgeBadge } from "@/components/primitives/EdgeBadge";
import type { DivergenceRow, DivergenceSnapshot } from "@/lib/data/schemas";

interface FeaturedDivergencesProps {
  divergence: DivergenceSnapshot;
}

const MARKET_LABELS: Record<string, string> = {
  "1X2": "1X2",
  BTTS: "BTTS",
  OU_2_5: "O/U 2.5",
  "AH_-0.5": "AH −0.5",
  "AH_+0.5": "AH +0.5",
  ADV_KO: "Adv. KO",
};

function formatKickoff(utc: string): string {
  const d = new Date(utc);
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${month}-${day} ${hh}:${mm}Z`;
}

export function FeaturedDivergences({ divergence }: FeaturedDivergencesProps) {
  const top3 = [...divergence.rows]
    .sort((a, b) => Math.abs(b.edge_E) - Math.abs(a.edge_E))
    .slice(0, 3);

  if (top3.length === 0) {
    return (
      <div
        className="rounded-2xl border px-6 py-6"
        style={{
          backgroundColor: "var(--bg-panel-elev)",
          borderColor: "var(--rule)",
          color: "var(--text-tertiary)",
          fontSize: 13,
        }}
      >
        No divergence rows available in this snapshot.
      </div>
    );
  }

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
    >
      {top3.map((row) => (
        <DivergenceCard key={row.row_id} row={row} />
      ))}
    </div>
  );
}

function DivergenceCard({ row }: { row: DivergenceRow }) {
  const marketLabel = MARKET_LABELS[row.market] ?? row.market;
  const matchup = `${row.home.display_name} vs ${row.away.display_name}`;

  // Short, generic blurb built from the row — we do not invent unsourced
  // narratives. The structure is: which side the edge favors + gate state.
  const direction =
    row.edge_E >= 0
      ? `Model prices ${row.outcome.toLowerCase()} richer than market`
      : `Market prices ${row.outcome.toLowerCase()} richer than model`;

  const gateNote =
    row.gate_status === "FIRED"
      ? " · volatility gate flagged, edge is annotated not filtered"
      : "";

  return (
    <Link
      href={`/match/${row.match_id}`}
      className="no-underline block"
      style={{ color: "var(--text-primary)" }}
    >
      <article
        className="rounded-2xl border h-full"
        style={{
          background: "var(--bg-panel-elev)",
          borderColor: "var(--rule)",
          padding: "20px 22px",
          boxShadow:
            "0 1px 3px rgb(0 0 0 / 0.04), 0 6px 24px rgb(0 0 0 / 0.05)",
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
            marginBottom: 14,
          }}
        >
          <span style={{ color: "var(--accent-focus)" }}>§</span> Featured
          divergence · {formatKickoff(row.kickoff_utc)}
        </div>

        <h3
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            fontSize: 22,
            margin: "0 0 6px",
            letterSpacing: "-0.01em",
            color: "var(--text-primary)",
            lineHeight: 1.15,
          }}
        >
          {matchup}
          {row.market !== "1X2" ? ` (${marketLabel})` : ""}
        </h3>

        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--text-secondary)",
            margin: "0 0 16px",
            lineHeight: 1.6,
          }}
        >
          {direction}
          {gateNote}.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr auto",
            columnGap: 24,
            alignItems: "end",
            paddingTop: 14,
            borderTop: "1px solid var(--rule)",
          }}
        >
          <Stat label="p · model" value={`${(row.p_model * 100).toFixed(1)}%`} />
          <Stat
            label="q · market"
            value={`${(row.q_market_devigged * 100).toFixed(1)}%`}
            muted
          />
          <div style={{ textAlign: "right" }}>
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: "var(--text-tertiary)",
                letterSpacing: ".04em",
                marginBottom: 4,
              }}
            >
              edge
            </div>
            <EdgeBadge edge={row.edge_E} threshold={row.edge_threshold} />
          </div>
        </div>
      </article>
    </Link>
  );
}

function Stat({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div>
      <div
        className="mono"
        style={{
          fontSize: 10,
          color: "var(--text-tertiary)",
          letterSpacing: ".04em",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        className="mono"
        style={{
          fontSize: 22,
          lineHeight: 1,
          color: muted ? "var(--text-tertiary)" : "var(--text-primary)",
        }}
      >
        {value}
      </div>
    </div>
  );
}
