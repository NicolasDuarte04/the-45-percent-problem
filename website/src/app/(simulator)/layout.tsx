import { EditorialMasthead } from "@/components/layout/EditorialMasthead";
import { SiteFooter } from "@/components/layout/SiteFooter";

/**
 * Route-group layout for the Tournament Scenario Simulator.
 *
 * Sets `data-canvas="simulator"` so the CSS variables block defined
 * within `globals.css` applies to every descendant. Inherits the dark slate
 * canvas; overrides only the simulator-specific tokens (--accent-warm,
 * --state-dead, --state-promoted, --radius: 0).
 *
 * The masthead and footer are reused from the existing site chrome —
 * the simulator is a sibling route group to (editorial) and (quant),
 * not a parallel app.
 */
export default function SimulatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-canvas="simulator">
      <EditorialMasthead />
      <main className="flex-1 w-full">{children}</main>
      <SiteFooter />
    </div>
  );
}
