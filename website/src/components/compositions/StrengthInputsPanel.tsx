import type { MatchDetail } from "@/lib/data/schemas";
import { MonoNumber } from "@/components/primitives/MonoNumber";

interface StrengthInputsPanelProps {
  match: MatchDetail;
}

export function StrengthInputsPanel({ match }: StrengthInputsPanelProps) {
  const s = match.strength_inputs;
  const l = match.lambda;

  const cells: Array<{ label: string; value: string; sub: string }> = [
    {
      label: `λ · ${match.home.fifa_code}`,
      value: l.home.toFixed(2),
      sub: "expected goals · home",
    },
    {
      label: `λ · ${match.away.fifa_code}`,
      value: l.away.toFixed(2),
      sub: "expected goals · away",
    },
    {
      label: "ρ · Dixon-Coles",
      value: (l.rho >= 0 ? "+" : "−") + Math.abs(l.rho).toFixed(2),
      sub: "low-score correction",
    },
    {
      label: `elo · ${match.home.fifa_code}`,
      value: s.elo_home.toFixed(0),
      sub: "current rating",
    },
    {
      label: `elo · ${match.away.fifa_code}`,
      value: s.elo_away.toFixed(0),
      sub: "current rating",
    },
    {
      label: "elo gap",
      value:
        (s.elo_home - s.elo_away >= 0 ? "+" : "−") +
        Math.abs(s.elo_home - s.elo_away).toFixed(0),
      sub: `${match.home.fifa_code} − ${match.away.fifa_code}`,
    },
    {
      label: `form · ${match.home.fifa_code}`,
      value: s.form_home.toFixed(2),
      sub: "weighted recent",
    },
    {
      label: `form · ${match.away.fifa_code}`,
      value: s.form_away.toFixed(2),
      sub: "weighted recent",
    },
    {
      label: "FIFA rank",
      value: `${s.fifa_rank_home} · ${s.fifa_rank_away}`,
      sub: `${match.home.fifa_code} · ${match.away.fifa_code}`,
    },
  ];

  return (
    <div
      className="rounded-lg"
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border-subtle)",
        padding: "16px 18px",
      }}
    >
      <div className="flex justify-between items-baseline mb-3">
        <h3
          className="text-[13px] font-medium"
          style={{
            fontFamily: "var(--font-sans)",
            color: "var(--text-primary)",
          }}
        >
          Strength inputs
        </h3>
        <span
          className="mono text-[10px] tracking-[.06em]"
          style={{ color: "var(--text-quiet)" }}
        >
          M★ · bivariate Poisson
        </span>
      </div>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
      >
        {cells.map((c) => (
          <div
            key={c.label}
            className="rounded-md"
            style={{
              background: "var(--bg-panel-elev)",
              border: "1px solid var(--border-subtle)",
              padding: "8px 10px",
            }}
          >
            <div
              className="mono text-[10px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              {c.label}
            </div>
            <div
              className="mono text-[15px] mt-[2px]"
              style={{ color: "var(--text-primary)" }}
            >
              {c.value}
            </div>
            <div
              className="mono text-[10px] mt-[1px]"
              style={{ color: "var(--text-quiet)" }}
            >
              {c.sub}
            </div>
          </div>
        ))}
      </div>

      {match.shootout_applicable && match.p_shootout_home_if_ko !== null && (
        <div
          className="mono text-[11px] mt-3 pt-3"
          style={{
            color: "var(--text-tertiary)",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          Shootout applicable · P({match.home.fifa_code} wins shootout | knock-out) ={" "}
          <MonoNumber value={match.p_shootout_home_if_ko * 100} decimals={1} />%
        </div>
      )}
    </div>
  );
}
