import { EditorialMasthead } from "@/components/layout/EditorialMasthead";
import { SiteFooter } from "@/components/layout/SiteFooter";

export default function EditorialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-canvas="editorial">
      <EditorialMasthead />
      <main className="flex-1 w-full">{children}</main>
      <SiteFooter />
    </div>
  );
}
