// Cursor magnetism for the breadcrumb home button — see @client/magnet.ts for
// the behaviour and the numbers. The pointer is tracked across the whole header
// row so the glyph reacts as the cursor approaches it rather than only once the
// cursor is on it.

import { initMagnet } from "@client/magnet";

function initAll() {
  document.querySelectorAll<HTMLElement>(".crumb-home").forEach((home) => {
    initMagnet(home, {
      scope:
        home.closest<HTMLElement>(".header-row") ??
        home.closest<HTMLElement>(".crumbs") ??
        home,
    });
  });
}

initAll();
document.addEventListener("astro:page-load", initAll);

export {};
