import { EditorialMasthead } from "@/components/layout/EditorialMasthead";
import { DesktopRecommendedBanner } from "@/components/layout/DesktopRecommendedBanner";
import { SiteFooter } from "@/components/layout/SiteFooter";

export default function QuantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-canvas="quant">
      <EditorialMasthead />
      <DesktopRecommendedBanner />
      <main className="flex-1 w-full">{children}</main>
      <SiteFooter />
    </div>
  );
}
