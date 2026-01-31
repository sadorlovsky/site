/**
 * Random wishlist item navigation.
 * Scrolls to a random item and highlights it.
 */

const HIGHLIGHT_CLASS = "wishlist-item--highlighted";
const HIGHLIGHT_DURATION = 3500;

let currentHighlight: HTMLElement | null = null;
let highlightTimeout: ReturnType<typeof setTimeout> | null = null;

function clearHighlight() {
  if (currentHighlight) {
    currentHighlight.classList.remove(HIGHLIGHT_CLASS);
    currentHighlight = null;
  }
  if (highlightTimeout) {
    clearTimeout(highlightTimeout);
    highlightTimeout = null;
  }
}

/**
 * Check if element is fully visible in viewport (with padding)
 */
function isElementFullyVisible(el: HTMLElement, padding = 20): boolean {
  const rect = el.getBoundingClientRect();
  const windowHeight =
    window.innerHeight || document.documentElement.clientHeight;

  // Element is fully visible if top and bottom are within viewport with padding
  return rect.top >= padding && rect.bottom <= windowHeight - padding;
}

/**
 * Prioritize loading the image for the target item
 */
function prioritizeImageLoading(item: HTMLElement) {
  const img = item.querySelector<HTMLImageElement>(".wishlist-img");
  if (!img) return;

  // If image is already loaded, nothing to do
  if (img.complete) return;

  // Change loading to eager and fetchpriority to high
  img.loading = "eager";
  img.fetchPriority = "high";

  // Force browser to start loading by accessing src
  // This triggers immediate load even if image was lazy
  if (img.dataset.src) {
    img.src = img.dataset.src;
  } else {
    // Re-trigger load by temporarily clearing and resetting src
    const currentSrc = img.src;
    img.src = "";
    img.src = currentSrc;
  }
}

export function scrollToRandomItem() {
  // Get all visible (non-received) wishlist items
  const items = document.querySelectorAll<HTMLElement>(
    ".wishlist-item:not(.item-received)",
  );

  if (items.length === 0) {
    // Fallback to all items if no unreceived items
    const allItems = document.querySelectorAll<HTMLElement>(".wishlist-item");
    if (allItems.length === 0) return;
    scrollToItem(allItems[Math.floor(Math.random() * allItems.length)]);
    return;
  }

  // Pick a random item
  const randomIndex = Math.floor(Math.random() * items.length);
  const randomItem = items[randomIndex];

  scrollToItem(randomItem);
}

function scrollToItem(item: HTMLElement) {
  // Clear any existing highlight
  clearHighlight();

  // Prioritize loading the image for this item
  prioritizeImageLoading(item);

  // Check if item is fully visible - don't scroll if so
  if (isElementFullyVisible(item)) {
    // Just highlight without scrolling
    highlightItem(item);
    return;
  }

  // Calculate scroll position to show item with comfortable padding from top
  const rect = item.getBoundingClientRect();
  const itemHeight = rect.height;
  const windowHeight = window.innerHeight;
  const topPadding = 120; // Comfortable padding from top of viewport

  // Target: position item so its top is at topPadding from viewport top
  let scrollTarget = window.scrollY + rect.top - topPadding;

  // But also ensure the bottom of the item is visible
  const bottomPadding = 40;
  const minScrollToShowBottom =
    window.scrollY + rect.bottom - windowHeight + bottomPadding;

  // Use whichever scroll position is greater (ensures bottom is visible)
  scrollTarget = Math.max(scrollTarget, minScrollToShowBottom);

  window.scrollTo({
    top: Math.max(0, scrollTarget),
    behavior: "smooth",
  });

  // Add highlight after a small delay (let scroll start)
  setTimeout(() => {
    highlightItem(item);
  }, 100);
}

function highlightItem(item: HTMLElement) {
  item.classList.add(HIGHLIGHT_CLASS);
  currentHighlight = item;

  // Remove highlight after duration
  highlightTimeout = setTimeout(() => {
    clearHighlight();
  }, HIGHLIGHT_DURATION);
}

export function initRandomButton(selector: string) {
  const button = document.querySelector<HTMLElement>(selector);
  if (!button) return;

  button.addEventListener("click", (e) => {
    e.preventDefault();
    scrollToRandomItem();
  });
}
