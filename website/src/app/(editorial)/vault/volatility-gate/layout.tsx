import type { ReactNode } from "react";
import { VaultArticle } from "../_layouts/Article";

export const metadata = {
  title: "Volatility Gate — Research Vault",
  description:
    "The five pre-registered suppression rules that prevent the model from acting on noisy or unreliable market prices.",
};

const bibtex = `@misc{forty_five_percent_gate_2026,
  title        = {Volatility Gate: five suppression rules with counterfactuals},
  author       = {{The 45\\% Problem project}},
  year         = {2026},
  howpublished = {Research Vault},
  url          = {https://the45percent.org/vault/volatility-gate},
}`;

const apa =
  "The 45% Problem project (2026). Volatility Gate: five suppression rules with counterfactuals. Research Vault. https://the45percent.org/vault/volatility-gate";

export default function VolatilityGateLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <VaultArticle
      eyebrow="§ VII · Long-form"
      title="Volatility Gate"
      deck="Five pre-registered suppression rules: news events, price discovery, exchange spread, liquidity floor, and sizing guardrails. Each rule has a counterfactual."
      readingTimeMinutes={11}
      lastRevised="2026-04-22"
      citation={{ apa, bibtex }}
      readNext={[
        {
          href: "/vault/market-layer",
          title: "Market layer",
          blurb: "De-vigging and edge — how divergence is measured.",
        },
        {
          href: "/vault/evaluation",
          title: "Evaluation",
          blurb: "Brier, log-loss, and CLV in plain English.",
        },
      ]}
    >
      {children}
    </VaultArticle>
  );
}
