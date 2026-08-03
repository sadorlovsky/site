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

function initMagnet(button: HTMLButtonElement) {
  if (button.dataset.magnet === "ready") return;
  button.dataset.magnet = "ready";

  // Track the pointer across the whole card so the button reacts as the cursor
  // approaches; the radius check keeps the pull local.
  const scope = button.closest<HTMLElement>("article") ?? button;

  const current = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  let running = false;

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
    }
  }

  function kick() {
    if (!running) {
      running = true;
      requestAnimationFrame(animate);
    }
  }

  scope.addEventListener("pointermove", (e) => {
    // Received items and other people's reservations render a disabled (or
    // hidden) button — it shouldn't twitch under the cursor.
    if (button.disabled) {
      target.x = 0;
      target.y = 0;
      kick();
      return;
    }
    const rect = button.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
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
