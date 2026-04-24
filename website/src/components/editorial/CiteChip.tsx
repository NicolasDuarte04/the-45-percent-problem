"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface CiteChipProps {
  /** The BibTeX body to copy. Rendered inline (monospace) and copyable. */
  bibtex: string;
  /** Optional APA-format citation rendered above the BibTeX block. */
  apa?: string;
  className?: string;
}

/**
 * §8.11 — click-to-copy BibTeX chip for the foot of any Vault article.
 * "Cite this snapshot" wording is supplied by the article so the snapshot id
 * is baked into the citation body itself.
 */
export function CiteChip({ bibtex, apa, className }: CiteChipProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(bibtex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {apa ? (
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 14,
            lineHeight: "22px",
            color: "var(--text-tertiary)",
            margin: 0,
          }}
        >
          {apa}
        </p>
      ) : null}
      <div style={{ position: "relative" }}>
        <pre className="vault-citechip" aria-label="BibTeX citation">
          {bibtex}
        </pre>
        <button
          type="button"
          onClick={handleCopy}
          className="mono"
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            fontSize: 11,
            padding: "3px 8px",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
            background: copied
              ? "color-mix(in oklch, var(--prism-cyan) 12%, var(--bg-panel-elev))"
              : "var(--bg-panel-elev)",
            color: copied ? "var(--prism-cyan)" : "var(--text-tertiary)",
            cursor: "pointer",
            transition: "color 120ms ease-out, background 120ms ease-out",
          }}
          aria-label="Copy BibTeX to clipboard"
        >
          {copied ? "\u2713 copied" : "copy"}
        </button>
      </div>
    </div>
  );
}
