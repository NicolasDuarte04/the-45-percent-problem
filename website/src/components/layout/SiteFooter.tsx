import Link from "next/link";
import { loadSnapshotMeta } from "@/lib/data/loadSnapshot";

// cp-39: compact footer nav so the previously orphaned editorial pages
// (About, Methodology, Teams, the Briefs archive) and the OSF preregistration
// are reachable from every page. The OSF link points at the same
// preregistration the Cite column references.
const OSF_URL = "https://osf.io/spmkg/overview?view_only=b2ba9087b4ac494f8255388d78af0321";

const FOOTER_LINKS: { label: string; href: string; external?: boolean }[] = [
  { label: "About", href: "/about" },
  { label: "Methodology", href: "/methodology" },
  { label: "Teams", href: "/teams" },
  { label: "Briefs archive", href: "/briefs" },
  { label: "OSF", href: OSF_URL, external: true },
];

export function SiteFooter() {
  const meta = loadSnapshotMeta();

  return (
    <footer
      className="w-full mt-auto border-t px-4"
      style={{
        borderColor: "var(--border-default)",
        color: "var(--text-tertiary)",
        marginTop: 80,
        paddingTop: 40,
        paddingBottom: 32,
      }}
    >
      <nav
        aria-label="Site"
        className="max-w-screen-xl mx-auto flex flex-wrap items-center gap-x-6 gap-y-2 mb-10 pb-8 border-b"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        {FOOTER_LINKS.map((link) =>
          link.external ? (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="no-underline mono text-[11px] uppercase tracking-[.06em] hover:underline underline-offset-4"
              style={{ color: "var(--text-secondary)" }}
            >
              {link.label}
            </a>
          ) : (
            <Link
              key={link.label}
              href={link.href}
              className="no-underline mono text-[11px] uppercase tracking-[.06em] hover:underline underline-offset-4"
              style={{ color: "var(--text-secondary)" }}
            >
              {link.label}
            </Link>
          ),
        )}
      </nav>

      <div className="max-w-screen-xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 text-[11px]">
        {/* Col 1 · Research description */}
        <div className="space-y-2">
          <div
            className="mono text-[10px] uppercase tracking-[.08em]"
            style={{ color: "var(--text-quiet)" }}
          >
            About
          </div>
          <p style={{ color: "var(--text-secondary)" }}>
            <strong style={{ color: "var(--text-primary)" }}>
              The 45% Problem
            </strong>{" "}
. Probabilistic Pricing for FIFA World Cup 2026.
          </p>
          <p>
            Research publication. No content on this site constitutes investment
            or gambling advice.
          </p>
        </div>

        {/* Col 2. Technical metadata (SHA / data / snapshot) */}
        <div className="space-y-2">
          <div
            className="mono text-[10px] uppercase tracking-[.08em]"
            style={{ color: "var(--text-quiet)" }}
          >
            Provenance
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 mono">
            <dt style={{ color: "var(--text-quiet)" }}>snapshot</dt>
            <dd style={{ color: "var(--text-secondary)" }}>{meta.snapshot_id}</dd>
            <dt style={{ color: "var(--text-quiet)" }}>code</dt>
            <dd style={{ color: "var(--text-secondary)" }}>{meta.code_sha}</dd>
            <dt style={{ color: "var(--text-quiet)" }}>data</dt>
            <dd style={{ color: "var(--text-secondary)" }}>{meta.data_sha}</dd>
          </dl>
        </div>

        {/* Col 3 · Citation */}
        <div className="space-y-2">
          <div
            className="mono text-[10px] uppercase tracking-[.08em]"
            style={{ color: "var(--text-quiet)" }}
          >
            Cite
          </div>
          <p className="mono leading-relaxed">
            Duarte Jaraba, N. (2026).{" "}
            <em style={{ color: "var(--text-secondary)" }}>
              The 45% Problem
            </em>
            . OSF.{" "}
            <a
              href="https://osf.io/spmkg/overview?view_only=b2ba9087b4ac494f8255388d78af0321"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--accent-focus)", textDecoration: "none" }}
            >
              osf.io/spmkg
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
