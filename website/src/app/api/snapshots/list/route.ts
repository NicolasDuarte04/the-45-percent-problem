import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const DATA_ROOT = path.join(process.cwd(), "public", "data");
const SNAPSHOTS_DIR = path.join(DATA_ROOT, "snapshots");
const LATEST_DIR = path.join(DATA_ROOT, "latest");

const WEEK_DAYS = 7;
const WEEK_TOLERANCE_DAYS = 2;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface SnapshotMetaShape {
  snapshot_id: string;
  generated_at_utc: string;
  code_sha?: string;
}

interface SnapshotEntry {
  id: string;
  date: string;
  codeSha: string;
  daysOld: number;
  label: string;
}

async function readMeta(dir: string): Promise<SnapshotMetaShape | null> {
  try {
    const raw = await readFile(path.join(dir, "snapshot_meta.json"), "utf8");
    return JSON.parse(raw) as SnapshotMetaShape;
  } catch {
    return null;
  }
}

function shortSha(sha: string | undefined): string {
  if (!sha) return "";
  return sha.slice(0, 8);
}

function isoDate(generatedAt: string): string {
  return generatedAt.slice(0, 10);
}

function daysBetween(now: number, generatedAt: string): number {
  const t = Date.parse(generatedAt);
  if (Number.isNaN(t)) return 0;
  return Math.round((now - t) / MS_PER_DAY);
}

export async function GET() {
  const latestMeta = await readMeta(LATEST_DIR);
  if (!latestMeta) {
    return NextResponse.json(
      { error: "no current snapshot available" },
      { status: 503 },
    );
  }

  const currentId = latestMeta.snapshot_id;
  const now = Date.now();

  let dirEntries: string[] = [];
  try {
    dirEntries = await readdir(SNAPSHOTS_DIR);
  } catch {
    dirEntries = [];
  }

  const metas: SnapshotMetaShape[] = [];
  for (const name of dirEntries) {
    const meta = await readMeta(path.join(SNAPSHOTS_DIR, name));
    if (meta) metas.push(meta);
  }

  metas.sort((a, b) => Date.parse(b.generated_at_utc) - Date.parse(a.generated_at_utc));

  const haveCurrentInList = metas.some((m) => m.snapshot_id === currentId);
  if (!haveCurrentInList) {
    metas.unshift(latestMeta);
  }

  let weekAgoId: string | null = null;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const m of metas) {
    if (m.snapshot_id === currentId) continue;
    const age = daysBetween(now, m.generated_at_utc);
    const diff = Math.abs(age - WEEK_DAYS);
    if (diff <= WEEK_TOLERANCE_DAYS && diff < bestDiff) {
      bestDiff = diff;
      weekAgoId = m.snapshot_id;
    }
  }

  const available: SnapshotEntry[] = metas.map((m) => {
    let label: string;
    if (m.snapshot_id === currentId) {
      label = "CURRENT";
    } else if (m.snapshot_id === weekAgoId) {
      label = "7 DAYS AGO";
    } else {
      label = isoDate(m.generated_at_utc);
    }
    return {
      id: m.snapshot_id,
      date: isoDate(m.generated_at_utc),
      codeSha: shortSha(m.code_sha),
      daysOld: daysBetween(now, m.generated_at_utc),
      label,
    };
  });

  const current: SnapshotEntry = {
    id: latestMeta.snapshot_id,
    date: isoDate(latestMeta.generated_at_utc),
    codeSha: shortSha(latestMeta.code_sha),
    daysOld: daysBetween(now, latestMeta.generated_at_utc),
    label: "CURRENT",
  };

  return NextResponse.json(
    { current, available },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
