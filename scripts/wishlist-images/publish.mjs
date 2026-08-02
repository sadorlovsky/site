/**
 * Publish approved candidates: upload to R2, then repoint WishlistItem.imageUrl.
 *
 * Requires --confirm, because both halves are live: the bucket is what the CDN
 * serves and the database is production. Originals are never overwritten — new
 * objects land under wishlist/styled/ and every previous imageUrl is written to a
 * rollback file before anything changes.
 *
 * Usage:
 *   bun scripts/wishlist-images/publish.mjs               # dry run, prints the plan
 *   bun scripts/wishlist-images/publish.mjs --confirm
 *   bun scripts/wishlist-images/publish.mjs --rollback=scripts/wishlist-images/out/rollback-<ts>.json --confirm
 */

import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { AwsClient } from "aws4fetch";
import { loadEnv, loadItems, setImageUrl, setImageUrlDark } from "./db.mjs";

const DEFAULT_OUT = "scripts/wishlist-images/out";

function parseArgs(argv) {
  const args = { out: DEFAULT_OUT, confirm: false };
  for (const arg of argv) {
    const [key, value] = arg.replace(/^--/, "").split("=");
    if (key === "confirm") args.confirm = true;
    else if (key === "out") args.out = value;
    else if (key === "rollback") args.rollback = value;
    else throw new Error(`Unknown flag: ${arg}`);
  }
  return args;
}

function r2Client() {
  const {
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_ACCOUNT_ID,
    R2_BUCKET_NAME = "wishlist-images",
  } = process.env;

  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ACCOUNT_ID) {
    throw new Error("R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY must be set");
  }

  const client = new AwsClient({
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  });

  return async (key, body) => {
    const url = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${key}`;
    const response = await client.fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "image/jpeg" },
      body,
    });
    if (!response.ok) {
      throw new Error(`R2 PUT ${key} → ${response.status}: ${await response.text()}`);
    }
  };
}

async function rollback(file, confirm) {
  const entries = JSON.parse(await readFile(file, "utf8"));
  console.log(`Restoring ${entries.length} imageUrl value(s)${confirm ? "" : " (dry run)"}`);

  for (const entry of entries) {
    console.log(`  #${entry.id}  ${entry.next} → ${entry.previous}`);
    if (confirm) {
      await setImageUrl(entry.id, entry.previous);
      // Older rollback files predate dark variants — leave imageUrlDark alone then.
      if ("previousDark" in entry) await setImageUrlDark(entry.id, entry.previousDark);
    }
  }

  if (!confirm) console.log("\nRe-run with --confirm to apply.");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadEnv();

  if (args.rollback) return rollback(args.rollback, args.confirm);

  const selection = JSON.parse(
    await readFile(path.join(args.out, "selection.json"), "utf8"),
  );

  if (selection.length === 0) {
    console.log("selection.json is empty — nothing to publish.");
    return;
  }

  // Read current values first so the rollback file is accurate even if we abort midway.
  const items = await loadItems();
  const byId = new Map(items.map((item) => [item.id, item]));

  const plan = await Promise.all(
    selection.map(async ({ id, file }) => {
      const item = byId.get(id);
      if (!item) throw new Error(`Item #${id} is in selection.json but not in the database`);

      // Dark twin travels by naming convention: <base>-dark.jpg next to the light file.
      const darkFile = path.join(args.out, `${path.basename(file, ".jpg")}-dark.jpg`);
      const hasDark = await access(darkFile).then(() => true, () => false);

      return {
        id,
        title: item.title,
        previous: item.imageUrl,
        previousDark: item.imageUrlDark ?? null,
        next: `wishlist/styled/${path.basename(file, ".jpg")}.jpg`,
        nextDark: hasDark ? `wishlist/styled/${path.basename(file, ".jpg")}-dark.jpg` : null,
        file: path.join(args.out, file),
        darkFile: hasDark ? darkFile : null,
      };
    }),
  );

  console.log(`${plan.length} item(s) to publish${args.confirm ? "" : " (dry run)"}:\n`);
  for (const entry of plan) {
    console.log(`  #${entry.id} ${entry.title}\n      ${entry.previous} → ${entry.next}`);
    if (entry.nextDark) console.log(`      dark: ${entry.previousDark ?? "(none)"} → ${entry.nextDark}`);
  }

  if (!args.confirm) {
    console.log("\nRe-run with --confirm to upload and update the database.");
    return;
  }

  const put = r2Client();
  const rollbackFile = path.join(args.out, `rollback-${Date.now()}.json`);
  await writeFile(rollbackFile, `${JSON.stringify(plan.map(({ id, previous, next, previousDark, nextDark }) => ({ id, previous, next, previousDark, nextDark })), null, 2)}\n`);
  console.log(`\nRollback written to ${rollbackFile}`);

  // Upload everything before touching the database — a half-uploaded batch is
  // harmless, but a row pointing at an object that isn't there is a broken card.
  for (const entry of plan) {
    await put(entry.next, await readFile(entry.file));
    console.log(`  uploaded ${entry.next}`);
    if (entry.darkFile) {
      await put(entry.nextDark, await readFile(entry.darkFile));
      console.log(`  uploaded ${entry.nextDark}`);
    }
  }

  for (const entry of plan) {
    await setImageUrl(entry.id, entry.next);
    if (entry.nextDark) await setImageUrlDark(entry.id, entry.nextDark);
    console.log(`  updated #${entry.id}`);
  }

  console.log("\nDone. Purge the ISR cache: ./scripts/revalidate-wishlist.sh");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
