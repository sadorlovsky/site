// Pins the pill row and hands the page title over to the compact pill.
//
// The hero title is ordinary content: it scrolls away under the pinned row and
// comes back at exactly the speed the page is scrolled, so there is nothing
// here to animate and nothing to wait for. This file only answers one question
// — has the title gone under the row? — and flips `.is-condensed`, which fades
// in the compact pill and the veil behind it.
//
// It used to be driven by scroll position with hysteresis (condense past 44px,
// expand below 6px). That made the title reappear only once the page had come
// to rest at the very top, and then take another 400ms to grow back: a visible
// lag with no frames dropped anywhere. An observer on the title itself has no
// threshold to tune — the pill arrives exactly when the title leaves.

function initCondense(header: HTMLElement) {
  if (header.dataset.condenseReady === "true") return;
  header.dataset.condenseReady = "true";

  const row = header.querySelector<HTMLElement>(".header-row");
  if (!row) return;

  // The pinned header floats over the page, so any *other* sticky element (the
  // year rows on /travel) must dock below it, not under it. Publish the row's
  // stuck height — plus its sticky top offset (0.55rem, keep in sync with
  // .page-header--condense .header-row) and a small breathing gap — as a CSS
  // variable scoped to the page's <main>.
  const scope = header.closest<HTMLElement>("main");
  if (scope) {
    const rem =
      parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const publish = () => {
      const offset = Math.round(row.offsetHeight + 1.05 * rem);
      scope.style.setProperty("--sticky-header-offset", `${offset}px`);
    };
    publish();
    new ResizeObserver(publish).observe(row);
  }

  // The compact pill doubles as the way back to the top: it carries the page
  // title, and by the time it exists the cursor is already up there.
  const pill = header.querySelector<HTMLElement>(".condensed-title");
  const title = header.querySelector<HTMLElement>(".page-title");
  pill?.addEventListener("click", () => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    // The pill fades out on the way up, so focus would be left on nothing.
    // preventScroll keeps this from racing the smooth scroll it just started.
    title?.focus({ preventScroll: true });
  });

  const hero = header.querySelector<HTMLElement>(".page-header__hero");
  if (!hero) return;

  // Watch the strip the row occupies: once the hero has left it, the row has
  // nothing but page content beneath it, and the compact title takes over.
  let observer: IntersectionObserver | null = null;

  const watch = () => {
    observer?.disconnect();
    const clearance = Math.round(row.getBoundingClientRect().height + 12);
    observer = new IntersectionObserver(
      ([entry]) => {
        header.classList.toggle("is-condensed", !entry.isIntersecting);
      },
      { rootMargin: `-${clearance}px 0px 0px 0px`, threshold: 0 },
    );
    observer.observe(hero);
  };

  watch();
  // The row's height changes when the pills wrap on a narrow viewport, which
  // moves the line the hero has to cross.
  new ResizeObserver(watch).observe(row);
}

function initAll() {
  document
    .querySelectorAll<HTMLElement>(".page-header--condense")
    .forEach(initCondense);
}

initAll();
document.addEventListener("astro:page-load", initAll);

export {};
