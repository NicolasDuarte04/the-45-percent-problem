import { Suspense } from "react";
import Link from "next/link";
import { loadSnapshot } from "@/lib/data/loadSnapshot";
import {
  loadStructuralMaps,
  mergeDivergence,
  mergeTournament,
} from "@/lib/db/structuralMerge";
import { resolveSnapshotPickerState } from "@/lib/data/snapshotPicker";
import { TournamentLeaderboard } from "@/components/compositions/TournamentLeaderboard";
import { MostLikelyBracket } from "@/components/compositions/MostLikelyBracket";
import { FeaturedDivergences } from "@/components/compositions/FeaturedDivergences";
import { TerminalDashboard } from "@/components/compositions/TerminalDashboard";
import { TournamentCalibrationStrip } from "@/components/compositions/TournamentCalibrationStrip";
import { RecentWritingList } from "@/components/compositions/RecentWritingList";
import { TerminalCTA } from "@/components/compositions/TerminalCTA";
import { TrailerSection } from "@/components/compositions/TrailerSection";
import { HeroGraphic, HERO_TROPHY_CAPTION } from "@/components/ui/HeroGraphic";
import {
  SectionHead,
  GhostLink,
} from "@/components/compositions/SectionHead";
import {
  SnapshotPicker,
  SnapshotBanner,
} from "@/components/compositions/SnapshotPicker";
import { SnapshotAwareHome } from "@/components/compositions/SnapshotAwareHome";

// Checkpoint 17 (A1): the home page reads zero per-request input, so
// Next 16 can prerender it statically. Snapshot toggling is now a
// client island (SnapshotAwareHome). The deep-link `?snapshot=` form
// still resolves to the historical view, fetched client-side from
// /api/snapshots/[id]/page-data.
export const dynamic = "force-static";

export default async function Home() {
  const picker = resolveSnapshotPickerState(undefined);

  const maps = await loadStructuralMaps();
  const snap = loadSnapshot(undefined);
  const tournament = mergeTournament(snap.tournament, maps);
  const divergence = mergeDivergence(snap.divergence, maps);
  const { evaluation, meta } = snap;
  return (
    <div
      className="mx-auto"
      style={{
        maxWidth: 1152,
        padding: "clamp(40px, 6vw, 64px) clamp(16px, 4vw, 48px)",
        color: "var(--text-primary)",
      }}
    >
      {/* ── Project intro header ───────────────────────────────────────────── */}
      <header
        className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-8 md:items-start"
        style={{ marginBottom: "clamp(48px, 8vw, 72px)" }}
      >
        <div style={{ maxWidth: 640 }}>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              letterSpacing: "-0.025em",
              lineHeight: 1.05,
              fontSize: "clamp(2.5rem, 5vw, 3rem)",
              margin: "0 0 24px",
              color: "var(--text-primary)",
            }}
          >
            The 45% Problem
          </h1>
          <p
            style={{
              fontSize: 18,
              lineHeight: 1.7,
              color: "var(--text-secondary)",
              margin: "0 0 20px",
            }}
          >
            Probabilistic pricing for FIFA World Cup 2026. M&#9733; is a
            bivariate Poisson model with Dixon-Coles correction, calibrated on
            international match data. Model-implied probabilities come from
            10,000 Monte Carlo simulations per nightly snapshot; a
            market-comparison layer de-vigs bookmaker odds and reports signed
            model-vs-market divergence for group-stage fixtures in the
            divergence terminal. Knockout fixtures are not yet covered, since
            those pairings are not known in advance. The &#8220;45%
            problem&#8221; refers to a systematic
            divergence documented in Phase 1: market-implied championship
            probabilities for mid-tier contenders cluster near 45% of their
            model-implied values, suggesting a persistent structural
            mispricing that motivated this research programme.
          </p>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-tertiary)",
              margin: 0,
            }}
          >
            Pre-registered at{" "}
            <a
              href="https://osf.io/spmkg/overview?view_only=b2ba9087b4ac494f8255388d78af0321"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--accent-focus)", fontWeight: 500 }}
            >
              osf.io/spmkg
            </a>{" "}
            · tag{" "}
            <span className="mono" style={{ color: "var(--data-neutral)" }}>
              {meta.pre_reg_tag}
            </span>{" "}
            · Phase: {meta.tournament_phase.replace(/_/g, " ")} ·{" "}
            <span className="mono">{meta.matches_remaining}</span> matches
            remaining
          </p>
        </div>
        {/* cp-08 additive onboarding: withSettle opts the trophy into a
            one-shot blur-to-sharp animation on first paint. CSS scope
            in globals.css (html:not([data-onboarding-seen="true"]))
            makes the animation a no-op for returning visitors, so the
            steady-state rendering is unchanged. */}
        <HeroGraphic withSettle />
        <p
          className="hidden md:block md:col-span-2"
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 13,
            lineHeight: 1.5,
            color: "var(--text-tertiary)",
            textAlign: "left",
            margin: 0,
          }}
        >
          {HERO_TROPHY_CAPTION}
        </p>
        <div
          className="md:col-span-2 flex flex-wrap items-center gap-3"
        >
          <Link
            href="/brief"
            className="no-underline inline-flex items-center"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-primary)",
              border: "1px solid rgb(31 31 31 / 0.28)",
              borderRadius: 6,
              padding: "6px 12px",
              gap: 4,
              background: "transparent",
            }}
          >
            Receive the daily brief →
          </Link>
        </div>
        <div
          className="md:col-span-2"
          style={{ marginTop: 32, borderTop: "1px solid var(--rule)" }}
        />
      </header>

      {/* Snapshot-aware block. Default view: server-rendered HTML for
          current snapshot, statically prerenderable. Historical view
          (?snapshot=<id>): client-fetched and rendered in place via
          SnapshotAwareHome. */}
      <Suspense fallback={null}>
        <SnapshotAwareHome current={picker.current} weekAgo={picker.weekAgo}>
          {/* ── § 0 · Scenario ────────────────────────────────────────── */}
          <section style={{ marginBottom: 56 }}>
            <SectionHead
              eyebrow="§ 0 · Scenario"
              title="Call the final four."
              rightSlot={
                <GhostLink href="/scenario/final-four">
                  Enter the simulator →
                </GhostLink>
              }
            />
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                lineHeight: 1.65,
                color: "var(--text-tertiary)",
                margin: 0,
                maxWidth: 540,
              }}
            >
              Pick four semifinalists. The model has run 10,000 simulated
              tournaments. See where your scenario lands.
            </p>
          </section>

          {/* ── § 1 · Championship pricing ────────────────────────────── */}
          <section style={{ marginBottom: 56 }}>
            <SectionHead
              eyebrow="§ 1 · Championship pricing"
              title="Tournament leaderboard"
              rightSlot={
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <SnapshotPicker
                    current={picker.current}
                    weekAgo={picker.weekAgo}
                    selectedId={picker.selected.id}
                    basePath="/"
                  />
                  <GhostLink href="/bracket">All 48 teams →</GhostLink>
                </div>
              }
            />
            <div style={{ marginBottom: 12 }}>
              <SnapshotBanner
                selected={picker.selected}
                current={picker.current}
                basePath="/"
              />
            </div>
            {/* TournamentLeaderboard declares min-width: 640px on its
                internal table; the wrapper isolates that overflow so the
                page never horizontally scrolls on a 375px mobile viewport.
                Per Mobile Optimization Plan §4 Phase 1 task 4. */}
            <div className="overflow-x-auto">
              <TournamentLeaderboard tournament={tournament} />
            </div>
          </section>

          {/* ── Most likely bracket ───────────────────────────────────── */}
          <section style={{ marginBottom: 56 }}>
            <SectionHead
              eyebrow="§ 1.5 · Modal path"
              title="Most likely bracket"
              rightSlot={<GhostLink href="/bracket">Full bracket →</GhostLink>}
            />
            {/* MostLikelyBracket declares min-width: 1100px (the largest
                offender). Wrapper traps the overflow inside the section
                instead of forcing the document horizontal scrollbar.
                Per Mobile Optimization Plan §4 Phase 1 task 4. */}
            <div className="overflow-x-auto">
              <MostLikelyBracket tournament={tournament} />
            </div>
          </section>

          {/* ── § 1.7 · Trailer ──────────────────────────────────────── */}
          <TrailerSection src="/assets/trailer.mp4" />

          {/* Checkpoint 17 (C1): below-the-fold sections live inside
              Suspense boundaries so selective hydration can defer them.
              The page is statically prerendered (A1) so the boundaries
              do not produce visible loading states under normal
              navigation; they exist to bound future async work and
              keep the hydration tree split. */}
          {/* ── § 1.6 · Terminal dashboard ─────────────────────────── */}
          <Suspense fallback={null}>
            <section style={{ marginBottom: 56 }}>
              <SectionHead
                eyebrow="§ 1.6 · Terminal"
                title="Dashboard"
              />
              <TerminalDashboard
                divergence={divergence}
                tournament={tournament}
              />
            </section>
          </Suspense>

          {/* ── § 2 · This window ────────────────────────────────────── */}
          <Suspense fallback={null}>
            <section style={{ marginBottom: 56 }}>
              <SectionHead
                eyebrow="§ 2 · This window"
                title="Featured divergences"
                rightSlot={<GhostLink href="/terminal">Full terminal →</GhostLink>}
              />
              <FeaturedDivergences divergence={divergence} />
            </section>
          </Suspense>

          {/* ── § 3 · Calibration ────────────────────────────────────── */}
          <Suspense fallback={null}>
            <section style={{ marginBottom: 56 }}>
              <SectionHead
                eyebrow="§ 3 · Calibration"
                title="How the model is doing"
              />
              <TournamentCalibrationStrip evaluation={evaluation} meta={meta} />
            </section>
          </Suspense>
        </SnapshotAwareHome>
      </Suspense>

      {/* ── § 4 · Research vault ───────────────────────────────────────────── */}
      <Suspense fallback={null}>
        <section style={{ marginBottom: 56 }}>
          <SectionHead
            eyebrow="§ 4 · Research vault"
            title="Recent writing"
            rightSlot={<GhostLink href="/vault">All essays →</GhostLink>}
          />
          <RecentWritingList />
        </section>
      </Suspense>

      {/* ── Terminal CTA block ─────────────────────────────────────────────── */}
      <TerminalCTA />
    </div>
  );
}
