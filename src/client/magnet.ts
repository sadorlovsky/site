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

  tracked.addEventListener("pointermove", (e) => {
    if (inert?.()) {
      rest();
      return;
    }
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
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
