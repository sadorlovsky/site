// Pins the page header and condenses the hero title into the nav row on scroll.
// Driven purely by scroll position because the header is sticky: the hero title
// never scrolls away on its own, so we toggle `.is-condensed` past a small
// threshold (with hysteresis to avoid flicker near the boundary). All the
// motion lives in CSS — this only flips the class.

// A wide gap between the two thresholds is deliberate: it keeps small
// back-and-forth scrolls near the top from repeatedly flipping the state
// (each flip reflows the page below the collapsing hero, which reads as a
// jump). You must commit ~44px of scroll to condense, and return almost to
// the top to expand again.
const CONDENSE_AT = 44; // px scrolled before the header condenses
const EXPAND_AT = 6; // px below which it expands again

function initCondense(header: HTMLElement) {
  if (header.dataset.condenseReady === "true") return;
  header.dataset.condenseReady = "true";

  let condensed = false;
  let ticking = false;

  function update() {
    ticking = false;
    const y = window.scrollY;
    if (!condensed && y > CONDENSE_AT) {
      condensed = true;
      header.classList.add("is-condensed");
    } else if (condensed && y < EXPAND_AT) {
      condensed = false;
      header.classList.remove("is-condensed");
    }
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  update();
  window.addEventListener("scroll", onScroll, { passive: true });

  // The pinned header floats over the page, so any *other* sticky element
  // (the year rows on /travel) must dock below it, not under it. Publish the
  // header's stuck height — the pill row plus its condensed top padding
  // (0.55rem, keep in sync with .page-header--condense.is-condensed) and a
  // small breathing gap — as a CSS variable scoped to the page's <main>.
  const row = header.querySelector<HTMLElement>(".header-row");
  const scope = header.closest<HTMLElement>("main");
  if (row && scope) {
    const rem =
      parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const publish = () => {
      const offset = Math.round(row.offsetHeight + 1.05 * rem); // 0.55rem pad + 0.5rem gap
      scope.style.setProperty("--sticky-header-offset", `${offset}px`);
    };
    publish();
    new ResizeObserver(publish).observe(row);
  }
}

function initAll() {
  document
    .querySelectorAll<HTMLElement>(".page-header--condense")
    .forEach(initCondense);
}

initAll();
document.addEventListener("astro:page-load", initAll);

export {};
