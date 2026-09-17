import { COUNTRY_NAMES, type FifaCode } from "@/lib/flags/countries";

interface FlagProps {
  code: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

// Static country flag rendered from a single shared SVG sprite at
// /assets/flags.svg keyed by FIFA 3-letter symbol id (uppercase). The
// sprite is built from the per-team SVGs at /assets/flags/<code>.svg by
// scripts/build-flag-sprite.mjs and contains one <symbol viewBox="0 0
// 640 480"> per flag.
//
// The sprite replaces the prior pattern (one <img> per flag), which
// produced ~48 individual HTTP requests on the team-picker grid. With
// the sprite the browser issues one request that all flags share, and
// caches it across pages.
//
// Defaults to 16px wide (4:3 aspect) for inline use against team
// labels; pass `size` for hero/header treatments. The 1px border and
// border-radius match the previous <img> presentation pixel-for-pixel.
export function Flag({ code, size = 16, className, style }: FlagProps) {
  const upper = code.toUpperCase();
  const name = COUNTRY_NAMES[upper as FifaCode];
  if (!name) return null;

  const height = Math.round((size * 3) / 4);
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 640 480"
      role="img"
      aria-label={`${name} flag`}
      className={`inline-block flex-none align-[-2px] ${className ?? ""}`}
      style={{
        aspectRatio: "4 / 3",
        border: "1px solid var(--border-subtle)",
        borderRadius: 1,
        ...style,
      }}
    >
      <title>{`${name} flag`}</title>
      <use href={`/assets/flags.svg#${upper}`} />
    </svg>
  );
}
