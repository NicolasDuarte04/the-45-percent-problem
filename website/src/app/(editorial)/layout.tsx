import { EditorialMasthead } from "@/components/layout/EditorialMasthead";
import { SiteFooter } from "@/components/layout/SiteFooter";

// Checkpoint 17 follow-up: the operator cookie is read by the
// EditorialMasthead client island (via /api/me/session-status) so
// this layout no longer touches request data. That keeps every page
// in the (editorial) group eligible for static prerendering. The
// previous pattern read the cookie here, which silently disabled the
// Desk tab on every statically prerendered route.
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
