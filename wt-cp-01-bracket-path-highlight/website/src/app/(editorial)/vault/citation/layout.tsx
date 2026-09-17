import type { ReactNode } from "react";
import { VaultArticle } from "../_layouts/Article";

export const metadata = {
  title: "Citation · Research Vault",
  description:
    "BibTeX and APA citation blocks for The 45% Problem. Snapshot-addressable citations for use in academic work.",
};

const bibtex = `@misc{forty_five_percent_citation_2026,
  title        = {The 45\\% Problem --- Probabilistic Pricing for {FIFA} {World Cup} 2026},
  author       = {Duarte Jaraba, Nicol\\'{a}s},
  year         = {2026},
  howpublished = {\\url{https://osf.io/spmkg/overview?view_only=b2ba9087b4ac494f8255388d78af0321}},
  note         = {Pre-registered, tag v1.0.0-mstar-lock},
}`;

const apa =
  "Duarte Jaraba, N. (2026). The 45% Problem. Probabilistic Pricing for FIFA World Cup 2026. https://osf.io/spmkg/overview?view_only=b2ba9087b4ac494f8255388d78af0321";

export default function CitationLayout({ children }: { children: ReactNode }) {
  return (
    <VaultArticle
      eyebrow="Reference"
      title="Citation"
      deck="BibTeX and APA citation blocks. Snapshot-addressable citation format for academic use."
      readingTimeMinutes={1}
      lastRevised="2026-04-22"
      citation={{ apa, bibtex }}
      readNext={[
        {
          href: "/vault/preregistration",
          title: "Pre-registration",
          blurb: "OSF DOI and sealed methodology.",
        },
        {
          href: "/about",
          title: "About",
          blurb: "Project statement and author information.",
        },
      ]}
    >
      {children}
    </VaultArticle>
  );
}
