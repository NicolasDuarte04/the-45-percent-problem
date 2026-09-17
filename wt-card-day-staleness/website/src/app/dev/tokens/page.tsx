/**
 * /dev/tokens · CP-00 (V3).
 *
 * Hidden review surface for the foundation drop. Renders the new band
 * tokens, the three new motion presets, and the copy-deck strings so a
 * reviewer can eyeball them on the dark canvas before any downstream
 * CP consumes them. Returns 404 in production unless explicitly
 * enabled via NEXT_PUBLIC_ENABLE_DEV_ROUTES.
 */

import { notFound } from "next/navigation";
import { MotionPlaygrounds } from "./Playgrounds";
import { BAND_LABELS } from "@/lib/sim/getRarityBand";
import {
  DEAD_PATH_LINE,
  RARITY_ROW_LABEL,
  RESET_TOAST_ACTION_LABEL,
  RESET_TOAST_MESSAGE,
} from "@/lib/sim/bandCopy";

type BandToken = {
  cssVar: string;
  label: (typeof BAND_LABELS)[number];
};

const BAND_TOKENS: readonly BandToken[] = [
  { cssVar: "--band-common", label: "Common" },
  { cssVar: "--band-plausible", label: "Plausible" },
  { cssVar: "--band-uncommon", label: "Uncommon" },
  { cssVar: "--band-rare", label: "Rare" },
  { cssVar: "--band-vanishing", label: "Vanishingly rare" },
] as const;

export default function DevTokensPage() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_ENABLE_DEV_ROUTES !== "1"
  ) {
    notFound();
  }

  return (
    <div
      data-canvas="quant"
      className="min-h-screen p-8 space-y-12"
      style={{
        backgroundColor: "var(--bg-root)",
        color: "var(--text-primary)",
      }}
    >
      <header
        className="border-b pb-4"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <h1 className="font-mono text-[11px] uppercase tracking-wider">
          45ANALYTICS / DEV / TOKENS · CP-00
        </h1>
        <p
          className="mt-2 text-[12px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          Foundation drop. Tokens, motion presets, and copy strings the V3
          checkpoints will consume. Not rendered in production.
        </p>
      </header>

      <Section title="Rarity band fills">
        <div className="grid gap-4 sm:grid-cols-5">
          {BAND_TOKENS.map((token) => (
            <div key={token.cssVar} className="space-y-2">
              <div
                className="h-16 border"
                style={{
                  backgroundColor: `var(${token.cssVar})`,
                  borderColor: "var(--border-default)",
                }}
                aria-hidden="true"
              />
              <div
                className="font-mono text-[10px] uppercase tracking-wider"
                style={{ color: "var(--text-quiet)" }}
              >
                {token.cssVar}
              </div>
              <div
                className="font-mono text-[11px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                {token.label}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Vanishing glow">
        <div className="flex items-center gap-4">
          <div
            className="h-16 w-32 border"
            style={{
              backgroundColor: "var(--bg-panel-elev)",
              borderColor: "var(--band-vanishing-glow)",
            }}
            aria-hidden="true"
          />
          <div
            className="font-mono text-[10px] uppercase tracking-wider"
            style={{ color: "var(--text-quiet)" }}
          >
            --band-vanishing-glow over --bg-panel-elev
          </div>
        </div>
      </Section>

      <Section title="Motion presets">
        <MotionPlaygrounds />
      </Section>

      <Section title="Copy deck">
        <dl
          className="grid gap-2 font-mono text-[12px]"
          style={{ color: "var(--text-primary)" }}
        >
          <CopyRow label="RARITY_ROW_LABEL" value={RARITY_ROW_LABEL} />
          <CopyRow
            label="RESET_TOAST (message + action)"
            value={`${RESET_TOAST_MESSAGE} [ ${RESET_TOAST_ACTION_LABEL} ]`}
          />
          <CopyRow label="DEAD_PATH_LINE" value={DEAD_PATH_LINE} />
        </dl>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2
        className="font-mono text-[11px] uppercase tracking-wider"
        style={{ color: "var(--text-tertiary)" }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
      <dt
        className="min-w-[14rem] text-[10px] uppercase tracking-wider"
        style={{ color: "var(--text-quiet)" }}
      >
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  );
}
