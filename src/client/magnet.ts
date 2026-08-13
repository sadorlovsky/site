// Cursor magnetism: an element eases toward the pointer while the pointer is
// near it, and eases back to rest when it leaves.
//
// The idiom is already the site's — the magnetic glass dock (nav-dock.ts) and
// the language switcher move their indicators this way, and the breadcrumb
// home glyph and the wishlist's Reserve button had each grown their own copy
// of it. This is that copy, once, with the two differences between them turned
// into options: where the pointer is tracked, and whether the element is
// currently allowed to move at all.
//
// The pull is deliberately small. It says the thing is aware of where you are;
// it is not a control that follows you around. Six pixels is far enough to
// read as life and too little to move anything out from under a click.

const STRENGTH = 0.35; // Fraction of the cursor's offset applied to the element
const MAX = 6; // Furthest it may drift from rest, px
const RADIUS = 90; // Cursor distance at which the pull starts, px
const SMOOTH = 0.18; // lerp factor toward the target offset

export interface MagnetOptions {
  /** Where the pointer is tracked. Wider than the element itself, normally, so
      it reacts as the cursor approaches rather than only once it has arrived —
      the radius check below is what keeps the pull local. Defaults to the
      element, which makes it a hover effect instead. */
  scope?: HTMLElement | null;
  /** Held at rest while this returns true. A disabled button should not twitch
      under a cursor that cannot press it. */
  inert?: () => boolean;
  strength?: number;
  max?: number;
  radius?: number;
  smooth?: number;
}

export const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

/**
 * Bumped whenever anything could have moved a magnet on screen.
 *
 * An element's resting position changes when the page scrolls or resizes —
 * never because the cursor moved. Measuring it on every pointermove meant
 * calling getBoundingClientRect immediately after the animation frame had
 * written `style.transform` to the same element, which is a read straight after
 * a write: the browser has to flush layout before it can answer. That is a
 * forced reflow in the hottest path on the page, once per mouse movement, and
 * the wishlist has 57 of these on it.
 */
let geometryEpoch = 0;
const invalidateGeometry = () => {
  geometryEpoch += 1;
};
window.addEventListener("scroll", invalidateGeometry, { passive: true });
window.addEventListener("resize", invalidateGeometry, { passive: true });

/** Wire one element up to the cursor. Safe to call again on the same element —
    a page-load handler re-running over a document that was never replaced must
    not leave two loops fighting over one transform. */
export function initMagnet(el: HTMLElement, options: MagnetOptions = {}): void {
  if (prefersReducedMotion) return;
  if (el.dataset.magnet === "ready") return;
  el.dataset.magnet = "ready";

  const {
    scope = el,
    inert,
    strength = STRENGTH,
    max = MAX,
    radius = RADIUS,
    smooth = SMOOTH,
  } = options;

  const tracked = scope ?? el;

  const current = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  let running = false;

  /** The element's centre with any magnetic drift taken back out. */
  const centre = { x: 0, y: 0 };
  let centreEpoch = -1;

  function readCentre() {
    const rect = el.getBoundingClientRect();
    // Subtracting the current offset gives the centre the element would have at
    // rest. Measuring the drifted position instead fed the pull back into
    // itself: the closer it came to the cursor, the closer its centre appeared
    // to be, and the target shrank as it travelled.
    centre.x = rect.left + rect.width / 2 - current.x;
    centre.y = rect.top + rect.height / 2 - current.y;
    centreEpoch = geometryEpoch;
  }

  function animate() {
    current.x = lerp(current.x, target.x, smooth);
    current.y = lerp(current.y, target.y, smooth);
    el.style.transform = `translate(${current.x}px, ${current.y}px)`;
    if (
      Math.abs(current.x - target.x) > 0.05 ||
      Math.abs(current.y - target.y) > 0.05
    ) {
      requestAnimationFrame(animate);
    } else {
      running = false;
      // Hand the layer back. Held permanently — as a `will-change: transform`
      // in the stylesheet does — this promotes every magnet on the page to a
      // compositor layer for the whole session, to pay for an animation that
      // only ever runs under the cursor.
      el.style.willChange = "";
    }
  }

  function kick() {
    if (!running) {
      running = true;
      requestAnimationFrame(animate);
    }
  }

  function rest() {
    target.x = 0;
    target.y = 0;
    kick();
  }

  // The layer is asked for on the way in, a frame or more before the first
  // transform lands, so the compositor has time to prepare it — requesting it
  // in the same breath as the change is most of the way to not asking at all.
  // The reading taken here is the one each hover starts from.
  tracked.addEventListener("pointerenter", () => {
    if (inert?.()) return;
    el.style.willChange = "transform";
    readCentre();
  });

  /**
   * A transition inside the scope can move the element without the cursor
   * having moved: a wishlist card lifts 8px when the pointer arrives, over
   * 0.4s, so the reading taken on the way in describes where the button was
   * before the lift, and the pull sits nearly 3px low for the length of the
   * hover. transitionend bubbles, so this catches the scope's own and its
   * children's. The element's own drift is the one that must not count — that
   * is this loop's writing coming back to it.
   */
  tracked.addEventListener("transitionend", (event) => {
    if (event.target === el && event.propertyName === "transform") return;
    centreEpoch = -1;
  });

  tracked.addEventListener("pointermove", (e) => {
    if (inert?.()) {
      rest();
      return;
    }
    if (centreEpoch !== geometryEpoch) readCentre();
    const dx = e.clientX - centre.x;
    const dy = e.clientY - centre.y;
    if (Math.hypot(dx, dy) < radius) {
      target.x = Math.max(-max, Math.min(max, dx * strength));
      target.y = Math.max(-max, Math.min(max, dy * strength));
      kick();
    } else {
      rest();
    }
  });

  tracked.addEventListener("pointerleave", rest);
}
