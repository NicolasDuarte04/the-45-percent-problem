import type { ReactNode } from "react";
import { VaultArticle } from "../_layouts/Article";

export const metadata = {
  title: "Anatomy of M0–M★ — Research Vault",
  description:
    "The five candidate models — from the null baseline to the pre-registered champion — and the formal specification that separates them.",
};

const bibtex = `@misc{forty_five_percent_models_2026,
  title        = {Anatomy of {M0}--{M$\\star$}: the five candidate models},
  author       = {{The 45\\% Problem project}},
  year         = {2026},
  howpublished = {Research Vault},
  url          = {https://the45percent.org/vault/models},
}`;

const apa =
  "The 45% Problem project (2026). Anatomy of M0–M★: the five candidate models. Research Vault. https://the45percent.org/vault/models";

export default function ModelsLayout({ children }: { children: ReactNode }) {
  return (
    <VaultArticle
      eyebrow="§ IV · Long-form"
      title="Anatomy of M0–M★"
      deck="Five models, one champion. From the null baseline to the pre-registered winner — what each model is, what it adds, and what it deliberately omits."
      readingTimeMinutes={14}
      lastRevised="2026-04-22"
      citation={{ bibtex, apa }}
      readNext={[
        {
          href: "/vault/preregistration",
          title: "Pre-registration",
          blurb: "How M★ was selected and sealed before the tournament.",
        },
        {
          href: "/vault/the-45-percent",
          title: "The 45% problem",
          blurb:
            "The residual variance that motivates this model architecture.",
        },
      ]}
    >
      {children}
    </VaultArticle>
  );
}
