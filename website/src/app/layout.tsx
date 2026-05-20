import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  DESKTOP_BANNER_DOM_ID,
  DESKTOP_BANNER_STORAGE_KEY,
} from "@/components/layout/desktopRecommendedBannerConstants";
import "./globals.css";

// Pre-hydrate dismiss check for the DesktopRecommendedBanner (rendered
// only inside (quant)/layout.tsx). Lives in the root layout because
// `beforeInteractive` scripts must be placed in the root layout per
// the next/script docs; the getElementById guard makes it a no-op on
// routes without the banner. Preserves the no-flash-of-banner-then-
// dismiss behavior without rendering a raw <script> inside a nested
// layout (which triggers React's "script tag inside a React component"
// warning under React 19).
const DESKTOP_BANNER_PRE_HYDRATE = `(function(){
  try {
    if (sessionStorage.getItem(${JSON.stringify(DESKTOP_BANNER_STORAGE_KEY)}) === "1") {
      var el = document.getElementById(${JSON.stringify(DESKTOP_BANNER_DOM_ID)});
      if (el) el.setAttribute("data-dismissed", "1");
    }
  } catch (e) { /* sessionStorage may be blocked; render the banner */ }
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
    "An institutional quantitative terminal publishing nightly M★ probability distributions and their divergence from market-implied probabilities for the 2026 FIFA World Cup.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
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
          id="quant-banner-pre-hydrate"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: DESKTOP_BANNER_PRE_HYDRATE }}
        />
        <Script src="https://plausible.io/js/script.tagged-events.js" data-domain="45analytics.com" strategy="afterInteractive" />
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <Analytics />
      </body>
    </html>
  );
}
