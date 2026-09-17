import Link from "next/link";

interface NavPanel {
  href: string;
  title: string;
  description: string;
  glyph: string;
}

const panels: NavPanel[] = [
  {
    href: "/terminal",
    title: "Divergence Terminal",
    description:
      "Full screener of all model-vs-market divergences, sortable by |E|, filterable by round, market, and gate status.",
    glyph: "◆",
  },
  {
    href: "/ledger",
    title: "Transparency Ledger",
    description:
      "Append-only record of every M★ forecast, settled and unsettled, with realized outcomes and calibration metrics.",
    glyph: "‖",
  },
  {
    href: "/vault",
    title: "Research Vault",
    description:
      "Phase 1 framework PDF, OSF pre-registration, model cards for M0. M★, glossary, and kill-criteria statement.",
    glyph: "●",
  },
  {
    href: "/bracket",
    title: "Bracket",
    description:
      "Full 48-team bracket with per-round conditional probabilities from the current M★ distribution.",
    glyph: "▲",
  },
];

export function ResearchVaultCTA() {
  return (
    <section aria-labelledby="vault-cta-heading">
      <h2
        id="vault-cta-heading"
        className="text-[13px] font-medium tracking-tight mb-3"
        style={{ color: "var(--text-primary)" }}
      >
        Explore the terminal
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {panels.map((panel) => (
          <Link
            key={panel.href}
            href={panel.href}
            className="block rounded border px-4 py-3 transition-colors duration-[120ms] group"
            style={{
              borderColor: "var(--border-default)",
              backgroundColor: "var(--bg-panel)",
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="mono text-[13px]"
                style={{ color: "var(--text-tertiary)" }}
                aria-hidden="true"
              >
                {panel.glyph}
              </span>
              <span
                className="text-[13px] font-medium group-hover:underline underline-offset-2"
                style={{
                  color: "var(--text-primary)",
                  textDecorationColor: "var(--accent-focus)",
                }}
              >
                {panel.title}
              </span>
            </div>
            <p
              className="text-[12px] leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {panel.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
