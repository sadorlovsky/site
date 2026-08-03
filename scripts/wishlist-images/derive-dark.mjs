/**
 * Derive dark-theme counterparts from approved light-theme renders.
 *
 * Runs the DARKEN_PROMPT edit on each file picked in selection.json, so the dark
 * image inherits the exact composition, pose and shelf of its approved light twin.
 * Output lands next to the source as <name>-dark.jpg; publish.mjs picks the pair
 * up by that naming convention.
 *
 * Usage:
 *   bun scripts/wishlist-images/derive-dark.mjs               # all of selection.json
 *   bun scripts/wishlist-images/derive-dark.mjs --only=1,2    # subset
 *   bun scripts/wishlist-images/derive-dark.mjs --force       # redo existing -dark files
 *
 * Flags:
 *   --model=<name>  nano-banana (default) | seedream | kontext
 *   --only=<ids>    comma-separated item ids
 *   --force         regenerate even if the -dark file already exists
 *   --out=<dir>     output directory (default scripts/wishlist-images/out)
 */

import { readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { buildDarkenPrompt, NEGATIVE_PROMPT } from "./style.mjs";
import { describe } from "./classify.mjs";
import { loadEnv, loadItems } from "./db.mjs";
import { generate } from "./fal.mjs";

const DEFAULT_OUT = "scripts/wishlist-images/out";
const CONCURRENCY = 4;

function parseArgs(argv) {
  const args = { model: "nano-banana", out: DEFAULT_OUT, force: false };
  for (const arg of argv) {
    const [key, value] = arg.replace(/^--/, "").split("=");
    if (key === "model") args.model = value;
    else if (key === "only") args.only = value.split(",").map((id) => Number.parseInt(id, 10));
    else if (key === "force") args.force = true;
    else if (key === "out") args.out = value;
    else throw new Error(`Unknown flag: ${arg}`);
  }
  return args;
}

function darkName(file) {
  return `${path.basename(file, ".jpg")}-dark.jpg`;
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

/** Same fixed-size worker pool as generate.mjs — fal rate-limits. */
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

  let selection = JSON.parse(
    await readFile(path.join(args.out, "selection.json"), "utf8"),
  );
  if (args.only) selection = selection.filter((entry) => args.only.includes(entry.id));

  if (selection.length === 0) {
    console.error("Nothing to derive — selection.json is empty or --only matched nothing.");
    process.exit(1);
  }

  console.log(`${selection.length} item(s) · model ${args.model} · deriving dark variants`);

  // The shelf/no-shelf split in the darken prompt follows category + form factor.
  const itemById = new Map((await loadItems()).map((item) => [item.id, describe(item)]));

  const failures = [];

  await pool(
    selection,
    async ({ id, file }) => {
      const source = path.join(args.out, file);
      const target = path.join(args.out, darkName(file));

      if (!args.force && (await exists(target))) {
        console.log(`  = #${id} ${file} → dark exists, skipping (--force to redo)`);
        return;
      }

      try {
        // The approved render only exists locally, so it goes in as a data URI.
        const image = await readFile(source);
        const dataUri = `data:image/jpeg;base64,${image.toString("base64")}`;

        const urls = await generate({
          model: args.model,
          prompt: buildDarkenPrompt(itemById.get(id)),
          imageUrl: dataUri,
          negativePrompt: NEGATIVE_PROMPT,
          variants: 1,
        });

        const response = await fetch(urls[0]);
        if (!response.ok) throw new Error(`download HTTP ${response.status}`);
        await writeFile(target, Buffer.from(await response.arrayBuffer()));

        console.log(`  ✓ #${id} ${darkName(file)}`);
      } catch (error) {
        console.error(`  ✗ #${id} ${file}: ${error.message}`);
        failures.push(id);
      }
    },
    CONCURRENCY,
  );

  await writeSheet(args.out, selection);

  if (failures.length > 0) {
    console.log(`\n${failures.length} failed — rerun with --only=${failures.join(",")}`);
  }
  console.log(`Compare pairs: open ${args.out}/review-dark.html`);
}

/** Side-by-side light/dark sheet with the card's dark background, for eyeballing pairs. */
async function writeSheet(outDir, selection) {
  const rows = [];
  for (const { id, file } of selection) {
    if (!(await exists(path.join(outDir, darkName(file))))) continue;
    rows.push(`
  <section>
    <h2>#${id}</h2>
    <div class="pair">
      <figure class="light"><img src="${file}" loading="lazy"><figcaption>light</figcaption></figure>
      <figure class="dark"><img src="${darkName(file)}" loading="lazy"><figcaption>dark</figcaption></figure>
    </div>
  </section>`);
  }

  const html = `<!doctype html>
<meta charset="utf-8">
<title>Dark derivation review</title>
<style>
  body { margin: 2rem; font: 14px/1.4 system-ui; background: #101012; color: #eee; }
  section { margin-bottom: 2.5rem; }
  h2 { font-size: 1rem; margin: 0 0 .6rem; }
  .pair { display: flex; gap: 1rem; }
  figure { margin: 0; flex: 0 0 380px; padding: 1rem; border-radius: 16px; }
  .light { background: #f0f0f0; color: #333; }
  .dark { background: #1a1a1a; }
  img { width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 12px; display: block; }
  figcaption { margin-top: .4rem; font-size: .8rem; opacity: .7; }
</style>
${rows.join("\n")}
`;
  await writeFile(path.join(outDir, "review-dark.html"), html);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
