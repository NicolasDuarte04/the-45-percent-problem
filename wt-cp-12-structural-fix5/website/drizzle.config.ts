import type { Config } from "drizzle-kit";

// drizzle-kit runs as a standalone CLI and does not auto-load Next.js's
// .env.local. Load it explicitly so `pnpm db:migrate` works without the
// caller having to source the file by hand. Silently ignore if absent
// (CI / Vercel will inject env vars directly).
try {
  process.loadEnvFile(".env.local");
} catch {
  /* no .env.local present; fall back to ambient process.env */
}

const directUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!directUrl) {
  throw new Error(
    "DIRECT_URL (or DATABASE_URL as fallback) must be set for drizzle-kit migrations.",
  );
}

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: directUrl },
  strict: true,
  verbose: true,
} satisfies Config;
