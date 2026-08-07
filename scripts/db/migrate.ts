/**
 * Apply pending migrations.
 *
 * Local by default; production only with `--remote`. The flag exists because
 * bun loads .env automatically, so the Turso credentials that scripts legitimately
 * need are always in scope — without an explicit opt-in, `bun db:migrate` would
 * quietly migrate the live database from a laptop. Same bargain `astro db push`
 * struck, and for the same reason.
 *
 * The wrinkle this handles: production already had every table in 0000_baseline
 * before Drizzle existed here — @astrojs/db created them. Running that
 * migration would fail on the first CREATE TABLE. So a database that has the
 * tables but no ledger is *adopted*: the baseline is recorded as applied
 * without being run, and everything after it migrates normally.
 */

import { appendFileSync } from "node:fs";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { sql } from "drizzle-orm";

const MIGRATIONS = "./db/migrations";
const LEDGER = "__drizzle_migrations";

const isRemote = process.argv.includes("--remote");

if (isRemote && !process.env.TURSO_DATABASE_URL) {
  throw new Error("--remote needs TURSO_DATABASE_URL (and TURSO_AUTH_TOKEN)");
}

const url = isRemote ? process.env.TURSO_DATABASE_URL! : "file:local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient(isRemote ? { url, authToken } : { url });
const db = drizzle(client);

async function tableExists(name: string): Promise<boolean> {
  const result = await client.execute({
    sql: "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
    args: [name],
  });
  return result.rows.length > 0;
}

/**
 * Record the baseline as applied without running it, for a database that
 * predates these migrations. Mirrors what the migrator itself would have
 * written: the same ledger table, the same hash, the same folder timestamp it
 * compares against.
 */
async function adoptBaseline(): Promise<void> {
  const [baseline] = readMigrationFiles({ migrationsFolder: MIGRATIONS });
  if (!baseline) throw new Error(`no migrations found in ${MIGRATIONS}`);

  await db.run(
    sql`CREATE TABLE IF NOT EXISTS ${sql.identifier(LEDGER)} (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at numeric
    )`,
  );
  await db.run(
    sql`INSERT INTO ${sql.identifier(LEDGER)} ("hash", "created_at")
        VALUES (${baseline.hash}, ${baseline.folderMillis})`,
  );
}

async function recordedCount(): Promise<number> {
  if (!(await tableExists(LEDGER))) return 0;
  const result = await client.execute(`SELECT count(*) AS n FROM ${LEDGER}`);
  return Number(result.rows[0].n);
}

console.log(`migrating ${isRemote ? new URL(url).host : url}`);

const hasLedger = await tableExists(LEDGER);
const hasTables = await tableExists("WishlistItem");

if (!hasLedger && hasTables) {
  console.log("existing database with no ledger — adopting the baseline");
  await adoptBaseline();
}

const before = await recordedCount();
await migrate(db, { migrationsFolder: MIGRATIONS });
const after = await recordedCount();

console.log(
  `up to date — ${after} migration(s) recorded, ${after - before} new`,
);

// CI asks for the deploy only when the schema actually moved. Reporting it from
// here beats diffing db/migrations in the workflow, which would need the git
// history that a shallow checkout does not have.
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `applied=${after - before}\n`);
}

client.close();
