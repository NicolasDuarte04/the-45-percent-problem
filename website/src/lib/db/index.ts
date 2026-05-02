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

const client =
  global.__briefPgClient ??
  postgres(getConnectionString(), {
    prepare: false,
    max: 1,
  });

if (process.env.NODE_ENV !== "production") {
  global.__briefPgClient = client;
}

export const db = drizzle(client, { schema });
export { schema };
