// Sliding gradient indicator + magnetic hover for the language switcher —
// the same "magic line" effect as the home-page magnetic glass dock
// (see nav-dock.ts). The indicator slides behind whichever button is hovered or
// focused and rests on the active-language button, returning there on leave. It
// re-homes when the language changes (the LangSwitcher inline script dispatches
// a "lang-change" event after updating aria-pressed).

const MAGNET_STRENGTH = 0.35; // Fraction of cursor offset applied to a button
const MAGNET_MAX = 6; // Max px a button can drift toward the cursor
const MAGNET_RADIUS = 90; // Cursor distance (px) at which the pull starts
const SMOOTH = 0.18; // lerp factor toward the target offset

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

interface ItemState {
  el: HTMLElement;
  current: { x: number; y: number };
  target: { x: number; y: number };
}

function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

function initSwitcher(group: HTMLElement) {
  // Guard against double-init (module eval + astro:page-load).
  if (group.dataset.langDock === "ready") return;
  group.dataset.langDock = "ready";

  const indicator = group.querySelector<HTMLElement>(
    ".lang-switcher__indicator",
  );
  // Not `.is-unavailable`. That one is a `<span>` standing in for a language
  // this post was never written in; sliding the gradient under it and marking
  // it active is the switcher saying a language was selected, and the magnetic
  // pull is the switcher saying it can be pressed. Neither is true.
  const items: ItemState[] = Array.from(
    group.querySelectorAll<HTMLElement>(
      ".lang-switcher__btn:not(.is-unavailable)",
    ),
  ).map((el) => ({ el, current: { x: 0, y: 0 }, target: { x: 0, y: 0 } }));

  // The item for the currently-selected language. In the switcher's runtime
  // mode that is a button reflecting the stored preference with aria-pressed;
  // in its link mode — a blog post, which exists once per language — it is the
  // anchor for the page you are already on, and a link says that with
  // aria-current rather than by claiming to be pressed.
  function activeLangButton(): HTMLElement | null {
    return (
      group.querySelector<HTMLElement>(
        '.lang-switcher__btn[aria-pressed="true"], .lang-switcher__btn[aria-current="page"]',
      ) ??
      items[0]?.el ??
      null
    );
  }

  let activeItem: HTMLElement | null = null;

  function moveIndicatorTo(el: HTMLElement) {
    if (!indicator) return;
    indicator.style.setProperty("--ind-x", `${el.offsetLeft}px`);
    indicator.style.setProperty("--ind-y", `${el.offsetTop}px`);
    indicator.style.setProperty("--ind-w", `${el.offsetWidth}px`);
    indicator.style.setProperty("--ind-h", `${el.offsetHeight}px`);
  }

  function setActive(el: HTMLElement | null) {
    // Falling back to the active language keeps the indicator home on leave.
    const next = el ?? activeLangButton();
    if (activeItem === next) return;
    // Authoritative: only `next` carries is-active, never a stale sibling.
    for (const item of items) {
      item.el.classList.toggle("is-active", item.el === next);
    }
    activeItem = next;
    if (next) {
      moveIndicatorTo(next);
      group.setAttribute("data-active", "");
    } else {
      group.removeAttribute("data-active");
    }
  }

  // Indicator follows whichever button the pointer is over (or has focus).
  for (const { el } of items) {
    el.addEventListener("pointerenter", () => setActive(el));
    el.addEventListener("focus", () => setActive(el));
  }
  group.addEventListener("pointerleave", () => setActive(null));
  group.addEventListener("focusout", (e) => {
    if (!group.contains(e.relatedTarget as Node)) setActive(null);
  });

  // Rest on the active language from the start, and re-home when it changes.
  setActive(activeLangButton());
  window.addEventListener("lang-change", () => {
    // Re-home onto the newly-selected language (aria-pressed already updated).
    setActive(activeLangButton());
  });

  // Keep the indicator aligned if the switcher reflows.
  window.addEventListener("resize", () => {
    if (activeItem) moveIndicatorTo(activeItem);
  });

  if (prefersReducedMotion) return;

  // Magnetic pull toward the cursor (same feel as the dock).
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

  group.addEventListener("pointermove", (e) => {
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

  group.addEventListener("pointerleave", () => {
    for (const item of items) {
      item.target.x = 0;
      item.target.y = 0;
    }
    kick();
  });
}

function initAll() {
  document
    .querySelectorAll<HTMLElement>(".lang-switcher")
    .forEach(initSwitcher);
}

initAll();
document.addEventListener("astro:page-load", initAll);

export {};
