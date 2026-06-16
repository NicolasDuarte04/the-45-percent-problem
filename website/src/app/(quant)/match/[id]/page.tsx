import Link from "next/link";
import { notFound } from "next/navigation";
import {
  loadLedger,
  loadMatchIfPresent,
  loadSnapshotMeta,
} from "@/lib/data/loadSnapshot";
import {
  getStructuralMatches,
  getStructuralVenues,
  type StructuralMatch,
} from "@/lib/db/structuralData";
import { loadStructuralMaps, mergeMatch } from "@/lib/db/structuralMerge";
import { MatchHeader } from "@/components/compositions/MatchHeader";
import { Flag } from "@/components/primitives/Flag";
import { MarketBreakdownPanel } from "@/components/compositions/MarketBreakdownPanel";
import { GoalMatrixHeatmap } from "@/components/compositions/GoalMatrixHeatmap";
import { StrengthInputsPanel } from "@/components/compositions/StrengthInputsPanel";
import { RelatedLedgerRecords } from "@/components/compositions/RelatedLedgerRecords";
import { ProvenanceBlock } from "@/components/layout/ProvenanceBlock";
import { TransparencyNote } from "@/components/compositions/TransparencyNote";

export const dynamic = "force-static";

const ROUND_LABELS: Record<StructuralMatch["round"], string> = {
  GRP: "Group Stage",
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarter-final",
  SF: "Semi-final",
  "3P": "Third-place playoff",
  FIN: "Final",
};

/**
 * Human-readable label for a knockout slot descriptor.
 *   "1A"         → "Winner Group A"
 *   "2C"         → "Runner-up Group C"
 *   "BEST3-CDEFI"→ "Best 3rd (C/D/E/F/I)"
 *   "WM73"       → "Winner M73"
 *   "LM101"      → "Loser M101"
 */
function formatSlot(slot: string): string {
  const grpWinner = /^1([A-L])$/.exec(slot);
  if (grpWinner) return `Winner Group ${grpWinner[1]}`;

  const grpRunnerUp = /^2([A-L])$/.exec(slot);
  if (grpRunnerUp) return `Runner-up Group ${grpRunnerUp[1]}`;

  const best3 = /^BEST3-([A-L]+)$/.exec(slot);
  if (best3) return `Best 3rd (${best3[1].split("").join("/")})`;

  const winnerMatch = /^WM(\d+)$/.exec(slot);
  if (winnerMatch) return `Winner M${winnerMatch[1]}`;

  const loserMatch = /^LM(\d+)$/.exec(slot);
  if (loserMatch) return `Loser M${loserMatch[1]}`;

  return slot;
}

export async function generateStaticParams() {
  // All 104 structural fixtures get a static route. Group-stage matches render
  // probability panels; knockout fixtures without a priced detail file render
  // the slot-descriptor "Fixtures TBD" view instead of 404-ing.
  const matches = await getStructuralMatches();
  return matches.map((m) => ({ id: m.match_id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const maps = await loadStructuralMaps();
    if (!maps.matchesById.has(id)) {
      return { title: "Match detail · The 45% Problem" };
    }

    const detail = loadMatchIfPresent(id);
    if (detail) {
      const match = mergeMatch(detail, maps);
      return {
        title: `${match.home.display_name} vs ${match.away.display_name}. Match detail`,
        description: `Per-match probability breakdown, goal matrix, and strength inputs for the ${match.round} fixture on ${match.kickoff_utc}.`,
      };
    }

    // Knockout fixture: teams not yet determined
    const structural = maps.matchesById.get(id)!;
    const homeLabel = structural.home_slot
      ? formatSlot(structural.home_slot)
      : "TBD";
    const awayLabel = structural.away_slot
      ? formatSlot(structural.away_slot)
      : "TBD";
    const roundLabel = ROUND_LABELS[structural.round] ?? structural.round;
    return {
      title: `${homeLabel} vs ${awayLabel}. ${roundLabel} · The 45% Problem`,
      description: `${roundLabel} fixture. Team assignments and probability breakdowns will appear here once the preceding rounds conclude.`,
    };
  } catch {
    return { title: "Match detail · The 45% Problem" };
  }
}

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const maps = await loadStructuralMaps();
  const structural = maps.matchesById.get(id);
  if (!structural) notFound();

  const detail = loadMatchIfPresent(id);

  // ── Knockout fixture without a priced detail file ─────────────────────────
  if (!detail) {
    if (structural.round === "GRP") {
      console.warn(
        `[match/${id}] Group-stage match missing JSON detail; expected file not found.`,
      );
    }

    const venues = getStructuralVenues();
    const venue = venues.find((v) => v.key === structural.venue_key);
    const roundLabel = ROUND_LABELS[structural.round] ?? structural.round;
    const homeLabel = structural.home_slot
      ? formatSlot(structural.home_slot)
      : "TBD";
    const awayLabel = structural.away_slot
      ? formatSlot(structural.away_slot)
      : "TBD";
    const meta = loadSnapshotMeta();

    return (
      <div
        className="flex flex-col"
        style={{
          backgroundColor: "var(--bg-root)",
          color: "var(--text-primary)",
        }}
      >
        <div
          className="shrink-0 px-4 md:px-6 pt-6 pb-4 border-b"
          style={{ borderColor: "var(--border-default)" }}
        >
          <div className="max-w-[1152px] mx-auto px-0 md:px-12">
            <h1
              className="text-[18px] font-medium tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {homeLabel} vs {awayLabel}
            </h1>
            <p
              className="text-[12px] mt-0.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              {roundLabel} · kickoff{" "}
              <span className="mono">{structural.kickoff_utc}</span>
              {venue ? ` · ${venue.stadium}, ${venue.city}` : ""}
            </p>
          </div>
        </div>

        <div className="max-w-[1152px] mx-auto w-full px-4 md:px-12 py-6 flex flex-col gap-6">
          <div
            className="rounded border p-6 flex flex-col gap-2"
            style={{ borderColor: "var(--border-default)" }}
          >
            <p
              className="text-[14px] font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              Fixtures TBD
            </p>
            <p
              className="text-[12px]"
              style={{ color: "var(--text-secondary)" }}
            >
              Team assignments for this {roundLabel.toLowerCase()} match will be
              confirmed once the preceding rounds conclude. Probability
              breakdowns will appear here when the snapshot pipeline has priced
              this fixture.
            </p>
            <dl
              className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 text-[12px]"
              style={{ color: "var(--text-secondary)" }}
            >
              <div>
                <dt
                  className="font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  Match
                </dt>
                <dd className="mono">{id}</dd>
              </div>
              <div>
                <dt
                  className="font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  Round
                </dt>
                <dd>{roundLabel}</dd>
              </div>
              <div>
                <dt
                  className="font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  Home slot
                </dt>
                <dd>{homeLabel}</dd>
              </div>
              <div>
                <dt
                  className="font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  Away slot
                </dt>
                <dd>{awayLabel}</dd>
              </div>
              {venue && (
                <>
                  <div>
                    <dt
                      className="font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Venue
                    </dt>
                    <dd>{venue.stadium}</dd>
                  </div>
                  <div>
                    <dt
                      className="font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      City
                    </dt>
                    <dd>
                      {venue.city}, {venue.country}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </div>

          <ProvenanceBlock meta={meta} />
        </div>
      </div>
    );
  }

  // ── Group-stage / already-priced fixture; full probability view ──────────
  const match = mergeMatch(detail, maps);
  const records = loadLedger();
  const meta = loadSnapshotMeta();

  return (
    <div
      className="flex flex-col"
      style={{
        backgroundColor: "var(--bg-root)",
        color: "var(--text-primary)",
      }}
    >
      <div
        className="shrink-0 px-4 md:px-6 pt-6 pb-4 border-b"
        style={{ borderColor: "var(--border-default)" }}
      >
        <div className="max-w-[1152px] mx-auto px-0 md:px-12">
          <h1
            className="text-[18px] font-medium tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            <Flag code={match.home.fifa_code} size={14} />{" "}
            {match.home.display_name} vs{" "}
            <Flag code={match.away.fifa_code} size={14} />{" "}
            {match.away.display_name}
          </h1>
          <p
            className="text-[12px] mt-0.5"
            style={{ color: "var(--text-tertiary)" }}
          >
            {match.round} · kickoff{" "}
            <span className="mono">{match.kickoff_utc}</span> · snapshot{" "}
            <span className="mono">{meta.snapshot_id}</span>
          </p>
        </div>
      </div>

      {/* ── Frozen-data disclosure (cp-14-pre) ────────────────────────────── */}
      <TransparencyNote id="match-frozen" ariaLabel="Match data transparency">
        <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
          Transparency note.
        </span>{" "}
        Per-match settled scores and model-vs-market divergence are not yet
        joined into this view; the market column shows pre-tournament synthetic
        odds, not live bookmaker lines.{" "}
        <Link
          href="/bracket"
          className="underline underline-offset-2"
          style={{ color: "var(--accent-focus)" }}
        >
          See the tournament bracket for results.
        </Link>
      </TransparencyNote>

      <div className="max-w-[1152px] mx-auto w-full px-4 md:px-12 py-6 flex flex-col gap-6">
        <MatchHeader match={match} />

        <MarketBreakdownPanel match={match} />

        <GoalMatrixHeatmap
          grid={match.p_model_goals}
          homeCode={match.home.fifa_code}
          awayCode={match.away.fifa_code}
          homeName={match.home.display_name}
          awayName={match.away.display_name}
        />

        <StrengthInputsPanel match={match} />

        <RelatedLedgerRecords match={match} records={records} />

        <ProvenanceBlock meta={meta} />
      </div>
    </div>
  );
}
