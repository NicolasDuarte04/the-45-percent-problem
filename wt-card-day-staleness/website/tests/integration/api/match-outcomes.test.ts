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

// Pin the per-team marginals the evaluator reads so the idempotency fixture's
// count cannot drift with the nightly M2 batch. snapshotProbs.ts is
// auto-generated (regenerated on every nightly and pushed to main); under the
// pull_request *merge* checkout the test ran main's freshly-regenerated probs
// against this file's hard-coded count, so any batch-to-batch Monte Carlo
// noise flipped the idempotency assertion. Mocking TEAM_PROBS to fixed values
// removes that coupling. This realises the test-infra follow-up the
// "real idempotency" case documented inline. Only pS is read by the Final
// Four evaluator; the remaining fields satisfy the TeamProbs shape.
vi.mock("@/lib/sim/snapshotProbs", () => {
  const t = (pS: number) => ({ pG: 0.9, pR: 0.7, pQ: 0.5, pS, pF: 0.1, pC: 0.05 });
  return {
    TEAM_PROBS: {
      ARG: t(0.28),
      BRA: t(0.3),
      FRA: t(0.28),
      ENG: t(0.2),
      MEX: t(0.25),
      ESP: t(0.3),
    },
  };
});

import { db } from "@/lib/db";
import { POST as PostMatchOutcome } from "@/app/api/admin/match-outcomes/route";
import { POST as PostCron } from "@/app/api/cron/eval-predictions/route";

const mockDb = vi.mocked(db);

const VALID_TOKEN = "admin-token-must-be-32-chars-min-1234";

const VALID_OUTCOME = {
  matchId: "M001",
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
  vi.stubEnv("BRIEF_DISPATCH_TOKEN", VALID_TOKEN);
  // Default: no settled matches, no predictions to evaluate, insert OK.
  mockDb.select.mockReturnValue(chainMock([]));
  mockDb.insert.mockReturnValue(chainMock([]));
  mockDb.update.mockReturnValue(chainMock([]));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/admin/match-outcomes", () => {
  it("inserts a settled outcome with a valid Bearer token (200) and reports zero transitions for an empty prediction set", async () => {
    const req = jsonPostRequest({
      url: "http://localhost/api/admin/match-outcomes",
      body: VALID_OUTCOME,
      headers: { authorization: `Bearer ${VALID_TOKEN}` },
    });
    const res = await PostMatchOutcome(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.transitionsCount).toBe(0);
    expect(mockDb.insert).toHaveBeenCalled();
    // cp-13: the response now reports the public-surface refresh. The
    // revalidation field is always present; the regen dispatch degrades to
    // not_configured here because no GITHUB_REGEN_PAT is set in the test env
    // (and therefore makes no network call).
    expect(json.revalidation).toBeDefined();
    expect(json.regenDispatch).toMatchObject({
      skipped: true,
      reason: "not_configured",
    });
  });

  it("rejects a missing Authorization header (401)", async () => {
    const req = jsonPostRequest({
      url: "http://localhost/api/admin/match-outcomes",
      body: VALID_OUTCOME,
    });
    const res = await PostMatchOutcome(req as never);
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("unauthorized");
  });

  it("rejects a wrong Bearer token (401)", async () => {
    const req = jsonPostRequest({
      url: "http://localhost/api/admin/match-outcomes",
      body: VALID_OUTCOME,
      headers: { authorization: "Bearer wrong-token-of-the-correct-length-padding-1234" },
    });
    const res = await PostMatchOutcome(req as never);
    expect(res.status).toBe(401);
  });

  it("rejects a body that violates the schema (400)", async () => {
    const req = jsonPostRequest({
      url: "http://localhost/api/admin/match-outcomes",
      body: { ...VALID_OUTCOME, stage: "not-a-stage" },
      headers: { authorization: `Bearer ${VALID_TOKEN}` },
    });
    const res = await PostMatchOutcome(req as never);
    expect(res.status).toBe(400);
  });

  it("rejects identical home and away teams (400)", async () => {
    const req = jsonPostRequest({
      url: "http://localhost/api/admin/match-outcomes",
      body: { ...VALID_OUTCOME, awayTeam: "ARG" },
      headers: { authorization: `Bearer ${VALID_TOKEN}` },
    });
    const res = await PostMatchOutcome(req as never);
    expect(res.status).toBe(400);
  });

  it("rejects a shootout winner that did not play in the match (400)", async () => {
    const req = jsonPostRequest({
      url: "http://localhost/api/admin/match-outcomes",
      body: { ...VALID_OUTCOME, homeGoals: 1, awayGoals: 1, shootoutWinner: "BRA" },
      headers: { authorization: `Bearer ${VALID_TOKEN}` },
    });
    const res = await PostMatchOutcome(req as never);
    expect(res.status).toBe(400);
  });

  it("triggers re-evaluation that writes a dead transition when an alive prediction's pick lost", async () => {
    // The chainMock returns the same result for any chained select call.
    // The runner does two reads: select all match_outcomes, then select
    // alive/promoted predictions. Both chain off mockDb.select(). We
    // tier the responses by call order.
    mockDb.select
      .mockReturnValueOnce(
        chainMock([
          {
            matchId: "M001",
            competition: "WC2026",
            stage: "r32",
            homeTeam: "ARG",
            awayTeam: "MEX",
            homeGoals: 2,
            awayGoals: 1,
            shootoutWinner: null,
            settledAt: new Date("2026-06-25T20:00:00.000Z"),
            enteredAt: new Date(),
            enteredBy: "test",
            meta: {},
          },
        ]),
      )
      .mockReturnValueOnce(
        chainMock([
          {
            id: "45A-2026-DEAD",
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
      url: "http://localhost/api/admin/match-outcomes",
      body: VALID_OUTCOME,
      headers: { authorization: `Bearer ${VALID_TOKEN}` },
    });
    const res = await PostMatchOutcome(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.transitionsCount).toBe(1);
    // The runner inserts once into match_outcomes (the route's upsert)
    // and once into prediction_state_log (the transition). Two inserts.
    expect(mockDb.insert).toHaveBeenCalledTimes(2);
    expect(mockDb.update).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/cron/eval-predictions", () => {
  it("rejects a missing Authorization header (401)", async () => {
    const req = jsonPostRequest({
      url: "http://localhost/api/cron/eval-predictions",
      body: {},
    });
    const res = await PostCron(req as never);
    expect(res.status).toBe(401);
  });

  it("accepts BRIEF_DISPATCH_TOKEN as a manual-trigger fallback (200)", async () => {
    const req = jsonPostRequest({
      url: "http://localhost/api/cron/eval-predictions",
      body: {},
      headers: { authorization: `Bearer ${VALID_TOKEN}` },
    });
    const res = await PostCron(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.evaluatedCount).toBe(0);
    expect(json.transitionsCount).toBe(0);
  });

  it("accepts CRON_SECRET (200)", async () => {
    const cronSecret = "cron-secret-must-be-32-chars-padded-1234";
    vi.stubEnv("CRON_SECRET", cronSecret);
    const req = jsonPostRequest({
      url: "http://localhost/api/cron/eval-predictions",
      body: {},
      headers: { authorization: `Bearer ${cronSecret}` },
    });
    const res = await PostCron(req as never);
    expect(res.status).toBe(200);
  });

  it("is idempotent: a run with no candidates and no settled matches produces zero transitions and zero log writes", async () => {
    // Default mocks return empty arrays from both select calls. The
    // runner walks zero predictions and writes nothing.
    const req = jsonPostRequest({
      url: "http://localhost/api/cron/eval-predictions",
      body: {},
      headers: { authorization: `Bearer ${VALID_TOKEN}` },
    });
    const res = await PostCron(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.evaluatedCount).toBe(0);
    expect(json.transitionsCount).toBe(0);
    expect(mockDb.update).not.toHaveBeenCalled();
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("skips writing a log row when the evaluator output matches the persisted state and count (real idempotency)", async () => {
    // A Final Four prediction whose persisted countCurrent already equals
    // what the evaluator would compute (joint of pS over the four picks),
    // and whose state is still alive with no settled matches. Re-running
    // the cron must not write a log row.
    // The persisted count must equal what the evaluator recomputes from
    // TEAM_PROBS. To keep this deterministic and immune to nightly M2-batch
    // regeneration, TEAM_PROBS is mocked above to fixed values:
    // ARG.pS=0.28 BRA.pS=0.30 FRA.pS=0.28 ENG.pS=0.20
    // joint = 0.28 * 0.30 * 0.28 * 0.20 = 0.004704
    // count = round(10000 * 0.004704) = 47
    mockDb.select
      .mockReturnValueOnce(chainMock([])) // settled matches
      .mockReturnValueOnce(
        chainMock([
          {
            id: "45A-2026-NOOP",
            subscriberId: null,
            email: null,
            mode: "final_four",
            scenario: { semifinalists: ["ARG", "BRA", "FRA", "ENG"] },
            storyLine: "x",
            countOriginal: 47,
            countCurrent: 47,
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
      url: "http://localhost/api/cron/eval-predictions",
      body: {},
      headers: { authorization: `Bearer ${VALID_TOKEN}` },
    });
    const res = await PostCron(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.evaluatedCount).toBe(1);
    expect(json.transitionsCount).toBe(0);
    expect(mockDb.update).not.toHaveBeenCalled();
    expect(mockDb.insert).not.toHaveBeenCalled();
  });
});
