import { EditorialMasthead } from "@/components/layout/EditorialMasthead";
import { DesktopRecommendedBanner } from "@/components/layout/DesktopRecommendedBanner";
import {
  DESKTOP_BANNER_DOM_ID,
  DESKTOP_BANNER_STORAGE_KEY,
} from "@/components/layout/desktopRecommendedBannerConstants";
import { SiteFooter } from "@/components/layout/SiteFooter";

// Checkpoint 17 follow-up: operator detection moved to the masthead
// client island so /bracket can statically prerender alongside the
// rest of the (quant) routes. See src/app/(editorial)/layout.tsx for
// the rationale.

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
  } catch (e) { /* sessionStorage may be blocked; render the banner */ }
})();`;

export default function QuantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-canvas="quant">
      <EditorialMasthead />
      <DesktopRecommendedBanner />
      <script dangerouslySetInnerHTML={{ __html: DESKTOP_BANNER_PRE_HYDRATE }} />
      <main className="flex-1 w-full">{children}</main>
      <SiteFooter />
    </div>
  );
}
