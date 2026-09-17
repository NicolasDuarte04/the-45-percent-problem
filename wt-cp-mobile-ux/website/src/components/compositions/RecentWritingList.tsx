import Link from "next/link";

interface VaultEntry {
  kind: "Essay" | "Protocol" | "Note" | "Data";
  title: string;
  authors?: string;
  kicker: string;
  date: string;
  href: string;
}

interface RecentWritingListProps {
  /**
   * Default byline used for any entry that omits its own `authors` field.
   * Swap to your real name (e.g. "Nicolás Duarte") or keep the house byline.
   */
  defaultAuthor?: string;
  /** Override the entries list entirely. */
  entries?: VaultEntry[];
}

// Single source of truth for the default byline. The placeholder names from
// the original design comp (J. Ribeiro, A. Lenehan, M. Osei) have been removed.
const DEFAULT_AUTHOR = "45analytics Research";

// Seeded from the research programme's editorial calendar, not the snapshot.
// Update in-place when new writing lands; this is static authored content.
const DEFAULT_ENTRIES: VaultEntry[] = [
  {
    kind: "Essay",
    title: "The 45% problem, in three figures",
    kicker: "Phase 1 findings",
    date: "2026-05-20",
    href: "/vault",
  },
  {
    kind: "Protocol",
    title: "Pre-registration, amendments, and failure modes",
    kicker: "Methodology · v12.1",
    date: "2026-04-02",
    href: "/vault/preregistration",
  },
  {
    kind: "Note",
    title: "Why we publish a ledger, not a record",
    kicker: "Editorial · short",
    date: "2026-03-15",
    href: "/ledger",
  },
  {
    kind: "Essay",
    title: "Calibration, sharpness, and the tyranny of accuracy",
    kicker: "Research · 18 min",
    date: "2026-02-28",
    href: "/vault/models",
  },
];

export function RecentWritingList({
  defaultAuthor = DEFAULT_AUTHOR,
  entries = DEFAULT_ENTRIES,
}: RecentWritingListProps = {}) {
  return (
    <div>
      {entries.map((e) => (
        <Link
          key={`${e.kind}-${e.title}`}
          href={e.href}
          className="no-underline"
          style={{
            display: "grid",
            gridTemplateColumns: "96px 1fr 160px",
            gap: 24,
            alignItems: "baseline",
            padding: "20px 0",
            borderBottom: "1px solid var(--rule)",
          }}
        >
          <span
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              letterSpacing: ".06em",
              textTransform: "uppercase",
            }}
          >
            {e.kind}
          </span>
          <div>
            <h4
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 400,
                fontSize: 19,
                margin: "0 0 4px",
                color: "var(--text-primary)",
                letterSpacing: "-0.01em",
              }}
            >
              {e.title}
            </h4>
            <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
              {(e.authors ?? defaultAuthor)} · {e.kicker}
            </div>
          </div>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              textAlign: "right",
            }}
          >
            {e.date}
          </div>
        </Link>
      ))}
    </div>
  );
}
