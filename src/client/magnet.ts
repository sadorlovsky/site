// Cursor magnetism — the pull shared by every liquid-glass control on the site
// (nav dock, language switcher, breadcrumb home glyph, Reserve pill, filter
// chips). An element drifts toward the pointer while it's within range and
// eases back to centre on leave; smoothing is a lerp driven by
// requestAnimationFrame, the same approach as eye-moving.ts.
//
// The dock and the language switcher keep their own copies: there the magnet is
// interleaved with the sliding-indicator bookkeeping over a whole group.

const STRENGTH = 0.35; // Fraction of cursor offset applied to the element
const MAX = 6; // Max px the element can drift toward the cursor
const RADIUS = 90; // Cursor distance (px) at which the pull starts
const SMOOTH = 0.18; // lerp factor toward the target offset

export const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

/** Touch screens have no hovering cursor to be pulled toward. */
export const hasFinePointer = window.matchMedia(
  "(hover: hover) and (pointer: fine)",
).matches;

interface MagnetOptions {
  /** Element the pointer is tracked across, so the pull starts on approach. */
  scope?: HTMLElement | null;
  /** Skip the pull while this returns true (disabled/hidden controls). */
  isInert?: () => boolean;
}

function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

export function magnetize(el: HTMLElement, options: MagnetOptions = {}): void {
  if (prefersReducedMotion) return;
  // Guard against double-init (module eval + astro:page-load).
  if (el.dataset.magnet === "ready") return;
  el.dataset.magnet = "ready";

  const scope = options.scope ?? el;
  const isInert = options.isInert;

  const current = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  let running = false;

  function animate() {
    current.x = lerp(current.x, target.x, SMOOTH);
    current.y = lerp(current.y, target.y, SMOOTH);
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

  function release() {
    target.x = 0;
    target.y = 0;
    kick();
  }

  scope.addEventListener("pointermove", (e) => {
    if (isInert?.()) {
      release();
      return;
    }
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    if (Math.hypot(dx, dy) < RADIUS) {
      target.x = Math.max(-MAX, Math.min(MAX, dx * STRENGTH));
      target.y = Math.max(-MAX, Math.min(MAX, dy * STRENGTH));
    } else {
      target.x = 0;
      target.y = 0;
    }
    kick();
  });

  scope.addEventListener("pointerleave", release);
}
