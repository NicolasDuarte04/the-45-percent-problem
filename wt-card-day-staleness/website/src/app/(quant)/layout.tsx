import { EditorialMasthead } from "@/components/layout/EditorialMasthead";
import { SiteFooter } from "@/components/layout/SiteFooter";

// Checkpoint 17 follow-up: operator detection moved to the masthead
// client island so /bracket can statically prerender alongside the
// rest of the (quant) routes. See src/app/(editorial)/layout.tsx for
// the rationale.

export default function QuantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-canvas="quant">
      <EditorialMasthead />
      <main className="flex-1 w-full">{children}</main>
      <SiteFooter />
    </div>
  );
}
