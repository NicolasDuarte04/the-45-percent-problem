import { EditorialMasthead } from "@/components/layout/EditorialMasthead";
import { DesktopRecommendedBanner } from "@/components/layout/DesktopRecommendedBanner";
import {
  DESKTOP_BANNER_DOM_ID,
  DESKTOP_BANNER_STORAGE_KEY,
} from "@/components/layout/desktopRecommendedBannerConstants";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { getOperatorSession } from "@/lib/sim/getOperatorSession";

// Pre-hydrate dismiss check. Rendered by the server layout (not by the
// Client Component itself) so it lives in the SSR document and runs
// during initial HTML parse, before React hydrates. This preserves the
// no-flash-of-banner-then-dismiss behavior without triggering React's
// "script tag inside a Client Component" warning.
const DESKTOP_BANNER_PRE_HYDRATE = `(function(){
  try {
    if (sessionStorage.getItem(${JSON.stringify(DESKTOP_BANNER_STORAGE_KEY)}) === "1") {
      var el = document.getElementById(${JSON.stringify(DESKTOP_BANNER_DOM_ID)});
      if (el) el.setAttribute("data-dismissed", "1");
    }
  } catch (e) { /* sessionStorage may be blocked — render the banner */ }
})();`;

export default async function QuantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const operator = await getOperatorSession();

  return (
    <div data-canvas="quant">
      <EditorialMasthead isOperator={operator !== null} />
      <DesktopRecommendedBanner />
      <script dangerouslySetInnerHTML={{ __html: DESKTOP_BANNER_PRE_HYDRATE }} />
      <main className="flex-1 w-full">{children}</main>
      <SiteFooter />
    </div>
  );
}
