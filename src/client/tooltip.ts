// Tooltips — a bead of the same liquid glass as the rest of the chrome, trailing
// the cursor.
//
// Two things this fixes over an element-anchored tooltip:
//
// 1. It doesn't blink. `mouseenter`/`mouseleave` fire per element, so crossing
//    into a trigger's own child (the <svg> inside an icon button) used to read
//    as leaving the trigger and hide the tooltip, over and over. Delegation now
//    runs on pointerover/pointerout, which bubble and carry `relatedTarget`, so
//    movement *within* a trigger is ignored entirely.
//
// 2. It isn't pinned to a box. Anchored to the element, a tooltip goes stale the
//    moment the page moves under it — the wishlist cards lift 8px on hover, and
//    the tooltip stayed where the card used to be. Following the pointer sidesteps
//    that, and the bead eases toward the cursor on the same lerp as the magnetic
//    dock, so it trails rather than snaps.
//
// Keyboard focus has no cursor, so that path stays anchored to the element via
// Floating UI.

import { computePosition, flip, shift, offset } from "@floating-ui/dom";

const CURSOR_GAP = 18; // px between the pointer and the bead
const EDGE = 8; // keep-out from the viewport edges
const SMOOTH = 0.18; // lerp factor — the chrome's cursor-magnetism easing

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

let initialized = false;
let tooltipEl: HTMLElement | null = null;
let currentTrigger: HTMLElement | null = null;

/** Where the pointer is, where the bead is, and how big the bead is. */
const pointer = { x: 0, y: 0 };
const current = { x: 0, y: 0 };
const size = { w: 0, h: 0 };
let following = false;
let running = false;

function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function createTooltipElements() {
  if (tooltipEl) return;

  tooltipEl = document.createElement("div");
  tooltipEl.className = "floating-tooltip";
  tooltipEl.setAttribute("role", "tooltip");

  document.body.appendChild(tooltipEl);
}

/** Resting place for the bead: centred above the pointer, inside the viewport. */
function targetPosition() {
  const x = clamp(
    pointer.x - size.w / 2,
    EDGE,
    Math.max(EDGE, window.innerWidth - size.w - EDGE),
  );
  // Not enough headroom? Hang it below the cursor instead.
  const above = pointer.y - CURSOR_GAP - size.h;
  const y = clamp(
    above < EDGE ? pointer.y + CURSOR_GAP : above,
    EDGE,
    Math.max(EDGE, window.innerHeight - size.h - EDGE),
  );
  return { x, y };
}

function render() {
  if (!tooltipEl) return;
  // The scale comes from --tooltip-scale so CSS can animate the entrance while
  // this keeps writing the position — one transform, one element, frost intact.
  tooltipEl.style.transform = `translate3d(${Math.round(current.x)}px, ${Math.round(current.y)}px, 0) scale(var(--tooltip-scale))`;
}

function animate() {
  const target = targetPosition();
  current.x = lerp(current.x, target.x, SMOOTH);
  current.y = lerp(current.y, target.y, SMOOTH);
  render();

  if (
    following &&
    (Math.abs(current.x - target.x) > 0.05 ||
      Math.abs(current.y - target.y) > 0.05)
  ) {
    requestAnimationFrame(animate);
  } else {
    running = false;
  }
}

function kick() {
  if (running || !following) return;
  running = true;
  requestAnimationFrame(animate);
}

/* offset* rather than getBoundingClientRect: the bead is scaled while hidden,
   and layout size is what the placement maths needs. */
function measure() {
  if (!tooltipEl) return;
  size.w = tooltipEl.offsetWidth;
  size.h = tooltipEl.offsetHeight;
}

/** Keyboard path: no cursor to follow, so pin the bead to the element. */
function anchorTo(trigger: HTMLElement) {
  if (!tooltipEl) return;
  following = false;
  computePosition(trigger, tooltipEl, {
    strategy: "fixed",
    placement: "top",
    middleware: [
      offset(CURSOR_GAP - 8),
      flip({ fallbackPlacements: ["bottom", "left", "right"] }),
      shift({ padding: EDGE }),
    ],
  }).then(({ x, y }) => {
    current.x = x;
    current.y = y;
    render();
  });
}

function showTooltip(trigger: HTMLElement, fromPointer: boolean) {
  const text = trigger.getAttribute("data-tooltip");
  if (!tooltipEl) return;
  // An empty label is a trigger that has nothing to say (the price drops its
  // tooltip in Russian) — never leave the previous bead hanging there.
  if (!text) {
    hideTooltip();
    return;
  }

  currentTrigger = trigger;
  tooltipEl.textContent = text;
  measure();

  if (fromPointer) {
    following = true;
    const target = targetPosition();
    // A bead handed over from another trigger glides across; a fresh one
    // materialises where it belongs instead of flying in from the last corner.
    if (!tooltipEl.hasAttribute("data-visible") || prefersReducedMotion) {
      current.x = target.x;
      current.y = target.y;
    }
    render();
    tooltipEl.setAttribute("data-visible", "");
    kick();
  } else {
    tooltipEl.setAttribute("data-visible", "");
    anchorTo(trigger);
  }
}

function hideTooltip() {
  following = false;
  currentTrigger = null;
  tooltipEl?.removeAttribute("data-visible");
}

function triggerOf(node: EventTarget | null): HTMLElement | null {
  if (!(node instanceof Element)) return null;
  return node.closest<HTMLElement>("[data-tooltip]");
}

function handlePointerOver(e: PointerEvent) {
  // Touch has no hovering cursor: a tooltip would just hang around after a tap.
  if (e.pointerType === "touch") return;
  const trigger = triggerOf(e.target);
  if (!trigger) return;
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  if (trigger !== currentTrigger) showTooltip(trigger, true);
}

function handlePointerOut(e: PointerEvent) {
  if (!currentTrigger) return;
  if (triggerOf(e.target) !== currentTrigger) return;
  const next = triggerOf(e.relatedTarget);
  // Moving deeper into the same trigger isn't leaving it.
  if (next === currentTrigger) return;
  // Handing over to a neighbouring trigger: leave the bead up and let the
  // pointerover that follows swap the label, so it glides across instead of
  // blinking out and back in.
  if (next) return;
  hideTooltip();
}

function handlePointerMove(e: PointerEvent) {
  if (!following) return;
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  if (prefersReducedMotion) {
    const target = targetPosition();
    current.x = target.x;
    current.y = target.y;
    render();
    return;
  }
  kick();
}

function handleFocusIn(e: Event) {
  const target = e.target as HTMLElement;
  if (target.hasAttribute("data-tooltip")) {
    showTooltip(target, false);
  }
}

function handleFocusOut(e: Event) {
  if (e.target === currentTrigger) hideTooltip();
}

export function initTooltips() {
  if (initialized) return;
  initialized = true;

  createTooltipElements();

  // pointerover/pointerout bubble, so one listener each covers every trigger.
  // All six are on the document, which survives a client-side navigation
  // intact — and they are delegated, so they pick up the incoming page's
  // triggers with nothing to re-bind. That is why this whole function is a
  // one-time singleton and stays one: re-running it per page would only stack
  // duplicate handlers on the same document.
  document.addEventListener("pointerover", handlePointerOver);
  document.addEventListener("pointerout", handlePointerOut);
  document.addEventListener("pointermove", handlePointerMove, {
    passive: true,
  });
  document.addEventListener("focusin", handleFocusIn);
  document.addEventListener("focusout", handleFocusOut);

  // The trigger can slide out from under a pinned bead while the page scrolls.
  document.addEventListener("scroll", hideTooltip, true);

  // The one thing that does not survive: the bead is parented to <body>, and
  // the swap replaces <body> wholesale. Left alone, tooltips would work on the
  // first page of a session and silently do nothing on every page after it —
  // the listeners still fire, they just write into a detached div. Hiding it
  // before the swap also keeps a bead that happens to be up at the moment of a
  // click from riding over the outgoing page.
  document.addEventListener("astro:before-swap", hideTooltip);
  document.addEventListener("astro:after-swap", () => {
    if (tooltipEl && !tooltipEl.isConnected) {
      document.body.appendChild(tooltipEl);
    }
  });
}
