import type { MatchDetail } from "@/lib/data/schemas";
import { ProbabilityCell } from "@/components/primitives/ProbabilityCell";

interface MatchHeaderProps {
  match: MatchDetail;
}

export function MatchHeader({ match }: MatchHeaderProps) {
  const { home, away, p_model_1x2: p, kickoff_utc, round } = match;
  const kickoff = new Date(kickoff_utc);
  const kickoffLabel = kickoff.toISOString().replace("T", " ").slice(0, 16) + "Z";

  return (
    <section
      className="rounded-lg"
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border-subtle)",
        padding: "24px 28px 20px",
      }}
    >
      <div className="flex justify-between items-center mb-5">
        <div
          className="mono text-[11px] uppercase tracking-[.06em]"
          style={{ color: "var(--text-tertiary)" }}
        >
          {round} · {match.match_id}
        </div>
        <div
          className="mono text-[11px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          {kickoffLabel}
        </div>
      </div>

      <div
        className="grid items-center"
        style={{ gridTemplateColumns: "auto 1fr auto", columnGap: 24 }}
      >
        <TeamSide team={home} align="start" />

        <div className="px-2">
          <div
            className="mono flex justify-between items-baseline text-[10px] uppercase tracking-[.08em] mb-[7px]"
            style={{ color: "var(--text-quiet)" }}
          >
            <span>p · model</span>
            <span>1X2</span>
          </div>
          <div
            className="flex overflow-hidden"
            style={{
              height: 10,
              borderRadius: 3,
              background: "var(--bg-root)",
              border: "0.5px solid var(--border-subtle)",
            }}
            role="img"
            aria-label={`1X2 probabilities: ${home.display_name} ${(p.H * 100).toFixed(1)}%, draw ${(p.D * 100).toFixed(1)}%, ${away.display_name} ${(p.A * 100).toFixed(1)}%`}
          >
            <div style={{ flex: p.H, background: "var(--prism-peach)" }} />
            <div
              style={{
                flex: p.D,
                background:
                  "color-mix(in oklch, var(--prism-sun) 55%, var(--bg-panel))",
              }}
            />
            <div style={{ flex: p.A, background: "var(--prism-cyan)" }} />
          </div>
          <div
            className="mono flex justify-between items-baseline mt-2 text-[12px]"
            style={{ color: "var(--text-primary)" }}
          >
            <span className="flex flex-col items-start">
              <ProbabilityCell p={p.H} />
              <span className="text-[10px]" style={{ color: "var(--text-quiet)" }}>
                {home.fifa_code} win
              </span>
            </span>
            <span
              className="flex flex-col items-center"
              style={{ color: "var(--text-tertiary)" }}
            >
              <ProbabilityCell p={p.D} />
              <span className="text-[10px]" style={{ color: "var(--text-quiet)" }}>
                draw
              </span>
            </span>
            <span className="flex flex-col items-end">
              <ProbabilityCell p={p.A} />
              <span className="text-[10px]" style={{ color: "var(--text-quiet)" }}>
                {away.fifa_code} win
              </span>
            </span>
          </div>
        </div>

        <TeamSide team={away} align="end" />
      </div>
    </section>
  );
}

function TeamSide({
  team,
  align,
}: {
  team: { fifa_code: string; display_name: string };
  align: "start" | "end";
}) {
  return (
    <div
      className="flex flex-col gap-2.5"
      style={{
        alignItems: align === "start" ? "flex-start" : "flex-end",
        minWidth: 200,
        textAlign: align === "start" ? "left" : "right",
      }}
    >
      <span
        className="mono inline-flex items-center justify-center"
        style={{
          width: 56,
          height: 36,
          borderRadius: 4,
          background: "var(--bg-panel-elev)",
          border: "1px solid var(--border-subtle)",
          color: "var(--text-secondary)",
          fontSize: 12,
          letterSpacing: ".04em",
        }}
        aria-label={`${team.display_name} crest placeholder`}
      >
        {team.fifa_code}
      </span>
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 26,
          fontWeight: 500,
          letterSpacing: "-0.015em",
          color: "var(--text-primary)",
          lineHeight: 1.05,
        }}
      >
        {team.display_name}
      </div>
    </div>
  );
}
