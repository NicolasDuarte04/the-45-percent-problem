import { EditorialMasthead } from "@/components/layout/EditorialMasthead";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { getOperatorSession } from "@/lib/sim/getOperatorSession";

export default async function EditorialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Pattern A from the Checkpoint 8 spec: resolve the signed
  // `45a:sim:owner` cookie server-side and hand a plain boolean to
  // the (client) masthead. Only verified operators see the Desk tab.
  const operator = await getOperatorSession();

  return (
    <div data-canvas="editorial">
      <EditorialMasthead isOperator={operator !== null} />
      <main className="flex-1 w-full">{children}</main>
      <SiteFooter />
    </div>
  );
}
