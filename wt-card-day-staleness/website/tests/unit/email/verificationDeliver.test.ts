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
import { deliverVerificationEmail } from "@/lib/email/verification";

const mockDb = vi.mocked(db);

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://45analytics.example");
});

describe("deliverVerificationEmail: happy path", () => {
  it("sends without the [45A] subject prefix, stamps sent_at, logs a 'sent' row", async () => {
    mockDb.update.mockReturnValue(chainMock([]));
    mockDb.insert.mockReturnValue(chainMock([]));
    resendSend.mockResolvedValue({ data: { id: "re_msg_1" }, error: null });

    const result = await deliverVerificationEmail({
      subscriberId: "sub-1",
      to: "reader@example.test",
      token: "tok_abcdefghijklmnop",
    });

    expect(result).toEqual({ messageId: "re_msg_1" });

    expect(resendSend).toHaveBeenCalledTimes(1);
    const sendArgs = resendSend.mock.calls[0][0];
    expect(sendArgs.from).toBe("brief@45analytics.com");
    expect(sendArgs.to).toBe("reader@example.test");
    expect(sendArgs.subject).toBe(
      "Confirm your subscription to the 45analytics daily brief",
    );
    expect(sendArgs.subject).not.toContain("[45A]");

    // sent_at stamped (update) and a single 'sent' row logged (insert).
    expect(mockDb.update).toHaveBeenCalledTimes(1);
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
  });
});

describe("deliverVerificationEmail: failure path", () => {
  it("logs a 'failed' row, leaves sent_at untouched, and throws", async () => {
    mockDb.update.mockReturnValue(chainMock([]));
    mockDb.insert.mockReturnValue(chainMock([]));
    resendSend.mockResolvedValue({
      data: null,
      error: { name: "rate_limit_exceeded", message: "slow down" },
    });

    await expect(
      deliverVerificationEmail({
        subscriberId: "sub-1",
        to: "reader@example.test",
        token: "tok_abcdefghijklmnop",
      }),
    ).rejects.toThrow(/Resend send failed/);

    // The failure row is logged, but verification_sent_at is NOT stamped.
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
    expect(mockDb.update).not.toHaveBeenCalled();
  });
});
