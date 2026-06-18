import { loadAllMatches, loadSnapshotMeta } from "@/lib/data/loadSnapshot";
import { ProvenanceBlock } from "@/components/layout/ProvenanceBlock";
import { MatchesBrowser } from "@/components/compositions/MatchesBrowser";

export const dynamic = "force-static";

export const metadata = {
  title: "Matches · The 45% Problem",
  description:
    "Every World Cup 2026 fixture with the model's 1X2 probabilities and modal scoreline. Played matches carry their real final score and outcome.",
};

export default async function MatchesPage() {
  const matches = loadAllMatches();
  const meta = loadSnapshotMeta();

  return (
    <div
      className="flex flex-col"
      style={{ backgroundColor: "var(--bg-root)", color: "var(--text-primary)" }}
    >
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div
        className="shrink-0 px-4 md:px-6 pt-6 pb-4 border-b"
        style={{ borderColor: "var(--border-default)" }}
      >
        <div className="max-w-[1152px] mx-auto px-0 md:px-12">
          <h1
            className="text-[18px] font-medium tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Matches
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Every World Cup 2026 fixture with the model&rsquo;s 1X2 probabilities
            and modal scoreline. Played matches carry their real final score and
            outcome; times are UTC. Each row opens the full per-match breakdown.
          </p>
        </div>
      </div>

      <div className="max-w-[1152px] mx-auto w-full px-4 md:px-12 py-6 flex flex-col gap-10">
        <MatchesBrowser matches={matches} />

        <ProvenanceBlock meta={meta} />
      </div>
    </div>
  );
}
