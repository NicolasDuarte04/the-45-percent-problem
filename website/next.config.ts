import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
};

// §12.8 — MDX plugin chain for Next.js 16 + Turbopack.
//
// Turbopack requires plugin identifiers as string module specifiers (not
// imported functions), because the MDX loader options are serialized
// across the Turbopack boundary. See docs/01-app/02-guides/mdx.md
// ("Using Plugins with Turbopack"). The strings also work under the
// webpack-backed production build, so one config serves both paths.
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
