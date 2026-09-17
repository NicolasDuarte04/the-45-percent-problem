import { cn } from "@/lib/utils";

interface DivergenceBarProps {
  p_model: number;
  q_market: number;
  className?: string;
}

const WIDTH = 96;
const DOT_RADIUS = 3;

export function DivergenceBar({ p_model, q_market, className }: DivergenceBarProps) {
  const modelX = Math.round(Math.min(p_model, 1) * WIDTH);
  const marketX = Math.round(Math.min(q_market, 1) * WIDTH);
  const isPositive = p_model >= q_market;

  const modelColor = isPositive ? "var(--prism-mint)" : "var(--prism-rose)";

  return (
    <div
      className={cn("inline-flex items-center", className)}
      role="img"
      aria-label={`model ${(p_model * 100).toFixed(1)}%, market ${(q_market * 100).toFixed(1)}%`}
      style={{ width: `${WIDTH}px`, height: "16px" }}
    >
      <svg
        width={WIDTH}
        height={16}
        aria-hidden
        style={{ overflow: "visible" }}
      >
        {/* 2px baseline · §2.11 */}
        <line
          x1={0}
          y1={8}
          x2={WIDTH}
          y2={8}
          stroke="var(--rule)"
          strokeWidth={2}
        />
        {/* Market dot (neutral) */}
        <circle
          cx={marketX}
          cy={8}
          r={DOT_RADIUS}
          fill="var(--text-quiet)"
        />
        {/* Model dot (colored by edge direction) */}
        <circle
          cx={modelX}
          cy={8}
          r={DOT_RADIUS}
          fill={modelColor}
        />
      </svg>
    </div>
  );
}
