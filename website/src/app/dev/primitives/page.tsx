import { notFound } from "next/navigation";
import { NumericCell } from "@/components/primitives/NumericCell";
import { EdgeBadge } from "@/components/primitives/EdgeBadge";
import { DivergenceBar } from "@/components/primitives/DivergenceBar";
import { SnapshotTimestamp } from "@/components/primitives/SnapshotTimestamp";
import { GateStatusPill } from "@/components/primitives/GateStatusPill";
import { HashChip } from "@/components/primitives/HashChip";
import { KillCriteriaBanner } from "@/components/primitives/KillCriteriaBanner";
import {
  formatCI,
  formatDecimalOdds,
  formatMono,
  formatProbability,
} from "@/lib/formatters";

export default function PrimitivesShowcase() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div
      className="min-h-screen p-8 space-y-12"
      style={{ backgroundColor: "var(--bg-root)" }}
    >
      <header className="border-b pb-4" style={{ borderColor: "var(--border-subtle)" }}>
        <h1 className="text-[22px] font-medium" style={{ color: "var(--text-primary)" }}>
          /dev/primitives
        </h1>
        <p className="text-[11px] mt-1" style={{ color: "var(--text-tertiary)" }}>
          §12.3 — Institutional Tech primitive showcase. Dev-only. Not rendered in production.
        </p>
      </header>

      <Section title="NumericCell · mono">
        <Row label="zero">
          <NumericCell value={0} formatter={(v) => formatMono(v, 2)} />
        </Row>
        <Row label="small (0.042)">
          <NumericCell value={0.042} formatter={(v) => formatMono(v, 3)} />
        </Row>
        <Row label="large (1234567.89)">
          <NumericCell value={1234567.89} formatter={(v) => formatMono(v, 2)} />
        </Row>
        <Row label="negative">
          <NumericCell value={-42.5} formatter={(v) => formatMono(v, 1)} />
        </Row>
      </Section>

      <Section title="NumericCell · probability">
        <Row label="near-zero (0.8%)">
          <NumericCell value={0.008} formatter={(p) => formatProbability(p, 1)} />
        </Row>
        <Row label="mid (41.2%)">
          <NumericCell value={0.412} formatter={(p) => formatProbability(p, 1)} ariaLabel="41.2 percent" />
        </Row>
        <Row label="near-certain (97.3%)">
          <NumericCell value={0.973} formatter={(p) => formatProbability(p, 1)} />
        </Row>
        <Row label="exactly 0%">
          <NumericCell value={0} formatter={(p) => formatProbability(p, 1)} />
        </Row>
        <Row label="exactly 100%">
          <NumericCell value={1} formatter={(p) => formatProbability(p, 1)} />
        </Row>
      </Section>

      <Section title="NumericCell · decimal odds">
        <Row label="short-price (1.150)">
          <NumericCell value={1.15} formatter={(d) => formatDecimalOdds(d, 3)} />
        </Row>
        <Row label="evens (2.000)">
          <NumericCell value={2.0} formatter={(d) => formatDecimalOdds(d, 3)} />
        </Row>
        <Row label="long-price (12.500)">
          <NumericCell value={12.5} formatter={(d) => formatDecimalOdds(d, 3)} />
        </Row>
        <Row label="extreme (250.000)">
          <NumericCell value={250.0} formatter={(d) => formatDecimalOdds(d, 3)} />
        </Row>
      </Section>

      <Section title="EdgeBadge">
        <Row label="positive, below threshold (+1.2pp)">
          <EdgeBadge edge={0.012} threshold={0.03} />
        </Row>
        <Row label="positive, above threshold (+4.7pp)">
          <EdgeBadge edge={0.047} threshold={0.03} />
        </Row>
        <Row label="negative, below threshold (−0.8pp)">
          <EdgeBadge edge={-0.008} threshold={0.03} />
        </Row>
        <Row label="negative, above threshold (−5.1pp)">
          <EdgeBadge edge={-0.051} threshold={0.03} />
        </Row>
        <Row label="zero">
          <EdgeBadge edge={0} threshold={0.03} />
        </Row>
      </Section>

      <Section title="DivergenceBar">
        <Row label="model > market (positive edge)">
          <DivergenceBar p_model={0.62} q_market={0.51} />
        </Row>
        <Row label="model < market (negative edge)">
          <DivergenceBar p_model={0.28} q_market={0.44} />
        </Row>
        <Row label="near-parity">
          <DivergenceBar p_model={0.33} q_market={0.34} />
        </Row>
        <Row label="large positive edge">
          <DivergenceBar p_model={0.85} q_market={0.55} />
        </Row>
        <Row label="near-zero both">
          <DivergenceBar p_model={0.04} q_market={0.02} />
        </Row>
      </Section>

      <Section title="SnapshotTimestamp">
        <Row label="fresh (2h stale)">
          <SnapshotTimestamp id="2026-04-23T00:00Z" stalenessHours={2} />
        </Row>
        <Row label="stale (22h stale)">
          <SnapshotTimestamp id="2026-04-22T06:00Z" stalenessHours={22} />
        </Row>
        <Row label="broken (30h stale)">
          <SnapshotTimestamp id="2026-04-21T18:00Z" stalenessHours={30} />
        </Row>
        <Row label="no staleness data">
          <SnapshotTimestamp id="2026-04-23T00:00Z" />
        </Row>
      </Section>

      <Section title="GateStatusPill">
        <Row label="gate OPEN">
          <GateStatusPill status="OPEN" />
        </Row>
        <Row label="gate FIRED (no rules)">
          <GateStatusPill status="FIRED" />
        </Row>
        <Row label="gate FIRED (with rules — hover for tooltip)">
          <GateStatusPill
            status="FIRED"
            rulesTripped={["named_event", "price_discovery", "liquidity_threshold"]}
          />
        </Row>
      </Section>

      <Section title="HashChip">
        <Row label="code_sha">
          <HashChip sha="a1b2c3d4e5f6789abcdef1234567890abcdef12" kind="code_sha" />
        </Row>
        <Row label="data_sha">
          <HashChip sha="sha256:7f2e4b9c1d3e5f7a2b4c6d8e0f2a4b6c8d0e2f4" kind="data_sha" />
        </Row>
      </Section>

      <Section title="NumericCell · confidence interval">
        <Row label="tight CI">
          <NumericCell<[number, number]>
            value={[0.038, 0.047]}
            formatter={([l, h]) => formatCI(l, h)}
            ariaLabel="3.8 to 4.7 percent"
          />
        </Row>
        <Row label="wide CI">
          <NumericCell<[number, number]>
            value={[0.041, 0.213]}
            formatter={([l, h]) => formatCI(l, h)}
          />
        </Row>
        <Row label="near-zero lower">
          <NumericCell<[number, number]>
            value={[0.001, 0.024]}
            formatter={([l, h]) => formatCI(l, h)}
          />
        </Row>
        <Row label="high probability">
          <NumericCell<[number, number]>
            value={[0.712, 0.891]}
            formatter={([l, h]) => formatCI(l, h)}
          />
        </Row>
      </Section>

      <Section title="KillCriteriaBanner">
        <Row label="not active (renders nothing)">
          <span className="mono text-[11px]" style={{ color: "var(--text-tertiary)" }}>
            [no output — active=false]
          </span>
          <KillCriteriaBanner active={false} />
        </Row>
        <Row label="active (no condition text)">
          <KillCriteriaBanner active={true} />
        </Row>
        <Row label="active (with condition)">
          <KillCriteriaBanner
            active={true}
            condition="M_STAR.log_loss > M0.log_loss by R16"
          />
        </Row>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2
        className="text-[14px] font-medium mb-4 pb-1 border-b"
        style={{ color: "var(--text-primary)", borderColor: "var(--border-subtle)" }}
      >
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-6">
      <span
        className="mono text-[11px] w-64 shrink-0"
        style={{ color: "var(--text-tertiary)" }}
      >
        {label}
      </span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
