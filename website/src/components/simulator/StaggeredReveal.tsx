"use client";

/**
 * StaggeredReveal · MOTION_SPEC.md §2.
 *
 * Page-level cascade for the result screen: hero → share strip →
 * alert configurator. Each item enters at `index * 180ms` after
 * mount, fades and lifts 8px over 240ms, then settles. Eye is led
 * down the page in declared order.
 *
 * Implementation note. The first attempt used framer-motion with
 * `initial`/`animate` props and was reliable elsewhere in the
 * simulator (RealityScoreReveal works), but inside this Server-
 * component → Client-component handoff under Next 16 + React 19 the
 * animation never advanced past `initial` despite the components
 * mounting and re-rendering on the client. Rather than fight a
 * framer/RSC interaction we cannot fully diagnose in-session, this
 * file uses a `useState` + `setTimeout` flip and a single CSS
 * transition. Same observable behaviour, no framer dependency for
 * this surface.
 *
 * Brutalist tone: 8px y-translate (the strict ceiling before motion
 * reads as marketing); existing motion.entry curve hardcoded; no
 * springs, no overshoots.
 *
 * Reduced-motion: items mount in their final state; no transition
 * runs. Honoured both via the JS branch (instant flip) and the CSS
 * @media block (animation: none).
 */

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

interface StaggeredRevealProps {
  children: React.ReactNode;
  className?: string;
}

interface StaggeredRevealItemProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Zero-based position in the cascade. Each item delays its
   * entrance by `index * 180ms` so the user's eye is led down the
   * page in declared order. Required: there is no implicit ordering.
   */
  index: number;
}

const STAGGER_MS = 180;

/**
 * Plain wrapper. The cascade is owned by each Item via its own
 * delay, so the parent does not need to coordinate state.
 *
 * Why named exports rather than a `<StaggeredReveal.Item>` static
 * property: a server component cannot reach across the client
 * boundary to read a static property off a "use client" symbol. 
 * it only has a stub reference. Separate named imports keep this
 * file callable from server components without an intermediary
 * client wrapper.
 */
export const StaggeredReveal: React.FC<StaggeredRevealProps> = ({
  children,
  className,
}) => {
  return <div className={className}>{children}</div>;
};

export const StaggeredRevealItem: React.FC<StaggeredRevealItemProps> = ({
  children,
  className,
  index,
}) => {
  const prefersReduced = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (prefersReduced) {
      setVisible(true);
      return;
    }
    const id = window.setTimeout(() => setVisible(true), index * STAGGER_MS);
    return () => window.clearTimeout(id);
  }, [index, prefersReduced]);

  // Inline style covers the resting and target frames; the CSS
  // class on the element supplies the transition timing.
  const style: React.CSSProperties = visible
    ? { opacity: 1, transform: "translateY(0)" }
    : { opacity: 0, transform: "translateY(8px)" };

  return (
    <div className={`stagger-item ${className ?? ""}`} style={style}>
      {children}
    </div>
  );
};
