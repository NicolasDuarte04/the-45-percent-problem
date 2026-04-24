import type { TournamentTeam } from "@/lib/data/schemas";

const CONF_COLOR: Record<string, string> = {
  CONMEBOL: "#F9B88A",
  UEFA:     "#7ED0E8",
  CONCACAF: "#88E0B6",
  AFC:      "#F5D76E",
  CAF:      "#EC7C6A",
  OFC:      "#8E5A8A",
};

const W   = 320;
const H   = 460;
const PAD = { top: 36, right: 16, bottom: 44, left: 52 };
const PW  = W - PAD.left - PAD.right;
const PH  = H - PAD.top  - PAD.bottom;

const ELO_MIN = 1480;
const ELO_MAX = 2200;
const P_MAX   = 0.24;

function xOf(elo: number)  { return PAD.left + ((elo - ELO_MIN) / (ELO_MAX - ELO_MIN)) * PW; }
function yOf(p: number)    { return PAD.top  + (1 - p / P_MAX) * PH; }

const Y_TICKS = [0, 0.05, 0.10, 0.15, 0.20];
const X_TICKS = [1500, 1700, 1900, 2100];

export function HeroGraphic({ teams }: { teams: TournamentTeam[] }) {
  return (
    <figure
      className="hidden md:block"
      aria-hidden="true"
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: W,
        height: H,
        margin: 0,
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        style={{ display: "block", overflow: "visible" }}
      >
        {/* ── Grid ─────────────────────────────────────────────────────── */}
        {Y_TICKS.map((p) => (
          <line
            key={p}
            x1={PAD.left}
            x2={PAD.left + PW}
            y1={yOf(p)}
            y2={yOf(p)}
            stroke="rgb(31 31 31 / 0.08)"
            strokeWidth={1}
          />
        ))}

        {/* ── Y-axis ticks + labels ─────────────────────────────────────── */}
        {Y_TICKS.map((p) => (
          <text
            key={p}
            x={PAD.left - 6}
            y={yOf(p) + 4}
            textAnchor="end"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fill: "var(--text-quiet)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {p === 0 ? "0" : `${Math.round(p * 100)}%`}
          </text>
        ))}

        {/* ── Y-axis label ─────────────────────────────────────────────── */}
        <text
          x={12}
          y={PAD.top + PH / 2}
          textAnchor="middle"
          transform={`rotate(-90, 12, ${PAD.top + PH / 2})`}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            fill: "var(--text-quiet)",
            letterSpacing: "0.04em",
          }}
        >
          p(Champion)
        </text>

        {/* ── X-axis ticks + labels ─────────────────────────────────────── */}
        {X_TICKS.map((elo) => (
          <text
            key={elo}
            x={xOf(elo)}
            y={PAD.top + PH + 14}
            textAnchor="middle"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fill: "var(--text-quiet)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {elo}
          </text>
        ))}

        {/* ── X-axis label ─────────────────────────────────────────────── */}
        <text
          x={PAD.left + PW / 2}
          y={H - 4}
          textAnchor="middle"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            fill: "var(--text-quiet)",
            letterSpacing: "0.04em",
          }}
        >
          ELO rating
        </text>

        {/* ── "Mid-tier zone" annotation band ──────────────────────────── */}
        {/* Teams with p_champion ∈ [0.01, 0.06] — the 45%-problem cluster */}
        <rect
          x={PAD.left}
          y={yOf(0.065)}
          width={PW}
          height={yOf(0.008) - yOf(0.065)}
          fill="rgb(249 184 138 / 0.12)"
        />
        <text
          x={PAD.left + PW - 4}
          y={yOf(0.037) - 4}
          textAnchor="end"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            fill: "var(--text-quiet)",
            fontStyle: "italic",
          }}
        >
          45% problem zone
        </text>

        {/* ── Data points ──────────────────────────────────────────────── */}
        {teams.map((t) => {
          const cx = xOf(t.elo_current);
          const cy = yOf(t.p_champion);
          const r  = t.p_champion > 0.1 ? 5 : t.p_champion > 0.03 ? 3.5 : 2.5;
          return (
            <circle
              key={t.fifa_code}
              cx={cx}
              cy={cy}
              r={r}
              fill={CONF_COLOR[t.confederation] ?? "#8A847C"}
              fillOpacity={0.75}
            />
          );
        })}

        {/* ── Chart title ──────────────────────────────────────────────── */}
        <text
          x={PAD.left + PW / 2}
          y={18}
          textAnchor="middle"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fill: "var(--text-tertiary)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          M★ Championship distribution · 48 teams
        </text>

        {/* ── Confederation legend ──────────────────────────────────────── */}
        {(["UEFA", "CONMEBOL", "CONCACAF", "AFC", "CAF"] as const).map(
          (conf, i) => (
            <g key={conf} transform={`translate(${PAD.left + i * 52}, ${H - 18})`}>
              <circle r={3} cx={4} cy={0} fill={CONF_COLOR[conf]} fillOpacity={0.8} />
              <text
                x={10}
                y={4}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 8,
                  fill: "var(--text-quiet)",
                }}
              >
                {conf}
              </text>
            </g>
          )
        )}
      </svg>
    </figure>
  );
}
