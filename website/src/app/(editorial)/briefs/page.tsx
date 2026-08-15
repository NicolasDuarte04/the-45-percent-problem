import type { Metadata } from "next";
import Link from "next/link";
import { listAvailableBriefs, type BriefSample } from "@/lib/brief";

// Briefs change daily; revalidate every 10 minutes so the index picks up the
// cron's nightly write without rebuilding the whole site. Phase 4 will trigger
// a targeted revalidation via webhook for instant freshness on dispatch day.
export const revalidate = 600;

export const metadata: Metadata = {
  title: "Brief Archive | 45analytics",
  description:
    "Every 45analytics daily brief from the World Cup 2026 run, reverse-chronological. A completed, fully readable archive.",
};

function rowSummary(brief: BriefSample): string {
  // Neutral, non-ranked row summary: the calibration-channel movers line
  // (tournament probability movers). The archive index deliberately does not
  // rank or headline any single market divergence (no "biggest edge of the
  // day"); it points to the issue. We use movers_line, not summary_line,
  // because summary_line is a free-text headline that may lead with the
  // largest market divergence; movers_line is the calibration summary.
  return brief.headline.movers_line || "Daily model brief.";
}

export default async function BriefsArchivePage() {
  const briefs = await listAvailableBriefs();

  return (
    <div
      className="mx-auto"
      style={{
        maxWidth: 1152,
        padding: "clamp(40px, 6vw, 64px) clamp(16px, 4vw, 48px)",
        color: "var(--text-primary)",
      }}
    >
      <header style={{ maxWidth: 720, marginBottom: 40 }}>
        <div
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
            marginBottom: 14,
          }}
        >
          Brief archive
        </div>
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            letterSpacing: "-0.015em",
            fontSize: 36,
            lineHeight: 1.1,
            margin: 0,
            color: "var(--text-primary)",
          }}
        >
          Every dispatch, fully readable, no signup
        </h1>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            lineHeight: 1.7,
            color: "var(--text-secondary)",
            margin: "16px 0 0",
          }}
        >
          Past issues of the 45analytics daily brief. Quiet days are listed
          with the same visual weight as active ones; the model does not
          manufacture output.
        </p>
      </header>

      {briefs.length === 0 ? (
        <ArchiveEmptyState />
      ) : (
        <ArchiveList briefs={briefs} />
      )}
    </div>
  );
}

function ArchiveList({ briefs }: { briefs: BriefSample[] }) {
  return (
    <ul
      style={{
        listStyle: "none",
        padding: 0,
        margin: 0,
      }}
      aria-label="All published briefs, newest first"
    >
      {briefs.map((b) => (
        <li
          key={b.brief_date}
          style={{ borderTop: "1px solid var(--rule)", padding: "16px 0" }}
        >
          <Link
            href={`/briefs/${b.brief_date}`}
            className="no-underline"
            style={{ color: "var(--text-primary)", display: "block" }}
          >
            <div
              style={{
                display: "flex",
                gap: 16,
                alignItems: "baseline",
                flexWrap: "wrap",
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: 11,
                  letterSpacing: ".08em",
                  color: "var(--text-tertiary)",
                  width: 88,
                  display: "inline-block",
                }}
              >
                ISSUE {String(b.issue_number).padStart(3, "0")}
              </span>
              <span
                className="mono"
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  width: 120,
                }}
              >
                {b.brief_date}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  color: "var(--text-primary)",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {rowSummary(b)}
              </span>
              <span
                className="mono"
                style={{
                  fontSize: 11,
                  letterSpacing: ".06em",
                  color: "var(--text-tertiary)",
                  whiteSpace: "nowrap",
                }}
              >
                [READ →]
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ArchiveEmptyState() {
  return (
    <section
      style={{
        maxWidth: 640,
        padding: "20px 24px",
        border: "1px solid var(--rule)",
        borderRadius: 2,
        background: "var(--bg-panel-elev)",
      }}
      aria-label="No briefs in this archive"
    >
      <div
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: ".10em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
          marginBottom: 8,
        }}
      >
        ◆ Archive
      </div>
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 18,
          lineHeight: 1.45,
          color: "var(--text-primary)",
          margin: "0 0 12px",
        }}
      >
        No dispatches in this archive.
      </p>
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          lineHeight: 1.7,
          color: "var(--text-secondary)",
          margin: 0,
        }}
      >
        The brief ran daily through the World Cup 2026 window; its published
        issues are collected here.
      </p>
    </section>
  );
}
