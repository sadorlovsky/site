/**
 * Generate restyled card images for wishlist items.
 *
 * Writes candidates to a local out/ directory plus a manifest — it never touches R2
 * or the database. Publishing is a separate, explicit step (publish.mjs) so nothing
 * reaches production before a human has looked at a contact sheet.
 *
 * Usage:
 *   bun scripts/wishlist-images/generate.mjs --dry-run --items=scripts/wishlist-images/sample-items.json
 *   bun scripts/wishlist-images/generate.mjs --category=vinyl --variants=3
 *   bun scripts/wishlist-images/generate.mjs --only=1,2,17 --model=seedream
 *
 * Flags:
 *   --model=<name>     nano-banana (default) | seedream | kontext
 *   --variants=<n>     candidates per item (default 2)
 *   --only=<ids>       comma-separated item ids
 *   --category=<slug>  restrict to one category
 *   --limit=<n>        stop after n items
 *   --items=<path>     read items from JSON instead of Turso (implies offline)
 *   --out=<dir>        output directory (default scripts/wishlist-images/out)
 *   --dry-run          print prompts, call nothing
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildPrompt, NEGATIVE_PROMPT } from "./style.mjs";
import { describe } from "./classify.mjs";
import { loadEnv, loadItems } from "./db.mjs";
import { generate } from "./fal.mjs";

const DEFAULT_OUT = "scripts/wishlist-images/out";
const CONCURRENCY = 4;

function parseArgs(argv) {
  const args = { model: "nano-banana", variants: 2, out: DEFAULT_OUT, dryRun: false };

  for (const arg of argv) {
    const [key, value] = arg.replace(/^--/, "").split("=");
    if (key === "dry-run") args.dryRun = true;
    else if (key === "model") args.model = value;
    else if (key === "variants") args.variants = Number.parseInt(value, 10);
    else if (key === "limit") args.limit = Number.parseInt(value, 10);
    else if (key === "only") args.only = value.split(",").map((id) => Number.parseInt(id, 10));
    else if (key === "category") args.category = value;
    else if (key === "items") args.items = value;
    else if (key === "out") args.out = value;
    else throw new Error(`Unknown flag: ${arg}`);
  }

  return args;
}

function slug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function cdnUrl(filename) {
  const domain = process.env.CDN_DOMAIN ?? process.env.CDN_DEV_DOMAIN;
  if (!domain) throw new Error("CDN_DOMAIN is not set — can't resolve source images");
  // Admin uploads already store a `wishlist/...` key; older seeded rows are bare names.
  return `https://${domain}/${filename}`;
}

/** Run tasks with a fixed worker pool — fal rate-limits, and 60 parallel calls is rude. */
async function pool(items, worker, size) {
  const results = [];
  let cursor = 0;

  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await worker(items[index], index);
      }
    }),
  );

  return results;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadEnv();

  let items = (await loadItems({ from: args.items })).map(describe);

  if (args.only) items = items.filter((item) => args.only.includes(item.id));
  if (args.category) items = items.filter((item) => item.category === args.category);
  if (args.limit) items = items.slice(0, args.limit);

  if (items.length === 0) {
    console.error("No items matched the filters.");
    process.exit(1);
  }

  console.log(
    `${items.length} item(s) · model ${args.model} · ${args.variants} variant(s) each` +
      (args.dryRun ? " · DRY RUN" : ""),
  );

  if (args.dryRun) {
    for (const item of items) {
      console.log(`\n${"=".repeat(78)}`);
      console.log(`#${item.id} ${item.title}`);
      console.log(`category: ${item.category} · form factor: ${item.formFactor} · units: ${item.units}`);
      console.log("=".repeat(78));
      console.log(buildPrompt(item));
    }
    console.log(`\n${"=".repeat(78)}\nNegative prompt: ${NEGATIVE_PROMPT}`);
    return;
  }

  await mkdir(args.out, { recursive: true });

  const failures = [];

  const records = await pool(
    items,
    async (item) => {
      const prompt = buildPrompt(item);
      const source = cdnUrl(item.imageUrl);

      try {
        const urls = await generate({
          model: args.model,
          prompt,
          imageUrl: source,
          negativePrompt: NEGATIVE_PROMPT,
          variants: args.variants,
        });

        const files = await Promise.all(
          urls.map(async (url, i) => {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`download HTTP ${response.status}`);

            const name = `${String(item.id).padStart(3, "0")}-${slug(item.title)}-v${i + 1}.jpg`;
            await writeFile(
              path.join(args.out, name),
              Buffer.from(await response.arrayBuffer()),
            );
            return name;
          }),
        );

        console.log(`  ✓ #${item.id} ${item.title} → ${files.length} variant(s)`);

        return { ...item, source, prompt, variants: files };
      } catch (error) {
        console.error(`  ✗ #${item.id} ${item.title}: ${error.message}`);
        failures.push({ id: item.id, title: item.title, error: error.message });
        return { ...item, source, prompt, variants: [], error: error.message };
      }
    },
    CONCURRENCY,
  );

  await writeFile(
    path.join(args.out, "manifest.json"),
    `${JSON.stringify({ model: args.model, items: records }, null, 2)}\n`,
  );

  console.log(`\nWrote ${args.out}/manifest.json`);
  if (failures.length > 0) {
    console.log(`${failures.length} item(s) failed — rerun with --only=${failures.map((f) => f.id).join(",")}`);
  }
  console.log("Next: bun scripts/wishlist-images/review.mjs");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
