// Cursor magnetism for the breadcrumb's steps — see @client/magnet.ts for the
// behaviour and the numbers. The pointer is tracked across the whole header row
// so a step reacts as the cursor approaches it rather than only once the cursor
// is on it.
//
// Both the house and the parent link, because both are capsules you can press;
// the current page's crumb is deliberately left out, since it goes nowhere.

import { initMagnet } from "@client/magnet";

function initAll() {
  document
    .querySelectorAll<HTMLElement>(".crumb-home, .crumb-link")
    .forEach((step) => {
      initMagnet(step, {
        scope:
          step.closest<HTMLElement>(".header-row") ??
          step.closest<HTMLElement>(".crumbs") ??
          step,
      });
    });
}

initAll();
document.addEventListener("astro:page-load", initAll);

export {};
