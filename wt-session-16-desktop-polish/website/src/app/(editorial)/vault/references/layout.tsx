import type { ReactNode } from "react";
import { VaultArticle } from "../_layouts/Article";

export const metadata = {
  title: "Bibliography · Research Vault",
  description:
    "Formal bibliography of the academic works and mathematical methods cited across The 45% Problem: probabilistic football modeling, de-vigging and market microstructure, forecast scoring rules, pairwise comparison, bootstrap procedures, bet sizing, and macroeconomic determinants.",
};

export default function ReferencesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <VaultArticle
      eyebrow="§ IV · Reference"
      title="Bibliography"
      deck="The academic works and mathematical methods cited across this project, grouped by the role each one plays in the methodology rather than by year."
      readingTimeMinutes={6}
      lastRevised="2026-04-30"
    >
      {children}
    </VaultArticle>
  );
}
