/**
 * Server-side resolution of the `?snapshot=` query param for the
 * SnapshotPicker. Read disk directly (Vercel runtime has access to
 * `public/data/` files). Defaults to the current `latest` snapshot
 * when the requested ID is unknown.
 *
 * Pairs with /api/snapshots/list which is the client-side discovery
 * surface; this module is what server components call.
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";

const DATA_ROOT = path.join(process.cwd(), "public", "data");
const SNAPSHOTS_DIR = path.join(DATA_ROOT, "snapshots");
const LATEST_DIR = path.join(DATA_ROOT, "latest");

const WEEK_DAYS = 7;
const WEEK_TOLERANCE_DAYS = 2;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface SnapshotInfo {
  id: string;
  date: string;
  codeSha: string;
  daysOld: number;
  label: string;
}

interface RawMeta {
  snapshot_id: string;
  generated_at_utc: string;
  code_sha?: string;
}

function readMetaSync(dir: string): RawMeta | null {
  const p = path.join(dir, "snapshot_meta.json");
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as RawMeta;
  } catch {
    return null;
  }
}

function daysBetween(now: number, generatedAt: string): number {
  const t = Date.parse(generatedAt);
  if (Number.isNaN(t)) return 0;
  return Math.round((now - t) / MS_PER_DAY);
}

function isoDate(generatedAt: string): string {
  return generatedAt.slice(0, 10);
}

function shortSha(sha: string | undefined): string {
  return sha ? sha.slice(0, 8) : "";
}

function listSnapshotMetas(): RawMeta[] {
  let names: string[] = [];
  try {
    names = readdirSync(SNAPSHOTS_DIR);
  } catch {
    return [];
  }
  const metas: RawMeta[] = [];
  for (const name of names) {
    const m = readMetaSync(path.join(SNAPSHOTS_DIR, name));
    if (m) metas.push(m);
  }
  metas.sort((a, b) => Date.parse(b.generated_at_utc) - Date.parse(a.generated_at_utc));
  return metas;
}

function buildInfo(m: RawMeta, label: string, now: number): SnapshotInfo {
  return {
    id: m.snapshot_id,
    date: isoDate(m.generated_at_utc),
    codeSha: shortSha(m.code_sha),
    daysOld: daysBetween(now, m.generated_at_utc),
    label,
  };
}

/**
 * Resolve the picker state for a request: the current snapshot, the
 * closest 7-days-ago snapshot (or null when unavailable), and the
 * snapshot that should actually be rendered. `requestedId` is the
 * raw `?snapshot=` query value; unknown values fall back to current.
 */
export function resolveSnapshotPickerState(requestedId: string | undefined): {
  current: SnapshotInfo;
  weekAgo: SnapshotInfo | null;
  selected: SnapshotInfo;
} {
  const latestMeta = readMetaSync(LATEST_DIR);
  const now = Date.now();
  if (!latestMeta) {
    const placeholder: SnapshotInfo = {
      id: "latest",
      date: "",
      codeSha: "",
      daysOld: 0,
      label: "CURRENT",
    };
    return { current: placeholder, weekAgo: null, selected: placeholder };
  }

  const current = buildInfo(latestMeta, "CURRENT", now);
  const metas = listSnapshotMetas();

  let weekAgoMeta: RawMeta | null = null;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const m of metas) {
    if (m.snapshot_id === current.id) continue;
    const age = daysBetween(now, m.generated_at_utc);
    const diff = Math.abs(age - WEEK_DAYS);
    if (diff <= WEEK_TOLERANCE_DAYS && diff < bestDiff) {
      bestDiff = diff;
      weekAgoMeta = m;
    }
  }
  const weekAgo = weekAgoMeta ? buildInfo(weekAgoMeta, "7 DAYS AGO", now) : null;

  let selected: SnapshotInfo = current;
  if (requestedId && requestedId !== current.id) {
    if (weekAgo && requestedId === weekAgo.id) {
      selected = weekAgo;
    } else {
      const match = metas.find((m) => m.snapshot_id === requestedId);
      if (match) {
        selected = buildInfo(match, isoDate(match.generated_at_utc), now);
      }
    }
  }

  return { current, weekAgo, selected };
}
