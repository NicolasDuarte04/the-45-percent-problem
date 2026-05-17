import katex from "katex";

/**
 * §12.8: Server-side KaTeX rendering components.
 *
 * These exist because the Rust mdxRs compiler (required while the project
 * directory contains a `%` in its name) cannot process the standard
 * remark-math `$...$` / `$$...$$` syntax. LaTeX curly braces conflict with
 * MDX JSX expression delimiters. Instead, math in vault MDX files is written
 * as <InlineMath math="..." /> and <BlockMath math="..." />.
 *
 * Once the parent directory is renamed to remove the `%`, the JS MDX pipeline
 * (remark-math + rehype-katex) can be re-enabled in next.config.ts and these
 * components replaced by standard $...$ syntax. The KaTeX CSS is already
 * imported globally in globals.css so no additional setup is needed.
 */

interface MathProps {
  math: string;
}

export function InlineMath({ math }: MathProps) {
  const html = katex.renderToString(math, {
    displayMode: false,
    throwOnError: false,
    strict: false,
  });
  return (
    <span
      className="katex-inline"
      dangerouslySetInnerHTML={{ __html: html }}
      aria-label={math}
    />
  );
}

export function BlockMath({ math }: MathProps) {
  const html = katex.renderToString(math, {
    displayMode: true,
    throwOnError: false,
    strict: false,
  });
  return (
    <div
      className="katex-block"
      style={{ overflowX: "auto", margin: "24px 0" }}
      dangerouslySetInnerHTML={{ __html: html }}
      aria-label={math}
      role="math"
    />
  );
}
