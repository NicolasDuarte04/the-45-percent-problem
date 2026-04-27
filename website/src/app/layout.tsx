import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import Script from "next/script";
import { TooltipProvider } from "@/components/ui/tooltip";
import { KillCriteriaBanner } from "@/components/primitives/KillCriteriaBanner";
import { loadEvaluationMetrics } from "@/lib/data/loadSnapshot";
import "./globals.css";

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
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "The 45% Problem — Probabilistic Pricing for FIFA World Cup 2026",
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
  const metrics = loadEvaluationMetrics();
  const killTripped = metrics.kill_criteria_check.triggered;

  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${sourceSerif4.variable}`}
      style={
        {
          "--font-sans":  `var(--font-inter), system-ui, sans-serif`,
          "--font-mono":  `var(--font-jetbrains-mono), ui-monospace, Menlo, monospace`,
          "--font-serif": `var(--font-source-serif-4), Georgia, ui-serif, serif`,
        } as React.CSSProperties
      }
    >
      <body className="min-h-screen antialiased">
        <Script src="https://plausible.io/js/script.js" data-domain="45analytics.com" strategy="afterInteractive" />
        <TooltipProvider>
          <KillCriteriaBanner
            active={killTripped}
            condition={metrics.kill_criteria_check.condition}
          />
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
