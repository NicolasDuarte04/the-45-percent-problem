import { EditorialMasthead } from "@/components/layout/EditorialMasthead";
import { FreshnessBanner } from "@/components/layout/FreshnessBanner";
import { SiteFooter } from "@/components/layout/SiteFooter";

export default function EditorialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-canvas="editorial">
      <EditorialMasthead />
      <FreshnessBanner />
      <main className="flex-1 w-full">{children}</main>
      <SiteFooter />
    </div>
  );
}
