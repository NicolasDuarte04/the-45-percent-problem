import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the server-only next/cache API so the helper can run in a plain node
// test context. We assert on the calls the helper makes, not on Next internals.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { revalidatePublicSnapshotRoutes } from "@/lib/revalidation";

const mockRevalidatePath = vi.mocked(revalidatePath);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("revalidatePublicSnapshotRoutes", () => {
  it("revalidates every public snapshot route and reports ok", () => {
    const result = revalidatePublicSnapshotRoutes();

    expect(result.ok).toBe(true);
    expect(result.failed).toEqual([]);
    expect(result.revalidated).toEqual([
      "/bracket",
      "/",
      "/ledger",
      "/match/[id]",
      "/team/[code]",
    ]);
  });

  it("passes the 'page' type for dynamic routes and a single arg for static routes", () => {
    revalidatePublicSnapshotRoutes();

    expect(mockRevalidatePath).toHaveBeenCalledWith("/bracket");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/ledger");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/match/[id]", "page");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/team/[code]", "page");
  });

  it("isolates a single failing route without aborting the rest", () => {
    mockRevalidatePath.mockImplementation((path: string) => {
      if (path === "/ledger") throw new Error("boom");
      return undefined;
    });

    const result = revalidatePublicSnapshotRoutes();

    expect(result.ok).toBe(false);
    expect(result.revalidated).toEqual([
      "/bracket",
      "/",
      "/match/[id]",
      "/team/[code]",
    ]);
    expect(result.failed).toEqual([{ route: "/ledger", error: "boom" }]);
  });
});
