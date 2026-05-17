import type { ReactNode } from "react";
import { VaultArticle } from "../_layouts/Article";

export const metadata = {
  title: "Kill criteria · Research Vault",
  description:
    "The pre-registered conditions under which this project publishes a null result and the terminal is frozen.",
};

const bibtex = `@misc{forty_five_percent_kill_2026,
  title        = {Kill criteria: pre-registered null-result conditions},
  author       = {{The 45\\% Problem project}},
  year         = {2026},
  howpublished = {Research Vault},
  url          = {https://the45percent.org/vault/kill-criteria},
}`;

const apa =
  "The 45% Problem project (2026). Kill criteria: pre-registered null-result conditions. Research Vault. https://the45percent.org/vault/kill-criteria";

export default function KillCriteriaLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <VaultArticle
      eyebrow="§ V · Status page"
      title="Kill criteria"
      deck="If M★ performs worse than the null baseline by the Round of 16, this project publishes a null result."
      readingTimeMinutes={8}
      lastRevised="2026-04-22"
      citation={{ bibtex, apa }}
      readNext={[
        {
          href: "/ledger",
          title: "Transparency Ledger",
          blurb: "Live calibration metrics and the kill-criterion check.",
        },
        {
          href: "/vault/preregistration",
          title: "Pre-registration",
          blurb: "The full set of pre-registered commitments.",
        },
      ]}
    >
      {children}
    </VaultArticle>
  );
}
