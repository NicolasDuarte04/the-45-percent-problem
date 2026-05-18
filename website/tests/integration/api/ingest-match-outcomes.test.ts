import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chainMock, jsonPostRequest } from "./_helpers";

vi.mock("@/lib/db", () => {
  const db = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };
  return { db, schema: {} };
});

import { db } from "@/lib/db";
import { POST as PostIngest } from "@/app/api/ingest/match-outcomes/route";

const mockDb = vi.mocked(db);

const VALID_TOKEN = "ingest-token-must-be-32-chars-min-padded";

const VALID_OUTCOME = {
  matchId: "FD12345",
  competition: "WC2026",
  stage: "r32" as const,
  homeTeam: "ARG",
  awayTeam: "MEX",
  homeGoals: 2,
  awayGoals: 1,
  settledAt: "2026-06-25T20:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("INGEST_TOKEN", VALID_TOKEN);
  mockDb.select.mockReturnValue(chainMock([]));
  mockDb.insert.mockReturnValue(chainMock([]));
  mockDb.update.mockReturnValue(chainMock([]));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/ingest/match-outcomes", () => {
  it("rejects a missing Authorization header (401)", async () => {
    const req = jsonPostRequest({
      url: "http://localhost/api/ingest/match-outcomes",
      body: { outcomes: [VALID_OUTCOME] },
    });
    const res = await PostIngest(req as never);
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("unauthorized");
  });

  it("rejects a wrong Bearer token (401)", async () => {
    const req = jsonPostRequest({
      url: "http://localhost/api/ingest/match-outcomes",
      body: { outcomes: [VALID_OUTCOME] },
      headers: {
        authorization: "Bearer wrong-token-of-the-right-length-1234567",
      },
    });
    const res = await PostIngest(req as never);
    expect(res.status).toBe(401);
  });

  it("accepts a valid batch with a valid Bearer token (200) and reports accepted=N and zero transitions for an empty prediction set", async () => {
    const req = jsonPostRequest({
      url: "http://localhost/api/ingest/match-outcomes",
      body: {
        outcomes: [
          VALID_OUTCOME,
          { ...VALID_OUTCOME, matchId: "FD12346", homeTeam: "BRA", awayTeam: "GER" },
        ],
      },
      headers: { authorization: `Bearer ${VALID_TOKEN}` },
    });
    const res = await PostIngest(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.accepted).toBe(2);
    expect(json.transitionsCount).toBe(0);
    // Two upserts (one per outcome). No prediction-state-log insert
    // since there are no candidate predictions.
    expect(mockDb.insert).toHaveBeenCalledTimes(2);
  });

  it("rejects an empty outcomes array (400)", async () => {
    const req = jsonPostRequest({
      url: "http://localhost/api/ingest/match-outcomes",
      body: { outcomes: [] },
      headers: { authorization: `Bearer ${VALID_TOKEN}` },
    });
    const res = await PostIngest(req as never);
    expect(res.status).toBe(400);
  });

  it("rejects a batch larger than 50 outcomes (400)", async () => {
    const big = Array.from({ length: 51 }, (_, i) => ({
      ...VALID_OUTCOME,
      matchId: `FD${10000 + i}`,
    }));
    const req = jsonPostRequest({
      url: "http://localhost/api/ingest/match-outcomes",
      body: { outcomes: big },
      headers: { authorization: `Bearer ${VALID_TOKEN}` },
    });
    const res = await PostIngest(req as never);
    expect(res.status).toBe(400);
  });

  it("rejects a body that violates the per-outcome schema (400)", async () => {
    const req = jsonPostRequest({
      url: "http://localhost/api/ingest/match-outcomes",
      body: {
        outcomes: [{ ...VALID_OUTCOME, stage: "not-a-stage" }],
      },
      headers: { authorization: `Bearer ${VALID_TOKEN}` },
    });
    const res = await PostIngest(req as never);
    expect(res.status).toBe(400);
  });

  it("triggers re-evaluation that writes a dead transition when an alive prediction's pick lost", async () => {
    // The runner does two selects: settled matches, then alive/promoted
    // predictions. Tier the responses by call order.
    mockDb.select
      .mockReturnValueOnce(
        chainMock([
          {
            matchId: "FD12345",
            competition: "WC2026",
            stage: "r32",
            homeTeam: "ARG",
            awayTeam: "MEX",
            homeGoals: 2,
            awayGoals: 1,
            shootoutWinner: null,
            settledAt: new Date("2026-06-25T20:00:00.000Z"),
            enteredAt: new Date(),
            enteredBy: "ingest",
            meta: {},
          },
        ]),
      )
      .mockReturnValueOnce(
        chainMock([
          {
            id: "45A-2026-DEAD-ING",
            subscriberId: null,
            email: null,
            mode: "final_four",
            scenario: { semifinalists: ["MEX", "ESP", "FRA", "ENG"] },
            storyLine: "x",
            countOriginal: 184,
            countCurrent: 184,
            total: 10000,
            state: "alive",
            killedBy: null,
            modelSha: "a",
            snapshotSha: "b",
            submittedAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      );

    const req = jsonPostRequest({
      url: "http://localhost/api/ingest/match-outcomes",
      body: { outcomes: [VALID_OUTCOME] },
      headers: { authorization: `Bearer ${VALID_TOKEN}` },
    });
    const res = await PostIngest(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.transitionsCount).toBe(1);
    // Two inserts: the outcome upsert plus the prediction_state_log row.
    expect(mockDb.insert).toHaveBeenCalledTimes(2);
    expect(mockDb.update).toHaveBeenCalledTimes(1);
  });
});
