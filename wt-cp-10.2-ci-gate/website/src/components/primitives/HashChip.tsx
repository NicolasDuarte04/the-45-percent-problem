"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { writeClipboardText } from "@/lib/clipboard";

interface HashChipProps {
  sha: string;
  kind: "code_sha" | "data_sha";
  className?: string;
}

export function HashChip({ sha, kind, className }: HashChipProps) {
  const [copied, setCopied] = useState(false);
  const short = sha.slice(0, 7);
  const label = kind === "code_sha" ? "code" : "data";

  async function handleCopy() {
    const ok = await writeClipboardText(sha);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "mono inline-flex items-center gap-1 px-1.5 py-px text-[10px] border",
        "transition-colors duration-[120ms] ease-out cursor-pointer",
        className
      )}
      style={{
        color: copied ? "var(--prism-cyan)" : "var(--text-quiet)",
        borderColor: copied ? "var(--prism-cyan)" : "var(--border-subtle)",
        backgroundColor: copied
          ? "color-mix(in oklch, var(--prism-cyan) 10%, transparent)"
          : "transparent",
        borderRadius: "var(--radius-sm)",
      }}
      aria-label={`${label} SHA ${sha}, click to copy`}
    >
      <span style={{ color: copied ? "var(--prism-cyan)" : "var(--text-quiet)", opacity: 0.7 }}>
        {label}:
      </span>
      <span>{copied ? "✓ copied" : short}</span>
    </button>
  );
}
