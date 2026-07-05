import type { Metadata } from "next";
import { VaultArticle } from "../_layouts/Article";
import {
  BlockMath,
  FnRef,
  Footnote,
  Footnotes,
  InlineMath,
  SectionRule,
} from "@/components/editorial";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Methodology: Research Vault",
  description:
    "The full methodology of The 45% Problem: model roster, simulation engine, market layer, and the volatility gate.",
};

const bibtex = `@misc{forty_five_percent_methodology_2026,
  title        = {Methodology: probabilistic pricing for the 2026 World Cup},
  author       = {{The 45\\% Problem project}},
  year         = {2026},
  howpublished = {Research Vault},
  url          = {https://45analytics.com/vault/methodology},
}`;

const apa =
  "The 45% Problem project (2026). Methodology: probabilistic pricing for the 2026 World Cup. Research Vault. https://45analytics.com/vault/methodology";

export default function MethodologyPage() {
  return (
    <VaultArticle
      eyebrow="§ I · Methodology"
      title="Methodology"
      deck="The full specification: what the framework does, why it does it that way, and how each piece is calibrated, frozen, and evaluated."
      readingTimeMinutes={20}
      lastRevised="2026-04-27"
      citation={{ bibtex, apa }}
      readNext={[
        {
          href: "/vault/models",
          title: "Anatomy of M0 to M★",
          blurb: "The five candidate models and what each one adds.",
        },
        {
          href: "/vault/preregistration",
          title: "Pre-registration",
          blurb: "The OSF lockdown that fixes M★ before kickoff.",
        },
      ]}
    >
      <p>
        This essay is the long-form home of the methodology. It is the
        web-native counterpart to the Phase 1 framework PDF: the same
        argument, written for the page rather than the printer.
      </p>

      <p>
        The premise (borrowed from Hoffmann, Ging &amp; Ramasamy 2002) is
        that structural variables explain roughly fifty-five percent of World
        Cup performance variance. The remaining{" "}
        <InlineMath math="45\%" /> is the residual this project takes as its
        subject. We do not predict through it. We price under it, with
        calibrated uncertainty.
        <FnRef n={1} />
      </p>

      <p>
        Every calibrated component below was fit on the same 347
        major-tournament match corpus (2010 through 2021, with the 2022
        World Cup held out as the final exam). The corpus is well below
        the roughly 12,000 international matches a fuller dataset would
        contain, and the resulting confidence intervals are wider than we
        wished. We document the constraint rather than disguise it; the
        Phase 8 firing of the kill criterion is one direct consequence.
      </p>

      <SectionRule />

      <h2>The model identity</h2>

      <p>
        Every model in the roster shares the same simulation engine. Only the
        strength-estimation function differs. The canonical identity, written
        once for the whole project, is:
      </p>

      <BlockMath math="E = mc^2" />

      <p>
        That is a placeholder while the full derivation is in draft. The
        renderer that produced it is the same KaTeX pipeline that will carry
        the bivariate Poisson likelihood, the Dixon-Coles correction term,
        and the de-vigging identity in the sections below.
      </p>

      <h2>Sections in draft</h2>

      <h3>Simulation engine</h3>
      <p>
        Bivariate Poisson with Dixon-Coles low-score correction; extra-time
        scaling; shootout model; ten thousand Monte Carlo runs for the
        website, one hundred thousand for the paper.
      </p>

      <h3>Market layer</h3>
      <p>
        Power-method de-vigging, edge thresholds at three percent for
        mainline markets and five percent for derivatives, fractional Kelly
        sizing under per-event and drawdown caps.
      </p>

      <h3>Volatility gate</h3>
      <p>
        Five suppression rules (named-event, price-discovery, exchange
        spread, liquidity, and sizing) gate the M★ recommendations.
      </p>

      <h3>Evaluation</h3>
      <p>
        Brier, RPS, log-loss, Diebold-Mariano, Nyberg market efficiency
        tests; CLV telemetry for M★, pseudo-CLV for the shadow models.
      </p>

      <Footnotes>
        <Footnote n={1}>
          Hoffmann, Ging &amp; Ramasamy (2002), &ldquo;The Socio-Economic
          Determinants of International Soccer Performance,&rdquo;{" "}
          <em>Journal of Applied Economics</em> 5(2), 253 to 272.
        </Footnote>
      </Footnotes>
    </VaultArticle>
  );
}
