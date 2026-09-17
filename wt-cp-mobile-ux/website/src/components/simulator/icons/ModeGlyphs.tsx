/**
 * Mode-card glyphs per UX_POLISH_PLAN_SIMULATOR_PHASE_D.md §5.1.
 *
 * Three minimalist 1px-stroke geometric SVG glyphs that anchor each
 * ModeSelectorCard. Inline SVG, no icon library, currentColor stroke
 * so the card hover (text-[var(--accent-warm)]) cascades through.
 *
 * 24px square viewbox, square line caps, no fill except where noted.
 * Designed to read like a research-paper diagram, not a sports app.
 */

interface GlyphProps {
  className?: string;
}

// V2-03 (B1): default size bumped from 24 to 32 so the glyph reads as the
// card's anchor, not a decorative corner stamp. Hand-drawn-feel geometry and
// 1px stroke weight unchanged.
const baseProps = {
  width: 32,
  height: 32,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1,
  strokeLinecap: "square" as const,
  strokeLinejoin: "miter" as const,
  "aria-hidden": true,
  focusable: false,
};

// Final Four: four small unfilled squares in a 2x2 grid with a faint
// 1px line connecting their inner corners to a single convergence point
// at the centre. Reads as "four → one".
export function FinalFourGlyph({ className }: GlyphProps) {
  return (
    <svg {...baseProps} className={className}>
      <rect x={3} y={3} width={6} height={6} />
      <rect x={15} y={3} width={6} height={6} />
      <rect x={3} y={15} width={6} height={6} />
      <rect x={15} y={15} width={6} height={6} />
      <line x1={9} y1={9} x2={12} y2={12} />
      <line x1={15} y1={9} x2={12} y2={12} />
      <line x1={9} y1={15} x2={12} y2={12} />
      <line x1={15} y1={15} x2={12} y2={12} />
    </svg>
  );
}

// Champion's Path: four dots connected left-to-right by a single 1px
// line, with a small filled circle at the rightmost dot (the path's
// destination).
export function ChampionsPathGlyph({ className }: GlyphProps) {
  return (
    <svg {...baseProps} className={className}>
      <line x1={4} y1={12} x2={20} y2={12} />
      <circle cx={4} cy={12} r={1.25} />
      <circle cx={9.33} cy={12} r={1.25} />
      <circle cx={14.67} cy={12} r={1.25} />
      <circle cx={20} cy={12} r={1.75} fill="currentColor" />
    </svg>
  );
}

// Full Bracket: minimalist tournament-tree fragment: 4 short
// horizontal lines on the left, converging through 2, into 1, in
// classic bracket-tree geometry.
export function FullBracketGlyph({ className }: GlyphProps) {
  return (
    <svg {...baseProps} className={className}>
      {/* Four input lines */}
      <line x1={3} y1={5} x2={7} y2={5} />
      <line x1={3} y1={10} x2={7} y2={10} />
      <line x1={3} y1={14} x2={7} y2={14} />
      <line x1={3} y1={19} x2={7} y2={19} />
      {/* First-round joins */}
      <line x1={7} y1={5} x2={7} y2={10} />
      <line x1={7} y1={14} x2={7} y2={19} />
      <line x1={7} y1={7.5} x2={13} y2={7.5} />
      <line x1={7} y1={16.5} x2={13} y2={16.5} />
      {/* Second-round join */}
      <line x1={13} y1={7.5} x2={13} y2={16.5} />
      <line x1={13} y1={12} x2={20} y2={12} />
    </svg>
  );
}
