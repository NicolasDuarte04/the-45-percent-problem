import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { chainMock, getRequest, samplePredictionRow } from "./_helpers";

vi.mock("@/lib/db", () => {
  const db = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };
  return { db, schema: {} };
});

import { db } from "@/lib/db";
import { COOKIE_NAME, signOwnerCookie } from "@/lib/sim/ownerCookie";
import { GET as GetById } from "@/app/api/predictions/[id]/route";
import { GET as GetList } from "@/app/api/predictions/route";

const mockDb = vi.mocked(db);

const TEST_OWNER_SECRET = "test-owner-secret-32-chars-pad-1234";

beforeAll(() => {
  vi.stubEnv("PREDICTION_OWNER_HMAC_SECRET", TEST_OWNER_SECRET);
});

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.select.mockReturnValue(chainMock([]));
});

afterEach(() => {
  // Keep the env stub across tests; only un-stub at the end of the file.
});

describe("GET /api/predictions/[id]", () => {
  const VALID_ID = "45A-2026-AAAA";

  function ctx(id: string) {
    return { params: Promise.resolve({ id }) };
  }

  it("returns the sanitized public view for an existing prediction (200)", async () => {
    const row = samplePredictionRow({
      id: VALID_ID,
      email: "leak@example.com",
      subscriberId: "subscriber-uuid-not-for-public-eyes",
    });
    mockDb.select.mockReturnValue(chainMock([row]));

    const req = getRequest({ url: `http://localhost/api/predictions/${VALID_ID}` });
    const res = await GetById(req as never, ctx(VALID_ID));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.prediction.id).toBe(VALID_ID);
    // Critical: public view must NOT leak the owner's email or
    // subscriber FK, even when the row carries them.
    expect(json.prediction).not.toHaveProperty("email");
    expect(json.prediction).not.toHaveProperty("subscriberId");
    expect(typeof json.prediction.submittedAt).toBe("string");
  });

  it("returns 404 when the prediction does not exist", async () => {
    mockDb.select.mockReturnValue(chainMock([]));
    const req = getRequest({ url: `http://localhost/api/predictions/${VALID_ID}` });
    const res = await GetById(req as never, ctx(VALID_ID));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("notFound");
  });

  it("returns 400 when the id shape is invalid", async () => {
    const req = getRequest({ url: "http://localhost/api/predictions/not-an-id" });
    const res = await GetById(req as never, ctx("not-an-id"));
    expect(res.status).toBe(400);
  });

  it("rejects ids that contain Crockford-excluded letters (I, L, O, U)", async () => {
    const bad = "45A-2026-OOOO";
    const req = getRequest({ url: `http://localhost/api/predictions/${bad}` });
    const res = await GetById(req as never, ctx(bad));
    expect(res.status).toBe(400);
  });

  it("surfaces hasTracking=false when the row has no subscriber attached", async () => {
    const row = samplePredictionRow({ id: VALID_ID, subscriberId: null });
    mockDb.select.mockReturnValue(chainMock([row]));
    const req = getRequest({ url: `http://localhost/api/predictions/${VALID_ID}` });
    const res = await GetById(req as never, ctx(VALID_ID));
    const json = await res.json();
    expect(json.prediction.hasTracking).toBe(false);
  });

  it("surfaces hasTracking=true when the row has a subscriber attached, without leaking the email or subscriberId", async () => {
    const row = samplePredictionRow({
      id: VALID_ID,
      subscriberId: "subscriber-uuid-tracked",
      email: "owner@example.com",
    });
    mockDb.select.mockReturnValue(chainMock([row]));
    const req = getRequest({ url: `http://localhost/api/predictions/${VALID_ID}` });
    const res = await GetById(req as never, ctx(VALID_ID));
    const json = await res.json();
    expect(json.prediction.hasTracking).toBe(true);
    expect(json.prediction).not.toHaveProperty("email");
    expect(json.prediction).not.toHaveProperty("subscriberId");
  });
});

describe("GET /api/predictions?email=...", () => {
  const OWNER_EMAIL = "owner@example.com";

  it("returns an empty list when no cookie is present (200)", async () => {
    const req = getRequest({
      url: `http://localhost/api/predictions?email=${OWNER_EMAIL}`,
    });
    const res = await GetList(req as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, predictions: [] });
    // No DB call should have happened — early return.
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it("returns an empty list when the cookie is malformed (200)", async () => {
    const req = getRequest({
      url: `http://localhost/api/predictions?email=${OWNER_EMAIL}`,
      cookies: { [COOKIE_NAME]: "not-a-real-signed-cookie" },
    });
    const res = await GetList(req as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, predictions: [] });
  });

  it("returns an empty list when the cookie email does not match the query email (200)", async () => {
    const cookieValue = signOwnerCookie("someone-else@example.com");
    const req = getRequest({
      url: `http://localhost/api/predictions?email=${OWNER_EMAIL}`,
      cookies: { [COOKIE_NAME]: cookieValue },
    });
    const res = await GetList(req as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, predictions: [] });
    // Anti-enumeration: do NOT query the DB on email mismatch.
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it("returns the owner's predictions when cookie + email match (200)", async () => {
    const rows = [
      samplePredictionRow({ id: "45A-2026-AAAA", email: OWNER_EMAIL }),
      samplePredictionRow({ id: "45A-2026-BBBB", email: OWNER_EMAIL }),
    ];
    mockDb.select.mockReturnValue(chainMock(rows));

    const cookieValue = signOwnerCookie(OWNER_EMAIL);
    const req = getRequest({
      url: `http://localhost/api/predictions?email=${OWNER_EMAIL}`,
      cookies: { [COOKIE_NAME]: cookieValue },
    });
    const res = await GetList(req as never);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.predictions).toHaveLength(2);
    // Owner view: email present, subscriberId stripped.
    expect(json.predictions[0].email).toBe(OWNER_EMAIL);
    expect(json.predictions[0]).not.toHaveProperty("subscriberId");
    expect(json.predictions[1].email).toBe(OWNER_EMAIL);
  });

  it("slides the cookie's Max-Age on a successful list response", async () => {
    const rows = [samplePredictionRow({ email: OWNER_EMAIL })];
    mockDb.select.mockReturnValue(chainMock(rows));

    const cookieValue = signOwnerCookie(OWNER_EMAIL);
    const req = getRequest({
      url: `http://localhost/api/predictions?email=${OWNER_EMAIL}`,
      cookies: { [COOKIE_NAME]: cookieValue },
    });
    const res = await GetList(req as never);

    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).not.toBeNull();
    expect(setCookie).toContain(COOKIE_NAME);
    expect(setCookie).toContain("Max-Age=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
  });

  it("does not set a renewal cookie on the empty-list path (no cookie)", async () => {
    const req = getRequest({
      url: `http://localhost/api/predictions?email=${OWNER_EMAIL}`,
    });
    const res = await GetList(req as never);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("rejects a missing email query param (400)", async () => {
    const req = getRequest({ url: "http://localhost/api/predictions" });
    const res = await GetList(req as never);
    expect(res.status).toBe(400);
  });

  it("rejects an invalid email format (400)", async () => {
    const req = getRequest({
      url: "http://localhost/api/predictions?email=not-an-email",
    });
    const res = await GetList(req as never);
    expect(res.status).toBe(400);
  });

  it("lowercases the query email before matching against the cookie", async () => {
    const rows = [samplePredictionRow({ email: OWNER_EMAIL })];
    mockDb.select.mockReturnValue(chainMock(rows));
    const cookieValue = signOwnerCookie(OWNER_EMAIL);
    const req = getRequest({
      // Mixed-case in the URL — should still match the lowercase cookie.
      url: `http://localhost/api/predictions?email=Owner@Example.COM`,
      cookies: { [COOKIE_NAME]: cookieValue },
    });
    const res = await GetList(req as never);
    const json = await res.json();
    expect(json.predictions).toHaveLength(1);
  });
});
