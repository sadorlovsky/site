/**
 * Minimal Turso client over the libsql HTTP API.
 *
 * Deliberately dependency-free: these scripts run standalone (`bun scripts/...`)
 * outside the Astro build, so `astro:db` isn't importable and pulling in the libsql
 * driver just to run two queries isn't worth it.
 *
 * https://docs.turso.tech/sdk/http/reference
 */

import { readFile } from "node:fs/promises";

/** Load .env if present so the scripts work under plain node as well as bun. */
export function loadEnv() {
  try {
    process.loadEnvFile(".env");
  } catch {
    // No .env (CI, or vars already exported) — not an error.
  }
}

function endpoint() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;

  if (!url || !token) {
    throw new Error(
      "TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set (see .env.example)",
    );
  }

  return { url: url.replace(/^libsql:/, "https:").replace(/\/$/, ""), token };
}

/** Decode one libsql cell — every value arrives tagged, integers as strings. */
function decodeCell(cell) {
  if (!cell || cell.type === "null") return null;
  if (cell.type === "integer") return Number.parseInt(cell.value, 10);
  if (cell.type === "float") return Number.parseFloat(cell.value);
  return cell.value;
}

async function execute(sql, args = []) {
  const { url, token } = endpoint();

  const response = await fetch(`${url}/v2/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        { type: "execute", stmt: { sql, args: args.map(toArg) } },
        { type: "close" },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Turso HTTP ${response.status}: ${await response.text()}`);
  }

  const body = await response.json();
  const first = body.results?.[0];

  if (first?.type !== "ok") {
    throw new Error(`Turso error: ${first?.error?.message ?? "unknown"}`);
  }

  const result = first.response.result;
  const columns = result.cols.map((c) => c.name);

  return result.rows.map((row) =>
    Object.fromEntries(row.map((cell, i) => [columns[i], decodeCell(cell)])),
  );
}

function toArg(value) {
  if (value === null || value === undefined) return { type: "null", value: null };
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { type: "integer", value: String(value) }
      : { type: "float", value };
  }
  return { type: "text", value: String(value) };
}

/**
 * Read wishlist items. Pass a JSON file path to work offline — useful for
 * `generate.mjs --dry-run`, which only needs titles and categories to print prompts.
 */
export async function loadItems({ from } = {}) {
  if (from) {
    return JSON.parse(await readFile(from, "utf8"));
  }

  return execute(
    "SELECT id, title, category, imageUrl, imageUrlDark FROM WishlistItem ORDER BY id",
  );
}

export async function setImageUrl(id, filename) {
  await execute("UPDATE WishlistItem SET imageUrl = ? WHERE id = ?", [filename, id]);
}

export async function setImageUrlDark(id, filename) {
  await execute("UPDATE WishlistItem SET imageUrlDark = ? WHERE id = ?", [filename, id]);
}
