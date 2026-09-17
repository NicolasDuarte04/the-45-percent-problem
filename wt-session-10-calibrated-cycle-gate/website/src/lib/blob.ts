/**
 * Vercel Blob client for the daily brief artifacts.
 *
 * Pipeline contract: the Python `evaluation/build_daily_brief.py` writes
 * `briefs/YYYY-MM-DD.json` (Phase 4). The cron route at /api/cron/send-brief
 * reads it back via `getBriefForDate()` and dispatches.
 *
 * The Python side uploads via the Vercel Blob REST API directly using
 * BLOB_READ_WRITE_TOKEN; this module is the TypeScript reader/writer used by
 * the Next.js routes.
 */
import { put, list, head, del } from "@vercel/blob";

const BRIEF_PREFIX = "briefs/";

function blobToken(): string {
  const t = process.env.BLOB_READ_WRITE_TOKEN;
  if (!t) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is not set. Populate .env.local / Vercel env.",
    );
  }
  return t;
}

export interface BriefBlobMeta {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  url: string;
  uploadedAt: Date;
  size: number;
}

function pathnameForDate(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid brief date "${date}"; expected YYYY-MM-DD.`);
  }
  return `${BRIEF_PREFIX}${date}.json`;
}

/** Upload a brief JSON payload. Used by the manual replay route. */
export async function putBriefForDate(
  date: string,
  payload: unknown,
): Promise<BriefBlobMeta> {
  const pathname = pathnameForDate(date);
  const result = await put(pathname, JSON.stringify(payload), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    token: blobToken(),
  });
  return {
    date,
    url: result.url,
    uploadedAt: new Date(),
    size: Buffer.byteLength(JSON.stringify(payload), "utf8"),
  };
}

/** Read the brief JSON for a specific date, or null if missing. */
export async function getBriefForDate<T = unknown>(
  date: string,
): Promise<T | null> {
  const pathname = pathnameForDate(date);
  try {
    const meta = await head(pathname, { token: blobToken() });
    const res = await fetch(meta.url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    if ((err as { status?: number }).status === 404) return null;
    throw err;
  }
}

/** List all briefs (newest first). Used by the /briefs archive index. */
export async function listBriefs(opts: {
  limit?: number;
} = {}): Promise<BriefBlobMeta[]> {
  const { blobs } = await list({
    prefix: BRIEF_PREFIX,
    token: blobToken(),
    limit: opts.limit,
  });
  return blobs
    .map((b) => {
      const filename = b.pathname.slice(BRIEF_PREFIX.length).replace(/\.json$/, "");
      return {
        date: filename,
        url: b.url,
        uploadedAt: b.uploadedAt,
        size: b.size,
      };
    })
    .filter((b) => /^\d{4}-\d{2}-\d{2}$/.test(b.date))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Delete a brief blob (admin only). */
export async function deleteBriefForDate(date: string): Promise<void> {
  const pathname = pathnameForDate(date);
  await del(pathname, { token: blobToken() });
}
