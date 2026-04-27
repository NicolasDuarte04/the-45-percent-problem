import type { ReactNode } from "react";
import { VaultArticle } from "../_layouts/Article";

export const metadata = {
  title: "Market Layer — Research Vault",
  description:
    "De-vigging, edge calculation, and the power method: how bookmaker odds become model-comparable implied probabilities.",
};

const bibtex = `@misc{forty_five_percent_market_layer_2026,
  title        = {Market Layer: de-vigging, edge, and the power method},
  author       = {{The 45\\% Problem project}},
  year         = {2026},
  howpublished = {Research Vault},
  url          = {https://the45percent.org/vault/market-layer},
}`;

const apa =
  "The 45% Problem project (2026). Market Layer: de-vigging, edge, and the power method. Research Vault. https://the45percent.org/vault/market-layer";

export default function MarketLayerLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <VaultArticle
      eyebrow="§ VI · Long-form"
      title="Market Layer"
      deck="De-vigging, edge, and the power method. How raw bookmaker decimal odds become de-vigged implied probabilities — and why the proportional method is wrong."
      readingTimeMinutes={8}
      lastRevised="2026-04-22"
      citation={{ apa, bibtex }}
      readNext={[
        {
          href: "/vault/volatility-gate",
          title: "Volatility gate",
          blurb: "The five suppression rules that protect the model from noise.",
        },
        {
          href: "/terminal",
          title: "Divergence Terminal",
          blurb: "Live model-vs-market divergence.",
        },
      ]}
    >
      {children}
    </VaultArticle>
  );
}
