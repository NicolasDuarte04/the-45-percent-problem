import type { ReactNode } from "react";
import { VaultArticle } from "../_layouts/Article";

export const metadata = {
  title: "The 45% Problem · Research Vault",
  description:
    "The titular essay. Why a stubborn residual in bookmaker markets motivates probabilistic pricing, pre-registration, and a public kill-criterion.",
};

const bibtex = `@misc{forty_five_percent_2026,
  title        = {The 45\\% Problem},
  author       = {{The 45\\% Problem project}},
  year         = {2026},
  howpublished = {Research Vault},
  url          = {https://45analytics.com/vault/the-45-percent},
}`;

const apa =
  "The 45% Problem project (2026). The 45% Problem. Research Vault. https://45analytics.com/vault/the-45-percent";

/**
 * §8.6: the titular essay wraps its MDX body in VaultArticle via this
 * route-scoped layout. The MDX file itself carries prose only, which keeps
 * it free of module imports and lets the route render in environments
 * where file:// URL resolution is sensitive to the project path.
 */
export default function TheFortyFivePercentLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <VaultArticle
      eyebrow="§ I · Titular essay"
      title="The 45% Problem"
      deck="Bookmaker markets on the World Cup resolve close to their implied probabilities; but a stubborn residual remains. This essay explains why that residual matters more than any single point prediction."
      readingTimeMinutes={11}
      lastRevised="2026-04-22"
      citation={{ apa, bibtex }}
      readNext={[
        {
          href: "/vault/preregistration",
          title: "Pre-registration",
          blurb: "OSF lockdown, DOI, and the signed git tag.",
        },
        {
          href: "/ledger",
          title: "Transparency Ledger",
          blurb:
            "Every settled and unsettled M★ forecast, with realized outcomes.",
        },
      ]}
    >
      {children}
    </VaultArticle>
  );
}
