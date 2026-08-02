/**
 * Build a contact sheet for approving generated candidates.
 *
 * Renders every item as the original next to its variants, each one inside a mock of
 * the real card — same 4:3 crop, same 20px radius, same badge positions, same 1.08
 * hover zoom — so what you approve is what the grid will actually show. The theme
 * toggle matters more than it looks: we generate a single mid-tone backdrop for both
 * themes, and this is where you find out whether that tone actually holds.
 *
 * Usage: bun scripts/wishlist-images/review.mjs [--out=<dir>]
 * Then open out/review.html, pick one variant per item, and save selection.json
 * next to the manifest.
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_OUT = "scripts/wishlist-images/out";

const outDir =
  process.argv
    .slice(2)
    .find((arg) => arg.startsWith("--out="))
    ?.split("=")[1] ?? DEFAULT_OUT;

const manifest = JSON.parse(
  await readFile(path.join(outDir, "manifest.json"), "utf8"),
);

const escape = (value) =>
  String(value).replace(
    /[&<>"]/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char],
  );

const rows = manifest.items
  .map((item) => {
    const candidates = item.variants
      .map(
        (file, i) => `
        <label class="shot">
          <input type="radio" name="item-${item.id}" value="${escape(file)}" />
          <span class="card"><img src="${escape(file)}" alt="" loading="lazy" /></span>
          <span class="caption">v${i + 1}</span>
        </label>`,
      )
      .join("");

    const failure = item.error
      ? `<p class="error">${escape(item.error)}</p>`
      : "";

    return `
    <section class="row" data-id="${item.id}">
      <header>
        <h2>#${item.id} ${escape(item.title)}</h2>
        <p class="meta">${escape(item.category)} · ${escape(item.formFactor)} · ${item.units > 1 ? `${item.units} units` : "single"}</p>
      </header>
      <div class="shots">
        <label class="shot original">
          <input type="radio" name="item-${item.id}" value="" checked />
          <span class="card"><img src="${escape(item.source)}" alt="" loading="lazy" /></span>
          <span class="caption">original (keep)</span>
        </label>
        ${candidates}
      </div>
      ${failure}
    </section>`;
  })
  .join("");

const html = `<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Wishlist image review — ${escape(manifest.model)}</title>
<style>
  :root { --bg: #f8f8ff; --fg: #1a1a1a; --muted: #666; --tile: #f0f0f0; --line: rgba(0,0,0,.1); }
  [data-theme="dark"] { --bg: #191919; --fg: #f0f0f0; --muted: #999; --tile: #1a1a1a; --line: rgba(255,255,255,.08); }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 2rem; font: 15px/1.5 system-ui, sans-serif; background: var(--bg); color: var(--fg); }
  .bar { position: sticky; top: 0; z-index: 10; display: flex; gap: .75rem; align-items: center;
         padding: .85rem 1rem; margin: -2rem -2rem 2rem; background: var(--bg); border-bottom: 1px solid var(--line); }
  .bar h1 { font-size: 1rem; margin: 0; flex: 1; }
  button { font: inherit; padding: .45rem .9rem; border-radius: 8px; border: 1px solid var(--line);
           background: transparent; color: inherit; cursor: pointer; }
  button.primary { background: rgb(237,98,146); border-color: transparent; color: #fff; }
  .row { padding: 1.25rem 0; border-bottom: 1px solid var(--line); }
  .row header { display: flex; align-items: baseline; gap: .75rem; margin-bottom: .75rem; flex-wrap: wrap; }
  h2 { font-size: 1rem; margin: 0; font-weight: 600; }
  .meta { margin: 0; color: var(--muted); font-size: .8rem; }
  .shots { display: flex; gap: 1rem; overflow-x: auto; padding-bottom: .5rem; }
  .shot { flex: 0 0 300px; cursor: pointer; }
  .shot input { position: absolute; opacity: 0; }
  /* Mirrors .item-image in src/styles/wishlist.css — 4:3, cover, 1.08 hover zoom */
  .card { display: block; position: relative; aspect-ratio: 4/3; overflow: hidden;
          border-radius: 20px 20px 0 0; background: var(--tile); border: 2px solid transparent; }
  .card img { width: 100%; height: 100%; object-fit: cover; display: block;
              transition: transform .4s cubic-bezier(.16,1,.3,1); }
  .shot:hover .card img { transform: scale(1.08); }
  .shot input:checked + .card { border-color: rgb(237,98,146); }
  .caption { display: block; margin-top: .4rem; font-size: .8rem; color: var(--muted); }
  .shot input:checked ~ .caption { color: rgb(237,98,146); font-weight: 600; }
  .original .card { opacity: .75; }
  .error { color: #d33; font-size: .85rem; margin: .5rem 0 0; }
  /* The badges overlay these corners on the real card — anything important under
     them is a composition bug, so show where they land. */
  .card::before, .card::after { content: ""; position: absolute; top: .75rem; width: 74px; height: 24px;
    border-radius: 999px; background: rgba(127,127,127,.35); pointer-events: none; }
  .card::before { left: .75rem; }
  .card::after { right: .75rem; }
</style>
</head>
<body>
  <div class="bar">
    <h1>${manifest.items.length} items · ${escape(manifest.model)}</h1>
    <button id="theme">Toggle theme</button>
    <button class="primary" id="save">Save selection.json</button>
  </div>
  ${rows}
<script>
  document.getElementById("theme").onclick = () => {
    const root = document.documentElement;
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  };

  document.getElementById("save").onclick = () => {
    const picks = [];
    for (const row of document.querySelectorAll(".row")) {
      const checked = row.querySelector("input:checked");
      if (checked?.value) picks.push({ id: Number(row.dataset.id), file: checked.value });
    }

    const blob = new Blob([JSON.stringify(picks, null, 2) + "\\n"], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "selection.json";
    link.click();
    URL.revokeObjectURL(link.href);
  };
</script>
</body>
</html>
`;

const target = path.join(outDir, "review.html");
await writeFile(target, html);
console.log(`Wrote ${target} — open it, pick variants, save selection.json into ${outDir}/`);
