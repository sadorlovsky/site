/**
 * Copy the live wishlist into ./local.db.
 *
 * The one direction that is safe to automate. `migrate.ts` needs `--remote`
 * because it writes to production; this cannot write there at all — the target
 * is the same hardcoded `file:local.db` that `seed.ts` uses, for the same
 * reason: bun loads .env, so the Turso credentials are always in scope, and the
 * only protection worth having is a script that has no way to point at them.
 *
 * Wishlist tables only. AdminCredential and AdminSession stay untouched, so the
 * local dev-login keeps working and nobody's passkeys end up on a laptop for no
 * reason — production's would not authenticate against ADMIN_RP_ID=localhost
 * anyway.
 *
 * Rows are copied column by column rather than dumped, so the schema is never
 * overwritten: run `bun db:migrate` first, then this fills the tables it left.
 *
 * Images need no step of their own: imageUrl holds an R2 key, the bucket is
 * shared, and CDN_DEV_DOMAIN serves the very file production serves.
 */

import { createClient, type Client, type InValue } from "@libsql/client";

/**
 * Parents before children: ItemOption and Reservation carry foreign keys into
 * WishlistItem. Deleting walks this list backwards.
 */
const TABLES = [
  "ExchangeRate",
  "WishlistItem",
  "ItemOption",
  "Reservation",
] as const;

// Hardcoded, as in seed.ts: this deletes every row in the tables it copies, and
// a TURSO_DATABASE_URL in scope must never be able to become the target.
const LOCAL = "file:local.db";

const remoteUrl = process.env.TURSO_DATABASE_URL;
if (!remoteUrl) {
  throw new Error("db:pull needs TURSO_DATABASE_URL (and TURSO_AUTH_TOKEN)");
}

const remote = createClient({
  url: remoteUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const local = createClient({ url: LOCAL });

async function columns(client: Client, table: string): Promise<string[]> {
  const result = await client.execute(`PRAGMA table_info("${table}")`);
  return result.rows.map((row) => String(row.name));
}

const quote = (name: string) => `"${name}"`;

/**
 * How many migrations that database has recorded — the honest measure of which
 * schema is older.
 *
 * Not a column diff: production carries columns from before Drizzle existed
 * here (processedImageUrl, accentColor) that the baseline never described and
 * nothing has dropped. They are absent locally because schema.ts does not
 * mention them, not because local is behind, and reading a column count as a
 * version number would fail on exactly that.
 */
async function migrationsApplied(client: Client): Promise<number> {
  const ledger = await client.execute({
    sql: "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
    args: ["__drizzle_migrations"],
  });
  if (ledger.rows.length === 0) return 0;

  const count = await client.execute(
    "SELECT count(*) AS n FROM __drizzle_migrations",
  );
  return Number(count.rows[0].n);
}

const [there, here] = await Promise.all([
  migrationsApplied(remote),
  migrationsApplied(local),
]);

if (here === 0) {
  throw new Error(
    `${LOCAL} has no schema — run \`bun db:reset\` (or \`bun db:migrate\`) first`,
  );
}
if (here < there) {
  throw new Error(
    `production is ${there - here} migration(s) ahead of ${LOCAL} — run ` +
      "`bun db:migrate`, or the copy would drop whatever those columns hold",
  );
}

/**
 * The columns to copy: the ones both databases have.
 *
 * Production-only columns are the legacy ones above — nothing reads them.
 * Local-only columns come from a migration that has not deployed yet, and take
 * their defaults.
 */
async function sharedColumns(table: string): Promise<string[]> {
  const [remoteColumns, localColumns] = await Promise.all([
    columns(remote, table),
    columns(local, table),
  ]);

  if (localColumns.length === 0) {
    throw new Error(
      `${table} does not exist in ${LOCAL} — run \`bun db:migrate\``,
    );
  }

  const pending = localColumns.filter((c) => !remoteColumns.includes(c));
  if (pending.length > 0) {
    console.log(
      `  ${table}: ${pending.join(", ")} not in production yet — left at default`,
    );
  }

  return remoteColumns.filter((column) => localColumns.includes(column));
}

console.log(`pulling ${new URL(remoteUrl).host} → ${LOCAL}`);

const plan = await Promise.all(
  TABLES.map(async (table) => ({ table, columns: await sharedColumns(table) })),
);

const rows = await Promise.all(
  plan.map(({ table, columns }) =>
    remote.execute(`SELECT ${columns.map(quote).join(", ")} FROM "${table}"`),
  ),
);

// One transaction: a failure halfway through leaves the tables it already
// emptied empty, and a wishlist with no items looks like a bug in the site
// rather than a script that died.
const tx = await local.transaction("write");
try {
  for (const { table } of [...plan].reverse()) {
    await tx.execute(`DELETE FROM "${table}"`);
  }

  for (const [index, { table, columns }] of plan.entries()) {
    const values = columns.map(() => "?").join(", ");
    const sql = `INSERT INTO "${table}" (${columns.map(quote).join(", ")}) VALUES (${values})`;

    for (const row of rows[index].rows) {
      await tx.execute({
        sql,
        args: columns.map((column) => row[column] as InValue),
      });
    }

    console.log(`  ${table}: ${rows[index].rows.length}`);
  }

  await tx.commit();
} finally {
  // No-op once committed; the rollback that matters is the one after a throw.
  tx.close();
}

remote.close();
local.close();

console.log("done — admin credentials and sessions untouched");
