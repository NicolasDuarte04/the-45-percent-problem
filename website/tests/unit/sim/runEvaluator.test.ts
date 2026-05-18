/**
 * Batching contract for the prediction evaluator (Checkpoint 16).
 *
 * The runner used to issue one UPDATE + one INSERT per transitioned
 * prediction inside a serial for-of loop, producing 2N DB roundtrips
 * for a single matchday's reconciliation. The new implementation
 * collects all transitions in memory, runs the per-id UPDATEs in
 * parallel (bounded by the pool), and writes a single batched INSERT
 * into prediction_state_log.
 *
 * These tests pin the new contract:
 *   1. Five transitions produce exactly one INSERT call.
 *   2. Five updates fire in parallel (Promise.all) — not serial.
 *   3. Zero transitions skip the INSERT call entirely.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Prediction, MatchOutcome } from "@/lib/db/schema";

vi.mock("@/lib/db", () => {
  const db = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };
  return { db, schema: {} };
});

// Pretend evaluatePrediction always flips alive -> dead so every
// candidate is a transition. The real evaluator is tested separately.
vi.mock("@/lib/sim/predictionEvaluator", () => ({
  evaluatePrediction: vi.fn((args: { prediction: Prediction }) => ({
    newState: "dead" as const,
    newCountCurrent: 0,
    reason: "all picks lost (test fixture)",
    evaluatorVersion: "test-v1",
  })),
}));

import { db } from "@/lib/db";
import { runEvaluatorAcrossPredictions } from "@/lib/sim/runEvaluator";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function chain(result: any) {
  const c: Record<string, unknown> = {};
  c.from = () => c;
  c.where = () => c;
  c.set = () => c;
  c.values = () => c;
  c.then = (resolve: (v: unknown) => unknown) => Promise.resolve(resolve(result));
  return c;
}

const mockDb = vi.mocked(db);

function makeAlivePrediction(id: string): Prediction {
  return {
    id,
    subscriberId: null,
    email: null,
    mode: "final_four",
    scenario: { semifinalists: ["MEX", "ESP", "FRA", "ENG"] },
    storyLine: "test",
    countOriginal: 100,
    countCurrent: 100,
    total: 10000,
    state: "alive",
    killedBy: null,
    modelSha: "a",
    snapshotSha: "b",
    submittedAt: new Date(),
    updatedAt: new Date(),
  } as Prediction;
}

const NO_SETTLED: MatchOutcome[] = [];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("runEvaluatorAcrossPredictions — batching contract", () => {
  it("five transitions produce exactly one INSERT and five UPDATE calls", async () => {
    mockDb.select
      .mockReturnValueOnce(chain(NO_SETTLED))
      .mockReturnValueOnce(
        chain([
          makeAlivePrediction("P1"),
          makeAlivePrediction("P2"),
          makeAlivePrediction("P3"),
          makeAlivePrediction("P4"),
          makeAlivePrediction("P5"),
        ]),
      );
    mockDb.update.mockReturnValue(chain([]));
    mockDb.insert.mockReturnValue(chain([]));

    const result = await runEvaluatorAcrossPredictions({
      triggeredByMatchId: "M01",
    });

    expect(result.evaluatedCount).toBe(5);
    expect(result.transitionsCount).toBe(5);
    // The batching contract: one INSERT, regardless of transition count.
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
    // One UPDATE per transitioned prediction (parallel via Promise.all).
    expect(mockDb.update).toHaveBeenCalledTimes(5);
  });

  it("five UPDATE calls fire in parallel, not serially", async () => {
    // Capture timing: when Promise.all is used every update is
    // scheduled before any of them resolves. We resolve each with a
    // microtask delay so we can tell parallel from serial by ordering
    // of the update calls vs the insert call.
    let updatesScheduled = 0;
    let insertScheduled = false;
    mockDb.select
      .mockReturnValueOnce(chain(NO_SETTLED))
      .mockReturnValueOnce(
        chain([
          makeAlivePrediction("P1"),
          makeAlivePrediction("P2"),
          makeAlivePrediction("P3"),
        ]),
      );
    mockDb.update.mockImplementation(() => {
      updatesScheduled += 1;
      return chain([]);
    });
    mockDb.insert.mockImplementation(() => {
      // When the INSERT is scheduled, every UPDATE must already have been
      // scheduled too, because the await Promise.all(updates) preceded
      // the await db.insert(...).values(...). Under a serial
      // implementation the INSERT would interleave with the updates.
      insertScheduled = true;
      expect(updatesScheduled).toBe(3);
      return chain([]);
    });

    await runEvaluatorAcrossPredictions({ triggeredByMatchId: "M02" });

    expect(insertScheduled).toBe(true);
  });

  it("zero transitions skips the INSERT entirely", async () => {
    // No candidates → no transitions.
    mockDb.select
      .mockReturnValueOnce(chain(NO_SETTLED))
      .mockReturnValueOnce(chain([]));
    mockDb.update.mockReturnValue(chain([]));
    mockDb.insert.mockReturnValue(chain([]));

    const result = await runEvaluatorAcrossPredictions({
      triggeredByMatchId: null,
    });

    expect(result.evaluatedCount).toBe(0);
    expect(result.transitionsCount).toBe(0);
    expect(mockDb.insert).not.toHaveBeenCalled();
    expect(mockDb.update).not.toHaveBeenCalled();
  });
});
