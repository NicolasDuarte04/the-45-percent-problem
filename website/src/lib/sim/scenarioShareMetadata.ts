/**
 * Per-scenario Open Graph / Twitter metadata for URL-state shares.
 *
 * Shared by the three simulator mode pages. When a page is opened with a
 * `?s=` scenario that strict-decodes to a complete, projectable scenario,
 * this returns metadata whose og:image points at the by-state OG route and
 * whose title carries the real story line (projection-framed). For a
 * partial draft, garbage, or an absent `?s=`, it returns the page's own
 * fallback metadata, so a half-built or invalid link simply unfurls as the
 * default page card rather than a broken one.
 *
 * Framing: projection only, never gambling-coded wording.
 */

import type { Metadata } from "next";

import { renderStoryLine } from "./renderStoryLine";
import { decodeScenarioStrict, SCENARIO_PARAM } from "./scenarioUrl";

const SHARE_DESCRIPTION =
  "Force outcomes and see what the 45analytics model projects for the bracket and each team's path.";

export function scenarioShareMetadata(
  rawS: string | undefined,
  pagePath: string,
  fallback: Metadata,
): Metadata {
  if (!rawS) return fallback;
  const payload = decodeScenarioStrict(rawS);
  if (!payload) return fallback;

  const storyLine = renderStoryLine(payload.mode, payload.scenario);
  const ending = /[.?!]$/.test(storyLine) ? "" : ".";
  const title = `${storyLine}${ending} Here is what the model projects.`;
  const ogImageUrl = `/api/og/scenario/by-state?${SCENARIO_PARAM}=${encodeURIComponent(rawS)}`;
  const pageUrl = `${pagePath}?${SCENARIO_PARAM}=${encodeURIComponent(rawS)}`;

  return {
    title,
    description: SHARE_DESCRIPTION,
    openGraph: {
      title,
      description: SHARE_DESCRIPTION,
      url: pageUrl,
      siteName: "45analytics",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `Tournament scenario: ${storyLine}`,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: SHARE_DESCRIPTION,
      images: [ogImageUrl],
    },
  };
}
