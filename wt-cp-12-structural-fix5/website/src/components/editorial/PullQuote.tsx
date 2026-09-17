import type { ReactNode } from "react";

interface PullQuoteProps {
  children: ReactNode;
  cite?: string;
}

/**
 * §2.8 / §8.3: left-hang pull quote in serif, 96px opening " in peach.
 * Opacity-only reveal motion is applied via the global motion rules.
 */
export function PullQuote({ children, cite }: PullQuoteProps) {
  return (
    <figure className="vault-pullquote" role="figure">
      <blockquote
        style={{ margin: 0, padding: 0, border: "none", fontStyle: "normal" }}
      >
        {children}
      </blockquote>
      {cite ? <figcaption className="vault-pullquote-cite">. {cite}</figcaption> : null}
    </figure>
  );
}
