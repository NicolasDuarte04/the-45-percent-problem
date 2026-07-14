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
  // Some sources store the hash with a "sha256:" algorithm prefix (data_sha in
  // snapshot_meta) and some without (code_sha, ledger data_sha). "sha256:" is
  // exactly 7 chars, so slicing the first 7 off a prefixed value yields a bare
  // "sha256:" and drops the whole hash. Strip the prefix first so the truncated
  // chip always shows real hash digits; the full value stays available on tap
  // (copy) and in the aria-label.
  const digits = sha.replace(/^sha256:/i, "");
  const short = digits.slice(0, 7);
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
