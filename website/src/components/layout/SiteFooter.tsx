import { loadSnapshotMeta } from "@/lib/data/loadSnapshot";

export function SiteFooter() {
  const meta = loadSnapshotMeta();

  return (
    <footer
      className="w-full mt-auto border-t px-4 py-6"
      style={{
        borderColor: "var(--border-subtle)",
        color: "var(--text-tertiary)",
      }}
    >
      <div className="max-w-screen-xl mx-auto space-y-2 text-[11px]">
        <p>
          <strong style={{ color: "var(--text-secondary)" }}>
            The 45% Problem
          </strong>{" "}
          — Probabilistic Pricing for FIFA World Cup 2026
        </p>
        <p>
          Research publication. No content on this site constitutes investment
          or gambling advice.
        </p>
        <p className="mono" style={{ color: "var(--text-tertiary)" }}>
          snapshot: {meta.snapshot_id} &nbsp;|&nbsp; code: {meta.code_sha}{" "}
          &nbsp;|&nbsp; data: {meta.data_sha}
        </p>
        <p>
          How to cite:{" "}
          <span className="mono">
            Duarte Jaraba, N. (2026). <em>The 45% Problem</em>. OSF.
            https://osf.io/8b5hd
          </span>
        </p>
      </div>
    </footer>
  );
}
