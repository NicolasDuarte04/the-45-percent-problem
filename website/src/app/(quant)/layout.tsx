import { EditorialMasthead } from "@/components/layout/EditorialMasthead";
import { DesktopRecommendedBanner } from "@/components/layout/DesktopRecommendedBanner";
import { SiteFooter } from "@/components/layout/SiteFooter";

// Checkpoint 17 follow-up: operator detection moved to the masthead
// client island so /bracket can statically prerender alongside the
// rest of the (quant) routes. See src/app/(editorial)/layout.tsx for
// the rationale.
//
// The DesktopRecommendedBanner pre-hydrate dismiss check lives in the
// root layout (app/layout.tsx) as a `next/script` with
// `strategy="beforeInteractive"`. Rendering a raw <script> here
// triggered React 19's "script tag inside a React component" warning
// on client-side navigation; `next/script` with `beforeInteractive`
// is the supported path.

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
