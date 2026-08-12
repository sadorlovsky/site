// Marks the section you are reading in a post's contents.
//
// Not an IntersectionObserver. The question here is not "is this heading on
// screen" — with a 5000-word cheatsheet several are, and none is for the whole
// of a long section — but "which heading did I last pass", which is a single
// comparison against the line the chrome docks on. One pass per animation
// frame, no thresholds to tune, and it gives the right answer inside a section
// taller than the viewport, where an observer gives none at all.

/**
 * The sheet, below the rail's breakpoint.
 *
 * A contents laid out in the flow above the first paragraph is a wall between
 * the reader and the post — twenty-seven entries on a phone before a word of
 * the article. Behind a pill in the corner it costs one tap, and the scroll it
 * answers to is its own.
 */
function initSheet(nav: HTMLElement) {
  const open = document.querySelector<HTMLElement>("[data-contents-open]");
  const scrim = document.querySelector<HTMLElement>("[data-contents-scrim]");
  const close = nav.querySelector<HTMLElement>("[data-contents-close]");
  if (!open || !scrim) return;

  let lastFocus: HTMLElement | null = null;

  const setOpen = (isOpen: boolean) => {
    nav.classList.toggle("is-open", isOpen);
    scrim.classList.toggle("is-open", isOpen);
    open.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) {
      lastFocus = document.activeElement as HTMLElement | null;
      scrim.hidden = false;
      // The article must not scroll behind the sheet: that is the whole
      // complaint the sheet answers.
      document.body.style.overflow = "hidden";
      close?.focus();
    } else {
      document.body.style.overflow = "";
      // The scrim leaves after the sheet has, so the transition is not cut.
      window.setTimeout(() => {
        if (!nav.classList.contains("is-open")) scrim.hidden = true;
      }, 360);
      lastFocus?.focus();
    }
  };

  open.setAttribute("aria-expanded", "false");
  open.addEventListener("click", () => setOpen(true));
  close?.addEventListener("click", () => setOpen(false));
  scrim.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav.classList.contains("is-open")) {
      setOpen(false);
    }
  });
  // Following an entry is the sheet's whole purpose; it closes behind you.
  nav.querySelectorAll("[data-contents-link]").forEach((link) => {
    link.addEventListener("click", () => setOpen(false));
  });
}

function initContents(nav: HTMLElement) {
  if (nav.dataset.contentsReady === "true") return;
  nav.dataset.contentsReady = "true";
  initSheet(nav);

  const list = nav.querySelector<HTMLElement>("[data-contents-list]");
  const links = Array.from(
    nav.querySelectorAll<HTMLAnchorElement>("[data-contents-link]"),
  );
  if (!list || links.length === 0) return;

  const targets = links
    .map((link) => {
      const id = link.dataset.contentsLink ?? "";
      const heading = document.getElementById(id);
      return heading ? { link, heading } : null;
    })
    .filter((entry): entry is { link: HTMLAnchorElement; heading: HTMLElement } =>
      entry !== null,
    );
  if (targets.length === 0) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let current: HTMLAnchorElement | null = null;
  let queued = false;

  // Which edges have something beyond them. A contents that fits gets no fade
  // at all — a mask over --ink-muted reads as a disabled row, not as an edge.
  const markFades = () => {
    const slack = list.scrollHeight - list.clientHeight;
    if (slack <= 1) {
      delete list.dataset.fade;
      return;
    }
    const atTop = list.scrollTop <= 1;
    const atBottom = list.scrollTop >= slack - 1;
    list.dataset.fade = atTop ? "bottom" : atBottom ? "top" : "both";
  };

  const chromeOffset = () => {
    const raw = getComputedStyle(nav).getPropertyValue(
      "--sticky-header-offset",
    );
    const parsed = Number.parseFloat(raw);
    return Number.isNaN(parsed) ? 88 : parsed;
  };

  const update = () => {
    queued = false;
    // A heading counts as passed once its top has crossed the line the chrome
    // sits on, plus a little, so the marker moves as the heading tucks under
    // the pills rather than a screen early.
    const line = chromeOffset() + 24;
    let passed = targets[0];
    for (const entry of targets) {
      if (entry.heading.getBoundingClientRect().top <= line) passed = entry;
      else break;
    }

    // Before the first heading there is no section to be in, and the first
    // entry would otherwise claim the whole introduction.
    const atTop = targets[0].heading.getBoundingClientRect().top > line;
    const next = atTop ? null : passed.link;
    if (next === current) return;

    current?.parentElement?.classList.remove("is-current");
    current = next;
    if (!current) return;
    current.parentElement?.classList.add("is-current");

    // Keep the marked entry inside the rail's own scrollport without touching
    // the page's: scrollIntoView would take the document with it.
    const item = current.parentElement;
    if (!item || list.scrollHeight <= list.clientHeight) return;
    const top = item.offsetTop - list.offsetTop;
    const bottom = top + item.offsetHeight;
    if (top < list.scrollTop) {
      list.scrollTo({ top: top - 8, behavior: reduced ? "auto" : "smooth" });
    } else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTo({
        top: bottom - list.clientHeight + 8,
        behavior: reduced ? "auto" : "smooth",
      });
    }
    markFades();
  };

  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("resize", markFades, { passive: true });
  list.addEventListener("scroll", markFades, { passive: true });
  new ResizeObserver(markFades).observe(list);
  update();
  markFades();
}

function initAll() {
  document
    .querySelectorAll<HTMLElement>("[data-post-contents]")
    .forEach(initContents);
}

initAll();
document.addEventListener("astro:page-load", initAll);

export {};
