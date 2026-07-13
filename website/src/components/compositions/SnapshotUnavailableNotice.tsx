import type { CSSProperties } from "react";

type Variant = "pruned" | "unsupported" | "error";

interface SnapshotUnavailableNoticeProps {
  /** The snapshot id the visitor asked for via ?snapshot=. */
  requestedId: string;
  /** The snapshot id actually being shown (the current one). */
  currentId: string;
  /**
   * pruned: the id is unknown or retention-pruned from the online store.
   * unsupported: this view only ever shows the current snapshot.
   * error: a transient failure loading the requested snapshot.
   */
  variant?: Variant;
}

/**
 * cp-39 · Honest notice for an unavailable ?snapshot= deep link.
 *
 * The requested id could not be shown, so the page falls back to the current
 * snapshot. That fallback is fine; doing it silently, while the page still
 * names a snapshot as if it were traceable, is not. This banner makes the
 * substitution explicit and names both ids.
 */
export function SnapshotUnavailableNotice({
  requestedId,
  currentId,
  variant = "pruned",
}: SnapshotUnavailableNoticeProps) {
  const message =
    variant === "unsupported"
      ? `This view always shows the current snapshot ${currentId}. Snapshot ${requestedId} is not shown here; historical snapshots are available on the home and bracket pages, and pruned snapshots remain in the repository history.`
      : variant === "error"
        ? `Snapshot ${requestedId} could not be loaded right now. Showing the current snapshot ${currentId} instead.`
        : `Snapshot ${requestedId} is no longer retained online. Showing the current snapshot ${currentId} instead. Pruned snapshots remain available in the repository history.`;

  const style: CSSProperties = {
    fontSize: 11,
    letterSpacing: ".02em",
    lineHeight: 1.6,
    color: "var(--text-tertiary)",
    background: "var(--bg-panel)",
    border: "1px solid var(--border-default)",
    borderRadius: 4,
    padding: "8px 12px",
  };

  return (
    <div role="status" className="mono" style={style}>
      {message}
    </div>
  );
}
