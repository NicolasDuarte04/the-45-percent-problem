import type { TeamProgression } from "@/lib/data/schemas";
import { ProbabilityCell } from "@/components/primitives/ProbabilityCell";
import { ConfidenceInterval } from "@/components/primitives/ConfidenceInterval";

interface TeamHeaderProps {
  team: TeamProgression;
}

export function TeamHeader({ team }: TeamHeaderProps) {
  const [lo, hi] = team.progression.ci_95_champion;
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
          team · group {team.group}
        </div>
        <div
          className="mono text-[11px] uppercase tracking-[.06em]"
          style={{ color: "var(--text-quiet)" }}
        >
          FIFA code {team.fifa_code}
        </div>
      </div>

      <div
        className="grid items-center"
        style={{ gridTemplateColumns: "auto 1fr auto", columnGap: 24 }}
      >
        <div className="flex items-center gap-4">
          <span
            className="mono inline-flex items-center justify-center"
            style={{
              width: 64,
              height: 44,
              borderRadius: 4,
              background: "var(--bg-panel-elev)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
              fontSize: 14,
              letterSpacing: ".04em",
            }}
            aria-label={`${team.display_name} crest placeholder`}
          >
            {team.fifa_code}
          </span>
          <div>
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
            <div
              className="mono text-[11px] mt-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              group {team.group}
            </div>
          </div>
        </div>

        <div />

        <div className="flex flex-col items-end">
          <div
            className="mono text-[10px] uppercase tracking-[.08em]"
            style={{ color: "var(--text-quiet)" }}
          >
            p · champion
          </div>
          <div
            className="mono text-[24px]"
            style={{
              color: "var(--prism-peach)",
              letterSpacing: "-0.01em",
              fontWeight: 500,
            }}
          >
            <ProbabilityCell p={team.progression.p_champion} decimals={1} />
          </div>
          <div
            className="mono text-[11px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            95% band <ConfidenceInterval lo={lo} hi={hi} />
          </div>
        </div>
      </div>
    </section>
  );
}
