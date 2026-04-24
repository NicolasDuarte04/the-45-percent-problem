import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
};

// §12.8 — MDX infrastructure. Plugin dependencies are installed
// (remark-gfm, remark-math, rehype-katex, rehype-slug,
// rehype-autolink-headings, rehype-pretty-code) and are intended to be
// wired into this config. Turbopack in this repo's environment currently
// rejects function-reference plugins (serialization error) and string-name
// plugins fail Node's ESM file-URL resolver because the project path
// contains a literal "%". Until one of those paths is unblocked, the MDX
// pipeline runs without plugins so the Vault routes render; the dependencies
// remain installed for the follow-up wiring step.
const withMDX = createMDX({
  extension: /\.(md|mdx)$/,
});

export default withMDX(nextConfig);
