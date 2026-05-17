import { loadSnapshotMeta } from "@/lib/data/loadSnapshot";

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
