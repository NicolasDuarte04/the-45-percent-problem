"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { track } from "@/lib/analytics/track";

export interface SnapshotInfo {
  id: string;
  date: string;
  codeSha: string;
  daysOld: number;
  label: string;
}

interface SnapshotPickerProps {
  current: SnapshotInfo;
  weekAgo: SnapshotInfo | null;
  selectedId: string;
  basePath: string;
}

const PICKER_BTN_BASE: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: ".08em",
  textTransform: "uppercase",
  background: "transparent",
  color: "var(--text-primary)",
  padding: "5px 10px",
  borderRadius: 4,
  cursor: "pointer",
  transition: "border-color 120ms, color 120ms",
};

function PickerButton({
  label,
  selected,
  onClick,
  disabled,
}: {
  label: string;
  selected: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...PICKER_BTN_BASE,
        border: `1px solid ${selected ? "var(--accent-warm)" : "var(--border-default)"}`,
        color: selected ? "var(--text-primary)" : "var(--text-secondary)",
        cursor: disabled ? "default" : "pointer",
      }}
    >
      [ {label} ]
    </button>
  );
}

export function SnapshotPicker({
  current,
  weekAgo,
  selectedId,
  basePath,
}: SnapshotPickerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const goTo = (id: string) => {
    track("snapshot_toggle", { id });
    const href = id === current.id ? basePath : `${basePath}?snapshot=${id}`;
    startTransition(() => {
      router.push(href);
    });
  };

  const selectedDate =
    selectedId === current.id
      ? current.date
      : weekAgo && selectedId === weekAgo.id
        ? weekAgo.date
        : current.date;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 6,
        opacity: isPending ? 0.7 : 1,
        transition: "opacity 120ms",
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
        }}
      >
        MODEL STATE · {selectedDate}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <PickerButton
          label="CURRENT"
          selected={selectedId === current.id}
          onClick={() => goTo(current.id)}
        />
        {weekAgo ? (
          <PickerButton
            label="7 DAYS AGO"
            selected={selectedId === weekAgo.id}
            onClick={() => goTo(weekAgo.id)}
          />
        ) : (
          <span
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              color: "var(--text-quiet)",
              padding: "5px 10px",
              border: "1px solid var(--border-default)",
              borderRadius: 4,
            }}
          >
            [ Historical snapshots unavailable ]
          </span>
        )}
      </div>
    </div>
  );
}

interface SnapshotBannerProps {
  selected: SnapshotInfo;
  current: SnapshotInfo;
  basePath: string;
}

/**
 * Banner shown only when viewing a non-current snapshot. Provides the
 * `[ Return to current ]` affordance back to the live model state.
 */
export function SnapshotBanner({ selected, current, basePath }: SnapshotBannerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (selected.id === current.id) return null;

  const onReturn = () => {
    track("snapshot_toggle", { id: current.id });
    startTransition(() => {
      router.push(basePath);
    });
  };

  return (
    <div
      className="mono"
      style={{
        fontSize: 11,
        letterSpacing: ".04em",
        color: "var(--text-tertiary)",
        background: "var(--bg-elevated, transparent)",
        border: "1px solid var(--border-default)",
        borderRadius: 4,
        padding: "8px 12px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        opacity: isPending ? 0.7 : 1,
        transition: "opacity 120ms",
      }}
    >
      <span>
        Viewing snapshot from {selected.daysOld} days ago.
      </span>
      <button
        type="button"
        onClick={onReturn}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: "var(--text-primary)",
          background: "transparent",
          border: "1px solid var(--border-default)",
          borderRadius: 4,
          padding: "4px 10px",
          cursor: "pointer",
        }}
      >
        [ Return to current ]
      </button>
    </div>
  );
}
