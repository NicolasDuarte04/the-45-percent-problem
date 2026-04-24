import { HashChip } from "@/components/primitives/HashChip";
import { cn } from "@/lib/utils";

interface BylineProps {
  author: string;
  codeSha?: string;
  doi?: string;
  className?: string;
}

export function Byline({ author, codeSha, doi, className }: BylineProps) {
  return (
    <div
      className={cn(
        "vault-byline flex flex-wrap items-center gap-x-3 gap-y-2",
        className,
      )}
    >
      <span>
        By <span style={{ color: "var(--text-primary)" }}>{author}</span>
      </span>
      {codeSha ? (
        <>
          <span style={{ color: "var(--text-quiet)" }} aria-hidden>
            ·
          </span>
          <HashChip sha={codeSha} kind="code_sha" />
        </>
      ) : null}
      {doi ? (
        <>
          <span style={{ color: "var(--text-quiet)" }} aria-hidden>
            ·
          </span>
          <span
            className="mono"
            style={{
              fontSize: 12,
              color: "var(--text-tertiary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: "1px 6px",
            }}
            aria-label={`DOI ${doi}`}
          >
            <span style={{ color: "var(--text-quiet)", opacity: 0.7 }}>doi:</span>{" "}
            {doi}
          </span>
        </>
      ) : null}
    </div>
  );
}
