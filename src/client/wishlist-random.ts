/**
 * Random wishlist item navigation.
 * Scrolls to a random item and highlights it.
 */

const HIGHLIGHT_CLASS = "wishlist-item--highlighted";
const HIGHLIGHT_DURATION = 1900; // just past the flare, see wishlist.css
/** Breathing room between the pinned header and the card it lands on. */
const CARD_GAP = 20;

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
 * How far from the top of the viewport a card should come to rest: clear of
 * the pinned header row, whose real height the header publishes as
 * --sticky-header-offset (page-header-condense.ts). It used to be a flat 120px,
 * which knew nothing about a header grown taller by wrapped pills.
 */
function headerClearance(): number {
  const main = document.querySelector("main");
  const published = main
    ? getComputedStyle(main).getPropertyValue("--sticky-header-offset")
    : "";
  const offset = parseFloat(published);
  return (Number.isFinite(offset) ? offset : 88) + CARD_GAP;
}

/** Where the page should sit for this card to rest below the header. */
function scrollTargetFor(el: HTMLElement): number {
  const top = window.scrollY + el.getBoundingClientRect().top;
  return Math.max(0, Math.round(top - headerClearance()));
}

/**
 * Check if element is fully visible in viewport (below the pinned header)
 */
function isElementFullyVisible(el: HTMLElement, padding = 20): boolean {
  const rect = el.getBoundingClientRect();
  const windowHeight =
    window.innerHeight || document.documentElement.clientHeight;

  return rect.top >= headerClearance() && rect.bottom <= windowHeight - padding;
}

/**
 * Run once the page has stopped moving. Cards below the fold are laid out from
 * `contain-intrinsic-size` estimates and get their real heights as the scroll
 * passes over them, which drags the target along with them — landings were
 * measured up to 150px off. So the destination is re-checked after the fact
 * rather than trusted from a single measurement taken before the trip.
 */
function onScrollSettled(run: () => void): void {
  // Read the support check into a variable: testing it inline narrows `window`
  // itself to `never` in the fallback below.
  const hasScrollEnd = "onscrollend" in window;
  if (hasScrollEnd) {
    window.addEventListener("scrollend", run, { once: true });
    return;
  }
  let last = window.scrollY;
  let still = 0;
  const poll = window.setInterval(() => {
    if (window.scrollY === last) {
      if (++still >= 4) {
        window.clearInterval(poll);
        run();
      }
    } else {
      last = window.scrollY;
      still = 0;
    }
  }, 50);
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

/**
 * Check if an item is reserved (by anyone)
 */
function isItemReserved(item: HTMLElement): boolean {
  // Check if reserved badge is visible
  const reservedBadge = item.querySelector<HTMLElement>(".reserved-badge");
  if (reservedBadge && !reservedBadge.hidden) {
    return true;
  }

  // Check if own reservation badge is visible
  const ownBadge = item.querySelector<HTMLElement>(".own-reservation-badge");
  if (ownBadge && !ownBadge.hidden) {
    return true;
  }

  // Check reserve button data attribute
  const reserveBtn = item.querySelector<HTMLElement>(".reserve-btn");
  if (reserveBtn && reserveBtn.dataset.reservedBy) {
    return true;
  }

  return false;
}

export function scrollToRandomItem() {
  // Get all non-received wishlist items
  const allNonReceived = document.querySelectorAll<HTMLElement>(
    ".wishlist-item:not(.item-received)",
  );

  // Filter out reserved items
  const availableItems = Array.from(allNonReceived).filter(
    (item) => !isItemReserved(item),
  );

  if (availableItems.length === 0) {
    // No available items - don't scroll
    return;
  }

  // Pick a random item
  const randomIndex = Math.floor(Math.random() * availableItems.length);
  const randomItem = availableItems[randomIndex];

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

  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({
    top: scrollTargetFor(item),
    behavior: smooth ? "smooth" : "auto",
  });

  // Nothing here tries to keep a tall card's bottom on screen any more. That
  // rule used to win whenever a card was taller than the viewport minus its
  // padding, and it won by pushing the card *up* — measured landing 18px below
  // the pinned row on a short window, with its top under the pills. For a card
  // that doesn't fit, showing the top is the right answer anyway.
  onScrollSettled(() => {
    const drift = window.scrollY - scrollTargetFor(item);
    if (Math.abs(drift) > 2) {
      window.scrollTo({ top: scrollTargetFor(item), behavior: "auto" });
    }
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

// A highlight is a class on a card plus a 1.9s timer to take it off again. If
// the reader clicks a category while one is running, the card goes with the
// page and the timer is left holding it — harmless in itself, but it keeps a
// detached card reachable and, worse, the module would still be pointing at it
// as `currentHighlight` when the next roll asks for the previous one to be
// cleared. Dropping both at the swap keeps that state honest.
document.addEventListener("astro:before-swap", clearHighlight);

export function initRandomButton(selector: string) {
  const button = document.querySelector<HTMLElement>(selector);
  if (!button) return;

  // Called twice for the same button on a cold load: once as the page's module
  // is evaluated, and again from astro:page-load, which the router fires on
  // window load. Two click listeners on the die would roll it twice — two
  // random items, the second overwriting the first's highlight mid-scroll.
  if (button.dataset.randomReady === "true") return;
  button.dataset.randomReady = "true";

  button.addEventListener("click", (e) => {
    e.preventDefault();
    // Tumble the die for the length of the roll. Re-armed on every click by
    // dropping the class first, so a rapid second press restarts the animation
    // instead of being swallowed.
    button.classList.remove("is-rolling");
    void button.offsetWidth; // reflow: without it the class re-add is a no-op
    button.classList.add("is-rolling");
    scrollToRandomItem();
  });

  button.addEventListener("animationend", () => {
    button.classList.remove("is-rolling");
  });
}
