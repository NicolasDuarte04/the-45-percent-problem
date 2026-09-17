import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __briefPgClient: ReturnType<typeof postgres> | undefined;
}

function getConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Populate .env.local before importing the db client.",
    );
  }
  return url;
}

// Default pool size. Historically pinned to 1 to avoid pooler exhaustion
// on small Vercel Postgres tiers when ~150 static-export routes opened
// fresh connections during build (see the globalThis cache below).
// Checkpoint 16: the synchronous Phase B evaluator now fires per-id
// UPDATEs in parallel via Promise.all, which still serializes on a
// max=1 pool. Bump in production via POSTGRES_POOL_MAX to let parallel
// queries actually parallelize. Default stays at 1 so unset envs keep
// the pre-Checkpoint-16 behaviour.
function getPoolMax(): number {
  const raw = process.env.POSTGRES_POOL_MAX;
  if (!raw) return 1;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 32) {
    console.warn(
      `[db] POSTGRES_POOL_MAX=${raw} is invalid; falling back to 1.`,
    );
    return 1;
  }
  return parsed;
}

// Cache the postgres client on globalThis in every environment, including
// production builds. Without this, each Next.js worker that re-evaluates
// this module ends up opening a fresh pooler connection per page render.
// fine for ~5 routes, devastating for ~150 static-export routes (the
// pooler queues, then we hit the 60s per-page build timeout).
const client =
  global.__briefPgClient ??
  postgres(getConnectionString(), {
    prepare: false,
    max: getPoolMax(),
  });

global.__briefPgClient = client;

export const db = drizzle(client, { schema });
export { schema };
