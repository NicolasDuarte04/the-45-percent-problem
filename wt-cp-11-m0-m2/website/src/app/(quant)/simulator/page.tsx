/**
 * /simulator · Scenario Simulator (initial scaffold).
 *
 * Greenfield route. Reads tournament STRUCTURE through the canonical
 * Drizzle path (with TS fallback for environments without DATABASE_URL).
 * No hardcoded matchups anywhere: every team and every fixture rendered
 * here is sourced from the seeded Postgres tables (or, in fallback mode,
 * from the TS module that mirrors them).
 *
 * The interactive layer (running scenarios, propagating results through
 * the bracket, comparing model vs market) is intentionally stubbed; this
 * file establishes the data contract and renders a read-only view that
 * proves the wiring works.
 */

import {
  getStructuralGroups,
  getStructuralMatches,
  getStructuralVenues,
} from "@/lib/db/structuralData";
import { Flag } from "@/components/primitives/Flag";

// Force server-rendered execution so Drizzle / fs reads happen here.
export const dynamic = "force-static";

const ROUND_LABEL: Record<string, string> = {
  GRP: "Group Stage",
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarter-finals",
  SF: "Semi-finals",
  "3P": "Third-place play-off",
  FIN: "Final",
};

export default async function ScenarioSimulatorPage() {
  const [groups, matches] = await Promise.all([
    getStructuralGroups(),
    getStructuralMatches(),
  ]);
  const venues = getStructuralVenues();
  const venueByKey = new Map(venues.map((v) => [v.key, v]));

  const groupMatches = matches.filter((m) => m.round === "GRP");
  const knockoutMatches = matches.filter((m) => m.round !== "GRP");

  const totalTeams = Object.values(groups).reduce(
    (acc, list) => acc + list.length,
    0,
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <header className="mb-8 border-b border-stone-200 pb-6 dark:border-stone-800">
        <h1 className="font-serif text-3xl font-medium leading-tight text-stone-900 dark:text-stone-100">
          Scenario Simulator
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          Initial state for every scenario is the official 2026 World Cup
          draw: {totalTeams} qualified teams across 12 groups, with
          {" "}{groupMatches.length} group-stage and {knockoutMatches.length}{" "}
          knockout fixtures. Data is sourced from the canonical Postgres
          tables; no team pairings are hard-coded in this page or in any
          downstream component.
        </p>
      </header>

      {/* Group grid */}
      <section className="mb-12">
        <h2 className="mb-4 font-serif text-xl text-stone-900 dark:text-stone-100">
          Groups A-L
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.entries(groups) as [string, typeof groups[keyof typeof groups]][]).map(
            ([letter, teams]) => (
              <div
                key={letter}
                className="rounded-md border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-950"
              >
                <h3 className="mb-3 flex items-baseline justify-between font-mono text-sm tracking-wide text-stone-500 dark:text-stone-400">
                  <span>Group {letter}</span>
                  <span className="text-xs">{teams.length} teams</span>
                </h3>
                <ul className="space-y-1.5">
                  {teams.map((t) => (
                    <li
                      key={t.fifa_code}
                      className="flex items-center gap-2 text-sm text-stone-800 dark:text-stone-200"
                    >
                      <Flag code={t.fifa_code} className="h-3.5 w-5 shrink-0" />
                      <span className="font-medium">{t.display_name}</span>
                      <span className="ml-auto font-mono text-xs text-stone-400">
                        Pot {t.draw_pot}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ),
          )}
        </div>
      </section>

      {/* Group-stage fixture preview */}
      <section className="mb-12">
        <h2 className="mb-4 font-serif text-xl text-stone-900 dark:text-stone-100">
          Group-stage fixtures (first 10)
        </h2>
        <p className="mb-4 max-w-2xl text-xs text-stone-500 dark:text-stone-400">
          Once the simulator&rsquo;s interactive layer ships, picking a
          result here will propagate through the bracket below.
        </p>
        <ol className="overflow-hidden rounded-md border border-stone-200 dark:border-stone-800">
          {groupMatches.slice(0, 10).map((m) => {
            const venue = venueByKey.get(m.venue_key);
            const dt = new Date(m.kickoff_utc);
            return (
              <li
                key={m.match_id}
                className="flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-3 text-sm last:border-b-0 dark:border-stone-800 dark:bg-stone-950"
              >
                <span className="font-mono text-xs text-stone-400">
                  {m.match_id}
                </span>
                <span className="rounded bg-stone-100 px-2 py-0.5 font-mono text-[11px] text-stone-600 dark:bg-stone-900 dark:text-stone-400">
                  Group {m.group}
                </span>
                <div className="flex flex-1 items-center justify-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <Flag code={m.home_code ?? ""} className="h-3.5 w-5" />
                    <span className="font-medium">{m.home_code}</span>
                  </span>
                  <span className="text-stone-400">vs</span>
                  <span className="flex items-center gap-1.5">
                    <Flag code={m.away_code ?? ""} className="h-3.5 w-5" />
                    <span className="font-medium">{m.away_code}</span>
                  </span>
                </div>
                <span className="text-xs text-stone-500">
                  {dt.toUTCString().slice(0, 16)} UTC
                </span>
                <span className="hidden text-xs text-stone-400 sm:inline">
                  {venue?.city}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Knockout slots */}
      <section>
        <h2 className="mb-4 font-serif text-xl text-stone-900 dark:text-stone-100">
          Knockout pathway ({knockoutMatches.length} slots)
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {(["R32", "R16", "QF", "SF", "3P", "FIN"] as const).map((round) => {
            const inRound = knockoutMatches.filter((m) => m.round === round);
            return (
              <div
                key={round}
                className="rounded-md border border-stone-200 p-3 text-sm dark:border-stone-800"
              >
                <h3 className="mb-2 font-mono text-xs uppercase tracking-wide text-stone-500">
                  {ROUND_LABEL[round]} ({inRound.length})
                </h3>
                <ul className="space-y-1 font-mono text-xs text-stone-700 dark:text-stone-300">
                  {inRound.map((m) => (
                    <li key={m.match_id} className="flex items-center gap-2">
                      <span className="text-stone-400">{m.match_id}</span>
                      <span>
                        {m.home_slot} <span className="text-stone-400">vs</span>{" "}
                        {m.away_slot}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="mt-12 border-t border-stone-200 pt-4 text-xs text-stone-500 dark:border-stone-800">
        Source: <code>src/lib/db/structuralData.ts</code> →{" "}
        <code>teams</code> / <code>matches</code> via Drizzle (or canonical
        TS fallback). Probabilities are not yet joined in this scaffold.
      </footer>
    </div>
  );
}
