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
 *   --category=<slug>  restrict to one or more categories (comma-separated)
 *   --limit=<n>        stop after n items
 *   --items=<path>     read items from JSON instead of Turso (implies offline)
 *   --out=<dir>        output directory (default scripts/wishlist-images/out)
 *   --dry-run          print prompts, call nothing
 */

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
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
    else if (key === "category") args.categories = value.split(",").map((c) => c.trim());
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

/**
 * After publishing, WishlistItem.imageUrl points at a *styled* render — feeding that
 * back in as the edit reference makes the model inherit its staging (shelf and all)
 * no matter what the prompt says. The original photo keys were recorded as `previous`
 * in publish.mjs's rollback files, so recover them from there, oldest first.
 */
async function loadOriginalSources(outDir) {
  const originals = new Map();

  const files = (await readdir(outDir))
    .filter((f) => /^rollback-\d+\.json$/.test(f))
    .sort();

  for (const file of files) {
    for (const { id, previous } of JSON.parse(await readFile(path.join(outDir, file), "utf8"))) {
      if (!originals.has(id) && previous && !previous.startsWith("wishlist/styled/")) {
        originals.set(id, previous);
      }
    }
  }

  return originals;
}

/**
 * Fold this run's records into whatever manifest.json already has on disk, keyed by
 * item id, so running generate.mjs on one category (or --only) doesn't wipe out
 * results from earlier runs on other items.
 *
 * A failed attempt only overwrites a prior *successful* record if that's all we
 * have — otherwise the earlier good candidates survive and the failure is dropped,
 * since re-running --only=<failed ids> is the documented way to retry.
 */
async function mergeManifest(manifestPath, newRecords) {
  let existing = [];
  try {
    existing = JSON.parse(await readFile(manifestPath, "utf8")).items ?? [];
  } catch {
    // No manifest yet — first run.
  }

  const byId = new Map(existing.map((record) => [record.id, record]));

  for (const record of newRecords) {
    const prior = byId.get(record.id);
    if (record.variants.length > 0 || !prior || prior.variants.length === 0) {
      byId.set(record.id, record);
    }
  }

  const items = [...byId.values()].sort((a, b) => a.id - b.id);
  const models = [...new Set(items.map((item) => item.model).filter(Boolean))];

  return { model: models.length === 1 ? models[0] : "mixed", items };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadEnv();

  let items = (await loadItems({ from: args.items })).map(describe);

  const originals = await loadOriginalSources(args.out).catch(() => new Map());
  items = items.map((item) => {
    if (!item.imageUrl?.startsWith("wishlist/styled/")) return item;
    const original = originals.get(item.id);
    if (!original) {
      console.warn(`  ! #${item.id} imageUrl is already styled and no original found in rollback files`);
      return item;
    }
    return { ...item, imageUrl: original };
  });

  if (args.only) items = items.filter((item) => args.only.includes(item.id));
  if (args.categories) items = items.filter((item) => args.categories.includes(item.category));
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

        return { ...item, source, prompt, model: args.model, variants: files };
      } catch (error) {
        console.error(`  ✗ #${item.id} ${item.title}: ${error.message}`);
        failures.push({ id: item.id, title: item.title, error: error.message });
        return { ...item, source, prompt, model: args.model, variants: [], error: error.message };
      }
    },
    CONCURRENCY,
  );

  const manifestPath = path.join(args.out, "manifest.json");
  const merged = await mergeManifest(manifestPath, records);

  await writeFile(
    manifestPath,
    `${JSON.stringify(merged, null, 2)}\n`,
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
