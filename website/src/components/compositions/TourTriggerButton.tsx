"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { TourStep } from "./CanvasTour";

type Variant = "masthead" | "inline";

export function TourTriggerButton({
  steps,
  durationSeconds,
  paramName = "guide",
  variant = "masthead",
}: {
  steps: TourStep[];
  durationSeconds: number;
  paramName?: string;
  variant?: Variant;
}) {
  const pathname = usePathname();
  const params = useSearchParams();

  const sp = new URLSearchParams(params.toString());
  sp.set(paramName, "1");
  const href = `${pathname}?${sp.toString()}`;

  if (variant === "inline") {
    return (
      <Link
        href={href}
        scroll={false}
        aria-keyshortcuts="?"
        className="transition-colors duration-[120ms] hover:underline"
        style={{ color: "var(--accent-focus)" }}
      >
        Open the guided walkthrough &rarr;
      </Link>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Link
        href={href}
        scroll={false}
        aria-keyshortcuts="?"
        className="px-2 py-1 text-[11px] transition-colors duration-[120ms]"
        style={{
          color: "var(--text-tertiary)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 2,
        }}
      >
        How to read this
      </Link>
      <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
        Guided tour &middot; {steps.length} steps &middot; ~{durationSeconds}s
      </span>
    </div>
  );
}
