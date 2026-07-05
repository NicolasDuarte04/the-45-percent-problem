import type { ReactNode } from "react";
import { VaultArticle } from "../_layouts/Article";

export const metadata = {
  title: "Why Probabilities · Research Vault",
  description:
    "The case for distributions over predictions: why a probability is more informative and more honest than a point forecast.",
};

const bibtex = `@misc{forty_five_percent_why_prob_2026,
  title        = {Why Probabilities},
  author       = {{The 45\\% Problem project}},
  year         = {2026},
  howpublished = {Research Vault},
  url          = {https://45analytics.com/vault/why-probabilities},
}`;

const apa =
  "The 45% Problem project (2026). Why Probabilities. Research Vault. https://45analytics.com/vault/why-probabilities";

export default function WhyProbabilitiesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <VaultArticle
      eyebrow="§ II · Long-form"
      title="Why Probabilities"
      deck="The case for distributions over predictions. A probability is more informative and more honest than a point forecast; and harder to fake."
      readingTimeMinutes={5}
      lastRevised="2026-04-22"
      citation={{ apa, bibtex }}
      readNext={[
        {
          href: "/vault/the-45-percent",
          title: "The 45% problem",
          blurb: "The residual that motivates this approach.",
        },
        {
          href: "/vault/models",
          title: "Anatomy of M0. M★",
          blurb: "The five candidate models.",
        },
      ]}
    >
      {children}
    </VaultArticle>
  );
}
