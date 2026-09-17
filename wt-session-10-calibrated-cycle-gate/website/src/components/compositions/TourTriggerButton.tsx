"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Info } from "lucide-react";
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
    <div className="flex flex-col items-end gap-1.5">
      <Link
        href={href}
        scroll={false}
        aria-keyshortcuts="?"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium transition-colors duration-[120ms]"
        style={{
          color: "var(--text-secondary)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius)",
        }}
      >
        <Info size={12} strokeWidth={2} aria-hidden />
        How to read this
      </Link>
      <span className="mono text-[10px]" style={{ color: "var(--text-quiet)" }}>
        Guided tour &middot; {steps.length} steps &middot; ~{durationSeconds}s
      </span>
    </div>
  );
}
