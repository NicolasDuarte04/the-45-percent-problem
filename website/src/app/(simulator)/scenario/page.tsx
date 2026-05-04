import type { Metadata } from "next";
import { LandingHero } from "@/components/simulator/LandingHero";
import { ModeSelectorCards } from "@/components/simulator/ModeSelectorCards";
import { SimulatorChrome } from "@/components/simulator/SimulatorChrome";
import { TeamGrid } from "@/components/simulator/TeamGrid";

export const metadata: Metadata = {
  title: "Scenario Simulator — 45analytics",
  description:
    "Call the World Cup 2026. Compare your scenario against 10,000 simulated tournaments and see how often the model agrees.",
};

/**
 * Simulator landing page.
 *
 * Layout (top to bottom):
 *   - Editorial masthead (from layout)
 *   - SimulatorChrome top mast strip (45ANALYTICS / TOURNAMENT SCENARIO / WC 2026)
 *   - LandingHero — serif headline + mono subhead + CTA, no visual element
 *   - ModeSelectorCards — three mode entries (Final Four / Champion's Path / Full Bracket)
 *   - TeamGrid — preview of the 48 qualifiers, alphabetical, static
 *   - SiteFooter (from layout)
 *
 * Pure server component. No client interactivity at this scaffold step;
 * the build modes' selection logic lands in subsequent steps.
 */
export default function ScenarioLandingPage() {
  return (
    <SimulatorChrome width="narrow">
      <LandingHero />
      <ModeSelectorCards />
      <TeamGrid />
    </SimulatorChrome>
  );
}
