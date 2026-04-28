import Image from "next/image";

/**
 * Static Monte Carlo trophy point cloud. Pre-rendered SVG served from
 * /public/assets — intentionally not a dynamic chart. See
 * _design_handoff/trophy_point_cloud.svg for the source.
 *
 * Caption lives in the parent layout so it can span the full hero width
 * rather than wrapping inside the 260px column.
 */
export function HeroGraphic() {
  return (
    <div
      aria-hidden="false"
      className="hidden md:block pointer-events-none select-none"
      style={{ width: 260 }}
    >
      <Image
        src="/assets/trophy_point_cloud.svg"
        alt="Quantitative World Cup Trophy — 10,000 Monte Carlo samples from the M★ posterior."
        width={260}
        height={384}
        priority
        unoptimized
      />
    </div>
  );
}

export const HERO_TROPHY_CAPTION =
  "A mathematical representation of 10,000 Monte Carlo samples from the M★ posterior, projected onto the FIFA World Cup trophy.";
