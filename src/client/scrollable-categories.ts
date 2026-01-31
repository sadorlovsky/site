/**
 * Shared logic for scrollable category filters.
 * Used by both WishlistFilters and MobileFilterBar.
 */

export interface ScrollableCategoriesOptions {
  /** The scrollable container element */
  scroller: HTMLElement;
  /** Optional wrapper element for edge fade classes (defaults to scroller) */
  wrapper?: HTMLElement;
  /** Selector for active item */
  activeSelector?: string;
}

export interface ScrollableCategoriesInstance {
  /** Update edge fade classes based on scroll position */
  updateEdgeFades: () => void;
  /** Scroll to show active category */
  scrollToActive: () => void;
  /** Clean up event listeners */
  destroy: () => void;
}

export function initScrollableCategories(
  options: ScrollableCategoriesOptions,
): ScrollableCategoriesInstance {
  const {
    scroller,
    wrapper = scroller,
    activeSelector = ".kit-toggle-item.is-active",
  } = options;

  // Drag-to-scroll state
  let isDragging = false;
  let startX = 0;
  let scrollStart = 0;
  let hasDragged = false;

  function updateEdgeFades() {
    const { scrollLeft, scrollWidth, clientWidth } = scroller;
    const threshold = 5;

    const atStart = scrollLeft <= threshold;
    const atEnd = scrollLeft + clientWidth >= scrollWidth - threshold;
    const isScrollable = scrollWidth > clientWidth + threshold;

    wrapper.classList.toggle("at-start", atStart);
    wrapper.classList.toggle("at-end", atEnd);
    scroller.classList.toggle("is-scrollable", isScrollable);
  }

  function scrollToActive() {
    // Find active button at call time (not at init time)
    // This is important for elements that are hidden at init
    const activeBtn = scroller.querySelector<HTMLElement>(activeSelector);
    if (!activeBtn) return;

    // Use offsetLeft for reliable positioning (works even with transforms)
    scroller.scrollLeft = activeBtn.offsetLeft;

    updateEdgeFades();
  }

  // Drag-to-scroll handlers
  function onMouseDown(e: MouseEvent) {
    // Only enable drag on devices with mouse (not touch)
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches)
      return;

    // Only enable drag if content is scrollable
    if (scroller.scrollWidth <= scroller.clientWidth) return;

    // Prevent native link drag
    e.preventDefault();

    isDragging = true;
    hasDragged = false;
    startX = e.pageX;
    scrollStart = scroller.scrollLeft;
    scroller.style.cursor = "grabbing";
    scroller.style.userSelect = "none";
  }

  function onMouseMove(e: MouseEvent) {
    if (!isDragging) return;

    const dx = e.pageX - startX;
    if (Math.abs(dx) > 3) {
      hasDragged = true;
    }
    scroller.scrollLeft = scrollStart - dx;
  }

  function onMouseUp() {
    if (!isDragging) return;
    isDragging = false;
    scroller.style.cursor = "";
    scroller.style.userSelect = "";
  }

  function onClickCapture(e: MouseEvent) {
    // Prevent click on links if we were dragging
    if (hasDragged) {
      e.preventDefault();
      e.stopPropagation();
      hasDragged = false;
    }
  }

  // Set up event listeners
  scroller.addEventListener("scroll", updateEdgeFades, { passive: true });
  scroller.addEventListener("mousedown", onMouseDown);
  scroller.addEventListener("click", onClickCapture, true);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);

  // Initial state
  updateEdgeFades();

  return {
    updateEdgeFades,
    scrollToActive,
    destroy() {
      scroller.removeEventListener("scroll", updateEdgeFades);
      scroller.removeEventListener("mousedown", onMouseDown);
      scroller.removeEventListener("click", onClickCapture, true);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    },
  };
}
