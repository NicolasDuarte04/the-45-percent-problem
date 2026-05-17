import { beforeEach, describe, expect, it, vi } from "vitest";
import { chainMock } from "../../integration/api/_helpers";

vi.mock("@/lib/db", () => {
  const db = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };
  return { db };
});

vi.mock("@/lib/email/calibrationDigest", () => ({
  CALIBRATION_DIGEST_EVENT_TYPE: "calibration_digest",
  sendCalibrationDigest: vi.fn(),
}));

import { db } from "@/lib/db";
import { sendCalibrationDigest } from "@/lib/email/calibrationDigest";
import { dispatchCalibrationDigests } from "@/lib/email/calibrationDispatcher";

const mockDb = vi.mocked(db);
const mockSend = vi.mocked(sendCalibrationDigest);

// Each row mirrors what loadTransitions() selects: the join of
// prediction_state_log + predictions + subscribers. We keep the field
// names aligned with the dispatcher's projection.
function makeRow(overrides: Partial<{
  subscriberId: string;
  email: string;
  predictionId: string;
  mode: "final_four" | "champions_path" | "full_bracket";
  storyLine: string;
  previousState: "alive" | "dead" | "promoted";
  newState: "alive" | "dead" | "promoted";
  reason: string;
}> = {}) {
  return {
    subscriberId: "sub-1",
    email: "operator@example.test",
    predictionId: "45A-2026-AAAA",
    mode: "final_four" as const,
    storyLine: "Spain, France, Argentina, Morocco in the semifinals.",
    previousState: "alive" as const,
    newState: "dead" as const,
    reason: "GER eliminated in R32 vs ITA (0-2). Scenario contradicted.",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://45analytics.example");
});

describe("dispatchCalibrationDigests: grouping", () => {
  it("groups multiple transitions for the same subscriber into one send", async () => {
    mockDb.select
      // loadTransitions: two rows for the same subscriber.
      .mockReturnValueOnce(
        chainMock([
          makeRow({ predictionId: "45A-2026-AAAA" }),
          makeRow({
            predictionId: "45A-2026-BBBB",
            mode: "champions_path",
            storyLine: "ARG path",
            previousState: "alive",
            newState: "promoted",
            reason: "ARG R16 W confirmed. Scenario promoted.",
          }),
        ]),
      )
      // hasAlreadyReceivedDigest for sub-1: empty.
      .mockReturnValueOnce(chainMock([]));

    mockSend.mockResolvedValue({ kind: "sent", messageId: "msg-1" });

    const result = await dispatchCalibrationDigests({
      digestDate: "2026-06-15",
      sinceCutoff: new Date("2026-06-14T06:00:00.000Z"),
    });

    expect(result).toEqual({
      dispatchedCount: 1,
      skippedCount: 0,
      failureCount: 0,
    });
    expect(mockSend).toHaveBeenCalledTimes(1);
    const call = mockSend.mock.calls[0][0];
    expect(call.to).toBe("operator@example.test");
    expect(call.subscriberId).toBe("sub-1");
    expect(call.transitions).toHaveLength(2);
    expect(call.transitions[0].predictionId).toBe("45A-2026-AAAA");
    expect(call.transitions[1].predictionId).toBe("45A-2026-BBBB");
  });

  it("dispatches one email per subscriber when transitions span multiple subscribers", async () => {
    mockDb.select
      .mockReturnValueOnce(
        chainMock([
          makeRow({ subscriberId: "sub-1", email: "a@example.test" }),
          makeRow({
            subscriberId: "sub-2",
            email: "b@example.test",
            predictionId: "45A-2026-BBBB",
          }),
        ]),
      )
      // hasAlreadyReceivedDigest for both subscribers: empty.
      .mockReturnValueOnce(chainMock([]))
      .mockReturnValueOnce(chainMock([]));

    mockSend.mockResolvedValue({ kind: "sent", messageId: "msg-x" });

    const result = await dispatchCalibrationDigests({
      digestDate: "2026-06-15",
      sinceCutoff: new Date("2026-06-14T06:00:00.000Z"),
    });

    expect(result.dispatchedCount).toBe(2);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it("dedupes duplicate predictionId rows for the same subscriber", async () => {
    // The evaluator should only write one transition per prediction per
    // run, but a manual admin re-eval can produce a second row. Dedupe.
    mockDb.select
      .mockReturnValueOnce(
        chainMock([
          makeRow({ predictionId: "45A-2026-AAAA" }),
          makeRow({ predictionId: "45A-2026-AAAA" }),
        ]),
      )
      .mockReturnValueOnce(chainMock([]));

    mockSend.mockResolvedValue({ kind: "sent", messageId: "msg-1" });

    await dispatchCalibrationDigests({
      digestDate: "2026-06-15",
      sinceCutoff: new Date("2026-06-14T06:00:00.000Z"),
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0][0].transitions).toHaveLength(1);
  });
});

describe("dispatchCalibrationDigests: idempotency", () => {
  it("skips a subscriber who already received today's digest", async () => {
    mockDb.select
      .mockReturnValueOnce(chainMock([makeRow()]))
      // hasAlreadyReceivedDigest returns a row: already sent.
      .mockReturnValueOnce(chainMock([{ id: "existing-send-log-id" }]));

    const result = await dispatchCalibrationDigests({
      digestDate: "2026-06-15",
      sinceCutoff: new Date("2026-06-14T06:00:00.000Z"),
    });

    expect(result).toEqual({
      dispatchedCount: 0,
      skippedCount: 1,
      failureCount: 0,
    });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("produces zero new sends when re-run on the same window", async () => {
    // First run: send. Second run: hasAlreadyReceivedDigest finds the row.
    mockDb.select
      .mockReturnValueOnce(chainMock([makeRow()]))
      .mockReturnValueOnce(chainMock([]));
    mockSend.mockResolvedValue({ kind: "sent", messageId: "msg-1" });

    const first = await dispatchCalibrationDigests({
      digestDate: "2026-06-15",
      sinceCutoff: new Date("2026-06-14T06:00:00.000Z"),
    });
    expect(first.dispatchedCount).toBe(1);

    mockDb.select
      .mockReturnValueOnce(chainMock([makeRow()]))
      .mockReturnValueOnce(chainMock([{ id: "existing-send-log-id" }]));

    const second = await dispatchCalibrationDigests({
      digestDate: "2026-06-15",
      sinceCutoff: new Date("2026-06-14T06:00:00.000Z"),
    });
    expect(second.dispatchedCount).toBe(0);
    expect(second.skippedCount).toBe(1);
  });
});

describe("dispatchCalibrationDigests: outcome counting", () => {
  it("counts a suppressed send as skipped, not dispatched or failed", async () => {
    mockDb.select
      .mockReturnValueOnce(chainMock([makeRow()]))
      .mockReturnValueOnce(chainMock([]));
    mockSend.mockResolvedValue({
      kind: "skipped_suppression",
      reason: "email_suppressed",
    });

    const result = await dispatchCalibrationDigests({
      digestDate: "2026-06-15",
      sinceCutoff: new Date("2026-06-14T06:00:00.000Z"),
    });

    expect(result).toEqual({
      dispatchedCount: 0,
      skippedCount: 1,
      failureCount: 0,
    });
  });

  it("counts a thrown send as a failure and continues processing other subscribers", async () => {
    mockDb.select
      .mockReturnValueOnce(
        chainMock([
          makeRow({ subscriberId: "sub-1", email: "a@example.test" }),
          makeRow({
            subscriberId: "sub-2",
            email: "b@example.test",
            predictionId: "45A-2026-BBBB",
          }),
        ]),
      )
      .mockReturnValueOnce(chainMock([]))
      .mockReturnValueOnce(chainMock([]));

    mockSend
      .mockRejectedValueOnce(new Error("Resend down"))
      .mockResolvedValueOnce({ kind: "sent", messageId: "msg-2" });

    const result = await dispatchCalibrationDigests({
      digestDate: "2026-06-15",
      sinceCutoff: new Date("2026-06-14T06:00:00.000Z"),
    });

    expect(result.dispatchedCount).toBe(1);
    expect(result.failureCount).toBe(1);
    expect(result.skippedCount).toBe(0);
  });

  it("returns zero counts when there are no transitions in the window", async () => {
    mockDb.select.mockReturnValueOnce(chainMock([]));

    const result = await dispatchCalibrationDigests({
      digestDate: "2026-06-15",
      sinceCutoff: new Date("2026-06-14T06:00:00.000Z"),
    });

    expect(result).toEqual({
      dispatchedCount: 0,
      skippedCount: 0,
      failureCount: 0,
    });
    expect(mockSend).not.toHaveBeenCalled();
  });
});
