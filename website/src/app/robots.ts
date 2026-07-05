/**
 * Next.js metadata route. §10.3 SEO.
 * Generates /robots.txt at build time.
 */
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://45analytics.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /dev/ is a build-time-only primitive showcase, not for indexing
        disallow: "/dev/",
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
