export function RoundProbabilityLegend() {
  return (
    <div
      data-guide-id="bracket-round-legend"
      className="rounded-lg"
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border-subtle)",
        padding: "14px 16px",
      }}
    >
      <div
        className="mono text-[10px] uppercase tracking-[.08em] mb-2"
        style={{ color: "var(--text-quiet)" }}
      >
        column legend
      </div>
      <div
        className="mono text-[11px] leading-5"
        style={{ color: "var(--text-tertiary)" }}
      >
        <span style={{ color: "var(--text-secondary)" }}>R16</span>: marginal
        P(reach round of 16 from group). ·{" "}
        <span style={{ color: "var(--text-secondary)" }}>QF</span>: marginal
        P(reach quarter-final). ·{" "}
        <span style={{ color: "var(--text-secondary)" }}>SF</span>: marginal
        P(reach semi-final). ·{" "}
        <span style={{ color: "var(--text-secondary)" }}>FIN</span>: marginal
        P(reach final). ·{" "}
        <span style={{ color: "var(--text-secondary)" }}>CHA</span>: marginal
        P(champion).
      </div>
      <div
        className="mono text-[11px] leading-5 mt-2"
        style={{ color: "var(--text-tertiary)" }}
      >
        All values are marginal over the Monte Carlo ensemble; not conditional
        on the team surviving the previous round. A 50% R16 and 25% QF means
        one in four MC runs has the team in the QF, not that half of those
        reaching R16 then advance.
      </div>
    </div>
  );
}
