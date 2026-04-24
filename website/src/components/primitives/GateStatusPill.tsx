"use client";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface GateStatusPillProps {
  status: "OPEN" | "FIRED";
  rulesTripped?: string[];
  className?: string;
}

export function GateStatusPill({ status, rulesTripped = [], className }: GateStatusPillProps) {
  const isFired = status === "FIRED";

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
      aria-label={`gate status ${status}${isFired && rulesTripped.length ? `, rules: ${rulesTripped.join(", ")}` : ""}`}
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

  if (isFired && rulesTripped.length > 0) {
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
        </TooltipContent>
      </Tooltip>
    );
  }

  return pill;
}
