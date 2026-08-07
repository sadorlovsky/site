// Magnetic glass dock behaviour, shared by the home nav and the page header.
// - A gradient indicator slides behind the hovered item ("magic line").
// - If an item starts active (.is-active), the indicator rests there and
//   returns to it when the pointer leaves.
// - Each item is subtly pulled toward the cursor (magnetic hover).
// Smoothing mirrors the lerp + requestAnimationFrame approach used by eye-moving.ts.

const MAGNET_STRENGTH = 0.35; // Fraction of cursor offset applied to an item
const MAGNET_MAX = 6; // Max px an item can drift toward the cursor
const MAGNET_RADIUS = 90; // Cursor distance (px) at which the pull starts
const SMOOTH = 0.18; // lerp factor toward the target offset

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

interface DockItemState {
  el: HTMLElement;
  current: { x: number; y: number };
  target: { x: number; y: number };
}

function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

function initDock(dock: HTMLElement) {
  // Guard against double-init: this module is evaluated as the body is parsed
  // and astro:page-load fires again on window load with the same dock still in
  // place. Every listener below would otherwise be attached twice.
  if (dock.dataset.dockReady === "ready") return;
  dock.dataset.dockReady = "ready";

  const indicator = dock.querySelector<HTMLElement>(".dock-indicator");
  const items: DockItemState[] = Array.from(
    dock.querySelectorAll<HTMLElement>(".dock-item"),
  ).map((el) => ({
    el,
    current: { x: 0, y: 0 },
    target: { x: 0, y: 0 },
  }));

  // The item the indicator rests on when nothing is hovered (e.g. current page).
  const defaultActive =
    dock.querySelector<HTMLElement>(".dock-item.is-active") ?? null;
  let activeItem: HTMLElement | null = null;

  function moveIndicatorTo(el: HTMLElement) {
    if (!indicator) return;
    indicator.style.setProperty("--dock-x", `${el.offsetLeft}px`);
    indicator.style.setProperty("--dock-y", `${el.offsetTop}px`);
    indicator.style.setProperty("--dock-w", `${el.offsetWidth}px`);
    indicator.style.setProperty("--dock-h", `${el.offsetHeight}px`);
  }

  function setActive(el: HTMLElement | null) {
    // Falling back to the default keeps the indicator on the current page.
    const next = el ?? defaultActive;
    if (activeItem === next) return;
    activeItem?.classList.remove("is-active");
    activeItem = next;
    if (next) {
      next.classList.add("is-active");
      moveIndicatorTo(next);
      dock.setAttribute("data-active", "");
    } else {
      dock.removeAttribute("data-active");
    }
  }

  // Indicator follows whichever item the pointer is over (or has focus).
  for (const { el } of items) {
    el.addEventListener("pointerenter", () => setActive(el));
    el.addEventListener("focus", () => setActive(el));
  }
  dock.addEventListener("pointerleave", () => setActive(null));
  dock.addEventListener("focusout", (e) => {
    if (!dock.contains(e.relatedTarget as Node)) setActive(null);
  });

  // Rest on the current page's item from the start.
  if (defaultActive) setActive(defaultActive);

  if (prefersReducedMotion) return;

  // Magnetic pull toward the cursor.
  let running = false;

  function animate() {
    let needsUpdate = false;
    for (const item of items) {
      item.current.x = lerp(item.current.x, item.target.x, SMOOTH);
      item.current.y = lerp(item.current.y, item.target.y, SMOOTH);
      if (
        Math.abs(item.current.x - item.target.x) > 0.05 ||
        Math.abs(item.current.y - item.target.y) > 0.05
      ) {
        needsUpdate = true;
      }
      item.el.style.transform = `translate(${item.current.x}px, ${item.current.y}px)`;
    }
    if (needsUpdate) {
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

  dock.addEventListener("pointermove", (e) => {
    for (const item of items) {
      const rect = item.el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const distance = Math.hypot(dx, dy);
      if (distance < MAGNET_RADIUS) {
        item.target.x = Math.max(
          -MAGNET_MAX,
          Math.min(MAGNET_MAX, dx * MAGNET_STRENGTH),
        );
        item.target.y = Math.max(
          -MAGNET_MAX,
          Math.min(MAGNET_MAX, dy * MAGNET_STRENGTH),
        );
      } else {
        item.target.x = 0;
        item.target.y = 0;
      }
    }
    kick();
  });

  dock.addEventListener("pointerleave", () => {
    for (const item of items) {
      item.target.x = 0;
      item.target.y = 0;
    }
    kick();
  });

  // Keep the indicator aligned if the dock reflows (e.g. orientation change).
  //
  // Every other listener in here is on the dock or its items and goes out with
  // them when the page is swapped. This one is on the window, which outlives
  // the page, so it has to be handed back explicitly — otherwise each visit to
  // a page with a dock leaves another resize handler behind, each one pinning
  // a detached dock and writing custom properties into it forever.
  const realign = () => {
    if (activeItem) moveIndicatorTo(activeItem);
  };
  window.addEventListener("resize", realign);
  document.addEventListener(
    "astro:before-swap",
    () => window.removeEventListener("resize", realign),
    { once: true },
  );
}

function initAll() {
  document.querySelectorAll<HTMLElement>("[data-dock]").forEach(initDock);
}

initAll();
document.addEventListener("astro:page-load", initAll);

export {};
