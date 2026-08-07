/**
 * The database handle, and everything a call site needs to query with it.
 *
 * Re-exports the tables and Drizzle's operators alongside `db` so that a query
 * still takes one import — the shape `astro:db` had, which is why porting off
 * it changed import lines and nothing else.
 *
 * Server-only: importing this from client code would ship a database driver and
 * a token to the browser.
 */

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } from "astro:env/server";
import * as schema from "./schema";

/**
 * Where a non-production build looks. Deliberately not the Turso credentials,
 * even when they are sitting right there in .env: dev needs them for migrations
 * and scripts, and a dev server that quietly wrote to the live wishlist because
 * a variable happened to be set is not a mistake worth leaving available.
 */
const LOCAL_DATABASE = "file:local.db";

function connection() {
  if (!import.meta.env.PROD) return { url: LOCAL_DATABASE };

  if (!TURSO_DATABASE_URL) {
    throw new Error(
      "TURSO_DATABASE_URL is required for a production build. " +
        "Set it (and TURSO_AUTH_TOKEN) in the deployment environment.",
    );
  }
  return { url: TURSO_DATABASE_URL, authToken: TURSO_AUTH_TOKEN };
}

export const db = drizzle(createClient(connection()), { schema });

export * from "./schema";
export { and, eq, sql } from "drizzle-orm";
