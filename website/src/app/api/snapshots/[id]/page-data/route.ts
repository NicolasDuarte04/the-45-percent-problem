import { NextResponse } from "next/server";
import { existsSync } from "node:fs";
import path from "node:path";

import {
  getSnapshotDir,
  loadBracket,
  loadDivergence,
  loadEvaluationMetrics,
  loadSnapshotMeta,
  loadTournament,
} from "@/lib/data/loadSnapshot";
import {
  loadStructuralMaps,
  mergeDivergence,
  mergeTournament,
} from "@/lib/db/structuralMerge";

export const runtime = "nodejs";

type Surface = "home" | "bracket";

function isSurface(value: string | null): value is Surface {
  return value === "home" || value === "bracket";
}

function snapshotExists(id: string): boolean {
  const dir = getSnapshotDir(id);
  const inside = path.join(dir, "snapshot_meta.json");
  return existsSync(inside);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const url = new URL(request.url);
  const surface = url.searchParams.get("surface");

  if (!isSurface(surface)) {
    return NextResponse.json(
      { error: "surface query parameter must be 'home' or 'bracket'" },
      { status: 400 },
    );
  }

  if (!snapshotExists(id)) {
    return NextResponse.json(
      { error: `snapshot '${id}' not found` },
      { status: 404 },
    );
  }

  const maps = await loadStructuralMaps();
  const meta = loadSnapshotMeta(id);

  if (surface === "home") {
    const tournament = mergeTournament(loadTournament(id), maps);
    const divergence = mergeDivergence(loadDivergence(id), maps);
    const evaluation = loadEvaluationMetrics(id);

    return NextResponse.json(
      { meta, tournament, divergence, evaluation },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  }

  const bracket = loadBracket(id);
  const tournament = mergeTournament(loadTournament(id), maps);
  return NextResponse.json(
    { meta, bracket, tournament },
    {
      status: 200,
      headers: {
        "Cache-Control":
          "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
