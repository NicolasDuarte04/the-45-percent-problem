import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { chainMock, jsonPostRequest, samplePredictionRow } from "./_helpers";

vi.mock("@/lib/db", () => {
  const db = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };
  return { db, schema: {} };
});

vi.mock("@/lib/email/subscribeService", () => ({
  subscribeService: vi.fn(),
}));

import { db } from "@/lib/db";
import { subscribeService } from "@/lib/email/subscribeService";
import { __resetRateLimitForTests } from "@/lib/ratelimit";
import { POST as PostAttach } from "@/app/api/predictions/[id]/email/route";

const mockDb = vi.mocked(db);
const mockSubscribeService = vi.mocked(subscribeService);

const SAME_ORIGIN = "http://localhost:3000";
const VALID_ID = "45A-2026-AAAA";
const VALID_EMAIL = "fan@example.com";

beforeAll(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", SAME_ORIGIN);
});

beforeEach(() => {
  vi.clearAllMocks();
  __resetRateLimitForTests();
  mockDb.select.mockReturnValue(chainMock([samplePredictionRow({ id: VALID_ID })]));
  mockDb.update.mockReturnValue(chainMock([samplePredictionRow({ id: VALID_ID })]));
});

afterEach(() => {
  // Env stays stubbed for the file.
});

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(opts: {
  body: unknown;
  origin?: string;
  referer?: string;
  forwardedFor?: string;
}) {
  const headers: Record<string, string> = {};
  if (opts.origin !== undefined) headers["origin"] = opts.origin;
  if (opts.referer !== undefined) headers["referer"] = opts.referer;
  if (opts.forwardedFor) headers["x-forwarded-for"] = opts.forwardedFor;
  return jsonPostRequest({
    url: `${SAME_ORIGIN}/api/predictions/${VALID_ID}/email`,
    body: opts.body,
    headers,
  });
}

describe("POST /api/predictions/[id]/email", () => {
  it("attaches the subscriber on a 'created' subscribeService outcome (200)", async () => {
    mockSubscribeService.mockResolvedValue({
      kind: "created",
      subscriberId: "sub-uuid-123",
    });

    const req = makeRequest({
      body: { email: VALID_EMAIL },
      origin: SAME_ORIGIN,
    });
    const res = await PostAttach(req as never, ctx(VALID_ID));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true, status: "created" });

    // subscribeService received simulator-shape payload with the
    // prediction's storyLine and a derived rarity band.
    expect(mockSubscribeService).toHaveBeenCalledOnce();
    const call = mockSubscribeService.mock.calls[0][0];
    expect(call.kind).toBe("simulator");
    expect(call.predictionId).toBe(VALID_ID);
    expect(call.email).toBe(VALID_EMAIL);
    expect(typeof call.storyLine).toBe("string");
    expect(typeof call.rarityBand).toBe("string");

    // DB update was called to attach subscriberId + email to the row.
    expect(mockDb.update).toHaveBeenCalledOnce();
  });

  it("returns 200 with status='already_active' (no fresh email, row attached)", async () => {
    mockSubscribeService.mockResolvedValue({
      kind: "already_active",
      subscriberId: "sub-uuid-456",
    });
    const req = makeRequest({ body: { email: VALID_EMAIL }, origin: SAME_ORIGIN });
    const res = await PostAttach(req as never, ctx(VALID_ID));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, status: "already_active" });
    expect(mockDb.update).toHaveBeenCalledOnce();
  });

  it("returns 200 with status='already_pending' (existing in-flight verification)", async () => {
    mockSubscribeService.mockResolvedValue({
      kind: "already_pending",
      subscriberId: "sub-uuid-789",
    });
    const req = makeRequest({ body: { email: VALID_EMAIL }, origin: SAME_ORIGIN });
    const res = await PostAttach(req as never, ctx(VALID_ID));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, status: "already_pending" });
  });

  it("returns 409 'suppressed' when subscribeService says suppressed", async () => {
    mockSubscribeService.mockResolvedValue({ kind: "suppressed" });
    const req = makeRequest({ body: { email: VALID_EMAIL }, origin: SAME_ORIGIN });
    const res = await PostAttach(req as never, ctx(VALID_ID));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("suppressed");
    // Critical: the prediction row is NOT attached when suppressed.
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("returns 409 'complained' for a complained subscriber", async () => {
    mockSubscribeService.mockResolvedValue({ kind: "complained" });
    const req = makeRequest({ body: { email: VALID_EMAIL }, origin: SAME_ORIGIN });
    const res = await PostAttach(req as never, ctx(VALID_ID));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("complained");
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("returns 502 when the verification email send fails", async () => {
    mockSubscribeService.mockResolvedValue({ kind: "send_failed" });
    const req = makeRequest({ body: { email: VALID_EMAIL }, origin: SAME_ORIGIN });
    const res = await PostAttach(req as never, ctx(VALID_ID));
    expect(res.status).toBe(502);
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("rejects cross-origin requests (403)", async () => {
    const req = makeRequest({
      body: { email: VALID_EMAIL },
      origin: "https://malicious.example",
    });
    const res = await PostAttach(req as never, ctx(VALID_ID));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("forbidden");
    expect(mockSubscribeService).not.toHaveBeenCalled();
  });

  it("accepts a same-origin Referer when Origin header is absent", async () => {
    mockSubscribeService.mockResolvedValue({
      kind: "created",
      subscriberId: "sub-uuid-321",
    });
    const req = makeRequest({
      body: { email: VALID_EMAIL },
      referer: `${SAME_ORIGIN}/scenario`,
    });
    const res = await PostAttach(req as never, ctx(VALID_ID));
    expect(res.status).toBe(200);
  });

  it("rejects requests with neither Origin nor Referer (403)", async () => {
    const req = makeRequest({ body: { email: VALID_EMAIL } });
    const res = await PostAttach(req as never, ctx(VALID_ID));
    expect(res.status).toBe(403);
  });

  it("returns 404 when the prediction does not exist", async () => {
    mockDb.select.mockReturnValue(chainMock([]));
    mockSubscribeService.mockResolvedValue({
      kind: "created",
      subscriberId: "sub-1",
    });
    const req = makeRequest({ body: { email: VALID_EMAIL }, origin: SAME_ORIGIN });
    const res = await PostAttach(req as never, ctx(VALID_ID));
    expect(res.status).toBe(404);
    // subscribeService should NOT be called when the prediction is missing.
    expect(mockSubscribeService).not.toHaveBeenCalled();
  });

  it("rejects an invalid prediction-id shape (400)", async () => {
    const req = jsonPostRequest({
      url: `${SAME_ORIGIN}/api/predictions/bad-id/email`,
      body: { email: VALID_EMAIL },
      headers: { origin: SAME_ORIGIN },
    });
    const res = await PostAttach(req as never, ctx("bad-id"));
    expect(res.status).toBe(400);
  });

  it("rejects an invalid email (400)", async () => {
    const req = makeRequest({
      body: { email: "not-an-email" },
      origin: SAME_ORIGIN,
    });
    const res = await PostAttach(req as never, ctx(VALID_ID));
    expect(res.status).toBe(400);
  });

  it("returns 429 once the per-IP rate limit is exceeded", async () => {
    mockSubscribeService.mockResolvedValue({
      kind: "created",
      subscriberId: "sub-loop",
    });
    const ip = "192.168.1.99";
    for (let i = 0; i < 10; i++) {
      const req = makeRequest({
        body: { email: VALID_EMAIL },
        origin: SAME_ORIGIN,
        forwardedFor: ip,
      });
      const res = await PostAttach(req as never, ctx(VALID_ID));
      expect(res.status).toBe(200);
    }
    const overshoot = makeRequest({
      body: { email: VALID_EMAIL },
      origin: SAME_ORIGIN,
      forwardedFor: ip,
    });
    const res = await PostAttach(overshoot as never, ctx(VALID_ID));
    expect(res.status).toBe(429);
    expect((await res.json()).error).toBe("rateLimit");
  });

  it("returns 500 when subscribeService throws", async () => {
    mockSubscribeService.mockRejectedValue(new Error("boom"));
    const req = makeRequest({ body: { email: VALID_EMAIL }, origin: SAME_ORIGIN });
    const res = await PostAttach(req as never, ctx(VALID_ID));
    expect(res.status).toBe(500);
  });
});
