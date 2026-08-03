// Magnetic pull for the wishlist filter row — category chips, the "All" pill
// and the random-item button, all wearing the chrome's liquid-glass capsule.
// Each control is pulled toward the cursor like the dock's items.
//
// Touch only: skipped. Without a hovering cursor there is nothing to be pulled
// toward, and the inline transform would override the chips' tap-scale
// feedback (.mobile-filter-categories .kit-toggle-item:active).

import { hasFinePointer, magnetize } from "@client/magnet";

const CONTROLS = [
  ".filter-categories .kit-toggle-item",
  ".mobile-filter-categories .kit-toggle-item",
  ".filter-all-btn",
  ".mobile-filter-all-btn",
  ".filter-random",
  ".mobile-filter-random",
].join(", ");

function initAll() {
  if (!hasFinePointer) return;
  document.querySelectorAll<HTMLElement>(CONTROLS).forEach((el) => {
    magnetize(el, {
      // Track the pointer across the whole filter row so a chip starts moving
      // as the cursor sweeps toward it.
      scope:
        el.closest<HTMLElement>(".filters") ??
        el.closest<HTMLElement>(".mobile-filter-bar-inner"),
      isInert: () =>
        (el as HTMLButtonElement).disabled ||
        el.getAttribute("aria-disabled") === "true" ||
        // Stand down while the row is being drag-scrolled.
        el.closest(".is-dragging") !== null,
    });
  });
}

initAll();
document.addEventListener("astro:page-load", initAll);

export {};
