import { loadSnapshot } from "@/lib/data/loadSnapshot";
import { TournamentLeaderboard } from "@/components/compositions/TournamentLeaderboard";
import { MostLikelyBracket } from "@/components/compositions/MostLikelyBracket";
import { FeaturedDivergences } from "@/components/compositions/FeaturedDivergences";
import { TerminalDashboard } from "@/components/compositions/TerminalDashboard";
import { TournamentCalibrationStrip } from "@/components/compositions/TournamentCalibrationStrip";
import { RecentWritingList } from "@/components/compositions/RecentWritingList";
import { TerminalCTA } from "@/components/compositions/TerminalCTA";
import {
  TrailerSection,
  WatchTrailerButton,
} from "@/components/compositions/TrailerSection";
import { HeroGraphic, HERO_TROPHY_CAPTION } from "@/components/ui/HeroGraphic";
import {
  SectionHead,
  GhostLink,
} from "@/components/compositions/SectionHead";

export const dynamic = "force-static";

export default function Home() {
  const { tournament, divergence, evaluation, meta } = loadSnapshot();

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
            international match data and compared nightly to bookmaker-implied
            probabilities. The &#8220;45% problem&#8221; refers to a systematic
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
              href="https://osf.io/8b5hd"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--accent-focus)", fontWeight: 500 }}
            >
              osf.io/8b5hd
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
        <HeroGraphic />
        <p
          className="hidden md:block md:col-span-2"
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 13,
            lineHeight: 1.5,
            color: "var(--text-tertiary)",
            textAlign: "left",
            margin: "-48px 0 0",
          }}
        >
          {HERO_TROPHY_CAPTION}
        </p>
        <div className="md:col-span-2" style={{ marginTop: -32 }}>
          <WatchTrailerButton />
        </div>
        <div
          className="md:col-span-2"
          style={{ marginTop: 32, borderTop: "1px solid var(--rule)" }}
        />
      </header>

      {/* ── § 1 · Championship pricing ─────────────────────────────────────── */}
      <section style={{ marginBottom: 56 }}>
        <SectionHead
          eyebrow="§ 1 · Championship pricing"
          title="Tournament leaderboard"
          rightSlot={<GhostLink href="/bracket">All 48 teams →</GhostLink>}
        />
        <TournamentLeaderboard tournament={tournament} />
      </section>

      {/* ── Most likely bracket ───────────────────────────────────────────── */}
      <section style={{ marginBottom: 56 }}>
        <SectionHead
          eyebrow="§ 1.5 · Modal path"
          title="Most likely bracket"
          rightSlot={<GhostLink href="/bracket">Full bracket →</GhostLink>}
        />
        <MostLikelyBracket tournament={tournament} />
      </section>

      {/* ── § 1.7 · Trailer ────────────────────────────────────────────────── */}
      <TrailerSection src="/assets/trailer.mp4" />

      {/* ── § 1.6 · Terminal dashboard ─────────────────────────────────────── */}
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

      {/* ── § 2 · This window ──────────────────────────────────────────────── */}
      <section style={{ marginBottom: 56 }}>
        <SectionHead
          eyebrow="§ 2 · This window"
          title="Featured divergences"
          rightSlot={<GhostLink href="/terminal">Full terminal →</GhostLink>}
        />
        <FeaturedDivergences divergence={divergence} />
      </section>

      {/* ── § 3 · Calibration ──────────────────────────────────────────────── */}
      <section style={{ marginBottom: 56 }}>
        <SectionHead
          eyebrow="§ 3 · Calibration"
          title="How the model is doing"
        />
        <TournamentCalibrationStrip evaluation={evaluation} meta={meta} />
      </section>

      {/* ── § 4 · Research vault ───────────────────────────────────────────── */}
      <section style={{ marginBottom: 56 }}>
        <SectionHead
          eyebrow="§ 4 · Research vault"
          title="Recent writing"
          rightSlot={<GhostLink href="/vault">All essays →</GhostLink>}
        />
        <RecentWritingList />
      </section>

      {/* ── Terminal CTA block ─────────────────────────────────────────────── */}
      <TerminalCTA />
    </div>
  );
}
