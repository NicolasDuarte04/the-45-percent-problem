import type { ReactNode } from "react";
import { VaultArticle } from "../_layouts/Article";

export const metadata = {
  title: "Glossary · Research Vault",
  description:
    "Definitions for every technical term used on this site, with formal statements and plain-English equivalents.",
};

export default function GlossaryLayout({ children }: { children: ReactNode }) {
  return (
    <VaultArticle
      eyebrow="§ VI · Reference"
      title="Glossary"
      deck="Every technical term used on this site: formal definition, plain-English equivalent, and a link to the section where it matters most."
      lastRevised="2026-04-22"
    >
      {children}
    </VaultArticle>
  );
}
