import type { ReactNode } from "react";
import { VaultArticle } from "../_layouts/Article";

export const metadata = {
  title: "Notation · Research Vault",
  description:
    "The complete symbol table used in the model specification, evaluation metrics, and the Phase 1 framework paper.",
};

export default function NotationLayout({ children }: { children: ReactNode }) {
  return (
    <VaultArticle
      eyebrow="§ VII · Reference"
      title="Notation"
      deck="The symbol table used in the model specification, evaluation metrics, and the Phase 1 framework paper; with canonical values from the pre-registration where applicable."
      lastRevised="2026-04-22"
    >
      {children}
    </VaultArticle>
  );
}
