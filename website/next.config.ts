import type { NextConfig } from "next";
import createMDX from "@next/mdx";

/**
 * §12.8: MDX pipeline.
 *
 * ACTIVE: Full JS pipeline with remark-math / rehype-katex / rehype-pretty-code.
 * Activated once the parent directory was renamed from "The 45% Problem" to
 * "The 45 Percent Problem", eliminating the `%` that caused Node 22's ESM
 * resolver to throw `URIError: URI malformed` during fileURLToPath conversion.
 *
 * Pipeline:
 *   remark-gfm. GitHub Flavoured Markdown (tables, task lists, etc.)
 *   remark-math: parse $...$ and $$...$$ math fences into mdast nodes
 *   rehype-katex: render those nodes to KaTeX HTML (SSR, no client JS)
 *   rehype-slug: inject id attributes on headings
 *   rehype-autolink-headings: wrap headings in self-link anchors ({ behavior: "wrap" })
 *   rehype-pretty-code: syntax-highlighted code blocks via Shiki
 *
 * KaTeX CSS is still imported once in globals.css; equations render server-side
 * so the page is fully readable before any client hydration.
 *
 * Plugin entries are expressed as module-specifier strings (Turbopack-safe) per
 * node_modules/next/dist/docs/01-app/02-guides/mdx.md.
 */
const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  // Checkpoint 16: edge-cache the home and bracket responses for short
  // windows. Both pages are dynamic (they await searchParams to read the
  // snapshot picker query), so the platform cannot statically prerender
  // them, but the request itself is overwhelmingly the default
  // no-query-string variant. Setting s-maxage lets the Vercel CDN serve
  // a cached HTML for the default view for up to 5 minutes and serve
  // stale content for another 10 minutes while a background revalidation
  // refreshes the cache. Snapshot deep-links cache under their own URL
  // and are similarly cheap. The Plausible script tag is unaffected and
  // hot-loads regardless, so per-user analytics still fire on every view.
  async headers() {
    return [
      {
        source: "/",
        headers: [
          {
            key: "Cache-Control",
            value:
              "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
          },
        ],
      },
      {
        source: "/bracket",
        headers: [
          {
            key: "Cache-Control",
            value:
              "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
          },
        ],
      },
    ];
  },
};

const withMDX = createMDX({
  extension: /\.(md|mdx)$/,

  options: {
    remarkPlugins: ["remark-gfm", "remark-math"],
    rehypePlugins: [
      "rehype-katex",
      "rehype-slug",
      ["rehype-autolink-headings", { behavior: "wrap" }],
      ["rehype-pretty-code", { theme: "github-dark-dimmed", keepBackground: false }],
    ],
  },
});

export default withMDX(nextConfig);
