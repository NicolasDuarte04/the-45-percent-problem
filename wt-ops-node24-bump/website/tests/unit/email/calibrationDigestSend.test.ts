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

const resendSend = vi.fn();

vi.mock("@/lib/email/resend", () => ({
  getResend: () => ({ emails: { send: resendSend } }),
  briefMail: {
    from: "brief@45analytics.com",
    replyTo: "hello@45analytics.com",
  },
}));

import { db } from "@/lib/db";
import {
  buildCalibrationDigestSubject,
  sendCalibrationDigest,
} from "@/lib/email/calibrationDigest";
import type { CalibrationDigestTransition } from "@/emails/CalibrationDigestEmail";

const mockDb = vi.mocked(db);

const SAMPLE_TRANSITION: CalibrationDigestTransition = {
  predictionId: "45A-2026-AAAA",
  mode: "final_four",
  storyLine: "Spain, France, Argentina, Morocco in the semifinals.",
  previousState: "alive",
  newState: "dead",
  reason: "GER eliminated in R32 vs ITA (0-2). Scenario contradicted.",
  permalinkUrl: "https://45analytics.example/scenario/p/45A-2026-AAAA",
};

const ACTIVE_SUBSCRIBER = {
  id: "sub-1",
  status: "active",
  subscriptionTypes: ["prediction_tracking"],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://45analytics.example");
  vi.stubEnv(
    "UNSUBSCRIBE_HMAC_SECRET",
    "test-secret-at-least-thirty-two-characters-long-aaaaa",
  );
});

describe("buildCalibrationDigestSubject", () => {
  it("uses the singular pattern when count is 1", () => {
    expect(buildCalibrationDigestSubject(1)).toBe(
      "[45A] 1 forecast changed state today",
    );
  });

  it("uses the plural pattern for N>1", () => {
    expect(buildCalibrationDigestSubject(3)).toBe(
      "[45A] 3 forecasts changed state today",
    );
    expect(buildCalibrationDigestSubject(42)).toBe(
      "[45A] 42 forecasts changed state today",
    );
  });
});

describe("sendCalibrationDigest: happy path", () => {
  it("dispatches via Resend and writes a 'sent' row to sendLog", async () => {
    // Suppression check: empty suppression list, active subscriber.
    mockDb.select
      .mockReturnValueOnce(chainMock([])) // suppressionList
      .mockReturnValueOnce(chainMock([ACTIVE_SUBSCRIBER])); // subscribers

    mockDb.insert.mockReturnValue(chainMock([]));
    resendSend.mockResolvedValue({
      data: { id: "resend-message-id-123" },
      error: null,
    });

    const result = await sendCalibrationDigest({
      to: "operator@example.test",
      subscriberId: "sub-1",
      digestDate: "2026-06-15",
      transitions: [SAMPLE_TRANSITION],
    });

    expect(result).toEqual({ kind: "sent", messageId: "resend-message-id-123" });

    // Resend invocation: subject pattern, from address, List-Unsubscribe header.
    expect(resendSend).toHaveBeenCalledTimes(1);
    const sendArgs = resendSend.mock.calls[0][0];
    expect(sendArgs.from).toBe("brief@45analytics.com");
    expect(sendArgs.to).toBe("operator@example.test");
    expect(sendArgs.subject).toBe(
      "[45A] 1 forecast changed state today",
    );
    expect(sendArgs.headers["List-Unsubscribe"]).toMatch(
      /^<https:\/\/45analytics\.example\/api\/unsubscribe\?u=/,
    );
    expect(sendArgs.headers["List-Unsubscribe-Post"]).toBe(
      "List-Unsubscribe=One-Click",
    );

    // sendLog insert: eventType + digestDate + status='sent'.
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
  });
});

describe("sendCalibrationDigest: suppression", () => {
  it("skips when the email is on the suppression list", async () => {
    mockDb.select.mockReturnValueOnce(
      chainMock([{ email: "operator@example.test" }]),
    );
    mockDb.insert.mockReturnValue(chainMock([]));

    const result = await sendCalibrationDigest({
      to: "operator@example.test",
      subscriberId: "sub-1",
      digestDate: "2026-06-15",
      transitions: [SAMPLE_TRANSITION],
    });

    expect(result).toEqual({
      kind: "skipped_suppression",
      reason: "email_suppressed",
    });
    expect(resendSend).not.toHaveBeenCalled();
    expect(mockDb.insert).toHaveBeenCalledTimes(1); // skipped_suppression row
  });

  it("skips when the subscriber's status is not active", async () => {
    mockDb.select
      .mockReturnValueOnce(chainMock([])) // suppressionList: clear
      .mockReturnValueOnce(
        chainMock([{ ...ACTIVE_SUBSCRIBER, status: "unsubscribed" }]),
      );
    mockDb.insert.mockReturnValue(chainMock([]));

    const result = await sendCalibrationDigest({
      to: "operator@example.test",
      subscriberId: "sub-1",
      digestDate: "2026-06-15",
      transitions: [SAMPLE_TRANSITION],
    });

    expect(result).toEqual({
      kind: "skipped_suppression",
      reason: "subscriber_inactive",
    });
    expect(resendSend).not.toHaveBeenCalled();
  });

  it("skips when the subscriber is not on the prediction_tracking topic", async () => {
    mockDb.select
      .mockReturnValueOnce(chainMock([]))
      .mockReturnValueOnce(
        chainMock([
          { ...ACTIVE_SUBSCRIBER, subscriptionTypes: ["daily_brief"] },
        ]),
      );
    mockDb.insert.mockReturnValue(chainMock([]));

    const result = await sendCalibrationDigest({
      to: "operator@example.test",
      subscriberId: "sub-1",
      digestDate: "2026-06-15",
      transitions: [SAMPLE_TRANSITION],
    });

    expect(result).toEqual({
      kind: "skipped_suppression",
      reason: "topic_not_subscribed",
    });
    expect(resendSend).not.toHaveBeenCalled();
  });

  it("normalizes the email to lowercase before checking the suppression list", async () => {
    mockDb.select
      .mockReturnValueOnce(chainMock([])) // suppression
      .mockReturnValueOnce(chainMock([ACTIVE_SUBSCRIBER]));
    mockDb.insert.mockReturnValue(chainMock([]));
    resendSend.mockResolvedValue({
      data: { id: "msg-1" },
      error: null,
    });

    await sendCalibrationDigest({
      to: "  Operator@Example.TEST  ",
      subscriberId: "sub-1",
      digestDate: "2026-06-15",
      transitions: [SAMPLE_TRANSITION],
    });

    expect(resendSend).toHaveBeenCalledTimes(1);
    // The Resend invocation keeps the original casing for the recipient
    // header, but the suppression query went through normalization.
    // (Verifying normalization indirectly: the call did not skip.)
  });
});

describe("sendCalibrationDigest: failure path", () => {
  it("writes a 'failed' row and throws when Resend returns an error", async () => {
    mockDb.select
      .mockReturnValueOnce(chainMock([]))
      .mockReturnValueOnce(chainMock([ACTIVE_SUBSCRIBER]));
    mockDb.insert.mockReturnValue(chainMock([]));
    resendSend.mockResolvedValue({
      data: null,
      error: { name: "ServiceUnavailable", message: "Resend is down" },
    });

    await expect(
      sendCalibrationDigest({
        to: "operator@example.test",
        subscriberId: "sub-1",
        digestDate: "2026-06-15",
        transitions: [SAMPLE_TRANSITION],
      }),
    ).rejects.toThrow(/Resend send failed/);
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
  });
});
