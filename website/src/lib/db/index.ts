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

// Cache the postgres client on globalThis in every environment, including
// production builds. Without this, each Next.js worker that re-evaluates
// this module ends up opening a fresh pooler connection per page render. 
// fine for ~5 routes, devastating for ~150 static-export routes (the
// pooler queues, then we hit the 60s per-page build timeout).
const client =
  global.__briefPgClient ??
  postgres(getConnectionString(), {
    prepare: false,
    max: 1,
  });

global.__briefPgClient = client;

export const db = drizzle(client, { schema });
export { schema };
