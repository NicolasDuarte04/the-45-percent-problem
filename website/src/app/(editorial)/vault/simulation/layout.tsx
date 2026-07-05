import type { ReactNode } from "react";
import { VaultArticle } from "../_layouts/Article";

export const metadata = {
  title: "Simulation · Research Vault",
  description:
    "Bivariate Poisson, Dixon-Coles correction, and the 10,000-run Monte Carlo engine that powers every probability on this site.",
};

const bibtex = `@misc{forty_five_percent_simulation_2026,
  title        = {Simulation: bivariate {Poisson} and {Monte Carlo}},
  author       = {{The 45\\% Problem project}},
  year         = {2026},
  howpublished = {Research Vault},
  url          = {https://45analytics.com/vault/simulation},
}`;

const apa =
  "The 45% Problem project (2026). Simulation: bivariate Poisson and Monte Carlo. Research Vault. https://45analytics.com/vault/simulation";

export default function SimulationLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <VaultArticle
      eyebrow="§ V · Long-form"
      title="Simulation"
      deck="Bivariate Poisson, Dixon-Coles low-score correction, and the 10,000-run Monte Carlo engine; how a match model becomes a tournament distribution."
      readingTimeMinutes={10}
      lastRevised="2026-04-22"
      citation={{ apa, bibtex }}
      readNext={[
        {
          href: "/vault/models",
          title: "Anatomy of M0. M★",
          blurb: "The five candidate models and their strength functions.",
        },
        {
          href: "/vault/market-layer",
          title: "Market layer",
          blurb: "De-vigging, edge, and the power method.",
        },
      ]}
    >
      {children}
    </VaultArticle>
  );
}
