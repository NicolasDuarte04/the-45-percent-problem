/**
 * cp-31: the committed daily Brief issue round-trips through its schema, the
 * no-tipster prohibition holds structurally, and the committed-source readers
 * in lib/brief resolve the issue without a Blob token.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { DailyBriefIssueSchema } from "@/lib/data/schemas";
import { loadLatestBrief, loadBriefByDate } from "@/lib/brief";

const BRIEFS_DIR = path.join(process.cwd(), "public", "data", "briefs");

function committedIssueFiles(): string[] {
  if (!fs.existsSync(BRIEFS_DIR)) return [];
  return fs
    .readdirSync(BRIEFS_DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f));
}

describe("committed daily brief issues", () => {
  it("at least one committed issue exists", () => {
    expect(committedIssueFiles().length).toBeGreaterThan(0);
  });

  for (const file of committedIssueFiles()) {
    const raw = fs.readFileSync(path.join(BRIEFS_DIR, file), "utf-8");
    const issue = JSON.parse(raw);

    it(`${file} round-trips through DailyBriefIssueSchema`, () => {
      const parsed = DailyBriefIssueSchema.safeParse(issue);
      if (!parsed.success) {
        throw new Error(parsed.error.toString());
      }
    });

    it(`${file} carries no ranked or per-match market divergence`, () => {
      expect(issue.top_divergences).toEqual([]);
      expect(issue.tournament_movers).toEqual([]);
      expect(issue.suppressed_today).toEqual([]);
      expect(issue.teaser).toEqual({ has_divergence: false });
      // The divergence layer surfaces status + an aggregate count only.
      expect(["live", "paused"]).toContain(issue.daily.divergence.status);
      const blob = JSON.stringify(issue);
      expect(blob.toLowerCase()).not.toContain("edge_bps");
      expect(blob.toLowerCase()).not.toContain("edge_e");
    });

    it(`${file} contains no en or em dash`, () => {
      const blob = fs.readFileSync(path.join(BRIEFS_DIR, file), "utf-8");
      expect(blob).not.toContain(String.fromCharCode(0x2013)); // en dash
      expect(blob).not.toContain(String.fromCharCode(0x2014)); // em dash
    });
  }
});

describe("committed-source readers (no Blob token)", () => {
  it("loadLatestBrief returns the newest committed issue", async () => {
    const dates = committedIssueFiles()
      .map((f) => f.replace(/\.json$/, ""))
      .sort((a, b) => b.localeCompare(a));
    const brief = await loadLatestBrief();
    expect(brief.brief_date).toBe(dates[0]);
    expect(brief.daily).toBeDefined();
  });

  it("loadBriefByDate resolves a committed issue by date", async () => {
    const [newest] = committedIssueFiles()
      .map((f) => f.replace(/\.json$/, ""))
      .sort((a, b) => b.localeCompare(a));
    const brief = await loadBriefByDate(newest);
    expect(brief).not.toBeNull();
    expect(brief?.brief_date).toBe(newest);
  });

  it("loadBriefByDate returns null for a malformed date", async () => {
    expect(await loadBriefByDate("not-a-date")).toBeNull();
  });
});
