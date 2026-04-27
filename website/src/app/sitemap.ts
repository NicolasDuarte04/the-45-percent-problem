/**
 * Next.js metadata route — §10.3 SEO.
 * Generates /sitemap.xml at build time.
 */
import type { MetadataRoute } from "next";
import { loadManifest } from "@/lib/data/loadSnapshot";

export default function sitemap(): MetadataRoute.Sitemap {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://the45percent.org";

  const now = new Date();

  // Static routes — full priority ordering per §3 sitemap
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: base,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${base}/terminal`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${base}/ledger`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${base}/bracket`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${base}/vault`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${base}/vault/the-45-percent`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${base}/vault/why-probabilities`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}/vault/models`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}/vault/simulation`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}/vault/market-layer`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}/vault/volatility-gate`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}/vault/evaluation`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}/vault/framework`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${base}/vault/preregistration`,
      lastModified: now,
      changeFrequency: "never",
      priority: 0.8,
    },
    {
      url: `${base}/vault/kill-criteria`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${base}/vault/glossary`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${base}/vault/notation`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${base}/vault/citation`,
      lastModified: now,
      changeFrequency: "never",
      priority: 0.5,
    },
    {
      url: `${base}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // Snapshot manifest — used for audit trail, lower priority
  let manifestEntries: MetadataRoute.Sitemap = [];
  try {
    const manifest = loadManifest();
    manifestEntries = manifest.map((entry) => ({
      url: `${base}/api/snapshot/${entry.snapshot_id}`,
      lastModified: new Date(entry.generated_at_utc),
      changeFrequency: "never" as const,
      priority: 0.3,
    }));
  } catch {
    // Manifest unavailable at build — skip dynamic snapshot entries
  }

  return [...staticRoutes, ...manifestEntries];
}
