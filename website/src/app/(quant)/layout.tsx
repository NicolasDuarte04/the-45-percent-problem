import { EditorialMasthead } from "@/components/layout/EditorialMasthead";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { loadEvaluationMetrics } from "@/lib/data/loadSnapshot";

export default function QuantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const metrics = loadEvaluationMetrics();
  const killTripped = metrics.kill_criteria_check.tripped;

  return (
    <div data-canvas="quant">
      <EditorialMasthead killTripped={killTripped} />
      <main className="flex-1 w-full">{children}</main>
      <SiteFooter />
    </div>
  );
}
