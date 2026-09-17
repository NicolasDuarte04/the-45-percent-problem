import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// triggerOnDemandRegen keeps a module-level debounce clock, so each test loads
// a fresh copy of the module via vi.resetModules() + dynamic import.
async function loadFresh() {
  vi.resetModules();
  return (await import("@/lib/regenDispatch")).triggerOnDemandRegen;
}

function okResponse(status = 204) {
  return { ok: true, status, text: async () => "" } as unknown as Response;
}
function errResponse(status = 401, body = "bad credentials") {
  return { ok: false, status, text: async () => body } as unknown as Response;
}

const CONFIG_ENV = {
  GITHUB_REGEN_PAT: "github_pat_testtoken_0123456789",
  GITHUB_REGEN_OWNER: "TestOwner",
  GITHUB_REGEN_REPO: "test-repo",
};

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("triggerOnDemandRegen", () => {
  it("skips with reason 'not_configured' and makes no network call when no PAT is set", async () => {
    vi.stubEnv("GITHUB_REGEN_PAT", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const trigger = await loadFresh();
    const result = await trigger({ reason: "test" });

    expect(result).toMatchObject({
      ok: false,
      skipped: true,
      reason: "not_configured",
      eventId: null,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("dispatches a repository_dispatch and returns ok + an eventId on HTTP 204", async () => {
    for (const [k, v] of Object.entries(CONFIG_ENV)) vi.stubEnv(k, v);
    const fetchSpy = vi.fn(async () => okResponse(204));
    vi.stubGlobal("fetch", fetchSpy);

    const trigger = await loadFresh();
    const result = await trigger({
      reason: "admin-match-outcome",
      triggeredByMatchId: "M001",
    });

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(false);
    expect(typeof result.eventId).toBe("string");
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [url, init] = fetchSpy.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe(
      "https://api.github.com/repos/TestOwner/test-repo/dispatches",
    );
    expect((init.headers as Record<string, string>).Authorization).toBe(
      `Bearer ${CONFIG_ENV.GITHUB_REGEN_PAT}`,
    );
    const body = JSON.parse(init.body as string);
    expect(body.event_type).toBe("regen-snapshot");
    expect(body.client_payload.triggered_by_match_id).toBe("M001");
    expect(body.client_payload.dispatch_id).toBe(result.eventId);
  });

  it("debounces a second call within the window to a single dispatch", async () => {
    for (const [k, v] of Object.entries(CONFIG_ENV)) vi.stubEnv(k, v);
    const fetchSpy = vi.fn(async () => okResponse(204));
    vi.stubGlobal("fetch", fetchSpy);

    const trigger = await loadFresh();
    const first = await trigger({ reason: "burst-1" });
    const second = await trigger({ reason: "burst-2" });

    expect(first.ok).toBe(true);
    expect(second).toMatchObject({ ok: false, skipped: true, reason: "debounced" });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("reports dispatch_failed on a non-2xx and rolls back the debounce so a retry can fire", async () => {
    for (const [k, v] of Object.entries(CONFIG_ENV)) vi.stubEnv(k, v);
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(errResponse(401))
      .mockResolvedValueOnce(okResponse(204));
    vi.stubGlobal("fetch", fetchSpy);

    const trigger = await loadFresh();
    const failed = await trigger({ reason: "attempt-1" });
    expect(failed).toMatchObject({
      ok: false,
      skipped: false,
      reason: "dispatch_failed",
    });
    expect(typeof failed.eventId).toBe("string");

    // Because the failed attempt rolled the clock back, an immediate retry is
    // NOT debounced and is allowed to succeed.
    const retried = await trigger({ reason: "attempt-2" });
    expect(retried.ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
