import type { ReactNode } from "react";
import { VaultArticle } from "../_layouts/Article";

export const metadata = {
  title: "Pre-registration · Research Vault",
  description:
    "The OSF lockdown, the signed git tag, and a plain-English account of what pre-registration commits this project to.",
};

const bibtex = `@misc{forty_five_percent_prereg_2026,
  title        = {Pre-registration: The 45\\% Problem},
  author       = {{The 45\\% Problem project}},
  year         = {2026},
  howpublished = {Open Science Framework},
  url          = {https://osf.io/spmkg/overview?view_only=b2ba9087b4ac494f8255388d78af0321},
  note         = {DOI: 10.17605/OSF.IO/8B5HD},
}`;

const apa =
  "The 45% Problem project (2026). Pre-registration: The 45% Problem. Open Science Framework. https://osf.io/spmkg/overview?view_only=b2ba9087b4ac494f8255388d78af0321";

export default function PreregistrationLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <VaultArticle
      eyebrow="§ III · Artifact of record"
      title="Pre-registration"
      deck="The OSF lockdown, the signed git tag, and a plain-English account of what pre-registration commits this project to; and what it does not."
      readingTimeMinutes={9}
      lastRevised="2026-04-22"
      doi="10.17605/OSF.IO/8B5HD"
      citation={{ bibtex, apa }}
      readNext={[
        {
          href: "/vault/kill-criteria",
          title: "Kill criteria",
          blurb:
            "The pre-registered conditions under which this project publishes a null result.",
        },
        {
          href: "/vault/models",
          title: "Model anatomy",
          blurb: "M0 through M★: what each model is and why it was included.",
        },
      ]}
    >
      {children}
    </VaultArticle>
  );
}
