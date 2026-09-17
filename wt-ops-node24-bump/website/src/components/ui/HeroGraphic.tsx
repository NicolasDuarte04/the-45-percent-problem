/**
 * Static Monte Carlo trophy point cloud. Pre-rendered raster served
 * from /public/assets: intentionally not a dynamic chart. See
 * _design_handoff/trophy_point_cloud.svg for the source.
 *
 * Caption lives in the parent layout so it can span the full hero width
 * rather than wrapping inside the 260px column.
 *
 * Checkpoint 17 (B2): the original 410 KB SVG (thousands of <circle>
 * elements) is replaced with a WebP at 2x of the display size, with a
 * PNG fallback for browsers that lack WebP. Total payload drops from
 * ~410 KB to ~42 KB (WebP) / ~62 KB (PNG fallback). The <picture>
 * element negotiates the format; we no longer route through next/image
 * because the prior call passed `unoptimized` so the optimizer was
 * already bypassed.
 */
/**
 * cp-08 additive onboarding: when `withSettle` is true the wrapping
 * <div> gains a `trophy-settle` class that triggers a one-shot
 * blur-to-sharp settle animation on first paint for visitors who have
 * not yet seen the onboarding. The CSS rule that drives the animation
 * is scoped to `html:not([data-onboarding-seen="true"])` in globals.css,
 * so returning visitors get zero animation and zero first-paint flash
 * (the inline beforeInteractive script in layout.tsx stamps the
 * attribute before React hydrates). Reduced-motion users get the same
 * static final composition.
 *
 * Default is `false`: every existing call site that does not pass the
 * prop renders byte-identically to before.
 */
interface HeroGraphicProps {
  withSettle?: boolean;
}

export function HeroGraphic({ withSettle = false }: HeroGraphicProps = {}) {
  const settleClass = withSettle ? " trophy-settle" : "";
  return (
    <div
      aria-hidden="false"
      className={`hidden md:block pointer-events-none select-none${settleClass}`}
      style={{ width: 260 }}
    >
      <picture>
        <source
          srcSet="/assets/trophy_point_cloud.webp"
          type="image/webp"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/trophy_point_cloud.png"
          alt="Quantitative World Cup Trophy. 10,000 Monte Carlo samples from the M★ posterior."
          width={260}
          height={384}
          fetchPriority="high"
          decoding="async"
          style={{ width: "100%", height: "auto" }}
        />
      </picture>
    </div>
  );
}

export const HERO_TROPHY_CAPTION =
  "A mathematical representation of 10,000 Monte Carlo samples from the M★ posterior, projected onto the FIFA World Cup trophy.";
