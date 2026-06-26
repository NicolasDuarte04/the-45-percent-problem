"use client";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { summarizeGateCoverage, type GateCoverage } from "@/lib/gateCoverage";

interface GateStatusPillProps {
  status: "OPEN" | "FIRED";
  rulesTripped?: string[];
  // Per-snapshot gate coverage (which rules ran vs are pending data). When
  // provided, even an OPEN pill carries a hover-card so it is never read as a
  // full five-rule pass. Omitted by callers with no coverage (e.g. the ledger).
  coverage?: GateCoverage | null;
  className?: string;
}

export function GateStatusPill({
  status,
  rulesTripped = [],
  coverage = null,
  className,
}: GateStatusPillProps) {
  const isFired = status === "FIRED";
  const cov = summarizeGateCoverage(coverage);

  const pill = (
    <span
      className={cn(
        "mono inline-flex items-center gap-1.5 px-1.5 py-px text-[11px] border font-medium",
        className
      )}
      style={{
        color: isFired ? "var(--text-primary)" : "var(--text-quiet)",
        borderColor: isFired ? "var(--prism-sun)" : "var(--border-subtle)",
        backgroundColor: isFired
          ? "color-mix(in oklch, var(--prism-sun) 10%, transparent)"
          : "transparent",
        borderRadius: "var(--radius-sm)",
      }}
      aria-label={`gate status ${status}${isFired && rulesTripped.length ? `, rules: ${rulesTripped.join(", ")}` : ""}${cov.pending.length ? `, ${cov.pending.length} rules pending data` : ""}`}
    >
      {isFired && (
        <span
          className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: "var(--prism-sun)" }}
          aria-hidden
        />
      )}
      {isFired ? "Gate tripped" : "Open"}
    </span>
  );

  const hasRules = isFired && rulesTripped.length > 0;
  const hasCoverage = cov.line !== null;
  if (!hasRules && !hasCoverage) {
    return pill;
  }

  return (
    <Tooltip>
      <TooltipTrigger className="cursor-default">{pill}</TooltipTrigger>
      <TooltipContent
        className="mono text-[11px] max-w-[280px]"
        style={{
          backgroundColor: "var(--bg-panel-elev)",
          border: "1px solid var(--border-default)",
          color: "var(--text-primary)",
        }}
      >
        {hasRules && (
          <div className={hasCoverage ? "mb-2" : ""}>
            <p className="font-medium mb-1" style={{ color: "var(--prism-sun)" }}>
              Rules tripped:
            </p>
            <ul className="list-none space-y-0.5">
              {rulesTripped.map((rule) => (
                <li key={rule} style={{ color: "var(--text-secondary)" }}>
                  ◆ {rule}
                </li>
              ))}
            </ul>
          </div>
        )}
        {hasCoverage && (
          <div className="space-y-0.5">
            <p className="font-medium" style={{ color: "var(--text-tertiary)" }}>
              Gate coverage
            </p>
            {cov.evaluated.length > 0 && (
              <p style={{ color: "var(--text-secondary)" }}>
                Evaluated: {cov.evaluated.join(", ")}
              </p>
            )}
            {cov.pending.length > 0 && (
              <p style={{ color: "var(--text-quiet)" }}>
                Pending data: {cov.pending.join(", ")}
              </p>
            )}
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
