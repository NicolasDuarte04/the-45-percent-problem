import { cn } from "@/lib/utils";

interface KillCriteriaBannerProps {
  active: boolean;
  condition?: string;
  className?: string;
}

export function KillCriteriaBanner({ active, condition, className }: KillCriteriaBannerProps) {
  if (!active) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "w-full px-4 py-2 flex items-center gap-3 border-b",
        className
      )}
      style={{
        backgroundColor: "rgba(252,165,165,0.08)",
        borderColor: "var(--edge-negative)",
        color: "var(--edge-negative)",
      }}
    >
      <span className="mono text-[11px] font-medium" aria-hidden>◆</span>
      <span className="mono text-[11px]">
        KILL CRITERIA TRIPPED
        {condition ? `: ${condition}` : ""}
        {". "}
        Kill criterion tripped. See dual-SE reading for context at{" "}
        <a
          href="/vault/kill-criteria"
          className="underline underline-offset-2"
          style={{ color: "var(--edge-negative)" }}
        >
          /vault/kill-criteria
        </a>
        .
      </span>
    </div>
  );
}
