/**
 * Shared logic for scrollable category filters.
 * Used by both WishlistFilters and MobileFilterBar.
 */

/**
 * Scroll positioning mode for active element:
 * - "center": Center the active element in the visible area
 * - "minimal": Only scroll if element is not visible, show with small padding from edge
 * - "minimal-peek": Like minimal, but always ensures peek of prev/next elements
 * - "start": Always align active element to the left edge
 */
export type ScrollMode = "center" | "minimal" | "minimal-peek" | "start";

export interface ScrollableCategoriesOptions {
  /** The scrollable container element */
  scroller: HTMLElement;
  /** Optional wrapper element for edge fade classes (defaults to scroller) */
  wrapper?: HTMLElement;
  /** Selector for active item */
  activeSelector?: string;
  /** Scroll positioning mode (default: "center") */
  scrollMode?: ScrollMode;
}

export interface ScrollableCategoriesInstance {
  /** Update edge fade classes based on scroll position */
  updateEdgeFades: () => void;
  /** Scroll to show active category (centered in view) */
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
    scrollMode = "center",
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

  /**
   * Scroll to show the active category based on scrollMode.
   * Uses requestAnimationFrame to ensure DOM is ready.
   */
  function scrollToActive() {
    // Use rAF to ensure element positions are calculated after layout
    requestAnimationFrame(() => {
      const activeBtn = scroller.querySelector<HTMLElement>(activeSelector);
      if (!activeBtn) return;

      const scrollerWidth = scroller.clientWidth;
      const scrollerScrollWidth = scroller.scrollWidth;

      // If content doesn't overflow, no scrolling needed
      if (scrollerScrollWidth <= scrollerWidth) {
        updateEdgeFades();
        return;
      }

      // Get position relative to scroller (not offsetParent)
      const scrollerRect = scroller.getBoundingClientRect();
      const activeRect = activeBtn.getBoundingClientRect();

      // Position relative to scroller's content (accounting for current scroll)
      const activeLeft =
        activeRect.left - scrollerRect.left + scroller.scrollLeft;
      const activeWidth = activeRect.width;
      const activeRight = activeLeft + activeWidth;
      const maxScrollLeft = scrollerScrollWidth - scrollerWidth;
      const currentScrollLeft = scroller.scrollLeft;

      let targetScrollLeft: number;

      switch (scrollMode) {
        case "start": {
          // Always align active element to the left edge (with offset for fade zone)
          const fadeOffset = 20; // offset to avoid left edge fade
          targetScrollLeft = activeLeft - fadeOffset;
          break;
        }

        case "minimal": {
          // Only scroll if element is not fully visible
          const padding = 16; // pixels from edge for visibility check
          const visibleLeft = currentScrollLeft;
          const visibleRight = currentScrollLeft + scrollerWidth;

          if (activeLeft < visibleLeft + padding) {
            // Element is cut off on the left
            targetScrollLeft = activeLeft - padding;
          } else if (activeRight > visibleRight - padding) {
            // Element is cut off on the right
            targetScrollLeft = activeRight - scrollerWidth + padding;
          } else {
            // Element is fully visible - don't scroll
            targetScrollLeft = currentScrollLeft;
          }
          break;
        }

        case "minimal-peek": {
          // Always position with peek of neighboring elements
          const peekAmount = 48; // pixels to show of prev/next element
          const padding = 16;

          // Determine if element is more towards left or right of scroller
          const activeCenterX = activeLeft + activeWidth / 2;
          const scrollerCenterX = scrollerScrollWidth / 2;

          if (activeCenterX <= scrollerCenterX) {
            // Element is in left half - show peek on left, align towards left
            targetScrollLeft = activeLeft - padding - peekAmount;
          } else {
            // Element is in right half - show peek on right, align towards right
            targetScrollLeft =
              activeRight - scrollerWidth + padding + peekAmount;
          }
          break;
        }

        case "center":
        default: {
          // Center the active element in the visible area
          const activeCenterX = activeLeft + activeWidth / 2;
          targetScrollLeft = activeCenterX - scrollerWidth / 2;
          break;
        }
      }

      // Clamp to valid scroll range
      const clampedScrollLeft = Math.max(
        0,
        Math.min(targetScrollLeft, maxScrollLeft),
      );

      scroller.scrollLeft = clampedScrollLeft;
      updateEdgeFades();
    });
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
