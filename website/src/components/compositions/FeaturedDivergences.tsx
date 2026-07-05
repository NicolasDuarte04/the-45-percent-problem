import Link from "next/link";
import { EdgeBadge } from "@/components/primitives/EdgeBadge";
import { Flag } from "@/components/primitives/Flag";
import type { DivergenceRow, DivergenceSnapshot } from "@/lib/data/schemas";
import { formatUtcShort } from "@/lib/formatters";
import { MARKET_LABELS } from "@/lib/markets";
import {
  DIVERGENCE_KNOCKOUT_PENDING_NOTE,
  divergenceMatchHref,
  upcomingDivergenceRows,
} from "@/lib/data/divergenceFilter";

interface FeaturedDivergencesProps {
  divergence: DivergenceSnapshot;
}

export function FeaturedDivergences({ divergence }: FeaturedDivergencesProps) {
  // cp-29: drop rows whose fixture already kicked off; a settled match is not a
  // live edge. If the filter empties a feed that did carry rows, the group
  // stage is over and knockout coverage is pending the odds remap.
  const upcoming = upcomingDivergenceRows(divergence);
  const top3 = [...upcoming]
    .sort((a, b) => Math.abs(b.edge_E) - Math.abs(a.edge_E))
    .slice(0, 3);

  if (top3.length === 0) {
    const hadRows = divergence.rows.length > 0;
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
        {hadRows
          ? DIVERGENCE_KNOCKOUT_PENDING_NOTE
          : "No divergence rows available in this snapshot."}
      </div>
    );
  }

  return (
    // Stack to a single column at narrow viewports; restore the 3-column
    // grid at md+ (≥768px). At 375px each of the original three columns
    // resolved to ~111px, which couldn't fit the inner "p · model /
    // q · market / edge-badge" Stat grid (1fr 1fr auto + 24px gaps +
    // a ~61px badge). The overflow leaked the badge to the right edge
    // of the viewport, producing 144px of page-level horizontal scroll
    // on the homepage. Per Mobile Optimization Plan §2.3 (cross-cutting
    // touch-target / overflow audit) and §4 Phase 1 task 4 spirit.
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {top3.map((row) => (
        <DivergenceCard key={row.row_id} row={row} />
      ))}
    </div>
  );
}

function DivergenceCard({ row }: { row: DivergenceRow }) {
  const marketLabel = MARKET_LABELS[row.market] ?? row.market;

  // Short, generic blurb built from the row; we do not invent unsourced
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
      href={divergenceMatchHref(row)}
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
          divergence · {formatUtcShort(row.kickoff_utc)}
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
          <Flag code={row.home.fifa_code} size={18} />{" "}
          {row.home.display_name}{" "}
          <span style={{ color: "var(--text-tertiary)" }}>vs</span>{" "}
          <Flag code={row.away.fifa_code} size={18} />{" "}
          {row.away.display_name}
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
            {/* threshold=0 so the badge is always colored in editorial cards.
                The pre-reg ε gate still applies on the /terminal row, where
                the muted-grey state is meaningful. Here the edge IS the
                headline, so it always earns saturation. */}
            <EdgeBadge edge={row.edge_E} threshold={0} />
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
