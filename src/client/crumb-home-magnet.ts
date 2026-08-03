// Magnetic pull for the breadcrumb home button — the same cursor magnetism as
// the magnetic glass dock (nav-dock.ts) and the language switcher. The pointer
// is tracked across the whole header row so the glyph reacts as the cursor
// approaches; the radius check keeps the pull local.

import { magnetize } from "@client/magnet";

function initAll() {
  document.querySelectorAll<HTMLElement>(".crumb-home").forEach((home) => {
    magnetize(home, {
      scope:
        home.closest<HTMLElement>(".header-row") ??
        home.closest<HTMLElement>(".crumbs"),
    });
  });
}

initAll();
document.addEventListener("astro:page-load", initAll);

export {};
