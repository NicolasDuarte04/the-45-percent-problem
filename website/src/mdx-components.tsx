import type { MDXComponents } from "mdx/types";
import {
  Eyebrow,
  Byline,
  Dropcap,
  MarginNote,
  PullQuote,
  Figure,
  CiteChip,
  SectionRule,
  KillCriteriaStatusBlock,
  R16CheckpointStatusBlock,
  InlineMath,
  BlockMath,
} from "@/components/editorial";
import {
  ReliabilityFigure,
  EloDriftFigure,
  PoissonHeatmap,
  DevigDemo,
  GateTimeline,
  ChampionEvolution,
  CLVBridge,
} from "@/components/figures";

/**
 * §8.13: globally-available MDX components for Vault articles.
 * Registered by Next.js via the `mdx-components.tsx` file convention; every
 * MDX page under `app/(editorial)/vault/…` can reference these identifiers
 * without importing.
 */
const components: MDXComponents = {
  // Editorial layout primitives
  Eyebrow,
  Byline,
  Dropcap,
  MarginNote,
  PullQuote,
  Figure,
  CiteChip,
  SectionRule,
  KillCriteriaStatusBlock,
  R16CheckpointStatusBlock,
  InlineMath,
  BlockMath,
  // §8.4 Living figures
  ReliabilityFigure,
  EloDriftFigure,
  PoissonHeatmap,
  DevigDemo,
  GateTimeline,
  ChampionEvolution,
  CLVBridge,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
