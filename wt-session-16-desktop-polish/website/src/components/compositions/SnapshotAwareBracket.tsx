"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import type { SnapshotInfo } from "@/lib/data/snapshotPicker";

interface SnapshotAwareBracketProps {
  current: SnapshotInfo;
  weekAgo: SnapshotInfo | null;
  children: ReactNode;
}

const HistoricalBracketBlock = dynamic(
  () =>
    import("./HistoricalBracketBlock").then((mod) => ({
      default: mod.HistoricalBracketBlock,
    })),
  {
    ssr: false,
    loading: () => <HistoricalLoadingShell />,
  },
);

export function SnapshotAwareBracket({
  current,
  weekAgo,
  children,
}: SnapshotAwareBracketProps) {
  const params = useSearchParams();
  const requested = params.get("snapshot");
  const isHistorical = Boolean(requested) && requested !== current.id;

  if (!isHistorical) {
    return <>{children}</>;
  }

  return (
    <HistoricalBracketBlock
      snapshotId={requested!}
      current={current}
      weekAgo={weekAgo}
    />
  );
}

function HistoricalLoadingShell() {
  return (
    <div
      className="mono"
      style={{
        fontSize: 12,
        letterSpacing: ".04em",
        color: "var(--text-tertiary)",
        padding: "48px 16px",
      }}
    >
      Loading historical snapshot...
    </div>
  );
}
