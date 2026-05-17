import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chainMock, jsonPostRequest, samplePredictionRow } from "./_helpers";

vi.mock("@/lib/db", () => {
  const db = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };
  return { db, schema: {} };
});

import { db } from "@/lib/db";
import { __resetRateLimitForTests } from "@/lib/ratelimit";
import { POST as PostPrediction } from "@/app/api/predictions/route";
import { POST as PostAdminState } from "@/app/api/admin/predictions/[id]/state/route";

const mockDb = vi.mocked(db);

const VALID_BODY_FF = {
  mode: "final_four" as const,
  scenario: { semifinalists: ["ARG", "BRA", "FRA", "ENG"] },
  modelSha: "a3f2c1d",
  snapshotSha: "9b7e2f4",
};

beforeEach(() => {
  vi.clearAllMocks();
  __resetRateLimitForTests();
  // Default chain mocks: existsCheck → no row, insert → returns the
  // sample row, update → returns the sample row. Tests override.
  mockDb.select.mockReturnValue(chainMock([]));
  mockDb.insert.mockReturnValue(chainMock([samplePredictionRow()]));
  mockDb.update.mockReturnValue(chainMock([samplePredictionRow()]));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/predictions", () => {
  it("inserts a Final Four prediction and returns the sanitized row (201)", async () => {
    const insertedRow = samplePredictionRow({
      mode: "final_four",
      scenario: VALID_BODY_FF.scenario,
    });
    mockDb.insert.mockReturnValue(chainMock([insertedRow]));

    const req = jsonPostRequest({
      url: "http://localhost/api/predictions",
      body: VALID_BODY_FF,
    });
    const res = await PostPrediction(req as never);

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.prediction.id).toMatch(/^45A-2026-[0-9A-HJKMNP-TV-Z]{4}$/);
    expect(json.prediction.mode).toBe("final_four");
    // Sanitization: response shape excludes email and subscriberId.
    expect(json.prediction).not.toHaveProperty("email");
    expect(json.prediction).not.toHaveProperty("subscriberId");
    expect(json.prediction.storyLine).toContain("semifinals");
    expect(json.prediction.total).toBe(10000);
    expect(json.prediction.countOriginal).toBeGreaterThanOrEqual(1);
    expect(json.prediction.countOriginal).toBe(json.prediction.countCurrent);
    expect(typeof json.prediction.submittedAt).toBe("string");
  });

  it("rejects malformed JSON body (400)", async () => {
    const req = jsonPostRequest({
      url: "http://localhost/api/predictions",
      body: "{not-json",
    });
    const res = await PostPrediction(req as never);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid");
  });

  it("rejects an unknown mode (400)", async () => {
    const req = jsonPostRequest({
      url: "http://localhost/api/predictions",
      body: { ...VALID_BODY_FF, mode: "weird_mode" },
    });
    const res = await PostPrediction(req as never);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid");
  });

  it("rejects a Final Four scenario with duplicate teams (400)", async () => {
    const req = jsonPostRequest({
      url: "http://localhost/api/predictions",
      body: {
        ...VALID_BODY_FF,
        scenario: { semifinalists: ["ARG", "ARG", "FRA", "ENG"] },
      },
    });
    const res = await PostPrediction(req as never);
    expect(res.status).toBe(400);
  });

  it("rejects when modelSha is missing (400)", async () => {
    const req = jsonPostRequest({
      url: "http://localhost/api/predictions",
      body: { ...VALID_BODY_FF, modelSha: undefined },
    });
    const res = await PostPrediction(req as never);
    expect(res.status).toBe(400);
  });

  it("returns 429 once the per-IP hourly rate limit is exceeded", async () => {
    const headers = { "x-forwarded-for": "10.0.0.1" };
    // 30/hour per IP. Burn 30 successful requests, then the 31st 429s.
    for (let i = 0; i < 30; i++) {
      const req = jsonPostRequest({
        url: "http://localhost/api/predictions",
        body: VALID_BODY_FF,
        headers,
      });
      const res = await PostPrediction(req as never);
      expect(res.status).toBe(201);
    }
    const overshoot = jsonPostRequest({
      url: "http://localhost/api/predictions",
      body: VALID_BODY_FF,
      headers,
    });
    const res = await PostPrediction(overshoot as never);
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toBe("rateLimit");
    expect(typeof json.retryAfterMs).toBe("number");
  });

  it("computes Reality Score deterministically from canonicalized scenario", async () => {
    // Two requests with the same canonical scenario should yield the
    // same countOriginal. Run two inserts back-to-back from different
    // IPs (so rate limiter doesn't interfere) and compare.
    const requestA = jsonPostRequest({
      url: "http://localhost/api/predictions",
      body: VALID_BODY_FF,
      headers: { "x-forwarded-for": "10.0.0.10" },
    });
    const requestB = jsonPostRequest({
      url: "http://localhost/api/predictions",
      body: {
        ...VALID_BODY_FF,
        // Permuted order; canonical form sorts → same hash.
        scenario: { semifinalists: ["ENG", "FRA", "BRA", "ARG"] },
      },
      headers: { "x-forwarded-for": "10.0.0.11" },
    });
    const aJson = await (await PostPrediction(requestA as never)).json();
    const bJson = await (await PostPrediction(requestB as never)).json();
    expect(bJson.prediction.countOriginal).toBe(aJson.prediction.countOriginal);
  });

  it("returns 500 when the DB insert fails", async () => {
    mockDb.insert.mockImplementation(() => {
      throw new Error("connection refused");
    });
    const req = jsonPostRequest({
      url: "http://localhost/api/predictions",
      body: VALID_BODY_FF,
    });
    const res = await PostPrediction(req as never);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("server");
  });

  it("returns 500 when the existence-check SELECT fails (e.g. missing table)", async () => {
    // Simulate the production failure mode that motivated this fix:
    // the `predictions` table does not exist (42P01), so the SELECT
    // inside `existsCheck` rejects. Pre-fix, this was logged as
    // "id generation exhausted": misleading ops; now it surfaces as
    // a `server` 500 with the real cause logged.
    mockDb.select.mockImplementation(() => {
      throw new Error('relation "predictions" does not exist');
    });
    const req = jsonPostRequest({
      url: "http://localhost/api/predictions",
      body: VALID_BODY_FF,
    });
    const res = await PostPrediction(req as never);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("server");
  });

  it("includes structured Zod issues when ?debug=1 is set", async () => {
    const req = jsonPostRequest({
      url: "http://localhost/api/predictions?debug=1",
      body: { ...VALID_BODY_FF, mode: "weird_mode" },
    });
    const res = await PostPrediction(req as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid");
    expect(Array.isArray(json.issues)).toBe(true);
    expect(json.issues.length).toBeGreaterThan(0);
    // Each issue has a path/code/message triple.
    for (const iss of json.issues) {
      expect(typeof iss.path).toBe("string");
      expect(typeof iss.code).toBe("string");
      expect(typeof iss.message).toBe("string");
    }
  });

  it("omits Zod issues by default (no ?debug=1)", async () => {
    const req = jsonPostRequest({
      url: "http://localhost/api/predictions",
      body: { ...VALID_BODY_FF, mode: "weird_mode" },
    });
    const res = await PostPrediction(req as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid");
    expect(json).not.toHaveProperty("issues");
  });
});

describe("POST /api/admin/predictions/[id]/state", () => {
  const VALID_TOKEN = "admin-token-must-be-32-chars-min-1234";
  const VALID_ID = "45A-2026-AAAA";

  beforeEach(() => {
    vi.stubEnv("BRIEF_DISPATCH_TOKEN", VALID_TOKEN);
  });

  function adminCtx(id: string) {
    return { params: Promise.resolve({ id }) };
  }

  it("updates a prediction's state with a valid Bearer token (200)", async () => {
    const updated = samplePredictionRow({ id: VALID_ID, state: "promoted" });
    mockDb.update.mockReturnValue(chainMock([updated]));

    const req = jsonPostRequest({
      url: `http://localhost/api/admin/predictions/${VALID_ID}/state`,
      body: { state: "promoted" },
      headers: { authorization: `Bearer ${VALID_TOKEN}` },
    });
    const res = await PostAdminState(req as never, adminCtx(VALID_ID));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.prediction.state).toBe("promoted");
    expect(json.prediction).not.toHaveProperty("email");
    expect(json.prediction).not.toHaveProperty("subscriberId");
  });

  it("rejects a missing Authorization header (401)", async () => {
    const req = jsonPostRequest({
      url: `http://localhost/api/admin/predictions/${VALID_ID}/state`,
      body: { state: "alive" },
    });
    const res = await PostAdminState(req as never, adminCtx(VALID_ID));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("unauthorized");
  });

  it("rejects a wrong Bearer token (401)", async () => {
    const req = jsonPostRequest({
      url: `http://localhost/api/admin/predictions/${VALID_ID}/state`,
      body: { state: "alive" },
      headers: { authorization: "Bearer wrong-token-of-the-correct-length-padding-for-32" },
    });
    const res = await PostAdminState(req as never, adminCtx(VALID_ID));
    expect(res.status).toBe(401);
  });

  it("rejects when BRIEF_DISPATCH_TOKEN is unset (401)", async () => {
    vi.stubEnv("BRIEF_DISPATCH_TOKEN", "");
    const req = jsonPostRequest({
      url: `http://localhost/api/admin/predictions/${VALID_ID}/state`,
      body: { state: "alive" },
      headers: { authorization: `Bearer ${VALID_TOKEN}` },
    });
    const res = await PostAdminState(req as never, adminCtx(VALID_ID));
    expect(res.status).toBe(401);
  });

  it("rejects an invalid prediction-id shape (400)", async () => {
    const req = jsonPostRequest({
      url: "http://localhost/api/admin/predictions/not-a-real-id/state",
      body: { state: "alive" },
      headers: { authorization: `Bearer ${VALID_TOKEN}` },
    });
    const res = await PostAdminState(req as never, adminCtx("not-a-real-id"));
    expect(res.status).toBe(400);
  });

  it("rejects an invalid state value (400)", async () => {
    const req = jsonPostRequest({
      url: `http://localhost/api/admin/predictions/${VALID_ID}/state`,
      body: { state: "winning" },
      headers: { authorization: `Bearer ${VALID_TOKEN}` },
    });
    const res = await PostAdminState(req as never, adminCtx(VALID_ID));
    expect(res.status).toBe(400);
  });

  it("returns 404 when no prediction matches the id", async () => {
    mockDb.update.mockReturnValue(chainMock([])); // no row updated
    const req = jsonPostRequest({
      url: `http://localhost/api/admin/predictions/${VALID_ID}/state`,
      body: { state: "alive" },
      headers: { authorization: `Bearer ${VALID_TOKEN}` },
    });
    const res = await PostAdminState(req as never, adminCtx(VALID_ID));
    expect(res.status).toBe(404);
  });

  it("rejects with 401 when scheme is not Bearer", async () => {
    const req = jsonPostRequest({
      url: `http://localhost/api/admin/predictions/${VALID_ID}/state`,
      body: { state: "alive" },
      headers: { authorization: `Basic ${VALID_TOKEN}` },
    });
    const res = await PostAdminState(req as never, adminCtx(VALID_ID));
    expect(res.status).toBe(401);
  });
});
