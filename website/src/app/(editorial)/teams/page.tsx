import type { Metadata } from "next";
import Link from "next/link";
import { COUNTRY_NAMES, type FifaCode } from "@/lib/flags/countries";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Teams | 45analytics",
  description:
    "All 48 qualified teams in the 2026 FIFA World Cup. Each team links to its progression page: model probability over time from group stage to champion.",
};

interface TeamRow {
  code: FifaCode;
  name: string;
}

function loadTeams(): TeamRow[] {
  return (Object.entries(COUNTRY_NAMES) as [FifaCode, string][])
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export default function TeamsIndexPage() {
  const teams = loadTeams();

  return (
    <div
      className="mx-auto"
      style={{
        maxWidth: 1152,
        padding: "clamp(40px, 6vw, 64px) clamp(16px, 4vw, 48px)",
        color: "var(--text-primary)",
      }}
    >
      <header style={{ maxWidth: 720, marginBottom: 48 }}>
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
          Teams
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
          The 48 qualified teams
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
          Every team links to its progression page: the model&rsquo;s
          probability over time from group stage to champion, its group-stage
          standing, and its bracket-path projections.
        </p>
      </header>

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "8px 24px",
        }}
      >
        {teams.map((team) => (
          <li key={team.code}>
            <Link
              href={`/team/${team.code}`}
              className="no-underline"
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 12,
                padding: "10px 0",
                borderBottom: "1px solid var(--rule)",
                color: "var(--text-primary)",
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: 11,
                  letterSpacing: ".06em",
                  color: "var(--text-tertiary)",
                  width: 36,
                }}
              >
                {team.code}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 16,
                  lineHeight: 1.4,
                }}
              >
                {team.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
