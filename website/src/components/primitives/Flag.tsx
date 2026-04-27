import { COUNTRY_NAMES, type FifaCode } from "@/lib/flags/countries";

interface FlagProps {
  code: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

// Static country flag, rendered from local SVGs in /public/assets/flags
// keyed by FIFA 3-letter code. Defaults to 16px wide (4:3 aspect) for
// inline use against team labels; pass `size` for hero/header treatments.
export function Flag({ code, size = 16, className, style }: FlagProps) {
  const upper = code.toUpperCase();
  const name = COUNTRY_NAMES[upper as FifaCode];
  if (!name) return null;

  const height = Math.round((size * 3) / 4);
  return (
    <img
      src={`/assets/flags/${upper.toLowerCase()}.svg`}
      alt={`${name} flag`}
      width={size}
      height={height}
      className={`inline-block flex-none align-[-2px] ${className ?? ""}`}
      style={{
        aspectRatio: "4 / 3",
        border: "1px solid var(--border-subtle)",
        borderRadius: 1,
        ...style,
      }}
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );
}
