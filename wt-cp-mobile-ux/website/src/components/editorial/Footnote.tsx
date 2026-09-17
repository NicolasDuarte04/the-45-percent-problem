import type { ReactNode } from "react";

interface NumProps {
  n: number;
}

/**
 * Inline footnote reference: superscript numeral linking to the matching
 * <Footnote n={n}> entry at the foot of the article.
 *
 * Usage:
 *   The result holds in the bivariate case<FnRef n={1} />.
 *
 *   <Footnotes>
 *     <Footnote n={1}>See Dixon & Coles (1997, §3).</Footnote>
 *   </Footnotes>
 */
export function FnRef({ n }: NumProps) {
  return (
    <sup className="vault-fnref" id={`fnref-${n}`}>
      <a href={`#fn-${n}`} aria-label={`See footnote ${n}`}>
        {n}
      </a>
    </sup>
  );
}

interface FootnoteProps extends NumProps {
  children: ReactNode;
}

export function Footnote({ n, children }: FootnoteProps) {
  return (
    <li className="vault-fn" id={`fn-${n}`} value={n}>
      <span className="vault-fn-body">{children}</span>{" "}
      <a
        href={`#fnref-${n}`}
        className="vault-fn-back"
        aria-label={`Return to reference ${n}`}
      >
        ↩
      </a>
    </li>
  );
}

interface FootnotesProps {
  children: ReactNode;
}

export function Footnotes({ children }: FootnotesProps) {
  return (
    <section className="vault-fns" aria-labelledby="footnotes-heading">
      <h2 id="footnotes-heading" className="vault-fns-heading">
        Notes
      </h2>
      <ol className="vault-fns-list">{children}</ol>
    </section>
  );
}
