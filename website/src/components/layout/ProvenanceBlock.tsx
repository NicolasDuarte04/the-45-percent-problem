import { HashChip } from "@/components/primitives/HashChip";
import type { SnapshotMeta } from "@/lib/data/schemas";

/**
 * Shared provenance strip (hash chips + OSF pre-reg link). Rendered at the
 * foot of quant routes that display snapshot-derived content.
 */
export function ProvenanceBlock({ meta }: { meta: SnapshotMeta }) {
  return (
    <div
      className="rounded-lg"
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border-subtle)",
        padding: "14px 16px",
      }}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className="mono text-[10px] uppercase tracking-[.08em]"
          style={{ color: "var(--text-quiet)" }}
        >
          provenance
        </span>
        <HashChip sha={meta.code_sha} kind="code_sha" />
        <HashChip sha={meta.data_sha} kind="data_sha" />
        <span className="flex-1" />
        <span
          className="mono text-[11px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          pre-registered ·{" "}
          <a
            href="https://osf.io/8b5hd"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent-focus)", textDecoration: "none" }}
          >
            osf.io/8b5hd
          </a>
        </span>
      </div>
    </div>
  );
}
