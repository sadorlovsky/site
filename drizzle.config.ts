import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit runs outside Astro, so credentials come from process.env rather
 * than astro:env. It is only ever pointed at a database by `generate` (which
 * needs none) and by hand; applying migrations goes through scripts/db/migrate.ts,
 * which is what CI runs.
 */
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./db/migrations",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL ?? "file:local.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
  // No `casing` on purpose: every column in the schema names itself explicitly,
  // exactly as Astro DB created it, and a casing rule here would rewrite those
  // names on the way to SQL.
});
