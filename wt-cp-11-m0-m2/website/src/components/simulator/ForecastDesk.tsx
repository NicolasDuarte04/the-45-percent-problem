import Link from "next/link";

import { getOneInN } from "@/lib/sim/getOneInN";
import type { OwnerPredictionView } from "@/lib/sim/predictionViews";
import type { Mode, PredictionState } from "@/lib/sim/types";

import { ClearOperatorSessionLink } from "./ClearOperatorSessionLink";
import { DeskViewedBeacon } from "./DeskViewedBeacon";

// Checkpoint 17 (A2): ForecastDesk is server-rendered. The chrome,
// table head, table body rows, and empty-state copy ship as HTML.
// Two tiny client islands carry the only interactive responsibilities:
// DeskViewedBeacon fires the once-per-session `desk_viewed` analytics
// event, and ClearOperatorSessionLink hosts the
// [ Clear operator session ] button. The row hover affordance is
// pure CSS (group-hover) so the table body needs no client JS.

function maskEmail(value: string | null | undefined): string {
  if (!value) return "your inbox";
  const v = value.trim().toLowerCase();
  const at = v.indexOf("@");
  if (at <= 0) return "your inbox";
  const local = v.slice(0, at);
  const domain = v.slice(at);
  const first = local.charAt(0);
  return `${first}***${domain}`;
}

function formatSubmittedAt(iso: string): string {
  // Same format as the permalink page masthead: YYYY-MM-DD HH:MM UTC.
  return `${new Date(iso).toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

const MODE_LABEL: Record<Mode, string> = {
  final_four: "FINAL FOUR",
  champions_path: "CHAMP PATH",
  full_bracket: "FULL BRACKET",
};

const STATE_LABEL: Record<PredictionState, string> = {
  alive: "ALIVE",
  dead: "DEAD",
  promoted: "PROMOTED",
};

interface ForecastDeskProps {
  email: string;
  predictions: OwnerPredictionView[];
}

export function ForecastDesk({ email, predictions }: ForecastDeskProps) {
  const masked = maskEmail(email);
  const count = predictions.length;

  return (
    <section aria-labelledby="desk-heading" className="mt-8 mb-12">
      <DeskViewedBeacon />
      <p
        className="font-mono text-[11px] uppercase tracking-[0.10em] text-[var(--text-tertiary)]"
      >
        OPERATOR · <span className="tabular-nums">{masked}</span>
      </p>
      <h1
        id="desk-heading"
        className="mt-3 font-serif text-[28px] leading-[1.15] sm:text-[36px] text-[var(--text-primary)]"
      >
        Forecast Desk
      </h1>

      {count === 0 ? (
        <ForecastDeskEmptyAuthenticated />
      ) : (
        <ForecastTable predictions={predictions} />
      )}

      <ClearOperatorSessionLink />
    </section>
  );
}

function ForecastTable({ predictions }: { predictions: OwnerPredictionView[] }) {
  return (
    <>
      <div
        className="mt-8 border border-[var(--border-default)] bg-[var(--bg-panel-elev)]"
        role="region"
        aria-label="Forecast register"
      >
        <table className="w-full border-collapse text-left">
          <thead>
            <tr
              className="font-mono text-[11px] uppercase tracking-[0.10em] text-[var(--text-tertiary)]"
            >
              <Th>Submitted</Th>
              <Th>Mode</Th>
              <Th>Scenario</Th>
              <Th align="right">Reality Score</Th>
              <Th align="right">State</Th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((p) => (
              <ForecastRow key={p.id} prediction={p} />
            ))}
          </tbody>
        </table>
      </div>

      <p
        className="mt-3 font-mono text-[11px] uppercase tracking-[0.10em] text-[var(--text-quiet)]"
      >
        {predictions.length}{" "}
        {predictions.length === 1 ? "forecast" : "forecasts"} on this desk
        · operator session active
      </p>
    </>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={`border-b border-[var(--border-default)] px-4 py-3 font-normal text-${align}`}
    >
      {children}
    </th>
  );
}

function ForecastRow({ prediction }: { prediction: OwnerPredictionView }) {
  const state = prediction.state;
  const isDead = state === "dead";
  const isPromoted = state === "promoted";

  const stateColor = isPromoted
    ? "var(--accent-warm)"
    : isDead
      ? "var(--text-quiet)"
      : "var(--text-primary)";

  const stateStyle: React.CSSProperties = isDead
    ? {
        color: stateColor,
        textDecorationLine: "line-through",
        textDecorationThickness: "1px",
      }
    : { color: stateColor };

  // Row hover affordance via pure CSS arbitrary values: the inset
  // left-edge accent-warm shadow appears on :hover. No client state,
  // no useState, no event handlers. Pure CSS replaces the previous
  // useState pair while preserving the original 120ms transition.
  return (
    <tr
      className="relative cursor-pointer transition-shadow duration-100 [box-shadow:inset_2px_0_0_0_transparent] hover:[box-shadow:inset_2px_0_0_0_var(--accent-warm)]"
    >
      <Td>
        <Link
          href={`/scenario/p/${prediction.id}`}
          aria-label={`Open scenario ${prediction.id}`}
          className="no-underline tabular-nums text-[var(--text-tertiary)] focus:outline-none focus-visible:underline"
          style={{
            position: "absolute",
            inset: 0,
            display: "block",
          }}
        >
          <span className="sr-only">Open scenario</span>
        </Link>
        <span
          className="font-mono text-[12px] tabular-nums text-[var(--text-tertiary)]"
        >
          {formatSubmittedAt(prediction.submittedAt)}
        </span>
      </Td>
      <Td>
        <span
          className="font-mono text-[11px] uppercase tracking-[0.10em] text-[var(--text-secondary)]"
        >
          {MODE_LABEL[prediction.mode]}
        </span>
      </Td>
      <Td>
        <span
          className="font-serif text-[14px] text-[var(--text-primary)]"
          title={prediction.storyLine}
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 1,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "min(48ch, 100%)",
          }}
        >
          {prediction.storyLine}
        </span>
      </Td>
      <Td align="right">
        <span
          className="font-mono text-[13px] tabular-nums text-[var(--text-primary)]"
        >
          {getOneInN(prediction.countCurrent, prediction.total)}
        </span>
      </Td>
      <Td align="right">
        <span
          className="font-mono text-[11px] uppercase tracking-[0.10em]"
          style={stateStyle}
        >
          {STATE_LABEL[state]}
        </span>
      </Td>
    </tr>
  );
}

function Td({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <td
      className={`border-b border-[var(--border-default)] px-4 py-3 text-${align} align-middle`}
      style={{ position: "relative" }}
    >
      {children}
    </td>
  );
}

function ForecastDeskEmptyAuthenticated() {
  return (
    <div className="mt-8 max-w-[60ch]">
      <p className="font-serif text-[16px] leading-[1.6] text-[var(--text-primary)]">
        No forecasts on this desk yet.
      </p>
      <p
        className="mt-3 font-sans text-[14px] leading-[1.6] text-[var(--text-tertiary)]"
      >
        When you submit a scenario and arm its email, the prediction
        appears here.
      </p>
      <p className="mt-6">
        <Link
          href="/scenario"
          className="no-underline font-mono text-[12px] uppercase tracking-[0.10em] text-[var(--text-primary)] hover:underline underline-offset-4"
        >
          [ Submit a scenario &rarr; ]
        </Link>
      </p>
    </div>
  );
}

/**
 * The unauthenticated empty state. Rendered by the /me page directly
 * when the operator cookie is missing or invalid. Exposed here so the
 * page composition keeps the desk-related copy in one module.
 */
export function ForecastDeskUnauthenticated() {
  return (
    <section aria-labelledby="desk-heading" className="mt-8 mb-12">
      <h1
        id="desk-heading"
        className="font-serif text-[28px] leading-[1.15] sm:text-[36px] text-[var(--text-primary)]"
      >
        Forecast Desk
      </h1>
      <div className="mt-8 max-w-[60ch]">
        <p className="font-serif text-[16px] leading-[1.6] text-[var(--text-primary)]">
          No operator session on this device.
        </p>
        <p
          className="mt-3 font-sans text-[14px] leading-[1.6] text-[var(--text-tertiary)]"
        >
          Each prediction can arm an alert email. The same email
          verifies your operator session for this desk. Submit a
          scenario and arm the email; this page becomes your forecast
          register.
        </p>
        <p className="mt-6">
          <Link
            href="/scenario"
            className="no-underline font-mono text-[12px] uppercase tracking-[0.10em] text-[var(--text-primary)] hover:underline underline-offset-4"
          >
            [ Submit a scenario &rarr; ]
          </Link>
        </p>
      </div>
    </section>
  );
}
