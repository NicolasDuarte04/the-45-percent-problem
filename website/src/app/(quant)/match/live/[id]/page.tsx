import { notFound } from "next/navigation";
import {
  loadLiveKnockouts,
  loadLiveKnockoutIfPresent,
  loadSnapshotMeta,
} from "@/lib/data/loadSnapshot";
import {
  ROUND_LABELS,
  outcomeLabel,
  shootoutLine,
  modalScoreline,
} from "@/lib/data/matchListing";
import { formatProbability } from "@/lib/formatters";
import { Flag } from "@/components/primitives/Flag";
import { MatchHeader } from "@/components/compositions/MatchHeader";
import { GoalMatrixHeatmap } from "@/components/compositions/GoalMatrixHeatmap";
import { StrengthInputsPanel } from "@/components/compositions/StrengthInputsPanel";
import { ProvenanceBlock } from "@/components/layout/ProvenanceBlock";
import type { LiveKnockoutMatch } from "@/lib/data/schemas";

export const dynamic = "force-static";

/**
 * cp-28: per-match detail for the live, explicitly UNGRADED knockout cards
 * (matches_live/, KO-FD ids). This is a SIBLING of the graded /match/[id] route,
 * not a variant of it. The two are kept apart on purpose:
 *
 *   - /match/[id]       reads frozen matches/ JSON + structural Drizzle data and
 *                       renders the graded ledger (RelatedLedgerRecords).
 *   - /match/live/[id]  reads ONLY matches_live/ via loadLiveKnockoutIfPresent
 *                       and never touches the ledger, calibration metrics, or
 *                       any graded surface.
 *
 * That loader + route separation is the same auditable wall the matches_live/
 * namespace already documents: no graded reader can pick a knockout card up by
 * accident, and this page can never leak knockout numbers into a scored surface.
 */

export async function generateStaticParams() {
  // One static route per committed knockout card. loadLiveKnockouts returns []
  // until the real draw resolves, so pre-draw this route prerenders nothing and
  // any /match/live/<id> request 404s via notFound() below.
  const knockouts = loadLiveKnockouts();
  return knockouts.map((m) => ({ id: m.match_id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const card = loadLiveKnockoutIfPresent(id);
  if (!card) {
    return { title: "Live knockout detail. The 45% Problem" };
  }
  const roundLabel = ROUND_LABELS[card.round] ?? card.round;
  return {
    title: `${card.home.display_name} vs ${card.away.display_name}. ${roundLabel} (live)`,
    description: `Live, ungraded per-match breakdown for the ${roundLabel} tie: goal matrix, 1X2, modal scoreline, and advance probability. Only the frozen pre-tournament group forecast is scored.`,
  };
}

/** The ungraded posture, stated the same way the cards state it. */
function UngradedBanner() {
  return (
    <div
      className="rounded-lg"
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border-subtle)",
        padding: "12px 16px",
      }}
    >
      <p
        className="mono text-[10px] uppercase tracking-[.07em]"
        style={{ color: "var(--text-quiet)" }}
      >
        Live · not graded
      </p>
      <p
        className="text-[12px] mt-1.5"
        style={{ color: "var(--text-secondary)" }}
      >
        This is a live projection of a knockout tie from the conditioned
        simulation. It is not scored. Only the frozen pre-tournament group
        forecast enters the ledger and the calibration metrics; these knockout
        numbers never do.
      </p>
    </div>
  );
}

/**
 * The headline knockout number: each side's chance of advancing past the tie
 * (regulation, extra time, and penalties combined), with the additive
 * extra-time / shootout context when the producer emitted it.
 */
function AdvancePanel({ card }: { card: LiveKnockoutMatch }) {
  const { home, away } = card;
  return (
    <section
      className="rounded-lg"
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border-subtle)",
        padding: "20px 24px",
      }}
    >
      <h3
        className="text-[13px] font-medium"
        style={{ color: "var(--text-primary)" }}
      >
        Advance probability
      </h3>
      <p
        className="mono text-[11px] mt-[3px]"
        style={{ color: "var(--text-tertiary)" }}
      >
        chance of progressing past this tie (incl. extra time and penalties)
      </p>
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="flex items-center gap-2">
          <Flag code={home.fifa_code} size={16} />
          <span className="text-[13px]" style={{ color: "var(--text-primary)" }}>
            {home.display_name}
          </span>
          <span
            className="mono text-[15px] ml-auto"
            style={{ color: "var(--text-primary)" }}
          >
            {formatProbability(card.p_advance_home)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Flag code={away.fifa_code} size={16} />
          <span className="text-[13px]" style={{ color: "var(--text-primary)" }}>
            {away.display_name}
          </span>
          <span
            className="mono text-[15px] ml-auto"
            style={{ color: "var(--text-primary)" }}
          >
            {formatProbability(card.p_advance_away)}
          </span>
        </div>
      </div>
      {(card.p_to_extra_time != null || card.p_to_shootout != null) && (
        <div
          className="mono flex gap-6 mt-4 pt-3 border-t text-[11px]"
          style={{
            color: "var(--text-tertiary)",
            borderColor: "var(--border-subtle)",
          }}
        >
          {card.p_to_extra_time != null && (
            <span>P(extra time) {formatProbability(card.p_to_extra_time)}</span>
          )}
          {card.p_to_shootout != null && (
            <span>P(shootout) {formatProbability(card.p_to_shootout)}</span>
          )}
        </div>
      )}
    </section>
  );
}

export default async function LiveKnockoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const card = loadLiveKnockoutIfPresent(id);
  if (!card) notFound();

  const meta = loadSnapshotMeta();
  const roundLabel = ROUND_LABELS[card.round] ?? card.round;
  const modal = modalScoreline(card.p_model_goals);
  const played = card.score != null;
  const penLine = shootoutLine(card);

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
            <Flag code={card.home.fifa_code} size={14} />{" "}
            {card.home.display_name} vs{" "}
            <Flag code={card.away.fifa_code} size={14} />{" "}
            {card.away.display_name}
          </h1>
          <p
            className="text-[12px] mt-0.5"
            style={{ color: "var(--text-tertiary)" }}
          >
            {roundLabel} (live) · kickoff{" "}
            <span className="mono">{card.kickoff_utc}</span> · snapshot{" "}
            <span className="mono">{meta.snapshot_id}</span>
          </p>
          {played && card.score ? (
            <p
              className="text-[14px] mt-1.5 mono font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              {card.home.fifa_code} {card.score.home}-{card.score.away}{" "}
              {card.away.fifa_code}
              <span
                className="text-[11px] ml-2"
                style={{ color: "var(--text-tertiary)" }}
              >
                {outcomeLabel(card.outcome_realized, true)}
              </span>
              {penLine ? (
                <span
                  className="text-[11px] ml-2"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  ({penLine})
                </span>
              ) : null}
            </p>
          ) : modal ? (
            <p
              className="text-[12px] mt-1 mono"
              style={{ color: "var(--text-tertiary)" }}
            >
              modal scoreline {modal.home}-{modal.away}
            </p>
          ) : null}
        </div>
      </div>

      <div className="max-w-[1152px] mx-auto w-full px-4 md:px-12 py-6 flex flex-col gap-6">
        <UngradedBanner />

        <MatchHeader match={card} />

        <AdvancePanel card={card} />

        <GoalMatrixHeatmap
          grid={card.p_model_goals}
          homeCode={card.home.fifa_code}
          awayCode={card.away.fifa_code}
          homeName={card.home.display_name}
          awayName={card.away.display_name}
        />

        <StrengthInputsPanel match={card} />

        <ProvenanceBlock meta={meta} />
      </div>
    </div>
  );
}
