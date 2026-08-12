// The furniture a post's prose needs and markdown cannot emit: a copy button
// on every code block, and a real scrollport around every table.
//
// Hung from the client rather than emitted by the markdown pipeline, because
// the thing it needs — the block's own text — is already in the DOM, and a
// rehype plugin to wrap every `pre` would put a build step between the author
// and a button. Nothing is lost without JavaScript: the listing is still
// selectable, which is how it was copied before.
//
// The label is a word, not a glyph. This site draws its icons; it does not
// borrow them from the text stream, and "Copy" says what the control does in
// the language the post is written in.

const COPY = {
  en: { idle: "Copy", done: "Copied", label: "Copy code", table: "Table" },
  ru: {
    idle: "Копировать",
    done: "Скопировано",
    label: "Скопировать код",
    table: "Таблица",
  },
};

function mount(pre: HTMLElement, lang: "en" | "ru") {
  if (pre.dataset.copyReady === "true") return;
  pre.dataset.copyReady = "true";

  const code = pre.querySelector("code");
  if (!code) return;

  const words = COPY[lang];
  const button = document.createElement("button");
  button.type = "button";
  button.className = "code-copy";
  button.textContent = words.idle;
  button.setAttribute("aria-label", words.label);

  let restore: ReturnType<typeof setTimeout> | undefined;
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(code.textContent ?? "");
    } catch {
      return;
    }
    button.textContent = words.done;
    clearTimeout(restore);
    restore = setTimeout(() => {
      button.textContent = words.idle;
    }, 2000);
  });

  pre.append(button);
}

/**
 * A table wide enough to need scrolling gets a box that can be scrolled, and
 * the box can be reached by keyboard.
 *
 * The table itself keeps `display: table`. Making the table its own scroll box
 * is one CSS declaration and costs it the role and the row-and-cell structure
 * an assistive reader moves through — a saving of one element, paid for with
 * the table's own semantics.
 */
function wrapTable(table: HTMLTableElement, lang: "en" | "ru") {
  if (table.dataset.scrollReady === "true") return;
  table.dataset.scrollReady = "true";

  const box = document.createElement("div");
  box.className = "table-scroll";
  // Named and focusable, so the scroll region is announced and the arrow keys
  // can reach it. Without tabindex it is mouse-only.
  box.setAttribute("role", "region");
  box.setAttribute("tabindex", "0");
  // The nearest heading above says what the table is about far better than the
  // word "table" does — the *heading*, though, not whatever element happens to
  // sit before it, which in a post is usually the sentence introducing it.
  let above = table.previousElementSibling;
  while (above && !/^H[1-6]$/.test(above.tagName)) {
    above = above.previousElementSibling;
  }
  const name = above?.textContent?.trim();
  box.setAttribute(
    "aria-label",
    name ? `${COPY[lang].table}: ${name}` : COPY[lang].table,
  );

  table.replaceWith(box);
  box.append(table);
}

function initAll() {
  const article = document.querySelector<HTMLElement>("article[data-lang]");
  if (!article) return;
  const lang = article.dataset.lang === "ru" ? "ru" : "en";

  if (navigator.clipboard) {
    article
      .querySelectorAll<HTMLElement>(".content pre")
      .forEach((pre) => mount(pre, lang));
  }

  article
    .querySelectorAll<HTMLTableElement>(".content table")
    .forEach((table) => wrapTable(table, lang));
}

initAll();
document.addEventListener("astro:page-load", initAll);

export {};
