import Link from "next/link";
import type {
  DivergenceRow,
  DivergenceSnapshot,
  TournamentSnapshot,
  TournamentTeam,
} from "@/lib/data/schemas";
import { Flag } from "@/components/primitives/Flag";

/**
 * Terminal Dashboard — two compact, terminal-style read-outs from the
 * nightly M★ snapshot. Replaces the old Prism-hue colour legend.
 *
 *   Card A · Top divergences  — divergence rows ranked by |E|
 *   Card B · Biggest movers   — 7-day Δ rank, split into risers / fallers
 *
 * Movers fall back to a small preview list while we are pre-tournament and
 * every rank_change_7d is still zero. Once the field becomes live in the
 * tournament window the real-data path kicks in automatically.
 */

interface TerminalDashboardProps {
  divergence: DivergenceSnapshot;
  tournament: TournamentSnapshot;
}

const TOP_N_DIVERGENCES = 3;
const TOP_N_MOVERS_PER_SIDE = 2;

export function TerminalDashboard({
  divergence,
  tournament,
}: TerminalDashboardProps) {
  const topDivergences = pickTopDivergences(divergence.rows, TOP_N_DIVERGENCES);
  const movers = pickMovers(tournament.teams, TOP_N_MOVERS_PER_SIDE);

  return (
    <div
      className="grid gap-6"
      style={{
        // Stack on narrow viewports; two columns once each card has ≥440px.
        // The min(440px, 100%) collapses the floor to the container width
        // on viewports below 440px so a 375px iPhone doesn't get a hard
        // 440px column that overflows the page. Per the canonical
        // intrinsic-sizing pattern for resilient grids.
        gridTemplateColumns: "repeat(auto-fit, minmax(min(440px, 100%), 1fr))",
      }}
    >
      <DivergenceCard rows={topDivergences} totalMarkets={divergence.rows.length} />
      <MoversCard
        risers={movers.risers}
        fallers={movers.fallers}
        baseline={movers.baseline}
        sampleSize={tournament.teams.length}
        isPreview={movers.isPreview}
      />
    </div>
  );
}

// ── Card primitives ──────────────────────────────────────────────────────

function Card({ children, ariaLabelledBy }: { children: React.ReactNode; ariaLabelledBy: string }) {
  return (
    <section
      aria-labelledby={ariaLabelledBy}
      className="rounded-2xl"
      style={{
        background: "var(--bg-panel-elev)",
        border: "1px solid var(--rule)",
        padding: 32,
        boxShadow:
          "0 1px 3px rgb(0 0 0 / 0.04), 0 10px 32px rgb(0 0 0 / 0.06)",
      }}
    >
      {children}
    </section>
  );
}

function Eyebrow({ left, right }: { left: string; right: string }) {
  return (
    <div
      className="mono flex items-center justify-between"
      style={{
        fontSize: 10,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--text-tertiary)",
        marginBottom: 6,
      }}
    >
      <span>{left}</span>
      <span>{right}</span>
    </div>
  );
}

function CardTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      style={{
        fontFamily: "var(--font-serif)",
        fontWeight: 400,
        fontSize: 22,
        letterSpacing: "-0.01em",
        lineHeight: 1.2,
        margin: "0 0 4px",
        color: "var(--text-primary)",
      }}
    >
      {children}
    </h2>
  );
}

function Dek({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 13,
        lineHeight: 1.5,
        color: "var(--text-tertiary)",
        margin: "0 0 18px",
      }}
    >
      {children}
    </p>
  );
}

function Shelf() {
  // Full-bleed 1px divider. `marginInline: -32` matches the card's 32px padding.
  return (
    <div
      style={{
        height: 1,
        background: "var(--rule)",
        marginInline: -32,
      }}
    />
  );
}

function CardFoot({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mono flex items-center justify-between"
      style={{
        paddingTop: 16,
        marginTop: 18,
        borderTop: "1px solid var(--rule)",
        fontSize: 10.5,
        color: "var(--text-tertiary)",
        letterSpacing: ".02em",
      }}
    >
      {children}
    </div>
  );
}

function FootStrong({ children }: { children: React.ReactNode }) {
  return (
    <b style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{children}</b>
  );
}

// ── Shared bits ──────────────────────────────────────────────────────────

function TeamCell({ code, name }: { code: string; name: string }) {
  return (
    <div
      className="flex items-center"
      style={{ gap: 10, lineHeight: 1, minWidth: 0 }}
    >
      <Flag code={code} size={22} />
      <span
        className="truncate"
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          color: "var(--text-secondary)",
          lineHeight: 1,
          minWidth: 0,
        }}
      >
        {name}
      </span>
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className="mono"
      scope="col"
      style={{
        textAlign: align,
        padding: align === "right" ? "14px 0 8px 14px" : "14px 0 8px 0",
        fontSize: 10,
        fontWeight: 500,
        color: "var(--text-tertiary)",
        letterSpacing: ".06em",
        textTransform: "uppercase",
        borderBottom: "1px solid var(--rule)",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <td
      style={{
        textAlign: align,
        padding: align === "right" ? "10px 0 10px 14px" : "10px 0",
        borderTop: "1px solid var(--rule)",
        color: "var(--text-secondary)",
        verticalAlign: "middle",
      }}
    >
      {children}
    </td>
  );
}

function NumCell({ value, dim = false }: { value: string; dim?: boolean }) {
  return (
    <span
      className="mono tabular-nums"
      style={{
        fontSize: 13.5,
        lineHeight: 1,
        color: dim ? "var(--text-tertiary)" : "var(--text-primary)",
      }}
    >
      {value}
    </span>
  );
}

function DivergencePP({ value }: { value: number }) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  const abs = Math.abs(value);
  return (
    <span
      className="mono tabular-nums"
      style={{
        fontSize: 13.5,
        lineHeight: 1,
        // Low-luminance high-chroma ink — mirrors the HTML prototype's
        // div-pos / div-neg pair. Stays legible on both editorial cream
        // and quant slate (oklch lightness 33% reads on either canvas).
        color: value >= 0 ? "oklch(33% .12 140)" : "oklch(33% .15 28)",
      }}
    >
      {sign}
      {abs.toFixed(1)}pp
    </span>
  );
}

function ShiftBadge({ value }: { value: number }) {
  const positive = value >= 0;
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return (
    <span
      className="mono inline-flex items-center"
      style={{
        height: 20,
        padding: "0 9px",
        borderRadius: 4,
        fontSize: 11.5,
        fontWeight: 500,
        lineHeight: 1,
        color: positive ? "oklch(33% .12 140)" : "oklch(33% .15 28)",
        background: positive ? "oklch(92% .06 140)" : "oklch(92% .05 28)",
        border: `1px solid ${positive ? "oklch(33% .12 140 / .28)" : "oklch(33% .15 28 / .28)"}`,
      }}
    >
      {sign}
      {Math.abs(value)}
    </span>
  );
}

// ── Card A · Top divergences ─────────────────────────────────────────────

function DivergenceCard({
  rows,
  totalMarkets,
}: {
  rows: ReturnType<typeof pickTopDivergences>;
  totalMarkets: number;
}) {
  return (
    <Card ariaLabelledBy="td-divergence-title">
      <Eyebrow left="widget · divergence" right={`n = ${totalMarkets} markets`} />
      <CardTitle id="td-divergence-title">Top divergences</CardTitle>
      <Dek>
        Markets where <span className="mono">M★</span> disagrees most with
        de-vigged book consensus.
      </Dek>

      <Shelf />

      <table
        style={{
          borderCollapse: "collapse",
          width: "100%",
          tableLayout: "fixed",
        }}
      >
        <colgroup>
          <col />
          <col style={{ width: 72 }} />
          <col style={{ width: 68 }} />
          <col style={{ width: 78 }} />
        </colgroup>
        <thead>
          <tr>
            <Th>Team</Th>
            <Th align="right">M★ model</Th>
            <Th align="right">Market</Th>
            <Th align="right">Divergence</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.row.row_id}>
              <Td>
                <TeamCell code={r.code} name={r.name} />
              </Td>
              <Td align="right">
                <NumCell value={`${(r.row.p_model * 100).toFixed(1)}%`} />
              </Td>
              <Td align="right">
                <NumCell
                  value={`${(r.row.q_market_devigged * 100).toFixed(1)}%`}
                  dim
                />
              </Td>
              <Td align="right">
                <DivergencePP value={r.row.edge_E * 100} />
              </Td>
            </tr>
          ))}
        </tbody>
      </table>

      <CardFoot>
        <span>
          sorted <FootStrong>|E| desc</FootStrong>
        </span>
        <Link
          href="/terminal"
          style={{
            color: "oklch(33% .11 225)",
            textDecoration: "none",
          }}
        >
          Full divergence terminal →
        </Link>
      </CardFoot>
    </Card>
  );
}

// ── Card B · Biggest movers ─────────────────────────────────────────────

function MoversCard({
  risers,
  fallers,
  baseline,
  sampleSize,
  isPreview,
}: {
  risers: { team: TournamentTeam; delta: number }[];
  fallers: { team: TournamentTeam; delta: number }[];
  baseline: string;
  sampleSize: number;
  isPreview: boolean;
}) {
  return (
    <Card ariaLabelledBy="td-movers-title">
      <Eyebrow
        left="widget · momentum"
        right={isPreview ? "Δt = 7d · preview" : "Δt = 7d"}
      />
      <CardTitle id="td-movers-title">Biggest movers</CardTitle>
      <Dek>
        Largest 7-day shifts in <span className="mono">Δ rank</span>. Reported
        descriptively — pre-registered §7.2.
      </Dek>

      <Shelf />

      <MoversSection
        title="Trending up"
        rule="Δ ≥ +1"
        direction="up"
        rows={risers}
        first
      />
      <MoversSection
        title="Trending down"
        rule="Δ ≤ −1"
        direction="down"
        rows={fallers}
      />

      <CardFoot>
        <span>
          baseline <FootStrong>{baseline}</FootStrong>
        </span>
        <span>
          n = <FootStrong>{sampleSize}</FootStrong>
        </span>
      </CardFoot>
    </Card>
  );
}

function MoversSection({
  title,
  rule,
  direction,
  rows,
  first = false,
}: {
  title: string;
  rule: string;
  direction: "up" | "down";
  rows: { team: TournamentTeam; delta: number }[];
  first?: boolean;
}) {
  return (
    <>
      <div
        className="mono flex items-center"
        style={{
          gap: 10,
          padding: first ? "6px 0 6px" : "18px 0 6px",
          fontSize: 10,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 6,
            height: 6,
            borderRadius: 1,
            flex: "0 0 auto",
            background:
              direction === "up" ? "oklch(33% .12 140)" : "oklch(33% .15 28)",
          }}
        />
        <span>{title}</span>
        <span style={{ flex: 1, height: 1, background: "var(--rule)" }} />
        <span>{rule}</span>
      </div>
      <table
        style={{
          borderCollapse: "collapse",
          width: "100%",
          tableLayout: "fixed",
        }}
      >
        <colgroup>
          <col />
          <col style={{ width: 84 }} />
          <col style={{ width: 96 }} />
        </colgroup>
        <thead>
          <tr>
            <Th>Team</Th>
            <Th align="right">P(champion)</Th>
            <Th align="right">Δ rank · 7d</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <Td>
                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                  No teams in this band.
                </span>
              </Td>
              <Td align="right">
                <NumCell value="—" dim />
              </Td>
              <Td align="right">
                <NumCell value="—" dim />
              </Td>
            </tr>
          ) : (
            rows.map(({ team, delta }) => (
              <tr key={team.fifa_code}>
                <Td>
                  <TeamCell code={team.fifa_code} name={team.display_name} />
                </Td>
                <Td align="right">
                  <NumCell value={`${(team.p_champion * 100).toFixed(1)}%`} />
                </Td>
                <Td align="right">
                  <ShiftBadge value={delta} />
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </>
  );
}

// ── Selection helpers ────────────────────────────────────────────────────

function pickTopDivergences(rows: DivergenceRow[], n: number) {
  // Pick rows where the outcome cleanly maps to one team — this card shows a
  // single flag per row, so a Draw outcome would have no natural team to
  // display. Sorted by |edge_E| desc so the most disagreement floats to top.
  return rows
    .filter((r) => r.outcome === "HOME" || r.outcome === "AWAY")
    .map((row) => {
      const teamRef = row.outcome === "HOME" ? row.home : row.away;
      return {
        row,
        code: teamRef.fifa_code,
        name: teamRef.display_name,
      };
    })
    .sort((a, b) => Math.abs(b.row.edge_E) - Math.abs(a.row.edge_E))
    .slice(0, n);
}

// Pre-tournament fallback so the dashboard reads as designed during the
// preview window. Auto-disabled the moment real rank movement arrives.
const PREVIEW_RISERS: { code: string; delta: number }[] = [
  { code: "BRA", delta: 3 },
  { code: "NED", delta: 2 },
];
const PREVIEW_FALLERS: { code: string; delta: number }[] = [
  { code: "GER", delta: -2 },
  { code: "ESP", delta: -2 },
];

function pickMovers(teams: TournamentTeam[], n: number) {
  const allZero = teams.every((t) => (t.rank_change_7d ?? 0) === 0);

  if (allZero) {
    const lookup = new Map(teams.map((t) => [t.fifa_code, t]));
    const risers = PREVIEW_RISERS.flatMap(({ code, delta }) => {
      const team = lookup.get(code);
      return team ? [{ team, delta }] : [];
    }).slice(0, n);
    const fallers = PREVIEW_FALLERS.flatMap(({ code, delta }) => {
      const team = lookup.get(code);
      return team ? [{ team, delta }] : [];
    }).slice(0, n);
    return { risers, fallers, baseline: "—", isPreview: true };
  }

  const sorted = [...teams].sort(
    (a, b) => (b.rank_change_7d ?? 0) - (a.rank_change_7d ?? 0)
  );
  const risers = sorted
    .filter((t) => (t.rank_change_7d ?? 0) > 0)
    .slice(0, n)
    .map((team) => ({ team, delta: team.rank_change_7d ?? 0 }));
  const fallers = sorted
    .filter((t) => (t.rank_change_7d ?? 0) < 0)
    .slice(-n)
    .reverse()
    .map((team) => ({ team, delta: team.rank_change_7d ?? 0 }));

  return { risers, fallers, baseline: "7d ago", isPreview: false };
}
