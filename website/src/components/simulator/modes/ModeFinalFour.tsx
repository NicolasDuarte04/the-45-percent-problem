"use client";

/**
 * Final Four build mode per IMPL_PROMPT §2.1 + design v2 §5.3.
 *
 * Phase C: DnD upgrade — teams can be dragged from the grid onto the
 * four SF slots in addition to the existing click-to-fill interaction.
 * Each slot is a DroppableSlot (via inline FFSlot sub-component).
 *
 * Per Patch v2.1 §3: NO partial rarity band, NO partial 1-in-N
 * shown during build. The Reality Score reveal happens on the
 * permalink page (`/scenario/p/[id]`) after submit.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { TeamPickerGrid } from "@/components/simulator/TeamPickerGrid";
import { Flag } from "@/components/primitives/Flag";
import { EmptySlot } from "@/components/simulator/EmptySlot";
import { LiveAgreementGauge } from "@/components/simulator/reality/LiveAgreementGauge";
import { COUNTRY_NAMES, type FifaCode } from "@/lib/flags/countries";
import {
  clearInflight,
  readInflightForMode,
  writeInflight,
} from "@/lib/sim/inflightStore";
import { submitPrediction } from "@/lib/sim/predictionsApi";
import { computeRealityScore } from "@/lib/sim/computeRealityScore";
import { canonicalizeScenario } from "@/lib/sim/canonicalizeScenario";
import type { TeamCode } from "@/lib/sim/types";

interface ModeFinalFourProps {
  modelSha: string;
  snapshotSha: string;
}

const SLOT_COUNT = 4;
const SLOT_LABELS = ["SF1", "SF2", "SF3", "SF4"] as const;

interface InflightFinalFour {
  semifinalists: ReadonlyArray<TeamCode | null>;
}

function hydrate(): (TeamCode | null)[] {
  const cached = readInflightForMode("final_four") as InflightFinalFour | null;
  if (!cached || !Array.isArray(cached.semifinalists)) {
    return Array(SLOT_COUNT).fill(null);
  }
  const slice = cached.semifinalists.slice(0, SLOT_COUNT);
  while (slice.length < SLOT_COUNT) slice.push(null);
  return slice.map((c) =>
    typeof c === "string" && /^[A-Z]{3}$/.test(c) ? c : null,
  );
}

// ── Droppable SF slot ─────────────────────────────────────────────────────────

interface FFSlotProps {
  idx: number;
  code: TeamCode | null;
  label: (typeof SLOT_LABELS)[number];
  isActive: boolean;
  onClear: (idx: number) => void;
  onActivate: (idx: number) => void;
}

function FFSlot({ idx, code, label, isActive, onClear, onActivate }: FFSlotProps) {
  const { isOver, setNodeRef } = useDroppable({ id: String(idx) });
  const countryName = code ? COUNTRY_NAMES[code as FifaCode] : null;
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => (code ? onClear(idx) : onActivate(idx))}
      aria-pressed={isActive && !code}
      className={[
        "flex h-28 w-full flex-col items-center justify-center gap-1 bg-[var(--bg-root)] px-2 transition-colors duration-100 focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)] sm:h-32",
        code
          ? "cursor-pointer hover:bg-[var(--bg-panel-elev)]"
          : "cursor-pointer",
        isOver ? "ring-1 ring-[var(--accent-focus)] ring-inset" : "",
      ].join(" ")}
      aria-label={
        code
          ? `Slot ${label} filled with ${code}; click to clear`
          : isActive
            ? `Slot ${label} armed; tap a team to fill`
            : `Slot ${label} empty; tap to arm, or drag a team here`
      }
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.10em] text-[var(--text-quiet)]">
        {label}
      </div>
      {code ? (
        <>
          <Flag code={code} size={32} />
          <div className="mt-0.5 font-mono text-[24px] tabular-nums tracking-[0.05em] text-[var(--text-primary)] sm:text-[28px]">
            {code}
          </div>
          {countryName ? (
            <div className="font-sans text-[10px] leading-tight text-[var(--text-quiet)] sm:text-[11px]">
              {countryName}
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-1 flex h-[68px] w-full items-stretch sm:h-[80px]">
          <EmptySlot
            size="md"
            isOver={isOver}
            isActive={isActive}
            label={label}
            ariaLabel={`Drop a team into ${label}`}
          />
        </div>
      )}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ModeFinalFour({ modelSha, snapshotSha }: ModeFinalFourProps) {
  const router = useRouter();
  const [slots, setSlots] = useState<(TeamCode | null)[]>(() =>
    Array(SLOT_COUNT).fill(null),
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorCopy, setErrorCopy] = useState<string | null>(null);
  const [activeCode, setActiveCode] = useState<TeamCode | null>(null);
  const [activeSlotIdx, setActiveSlotIdx] = useState<number | null>(null);
  const hydratedRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  );

  // Hydrate from inflight on mount (client-only — guarded by useEffect).
  useEffect(() => {
    if (hydratedRef.current) return;
    setSlots(hydrate());
    hydratedRef.current = true;
  }, []);

  // Persist on every change once hydrated.
  useEffect(() => {
    if (!hydratedRef.current) return;
    writeInflight("final_four", { semifinalists: slots });
  }, [slots]);

  const filled = slots.filter((c): c is TeamCode => Boolean(c));
  const allFilled = filled.length === SLOT_COUNT;
  const selectedSet = useMemo(() => new Set(filled), [filled]);

  // Live Reality Score — recomputed only when slots change (drop, click,
  // clear). Used by LiveAgreementGauge once allFilled triggers
  // isComplete; until then the gauge renders in ghost state.
  const liveScore = useMemo(() => {
    if (filled.length < SLOT_COUNT) return null;
    const scenario = { semifinalists: filled };
    const canonical = canonicalizeScenario("final_four", scenario);
    return computeRealityScore("final_four", canonical, scenario);
  }, [filled]);

  function handlePick(code: TeamCode) {
    setSlots((prev) => {
      const at = prev.indexOf(code);
      if (at !== -1) {
        const next = [...prev];
        next[at] = null;
        return next;
      }
      const target =
        activeSlotIdx !== null && prev[activeSlotIdx] === null
          ? activeSlotIdx
          : prev.indexOf(null);
      if (target === -1) return prev;
      const next = [...prev];
      next[target] = code;
      return next;
    });
    setActiveSlotIdx(null);
    setErrorCopy(null);
  }

  function handleClearSlot(idx: number) {
    setSlots((prev) => {
      const next = [...prev];
      next[idx] = null;
      return next;
    });
    setActiveSlotIdx(null);
    setErrorCopy(null);
  }

  function handleActivateSlot(idx: number) {
    setActiveSlotIdx((current) => (current === idx ? null : idx));
    setErrorCopy(null);
  }

  function handleDropToSlot(idx: number, code: TeamCode) {
    setSlots((prev) => {
      const next = [...prev];
      const from = prev.indexOf(code);
      if (from !== -1) next[from] = null;
      next[idx] = code;
      return next;
    });
    setErrorCopy(null);
  }

  function handleDragStart({ active }: DragStartEvent) {
    setActiveCode((active.data.current?.code as TeamCode) ?? null);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveCode(null);
    const code = active.data.current?.code as TeamCode | undefined;
    if (!code || !over) return;
    const idx = parseInt(over.id as string, 10);
    if (!isNaN(idx) && idx >= 0 && idx < SLOT_COUNT) {
      handleDropToSlot(idx, code);
    }
  }

  function handleReset() {
    setSlots(Array(SLOT_COUNT).fill(null));
    setActiveSlotIdx(null);
    clearInflight();
    setErrorCopy(null);
  }

  async function handleSubmit() {
    if (!allFilled || submitting) return;
    setSubmitting(true);
    setErrorCopy(null);
    const result = await submitPrediction({
      mode: "final_four",
      scenario: { semifinalists: filled },
      modelSha,
      snapshotSha,
    });
    if (result.kind === "ok") {
      clearInflight();
      router.push(`/scenario/p/${result.prediction.id}`);
      return;
    }
    setSubmitting(false);
    setErrorCopy(
      result.kind === "rateLimit"
        ? "Too many predictions in a short window. Wait a moment and try again."
        : result.kind === "network"
          ? "Could not reach the server. Check your connection and try again."
          : result.kind === "invalid"
            ? "Something in the scenario looks wrong. Reset and try again."
            : "Something went wrong on our side. Try again in a moment.",
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <section
        aria-labelledby="ff-heading"
        data-canvas="simulator"
        className="pt-10 pb-12"
      >
        <div className="flex items-baseline justify-between gap-4">
          <h1
            id="ff-heading"
            className="font-serif text-[28px] leading-[1.1] sm:text-[40px] text-[var(--text-primary)]"
          >
            Who makes the final four?
          </h1>
          <button
            type="button"
            onClick={handleReset}
            className="font-mono text-[11px] uppercase tracking-[0.10em] text-[var(--text-quiet)] hover:text-[var(--text-primary)]"
          >
            [ Reset ]
          </button>
        </div>

        <p className="mt-3 font-sans text-[14px] text-[var(--text-tertiary)]">
          We compare your scenario against 10,000 simulations of the tournament.
        </p>

        {/* Slot row */}
        <ol
          aria-label="Semifinalist slots"
          className="mt-8 grid grid-cols-2 gap-px border border-[var(--border-default)] bg-[var(--rule)] sm:grid-cols-4"
        >
          {slots.map((code, idx) => (
            <li key={idx} className="contents">
              <FFSlot
                idx={idx}
                code={code}
                label={SLOT_LABELS[idx]}
                isActive={activeSlotIdx === idx}
                onClear={handleClearSlot}
                onActivate={handleActivateSlot}
              />
            </li>
          ))}
        </ol>

        {/* Team grid */}
        <TeamPickerGrid
          selected={selectedSet}
          onPick={handlePick}
          draggable={true}
        />

        {/* Live Agreement Gauge — Phase D Workstream 3 (Option C).
            Ghost state until all 4 SF slots are filled per the per-mode
            show-threshold table. Viral hook only — no scientific rarity
            words; that vocabulary is reserved for the post-submit
            RealityScorePanel. */}
        <div className="mt-8 max-w-md">
          <LiveAgreementGauge
            count={liveScore?.count ?? 0}
            total={liveScore?.total ?? 10000}
            isComplete={allFilled}
            variant="compact"
          />
        </div>

        {/* Submit + error */}
        <div className="mt-10 flex flex-col items-start gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!allFilled || submitting}
            className={[
              "border px-5 py-3 font-mono text-[13px] uppercase tracking-[0.10em] transition-colors duration-100 focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]",
              allFilled && !submitting
                ? "border-[var(--text-primary)] text-[var(--text-primary)] hover:border-[var(--accent-warm)] hover:text-[var(--accent-warm)] cursor-pointer"
                : "border-[var(--border-default)] text-[var(--text-quiet)] cursor-not-allowed",
            ].join(" ")}
          >
            {submitting ? "[ Submitting... ]" : "[ See how the model reacts ]"}
          </button>
          {errorCopy ? (
            <p
              role="alert"
              className="font-sans text-[13px] text-[var(--state-dead)]"
            >
              {errorCopy}
            </p>
          ) : null}
          {!allFilled ? (
            <p className="font-sans text-[12px] text-[var(--text-quiet)]">
              Pick {SLOT_COUNT - filled.length} more team
              {SLOT_COUNT - filled.length === 1 ? "" : "s"} to submit.
            </p>
          ) : null}
        </div>
      </section>

      <DragOverlay dropAnimation={null}>
        {activeCode ? (
          <div className="z-50 inline-flex items-center gap-2 border border-[var(--text-primary)] bg-[var(--text-primary)] px-3 py-2 font-mono text-[20px] tabular-nums text-[var(--bg-root)] shadow-lg">
            <Flag code={activeCode} size={24} />
            <span>{activeCode}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

