/**
 * §3: /about
 * Project statement, author, citation instructions.
 */
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "About · The 45% Problem",
  description:
    "Project statement, author, methodology, and citation instructions for The 45% Problem; a probabilistic pricing study for the 2026 FIFA World Cup.",
};

export default function AboutPage() {
  return (
    <div
      style={{
        backgroundColor: "var(--bg-root)",
        color: "var(--text-primary)",
        minHeight: "100vh",
      }}
    >
      <div
        className="mx-auto px-6 py-16"
        style={{ maxWidth: 720 }}
      >
        {/* Eyebrow */}
        <p
          className="mono uppercase tracking-widest mb-6"
          style={{ fontSize: 11, color: "var(--text-quiet)", letterSpacing: "0.08em" }}
        >
          About
        </p>

        {/* Title */}
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 36,
            lineHeight: "44px",
            letterSpacing: "-0.01em",
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 24,
          }}
        >
          The 45% Problem
        </h1>

        {/* Deck */}
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 18,
            lineHeight: "30px",
            color: "var(--text-secondary)",
            marginBottom: 48,
            maxWidth: "64ch",
          }}
        >
          A probabilistic pricing study for the 2026 FIFA World Cup. It
          publishes the nightly state of the M&#9733; probability distribution
          and an append-only record of every forecast the model has ever made.
          The market-divergence layer covers knockout fixtures live: model
          probabilities conditioned on settled results are compared against
          de-vigged market odds, ungraded. Only the 72 pre-registered
          group-stage forecasts are ever graded. When the odds are older than
          30 hours the layer reports itself stale rather than showing stale rows.
        </p>

        {/* Divider */}
        <div
          style={{
            borderTop: "1px solid var(--border-default)",
            marginBottom: 40,
          }}
        />

        {/* Project statement */}
        <section style={{ marginBottom: 48 }}>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 22,
              lineHeight: "30px",
              fontWeight: 500,
              color: "var(--text-primary)",
              marginBottom: 16,
            }}
          >
            What this is
          </h2>
          <p style={{ fontSize: 16, lineHeight: "26px", color: "var(--text-secondary)", marginBottom: 16 }}>
            A publicly-hosted, nightly-rebuilt, read-only research terminal.
            It renders the state of M&#9733; against the 2026 FIFA World Cup and
            publishes its forecast record. Its content is primarily tabular.
            Its voice is primarily academic.
          </p>
          <p style={{ fontSize: 16, lineHeight: "26px", color: "var(--text-secondary)", marginBottom: 16 }}>
            Every number rendered is traceable to a specific{" "}
            <span className="mono">code_sha</span>,{" "}
            <span className="mono">data_sha</span>, and{" "}
            <span className="mono">mc_seed</span> in the Phase 7 forecast log.
            A reader can reconstruct any reported probability from published
            artifacts alone.
          </p>
          <p style={{ fontSize: 16, lineHeight: "26px", color: "var(--text-secondary)" }}>
            This is not a prediction product. It does not give gambling advice.
            The word &ldquo;bet&rdquo; does not appear in the product UI; a pre-registration
            commitment and a design invariant. See the{" "}
            <Link
              href="/vault/preregistration"
              style={{ color: "var(--accent-focus)", textDecoration: "none" }}
            >
              pre-registration
            </Link>{" "}
            for the full methodological lockdown.
          </p>
        </section>

        {/* Author */}
        <section style={{ marginBottom: 48 }}>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 22,
              lineHeight: "30px",
              fontWeight: 500,
              color: "var(--text-primary)",
              marginBottom: 16,
            }}
          >
            Author
          </h2>
          <p style={{ fontSize: 16, lineHeight: "26px", color: "var(--text-secondary)" }}>
            Nicolás Duarte Jaraba. Pre-registration and methodology sealed
            2026-04-22 under OSF registration{" "}
            <a
              href="https://osf.io/spmkg/overview?view_only=b2ba9087b4ac494f8255388d78af0321"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--accent-focus)", textDecoration: "none" }}
            >
              osf.io/spmkg
            </a>{" "}
            and git tag{" "}
            <span className="mono">v1.0.0-MSTAR-LOCKED</span>.
          </p>
        </section>

        {/* Citation */}
        <section style={{ marginBottom: 48 }}>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 22,
              lineHeight: "30px",
              fontWeight: 500,
              color: "var(--text-primary)",
              marginBottom: 16,
            }}
          >
            Citation
          </h2>
          <p
            style={{
              fontSize: 14,
              lineHeight: "22px",
              color: "var(--text-tertiary)",
              marginBottom: 12,
            }}
          >
            APA
          </p>
          <pre
            className="mono"
            style={{
              fontSize: 13,
              lineHeight: "22px",
              color: "var(--text-secondary)",
              backgroundColor: "var(--bg-panel)",
              padding: "16px 20px",
              borderRadius: 6,
              overflowX: "auto",
              marginBottom: 24,
              border: "1px solid var(--border-default)",
              whiteSpace: "pre-wrap",
            }}
          >
            {`Duarte Jaraba, N. (2026). The 45% Problem. Probabilistic Pricing for FIFA World Cup 2026. OSF. https://osf.io/spmkg/overview?view_only=b2ba9087b4ac494f8255388d78af0321`}
          </pre>
          <p
            style={{
              fontSize: 14,
              lineHeight: "22px",
              color: "var(--text-tertiary)",
              marginBottom: 12,
            }}
          >
            BibTeX
          </p>
          <pre
            className="mono"
            style={{
              fontSize: 13,
              lineHeight: "22px",
              color: "var(--text-secondary)",
              backgroundColor: "var(--bg-panel)",
              padding: "16px 20px",
              borderRadius: 6,
              overflowX: "auto",
              border: "1px solid var(--border-default)",
              whiteSpace: "pre-wrap",
            }}
          >
            {`@misc{duarte_jaraba_45_2026,
  title        = {The 45\\% Problem --- Probabilistic Pricing for {FIFA} {World Cup} 2026},
  author       = {Duarte Jaraba, Nicol\\'{a}s},
  year         = {2026},
  howpublished = {\\url{https://osf.io/spmkg/overview?view_only=b2ba9087b4ac494f8255388d78af0321}},
  note         = {Pre-registered, tag v1.0.0-MSTAR-LOCKED},
}`}
          </pre>
        </section>

        {/* Disclaimer */}
        <section>
          <p
            style={{
              fontSize: 12,
              lineHeight: "20px",
              color: "var(--text-quiet)",
              borderTop: "1px solid var(--border-subtle)",
              paddingTop: 24,
            }}
          >
            Research publication. No content on this site constitutes
            investment or gambling advice. See the{" "}
            <Link
              href="/vault/kill-criteria"
              style={{ color: "var(--text-quiet)", textDecoration: "underline" }}
            >
              kill-criteria statement
            </Link>{" "}
            for the pre-registered null-result conditions.
          </p>
        </section>
      </div>
    </div>
  );
}
