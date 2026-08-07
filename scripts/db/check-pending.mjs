/**
 * Vercel's Ignored Build Step: does the database already have every migration
 * this commit expects?
 *
 * Exit 0 tells Vercel to skip the build, exit 1 to go ahead. So a commit that
 * carries an unapplied migration is *not* built — it waits for CI to migrate
 * and then trigger the deploy hook, and the code never reaches production
 * ahead of the schema it needs.
 *
 * Deliberately dependency-free: this runs before anything is guaranteed to be
 * installed, so it reads the journal off disk and talks to Turso over its HTTP
 * API with fetch rather than importing a client.
 *
 * Failure is deliberately fail-open (exit 1, build proceeds). A network blip
 * here should not be able to freeze deployments; the worst case is the ordinary
 * behaviour everyone had before this file existed.
 */

import { readFileSync } from "node:fs";

const JOURNAL = "db/migrations/meta/_journal.json";
const SKIP = 0;
const BUILD = 1;

function finish(code, message) {
  console.log(message);
  process.exit(code);
}

let latestMigration;
try {
  const journal = JSON.parse(readFileSync(JOURNAL, "utf8"));
  latestMigration = Math.max(...journal.entries.map((entry) => entry.when));
} catch (error) {
  finish(BUILD, `cannot read ${JOURNAL} (${error.message}) — building anyway`);
}

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url) {
  finish(BUILD, "TURSO_DATABASE_URL is not set — building anyway");
}

if (url.startsWith("file:")) {
  finish(BUILD, "pointed at a local file, not Turso — building anyway");
}

const endpoint = url.replace(/^libsql:\/\//, "https://").replace(/\/$/, "");

async function lastAppliedMigration() {
  const response = await fetch(`${endpoint}/v2/pipeline`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({
      requests: [
        {
          type: "execute",
          stmt: {
            sql: "SELECT max(created_at) FROM __drizzle_migrations",
          },
        },
        { type: "close" },
      ],
    }),
  });

  if (!response.ok) throw new Error(`libSQL replied ${response.status}`);

  const payload = await response.json();
  const [result] = payload.results;
  // No ledger yet: nothing has been migrated, so everything is pending.
  if (result.type === "error") return null;

  const value = result.response.result.rows[0]?.[0]?.value;
  return value == null ? null : Number(value);
}

try {
  const applied = await lastAppliedMigration();

  if (applied !== null && applied >= latestMigration) {
    finish(BUILD, "schema is up to date — building");
  }

  finish(
    SKIP,
    `schema is behind (applied ${applied ?? "nothing"}, need ${latestMigration}) — ` +
      "skipping this build; CI will migrate and trigger the deploy hook",
  );
} catch (error) {
  finish(
    BUILD,
    `could not check migrations (${error.message}) — building anyway`,
  );
}
