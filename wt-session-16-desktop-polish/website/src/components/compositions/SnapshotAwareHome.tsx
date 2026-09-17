"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import type { SnapshotInfo } from "@/lib/data/snapshotPicker";

interface SnapshotAwareHomeProps {
  current: SnapshotInfo;
  weekAgo: SnapshotInfo | null;
  children: ReactNode;
}

const HistoricalHomeBlock = dynamic(
  () =>
    import("./HistoricalHomeBlock").then((mod) => ({
      default: mod.HistoricalHomeBlock,
    })),
  {
    ssr: false,
    loading: () => <HistoricalLoadingShell />,
  },
);

export function SnapshotAwareHome({
  current,
  weekAgo,
  children,
}: SnapshotAwareHomeProps) {
  const params = useSearchParams();
  const requested = params.get("snapshot");
  const isHistorical = Boolean(requested) && requested !== current.id;

  if (!isHistorical) {
    return <>{children}</>;
  }

  return (
    <HistoricalHomeBlock
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
        padding: "48px 0",
      }}
    >
      Loading historical snapshot...
    </div>
  );
}
