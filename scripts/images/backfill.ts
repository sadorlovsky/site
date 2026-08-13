/**
 * Write the derivatives for photographs that were uploaded before there were
 * any — and check that every photograph the database names has its full set.
 *
 * The site serves `<img srcset>` straight off the CDN now, at keys derived from
 * the original's name (lib/images.ts). Nothing looks those keys up, so a
 * picture whose derivatives were never written is a broken card rather than a
 * slow one. This is what closes that gap: for every image the database points
 * at, it makes sure all four widths exist, and makes them when they do not.
 *
 *   bun images:backfill --check     what is missing, writes nothing
 *   bun images:backfill             make whatever is missing
 *   bun images:backfill --force     make them all again (new widths, new encoder)
 *
 * Local by default, production only with `--remote`, on the same terms as
 * scripts/db/migrate.ts: bun loads .env, so the credentials are always in
 * scope, and nothing may treat that as permission. Note that the *bucket* is
 * whichever R2_* names are in the environment either way — `--remote` chooses
 * the database, which is the thing that says which keys matter.
 *
 * Run it before deploying anything that reads derivatives, and again after
 * changing IMAGE_WIDTHS.
 */

import { createClient } from "@libsql/client";
import { AwsClient } from "aws4fetch";
import { deriveWebp } from "../../src/lib/admin/derive";
import { IMMUTABLE_CACHE_CONTROL, derivativeKeys } from "../../src/lib/images";

const isRemote = process.argv.includes("--remote");
const isCheck = process.argv.includes("--check");
const isForce = process.argv.includes("--force");

if (isRemote && !process.env.TURSO_DATABASE_URL) {
  throw new Error("--remote needs TURSO_DATABASE_URL (and TURSO_AUTH_TOKEN)");
}

const {
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_ACCOUNT_ID,
  R2_BUCKET_NAME = "wishlist-images",
} = process.env;

if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ACCOUNT_ID) {
  throw new Error(
    "R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_ACCOUNT_ID are all needed",
  );
}

const db = createClient(
  isRemote
    ? {
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN,
      }
    : { url: "file:local.db" },
);

const r2 = new AwsClient({
  accessKeyId: R2_ACCESS_KEY_ID,
  secretAccessKey: R2_SECRET_ACCESS_KEY,
});

const bucket = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}`;
const objectUrl = (key: string) => `${bucket}/${encodeURI(key)}`;

async function exists(key: string): Promise<boolean> {
  const response = await r2.fetch(objectUrl(key), { method: "HEAD" });
  return response.ok;
}

async function download(key: string): Promise<ArrayBuffer> {
  const response = await r2.fetch(objectUrl(key));
  if (!response.ok) {
    throw new Error(`${key}: GET returned ${response.status}`);
  }
  return response.arrayBuffer();
}

async function upload(key: string, body: ArrayBuffer): Promise<void> {
  const response = await r2.fetch(objectUrl(key), {
    method: "PUT",
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": IMMUTABLE_CACHE_CONTROL,
    },
    body,
  });
  if (!response.ok) {
    throw new Error(`${key}: PUT returned ${response.status}`);
  }
}

/** Both renders of every item, deduplicated — the same file can be two items'
    picture, and deriving it twice would be two decodes for one result. */
async function imageKeys(): Promise<string[]> {
  const result = await db.execute(
    "SELECT imageUrl, imageUrlDark FROM WishlistItem",
  );
  const keys = new Set<string>();
  for (const row of result.rows) {
    for (const value of [row.imageUrl, row.imageUrlDark]) {
      if (typeof value === "string" && value) keys.add(value);
    }
  }
  return [...keys].sort();
}

async function main() {
  const keys = await imageKeys();
  console.log(
    `${keys.length} images in the ${isRemote ? "production" : "local"} database`,
  );

  let made = 0;
  let missing = 0;
  const failures: string[] = [];

  for (const key of keys) {
    const wanted = derivativeKeys(key);
    const absent = isForce
      ? wanted
      : (
          await Promise.all(
            wanted.map(async (d) => ((await exists(d.key)) ? null : d)),
          )
        ).filter((d) => d !== null);

    if (absent.length === 0) continue;

    missing += absent.length;

    if (isCheck) {
      console.log(`${key}: missing ${absent.map((d) => d.width).join(", ")}`);
      continue;
    }

    try {
      // Derive every width even when only one is absent: the decode is the
      // expensive half and it is already paid for by the time the first
      // encoder runs.
      const derivatives = await deriveWebp(await download(key), key);
      const write = new Set(absent.map((d) => d.key));
      await Promise.all(
        derivatives
          .filter((d) => write.has(d.key))
          .map((d) => upload(d.key, d.body)),
      );
      made += absent.length;
      console.log(`${key}: wrote ${absent.map((d) => d.width).join(", ")}`);
    } catch (error) {
      failures.push(`${key}: ${error instanceof Error ? error.message : error}`);
      console.error(`${key}: FAILED — ${error}`);
    }
  }

  if (isCheck) {
    console.log(
      missing === 0
        ? "Every image has all four widths."
        : `${missing} derivatives missing. Run without --check to make them.`,
    );
    // A missing derivative is a broken card, so this is worth failing a
    // pipeline over rather than only worth reading.
    process.exit(missing === 0 ? 0 : 1);
  }

  console.log(`Wrote ${made} derivatives.`);
  if (failures.length > 0) {
    console.error(`\n${failures.length} images failed:`);
    for (const failure of failures) console.error(`  ${failure}`);
    process.exit(1);
  }
}

await main();
