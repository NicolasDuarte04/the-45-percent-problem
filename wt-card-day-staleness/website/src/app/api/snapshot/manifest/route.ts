import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export async function GET() {
  const file = path.join(process.cwd(), "public", "data", "manifest.json");
  try {
    const raw = await readFile(file, "utf8");
    return new NextResponse(raw, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "manifest not found" },
      { status: 404 },
    );
  }
}
