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

// cp-38: the landing leaderboard and modal-path bracket render the frozen
// pre-tournament snapshot (computed before the opening match), not the
// live conditional view. This visible label keeps the two from being read
// as live results; the live conditional bracket lives on /bracket.
function FrozenForecastLabel() {
  return (
    <p
      className="mono"
      style={{
        fontSize: 11,
        letterSpacing: ".04em",
        lineHeight: 1.5,
        color: "var(--text-tertiary)",
        margin: "0 0 12px",
      }}
    >
      <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
        FROZEN PRE-TOURNAMENT FORECAST.
      </span>{" "}
      Computed before the opening match and not updated with results. The
      live conditional view lives on the{" "}
      <Link href="/bracket" style={{ color: "var(--accent-focus)" }}>
        Bracket page
      </Link>
      .
    </p>
  );
}

// cp-44 closing moment: the landing page's final module, surfacing the settled
// research record with links and no new computation. Every number is read from
// the committed published artifacts (snapshot meta and the R16 checkpoint
// mirrored into evaluation_metrics from r16_checkpoint.json). No divergence
// ranking, no tip framing: only the pre-registered result and where to read it.
function ClosingMoment({
  settled,
  checkpoint,
}: {
  settled: number;
  checkpoint:
    | {
        n: number;
        mean_log_loss_mstar: number;
        mean_log_loss_m0: number;
        gap_in_se: number;
        threshold_se: number;
        tripped: boolean;
      }
    | null
    | undefined;
}) {
  const labelStyle = {
    fontSize: 11,
    letterSpacing: ".08em",
    textTransform: "uppercase" as const,
    color: "var(--text-tertiary)",
    marginBottom: 8,
  };
  const bodyStyle = {
    fontFamily: "var(--font-sans)",
    fontSize: 14,
    lineHeight: 1.7,
    color: "var(--text-secondary)",
    margin: 0,
  };
  const linkStyle = { color: "var(--accent-focus)", fontWeight: 500 } as const;

  // Checkpoint prose reads its magnitude and direction from the artifact.
  const gap = checkpoint ? Math.abs(checkpoint.gap_in_se).toFixed(2) : null;
  const direction = checkpoint && checkpoint.gap_in_se > 0 ? "worse than" : "better than";

  return (
    <section style={{ marginBottom: 56 }}>
      <SectionHead
        eyebrow="§ 5 · Closing"
        title="The tournament, closed out"
        rightSlot={<GhostLink href="/vault">Research vault →</GhostLink>}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
          maxWidth: 620,
          borderTop: "1px solid var(--rule)",
          paddingTop: 24,
        }}
      >
        <div>
          <div className="mono" style={labelStyle}>
            Tournament record
          </div>
          <p style={bodyStyle}>
            {settled} of {settled} fixtures are settled. The graded{" "}
            <Link href="/ledger" style={linkStyle}>
              ledger
            </Link>{" "}
            is the 72 pre-registered group-stage forecasts, and no knockout
            forecast was ever scored.
          </p>
        </div>

        {checkpoint ? (
          <div>
            <div className="mono" style={labelStyle}>
              Round of 16 checkpoint
            </div>
            <p style={bodyStyle}>
              {`The pre-registered Round of 16 kill criterion ${
                checkpoint.tripped ? "fired" : "did not fire"
              }. Across the ${checkpoint.n} pre-registered group-stage forecasts, M★ carried a mean log loss of `}
              <span className="mono">
                {checkpoint.mean_log_loss_mstar.toFixed(3)}
              </span>
              {` against M0’s `}
              <span className="mono">
                {checkpoint.mean_log_loss_m0.toFixed(3)}
              </span>
              {`, ${gap} standard errors ${direction} M0 and ${
                checkpoint.tripped ? "beyond" : "inside"
              } the ${checkpoint.threshold_se.toFixed(1)} SE threshold. The paired per-match construction is its own event, never compared to the Phase 8 cross-validation readings. Read the `}
              <Link href="/vault/kill-criteria" style={linkStyle}>
                kill-criteria record
              </Link>
              .
            </p>
          </div>
        ) : null}

        <div>
          <div className="mono" style={labelStyle}>
            Ablation report
          </div>
          <p style={bodyStyle}>
            The full ablation report is published as promised, with nulls kept
            honest wherever no per-match forecast or market line was committed:{" "}
            <a href="/data/latest/ablation.json" style={linkStyle}>
              ablation.json
            </a>{" "}
            and the{" "}
            <Link href="/vault/evaluation" style={linkStyle}>
              evaluation essay
            </Link>{" "}
            in the vault.
          </p>
        </div>
      </div>
    </section>
  );
}

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
            Probabilistic pricing for FIFA World Cup 2026, now a completed,
            citable research archive. M&#9733; is a bivariate Poisson model with
            Dixon-Coles correction, calibrated on international match data.
            Model-implied probabilities came from 10,000 Monte Carlo simulations
            per snapshot, rebuilt through the tournament; a market-comparison
            layer de-vigged bookmaker odds and reported signed model-vs-market
            divergence in the divergence terminal. The knockout rounds were
            tracked conditioned on settled results and compared against
            de-vigged market odds, ungraded. Only the 72 pre-registered
            group-stage forecasts are ever graded. The &#8220;45%
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
            href="/briefs"
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
            Read the brief archive →
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
            <FrozenForecastLabel />
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
            <FrozenForecastLabel />
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

      {/* ── § 5 · Closing moment (cp-44) ───────────────────────────────────── */}
      <ClosingMoment settled={meta.matches_settled} checkpoint={evaluation.r16_checkpoint} />

      {/* ── Terminal CTA block ─────────────────────────────────────────────── */}
      <TerminalCTA />
    </div>
  );
}
