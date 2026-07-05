import type { ReactNode } from "react";
import { VaultArticle } from "../_layouts/Article";

export const metadata = {
  title: "Evaluation · Research Vault",
  description:
    "Brier score, log-loss, RPS, and closing-line value in plain English; how to read the Transparency Ledger's scoring metrics.",
};

const bibtex = `@misc{forty_five_percent_evaluation_2026,
  title        = {Evaluation: {Brier}, log-loss, and {CLV} in plain {English}},
  author       = {{The 45\\% Problem project}},
  year         = {2026},
  howpublished = {Research Vault},
  url          = {https://45analytics.com/vault/evaluation},
}`;

const apa =
  "The 45% Problem project (2026). Evaluation: Brier, log-loss, and CLV in plain English. Research Vault. https://45analytics.com/vault/evaluation";

export default function EvaluationLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <VaultArticle
      eyebrow="§ VIII · Long-form"
      title="Evaluation"
      deck="Brier score, log-loss, RPS, and closing-line value; what each metric measures, how to read the Ledger, and why calibration matters more than accuracy."
      readingTimeMinutes={8}
      lastRevised="2026-04-22"
      citation={{ apa, bibtex }}
      readNext={[
        {
          href: "/ledger",
          title: "Transparency Ledger",
          blurb: "The live forecast record these metrics are drawn from.",
        },
        {
          href: "/vault/kill-criteria",
          title: "Kill-criteria statement",
          blurb: "The pre-registered null-result condition.",
        },
      ]}
    >
      {children}
    </VaultArticle>
  );
}
