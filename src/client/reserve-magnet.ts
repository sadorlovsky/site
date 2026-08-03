// Magnetic pull for the wishlist Reserve button — the same cursor magnetism as
// the magnetic glass dock, the language switcher and the breadcrumb home glyph.
// The pointer is tracked across the whole card so the button reacts as the
// cursor approaches; the radius check keeps the pull local.

import { magnetize } from "@client/magnet";

function initAll() {
  document
    .querySelectorAll<HTMLButtonElement>(".reserve-btn")
    .forEach((button) => {
      magnetize(button, {
        scope: button.closest<HTMLElement>("article"),
        // Received items and other people's reservations render a disabled (or
        // hidden) button — it shouldn't twitch under the cursor.
        isInert: () => button.disabled,
      });
    });
}

initAll();
document.addEventListener("astro:page-load", initAll);

export {};
