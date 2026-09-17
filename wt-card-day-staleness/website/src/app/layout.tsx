import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastHost } from "@/components/ui/Toast";
import "./globals.css";

// Pre-hydrate onboarding-seen check for cp-08's additive Surface A
// (chip + modal + masthead pill on the editorial canvas). Stamps the
// `data-onboarding-seen` attribute on <html> before React hydrates so
// the CSS selector that scopes the trophy-settle animation
// (html:not([data-onboarding-seen="true"]) .trophy-settle) resolves
// correctly on first paint, with no flash for returning visitors.
const ONBOARDING_SEEN_PRE_HYDRATE = `(function(){
  try {
    var seen = localStorage.getItem("45a.onboarding.seen") === "true";
    document.documentElement.setAttribute("data-onboarding-seen", seen ? "true" : "false");
  } catch (e) {
    /* localStorage may be blocked; treat as not-seen so the chip can render. */
    document.documentElement.setAttribute("data-onboarding-seen", "false");
  }
})();`;

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const sourceSerif4 = Source_Serif_4({
  variable: "--font-source-serif-4",
  subsets: ["latin"],
  display: "swap",
  // Checkpoint 16: weights 300 and 700 were preloaded but no rule in
  // globals.css and no inline style ever requests them. Source Serif 4
  // weights actually in use are 400 (body/headings), 500 (subheads,
  // emphasised links), and 600 (a single .vault-prose heading rule).
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "The 45% Problem · Probabilistic Pricing for FIFA World Cup 2026",
  description:
    "An institutional quantitative terminal publishing M★ probability distributions for the 2026 FIFA World Cup, updated nightly.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
};

// viewport-fit=cover lets the canvas-aware page background (--bg-root,
// cream on the editorial canvas, slate on the quant canvas) paint behind
// the iOS status bar / notch, instead of the browser default white that
// otherwise bleeds at the top of the page. No static theme-color is set:
// a single value would be correct on only one of the two canvases, so we
// rely on --bg-root filling the safe area. On non-notch / desktop devices
// the safe-area insets are zero, so this adds nothing there.
export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${sourceSerif4.variable}`}
      // cp-08: SSR default for the onboarding-seen attribute. Set to
      // "false" so first-visit visitors get an exact-match hydration.
      // The inline `ONBOARDING_SEEN_PRE_HYDRATE` script in <body>
      // flips this to "true" for returning visitors before React
      // hydrates; that legitimate one-attribute mismatch is silenced
      // by `suppressHydrationWarning`. Same pattern next-themes uses
      // for its theme attribute.
      data-onboarding-seen="false"
      suppressHydrationWarning
      // overflowX: "clip" prevents horizontal page-level scroll on
      // narrow viewports (Mobile Optimization Plan §6.1 acceptance
      // criterion #1) without establishing a new scroll container.
      // Critical for preserving position: sticky on filter bars and
      // the vault sidebar (which `overflow-x: hidden` would break).
      // Inlined here rather than in globals.css because Tailwind v4's
      // PostCSS pipeline strips the `clip` keyword from compiled CSS.
      style={
        {
          "--font-sans":  `var(--font-inter), system-ui, sans-serif`,
          "--font-mono":  `var(--font-jetbrains-mono), ui-monospace, Menlo, monospace`,
          "--font-serif": `var(--font-source-serif-4), Georgia, ui-serif, serif`,
          overflowX: "clip",
        } as React.CSSProperties
      }
    >
      <body className="min-h-screen antialiased" style={{ overflowX: "clip" }}>
        <Script
          id="onboarding-seen-pre-hydrate"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: ONBOARDING_SEEN_PRE_HYDRATE }}
        />
        <Script src="https://plausible.io/js/script.tagged-events.js" data-domain="45analytics.com" strategy="afterInteractive" />
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <ToastHost />
        <Analytics />
      </body>
    </html>
  );
}
