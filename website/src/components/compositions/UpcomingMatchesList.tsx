import Link from "next/link";
import type { TeamUpcomingItem } from "@/lib/data/matchListing";

interface UpcomingMatchesListProps {
  matches: TeamUpcomingItem[];
  fifaCode: string;
}

export function UpcomingMatchesList({
  matches,
  fifaCode,
}: UpcomingMatchesListProps) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div className="flex justify-between items-baseline px-4 pt-4 pb-3">
        <div>
          <h3
            className="text-[13px] font-medium"
            style={{
              fontFamily: "var(--font-sans)",
              color: "var(--text-primary)",
            }}
          >
            Upcoming fixtures
          </h3>
          <div
            className="mono text-[11px] mt-[3px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            group-stage and knockout matches resolved from the draw
          </div>
        </div>
        <span
          className="mono text-[10px] uppercase tracking-[.08em]"
          style={{ color: "var(--text-quiet)" }}
        >
          {matches.length} fixtures
        </span>
      </div>

      {matches.length === 0 ? (
        <div
          className="px-4 py-6 mono text-[12px] text-center"
          style={{
            borderTop: "1px solid var(--border-subtle)",
            color: "var(--text-tertiary)",
          }}
        >
          No upcoming fixtures in the snapshot. {fifaCode} may have been
          eliminated or the draw is pending.
        </div>
      ) : (
        matches.map((m) => {
          const kickoff = new Date(m.kickoff_utc);
          const kickoffLabel =
            kickoff.toISOString().replace("T", " ").slice(0, 16) + "Z";
          // Live knockout cards live in the separate, explicitly ungraded
          // /match/live/[id] route; graded group cards go to /match/[id].
          const href = m.is_live_knockout
            ? `/match/live/${m.match_id}`
            : `/match/${m.match_id}`;
          return (
            <Link
              key={m.match_id}
              href={href}
              className="grid items-center transition-colors duration-[120ms]"
              style={{
                gridTemplateColumns: "1fr auto auto",
                gap: 16,
                padding: "11px 16px",
                borderTop: "1px solid var(--border-subtle)",
              }}
            >
              <span
                className="mono text-[12px]"
                style={{ color: "var(--accent-focus)" }}
              >
                {m.match_id}
              </span>
              <span
                className="mono text-[12px]"
                style={{ color: "var(--text-primary)" }}
              >
                {m.is_home ? "vs" : "at"} {m.opponent}
              </span>
              <span
                className="mono text-[11px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                {kickoffLabel}
              </span>
            </Link>
          );
        })
      )}
    </div>
  );
}
