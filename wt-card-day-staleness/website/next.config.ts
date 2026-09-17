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
/**
 * Session 15 (PR-B1 / PR-B2) — umbrella-at-root migration, staged.
 *
 * End state: `/` serves the 45 Analytics umbrella, the World Cup product
 * lives under `/the-45-percent-problem`, and every old WC deep link 301s to
 * its new path. No WC page file moves and no WC component edits: the
 * migration is expressed entirely as routing config, so rollback is a
 * one-line revert.
 *
 * Staging is controlled by UMBRELLA_AT_ROOT_CUTOVER:
 *   false (PR-B1, additive)  — `/` still serves the WC home; every WC route
 *     additionally becomes reachable under /the-45-percent-problem/* via
 *     always-on rewrites; the full 301 inventory below is defined but inert.
 *   true (PR-B2, cutover)    — `/` rewrites to the umbrella, /45analytics
 *     canonicalises to `/`, and the 301 inventory goes live.
 *
 * PR-B2 must not merge without the WC team's launch-stability sign-off
 * (their opening match is 2026-06-11).
 *
 * Deliberately untouched: /api/*, /confirmed, /verify, /unsubscribe (baked
 * into already-sent brief emails and shared by both products), /dev, and
 * /voto21junio/*.
 *
 * Known cosmetic caveat for the WC team to review before cutover: WC nav
 * components that compare usePathname() against old root paths will see
 * /the-45-percent-problem/* after cutover; pages render correctly but
 * active-link highlighting may not match. Internal WC links keep pointing
 * at old root paths and arrive via one 301 hop.
 */
const UMBRELLA_AT_ROOT_CUTOVER = false;

// Every top-level public WC segment, from the app router tree:
// (editorial) about brief briefs methodology teams vault
// (quant)     bracket ledger match simulator team terminal
// (simulator) me scenario
const WC_SEGMENTS = [
  "about",
  "bracket",
  "brief",
  "briefs",
  "ledger",
  "match",
  "me",
  "methodology",
  "scenario",
  "simulator",
  "team",
  "teams",
  "terminal",
  "vault",
];

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],

  async redirects() {
    if (!UMBRELLA_AT_ROOT_CUTOVER) return [];
    return [
      // The umbrella's staging address canonicalises to the front door.
      // (Safe from loops: redirects are matched against the incoming URL
      // only; the `/` → /45analytics rewrite below is internal.)
      { source: "/45analytics", destination: "/", permanent: true },
      // Full 301 inventory: every old WC deep link → its new home.
      ...WC_SEGMENTS.map((s) => ({
        source: `/${s}`,
        destination: `/the-45-percent-problem/${s}`,
        permanent: true,
      })),
      ...WC_SEGMENTS.map((s) => ({
        source: `/${s}/:path*`,
        destination: `/the-45-percent-problem/${s}/:path*`,
        permanent: true,
      })),
    ];
  },

  async rewrites() {
    return {
      // beforeFiles rules chain: after a rule matches, the REWRITTEN path is
      // checked against the remaining rules. Order is therefore load-bearing:
      // the `/` rule sits first so that `/the-45-percent-problem` → `/`
      // (a later rule) cannot subsequently re-map to the umbrella.
      beforeFiles: [
        ...(UMBRELLA_AT_ROOT_CUTOVER
          ? [{ source: "/", destination: "/45analytics" }]
          : []),
        // Additive, always on: the WC home and every WC route are reachable
        // at their post-migration canonical paths. Until cutover the old
        // root paths remain primary and nothing 301s.
        { source: "/the-45-percent-problem", destination: "/" },
        ...WC_SEGMENTS.map((s) => ({
          source: `/the-45-percent-problem/${s}`,
          destination: `/${s}`,
        })),
        ...WC_SEGMENTS.map((s) => ({
          source: `/the-45-percent-problem/${s}/:path*`,
          destination: `/${s}/:path*`,
        })),
      ],
    };
  },
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
      // Session 15: the same two pages at their post-migration canonical
      // paths (served via the /the-45-percent-problem/* rewrites) get the
      // same edge-cache policy. Headers match the incoming URL, so the
      // original entries above stop applying once the 301 inventory is live.
      {
        source: "/the-45-percent-problem",
        headers: [
          {
            key: "Cache-Control",
            value:
              "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
          },
        ],
      },
      {
        source: "/the-45-percent-problem/bracket",
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
