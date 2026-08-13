// Cursor magnetism for the wishlist Reserve button — see @client/magnet.ts for
// the behaviour and the numbers. The pointer is tracked across the whole card
// so the button reacts as the cursor approaches it, and a received item or
// somebody else's reservation renders it disabled, which holds it still.

import { initMagnet } from "@client/magnet";

function initAll() {
  document
    .querySelectorAll<HTMLButtonElement>(".reserve-btn")
    .forEach((button) => {
      initMagnet(button, {
        scope: button.closest<HTMLElement>("article"),
        inert: () => button.disabled,
      });
    });
}

initAll();
document.addEventListener("astro:page-load", initAll);

export {};
