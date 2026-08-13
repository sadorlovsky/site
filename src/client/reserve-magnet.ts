// Magnetic pull for the wishlist Reserve button — the same cursor magnetism as
// the magnetic glass dock (nav-dock.ts), the language switcher and the
// breadcrumb home glyph (crumb-home-magnet.ts). The button drifts toward the
// pointer while it's within range, easing back to centre on leave. Smoothing
// mirrors the lerp + requestAnimationFrame approach used elsewhere.

const MAGNET_STRENGTH = 0.35; // Fraction of cursor offset applied to the button
const MAGNET_MAX = 6; // Max px the button can drift toward the cursor
const MAGNET_RADIUS = 90; // Cursor distance (px) at which the pull starts
const SMOOTH = 0.18; // lerp factor toward the target offset

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

/**
 * Bumped whenever anything could have moved a button on screen.
 *
 * A button's position changes when the page scrolls or resizes — never because
 * the cursor moved. Reading it on every pointermove meant calling
 * getBoundingClientRect immediately after the animation frame had written
 * `style.transform` to the same element, which is a read straight after a
 * write: the browser has to flush layout before it can answer. That is a
 * forced reflow in the hottest path on the page, once per mouse movement.
 */
let geometryEpoch = 0;
const invalidateGeometry = () => {
  geometryEpoch += 1;
};
window.addEventListener("scroll", invalidateGeometry, { passive: true });
window.addEventListener("resize", invalidateGeometry, { passive: true });

function initMagnet(button: HTMLButtonElement) {
  if (button.dataset.magnet === "ready") return;
  button.dataset.magnet = "ready";

  // Track the pointer across the whole card so the button reacts as the cursor
  // approaches; the radius check keeps the pull local.
  const scope = button.closest<HTMLElement>("article") ?? button;

  const current = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  let running = false;

  /** The button's centre with any magnetic drift taken back out. */
  const centre = { x: 0, y: 0 };
  let centreEpoch = -1;

  function readCentre() {
    const rect = button.getBoundingClientRect();
    // Subtracting the current offset gives the centre the button would have at
    // rest. Measuring the drifted position instead fed the pull back into
    // itself: the closer the button came to the cursor, the closer its centre
    // appeared to be, and the target shrank as it travelled.
    centre.x = rect.left + rect.width / 2 - current.x;
    centre.y = rect.top + rect.height / 2 - current.y;
    centreEpoch = geometryEpoch;
  }

  function animate() {
    current.x = lerp(current.x, target.x, SMOOTH);
    current.y = lerp(current.y, target.y, SMOOTH);
    button.style.transform = `translate(${current.x}px, ${current.y}px)`;
    if (
      Math.abs(current.x - target.x) > 0.05 ||
      Math.abs(current.y - target.y) > 0.05
    ) {
      requestAnimationFrame(animate);
    } else {
      running = false;
      // Hand the layer back. Held permanently — as `will-change: transform` in
      // the stylesheet did — this promoted all 57 buttons on the page to
      // compositor layers for the whole session, to pay for an animation that
      // only ever runs under the cursor.
      button.style.willChange = "";
    }
  }

  function kick() {
    if (!running) {
      running = true;
      requestAnimationFrame(animate);
    }
  }

  // The layer is asked for on the way in, a frame or more before the first
  // transform lands, so the compositor has time to prepare it — requesting it
  // in the same breath as the change is most of the way to not asking at all.
  scope.addEventListener("pointerenter", () => {
    if (button.disabled) return;
    button.style.willChange = "transform";
    readCentre();
  });

  // The card lifts 8px when the cursor arrives, over 0.4s, and the centre read
  // on pointerenter is the one it had before it moved — so every frame of the
  // hover pulls toward a point up to 8px below where the button now is, and
  // only a scroll or a resize would ever correct it. Take the reading again
  // once the lift has landed, through the same channel a scroll uses.
  scope.addEventListener("transitionend", (event) => {
    if (
      event.target === scope &&
      !event.pseudoElement &&
      event.propertyName === "transform"
    ) {
      centreEpoch = -1;
    }
  });

  scope.addEventListener("pointermove", (e) => {
    // Received items and other people's reservations render a disabled (or
    // hidden) button — it shouldn't twitch under the cursor.
    if (button.disabled) {
      target.x = 0;
      target.y = 0;
      kick();
      return;
    }
    if (centreEpoch !== geometryEpoch) readCentre();
    const dx = e.clientX - centre.x;
    const dy = e.clientY - centre.y;
    if (Math.hypot(dx, dy) < MAGNET_RADIUS) {
      target.x = Math.max(
        -MAGNET_MAX,
        Math.min(MAGNET_MAX, dx * MAGNET_STRENGTH),
      );
      target.y = Math.max(
        -MAGNET_MAX,
        Math.min(MAGNET_MAX, dy * MAGNET_STRENGTH),
      );
    } else {
      target.x = 0;
      target.y = 0;
    }
    kick();
  });

  scope.addEventListener("pointerleave", () => {
    target.x = 0;
    target.y = 0;
    kick();
  });
}

function initAll() {
  if (prefersReducedMotion) return;
  document
    .querySelectorAll<HTMLButtonElement>(".reserve-btn")
    .forEach(initMagnet);
}

initAll();
document.addEventListener("astro:page-load", initAll);

export {};
