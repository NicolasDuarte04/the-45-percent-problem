"use client";

import { useSearchParams } from "next/navigation";
import { SnapshotUnavailableNotice } from "./SnapshotUnavailableNotice";

interface SnapshotParamNoticeProps {
  /** The snapshot id this view actually renders (the current one). */
  currentId: string;
  variant?: "pruned" | "unsupported" | "error";
}

/**
 * cp-39 · Client reader for the ?snapshot= param on views that are served as
 * static HTML (the terminal), where the server render has no access to the
 * query string. When a snapshot is requested that this view cannot show, it
 * renders the honest fallback notice instead of silently showing the current
 * snapshot as if it were the requested one. Must be wrapped in a <Suspense>
 * boundary by the caller (useSearchParams requirement on static routes).
 */
export function SnapshotParamNotice({
  currentId,
  variant = "unsupported",
}: SnapshotParamNoticeProps) {
  const requested = useSearchParams().get("snapshot");
  if (!requested || requested === currentId) return null;
  // Own bottom margin so it only occupies space when it actually renders (the
  // common no-param terminal load stays visually unchanged).
  return (
    <div style={{ marginBottom: 16 }}>
      <SnapshotUnavailableNotice
        requestedId={requested}
        currentId={currentId}
        variant={variant}
      />
    </div>
  );
}
