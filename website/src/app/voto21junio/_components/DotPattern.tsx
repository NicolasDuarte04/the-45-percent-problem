/**
 * DotPattern — the "campo de votos" motif (Session 01).
 *
 * A field of voter dots with a `live` fraction lit in the accent. The SVG is
 * generated deterministically (seeded) by campoSvg(), so server and client
 * markup match exactly. Drift and reduced-motion are handled by the scoped
 * stylesheet (.cdrift). The mask prop applies the safe-zone fade the prototype
 * uses so the motif never overlaps hero numerals or headlines.
 */

import type { CSSProperties } from "react";
import { campoSvg, type CampoOptions } from "../_lib/voto-runtime";

interface DotPatternProps extends CampoOptions {
  className?: string;
  style?: CSSProperties;
  /** CSS mask-image value for the safe-zone fade (e.g. a radial/linear gradient). */
  mask?: string;
}

export function DotPattern({ className, style, mask, ...campo }: DotPatternProps) {
  const maskStyle: CSSProperties = mask
    ? { WebkitMaskImage: mask, maskImage: mask, ...style }
    : (style ?? {});
  return (
    <div
      className={className}
      style={maskStyle}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: campoSvg(campo) }}
    />
  );
}
