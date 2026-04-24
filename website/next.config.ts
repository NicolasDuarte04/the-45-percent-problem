import type { NextConfig } from "next";
import createMDX from "@next/mdx";

/**
 * §12.8 — MDX pipeline.
 *
 * ACTIVE: Rust compiler (`mdxRs: { mdxType: "gfm" }`). Math still renders
 * server-side via the `<InlineMath math="…" />` / `<BlockMath math="…" />`
 * components under components/editorial/KatexMath.tsx, which call
 * `katex.renderToString()` at render time and emit pre-computed HTML. The
 * KaTeX stylesheet is imported in globals.css, so every equation in
 * /vault/notation (and every other vault article with math) renders with
 * full KaTeX typography right now, without any dependency on
 * remark-math / rehype-katex.
 *
 * WHY NOT THE JS PIPELINE. Node 22's ESM resolver converts the CWD to a
 * file:// URL during `fileURLToPath`, and `/The 45% Problem/` contains a
 * literal `%` that becomes an invalid percent-encoding sequence. Every
 * `.mdx` evaluation throws `URIError: URI malformed` in the JS pipeline —
 * both webpack and Turbopack paths fail identically, and
 * `--preserve-symlinks` breaks pnpm's own resolution before it helps.
 *
 * The JS pipeline, including `remark-math` and `rehype-katex`, is
 * preserved below as a ready-to-activate block. Once the parent directory
 * is renamed (`mv "The 45% Problem" "The 45 Percent Problem"`), flip the
 * commented block into the `withMDX` call and remove `experimental.mdxRs`.
 * All plugin entries are already expressed as Turbopack-safe module-
 * specifier strings per
 * node_modules/next/dist/docs/01-app/02-guides/mdx.md.
 */
const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  experimental: {
    mdxRs: { mdxType: "gfm" },
  },
};

const withMDX = createMDX({
  extension: /\.(md|mdx)$/,

  // ── JS pipeline (activate after renaming the directory to remove `%`) ───
  // options: {
  //   remarkPlugins: ["remark-gfm", "remark-math"],
  //   rehypePlugins: [
  //     "rehype-katex",
  //     "rehype-slug",
  //     ["rehype-autolink-headings", { behavior: "wrap" }],
  //     ["rehype-pretty-code", { theme: "github-dark-dimmed", keepBackground: false }],
  //   ],
  // },
});

export default withMDX(nextConfig);
