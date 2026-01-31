import { computePosition, flip, shift, offset, arrow } from "@floating-ui/dom";

const TOOLTIP_OFFSET = 6;
const ARROW_SIZE = 5;

let initialized = false;
let tooltipEl: HTMLElement | null = null;
let arrowEl: HTMLElement | null = null;
let currentTrigger: HTMLElement | null = null;

function createTooltipElements() {
  if (tooltipEl) return;

  tooltipEl = document.createElement("div");
  tooltipEl.className = "floating-tooltip";
  tooltipEl.setAttribute("role", "tooltip");

  arrowEl = document.createElement("div");
  arrowEl.className = "floating-tooltip-arrow";
  tooltipEl.appendChild(arrowEl);

  document.body.appendChild(tooltipEl);
}

function showTooltip(trigger: HTMLElement) {
  const text = trigger.getAttribute("data-tooltip");
  if (!text || !tooltipEl || !arrowEl) return;

  currentTrigger = trigger;

  // Set text content (arrow is first child, text comes after)
  const textNode = tooltipEl.childNodes[1];
  if (textNode) {
    textNode.textContent = text;
  } else {
    tooltipEl.appendChild(document.createTextNode(text));
  }

  tooltipEl.style.display = "block";

  computePosition(trigger, tooltipEl, {
    placement: "top",
    middleware: [
      offset(TOOLTIP_OFFSET + ARROW_SIZE),
      flip({ fallbackPlacements: ["bottom", "left", "right"] }),
      shift({ padding: 8 }),
      arrow({ element: arrowEl }),
    ],
  }).then(({ x, y, placement, middlewareData }) => {
    if (!tooltipEl || !arrowEl) return;

    Object.assign(tooltipEl.style, {
      left: `${x}px`,
      top: `${y}px`,
    });

    // Position arrow
    const arrowData = middlewareData.arrow;
    const staticSide = {
      top: "bottom",
      right: "left",
      bottom: "top",
      left: "right",
    }[placement.split("-")[0]] as string;

    Object.assign(arrowEl.style, {
      left: arrowData?.x != null ? `${arrowData.x}px` : "",
      top: arrowData?.y != null ? `${arrowData.y}px` : "",
      right: "",
      bottom: "",
      [staticSide]: `-${ARROW_SIZE}px`,
    });

    // Set arrow direction class
    arrowEl.className = `floating-tooltip-arrow floating-tooltip-arrow--${staticSide}`;
  });
}

function hideTooltip() {
  if (tooltipEl) {
    tooltipEl.style.display = "none";
  }
  currentTrigger = null;
}

function handleMouseEnter(e: Event) {
  const target = e.target as HTMLElement;
  const trigger = target.closest("[data-tooltip]") as HTMLElement | null;
  if (trigger) {
    showTooltip(trigger);
  }
}

function handleMouseLeave(e: Event) {
  const target = e.target as HTMLElement;
  const trigger = target.closest("[data-tooltip]") as HTMLElement | null;
  if (trigger && trigger === currentTrigger) {
    hideTooltip();
  }
}

function handleFocusIn(e: Event) {
  const target = e.target as HTMLElement;
  if (target.hasAttribute("data-tooltip")) {
    showTooltip(target);
  }
}

function handleFocusOut(e: Event) {
  const target = e.target as HTMLElement;
  if (target === currentTrigger) {
    hideTooltip();
  }
}

export function initTooltips() {
  if (initialized) return;
  initialized = true;

  createTooltipElements();

  // Use event delegation for better performance
  document.addEventListener("mouseenter", handleMouseEnter, true);
  document.addEventListener("mouseleave", handleMouseLeave, true);
  document.addEventListener("focusin", handleFocusIn);
  document.addEventListener("focusout", handleFocusOut);

  // Hide tooltip on scroll to prevent stale positioning
  document.addEventListener("scroll", hideTooltip, true);
}
