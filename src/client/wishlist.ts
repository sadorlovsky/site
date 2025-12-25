import { actions } from "astro:actions";

const LANG_STORAGE_KEY = "wishlist-lang";
const VISITOR_ID_KEY = "wishlist-visitor-id";
let currentLang: "en" | "ru" = "en";

function getVisitorId(): string {
  return localStorage.getItem(VISITOR_ID_KEY) || "";
}

function saveLanguage(lang: "en" | "ru") {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {}
}

export function initializeWishlist() {
  // Check if language was set by inline script
  const isRussian = document.documentElement.classList.contains("lang-ru");
  currentLang = isRussian ? "ru" : "en";

  // Apply language translations
  if (currentLang === "ru") {
    updateLanguage("ru");
  }

  // Update prices based on language
  updatePricesForLanguage(currentLang);

  // Show content after language is applied
  document.documentElement.classList.add("lang-ready");

  initializeReserveButtons();
  initializeLanguageSwitcher();
}

function initializeReserveButtons() {
  const reserveButtons = document.querySelectorAll<HTMLButtonElement>(".reserve-btn");
  const visitorId = getVisitorId();

  reserveButtons.forEach((button) => {
    // Skip received items
    if (button.disabled) {
      return;
    }

    const reservedBy = button.dataset.reservedBy || "";
    const isReserved = reservedBy.length > 0;
    const isOwnReservation = isReserved && reservedBy === visitorId;

    // Get badge element (in the item-image section)
    const article = button.closest("article");
    const badge = article?.querySelector(".own-reservation-badge") as HTMLElement;

    // Set initial button state
    if (isReserved) {
      if (isOwnReservation) {
        // Own reservation - show Cancel and badge
        button.textContent =
          (currentLang === "ru" ? button.dataset.ruCancel : button.dataset.enCancel) ?? null;
        button.classList.add("own-reservation");
        if (badge) {
          badge.hidden = false;
          // Update badge text for current language
          const span = badge.querySelector("span");
          if (span) {
            span.textContent =
              (currentLang === "ru" ? badge.dataset.ru : badge.dataset.en) ?? null;
          }
        }
      } else {
        // Someone else's reservation - show Reserved (disabled)
        button.textContent =
          (currentLang === "ru" ? button.dataset.ruReserved : button.dataset.enReserved) ?? null;
        button.classList.add("reserved-other");
        button.disabled = true;
      }
    }

    button.addEventListener("click", async function () {
      const itemId = this.dataset.itemId;
      if (!itemId) return;

      const currentReservedBy = this.dataset.reservedBy || "";
      const isCurrentlyReserved = currentReservedBy.length > 0;
      const isOwn = isCurrentlyReserved && currentReservedBy === visitorId;

      // Get badge for this item
      const itemArticle = this.closest("article");
      const itemBadge = itemArticle?.querySelector(".own-reservation-badge") as HTMLElement;

      if (isCurrentlyReserved && isOwn) {
        // Cancel reservation - optimistic UI
        const previousState = {
          reservedBy: this.dataset.reservedBy,
          textContent: this.textContent,
          hasClass: this.classList.contains("own-reservation"),
          badgeHidden: itemBadge?.hidden,
        };

        // Optimistically update UI
        this.dataset.reservedBy = "";
        this.textContent =
          (currentLang === "ru" ? this.dataset.ruReserve : this.dataset.enReserve) ?? null;
        this.classList.remove("own-reservation");
        if (itemBadge) itemBadge.hidden = true;

        // Make API call in background
        const { error } = await actions.unreserve({
          itemId: parseInt(itemId),
          visitorId,
        });

        // Rollback on error
        if (error) {
          this.dataset.reservedBy = previousState.reservedBy;
          this.textContent = previousState.textContent;
          if (previousState.hasClass) this.classList.add("own-reservation");
          if (itemBadge) itemBadge.hidden = previousState.badgeHidden ?? false;
          alert(error.message || "Failed to cancel reservation");
        }
      } else if (!isCurrentlyReserved) {
        // Make reservation - optimistic UI
        const previousState = {
          reservedBy: this.dataset.reservedBy,
          textContent: this.textContent,
          hasClass: this.classList.contains("own-reservation"),
          badgeHidden: itemBadge?.hidden,
        };

        // Optimistically update UI
        this.dataset.reservedBy = visitorId;
        this.textContent =
          (currentLang === "ru" ? this.dataset.ruCancel : this.dataset.enCancel) ?? null;
        this.classList.add("own-reservation");
        if (itemBadge) {
          itemBadge.hidden = false;
          const badgeSpan = itemBadge.querySelector("span");
          if (badgeSpan) {
            badgeSpan.textContent =
              (currentLang === "ru" ? itemBadge.dataset.ru : itemBadge.dataset.en) ?? null;
          }
        }

        // Make API call in background
        const { error } = await actions.reserve({
          itemId: parseInt(itemId),
          visitorId,
        });

        // Rollback on error
        if (error) {
          this.dataset.reservedBy = previousState.reservedBy;
          this.textContent = previousState.textContent;
          if (!previousState.hasClass) this.classList.remove("own-reservation");
          if (itemBadge) itemBadge.hidden = previousState.badgeHidden ?? true;
          alert(error.message || "Failed to reserve item");
        }
      }
    });
  });
}

function initializeLanguageSwitcher() {
  const langButtons = document.querySelectorAll<HTMLButtonElement>(".lang-btn");

  langButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang as "en" | "ru";
      if (!lang || lang === currentLang) return;

      currentLang = lang;
      saveLanguage(lang);

      // Update lang-ru class on html (CSS handles button styling)
      if (lang === "ru") {
        document.documentElement.classList.add("lang-ru");
      } else {
        document.documentElement.classList.remove("lang-ru");
      }

      // Update all translatable elements
      updateLanguage(lang);

      // Update prices for new language
      updatePricesForLanguage(lang);
    });
  });
}

function formatRubPrice(price: string): string {
  // Extract number from price like "₽4500"
  const match = price.match(/₽(\d+)/);
  if (!match) return price;
  const num = parseInt(match[1], 10);
  // Round to nearest 10
  const rounded = Math.round(num / 10) * 10;
  // Format with space as thousands separator, symbol after number
  const formatted = rounded.toLocaleString("ru-RU");
  return `${formatted} ₽`;
}

function updatePricesForLanguage(lang: "en" | "ru") {
  const priceElements = document.querySelectorAll<HTMLElement>(".item-price");

  priceElements.forEach((el) => {
    const originalPrice = el.dataset.priceOriginal || "";
    const priceUsd = el.dataset.priceUsd;
    const priceRub = el.dataset.priceRub;
    const isOriginalUsd = el.dataset.originalIsUsd === "true";

    // Set displayed price based on language
    if (lang === "ru" && priceRub) {
      el.textContent = formatRubPrice(priceRub);
    } else {
      el.textContent = originalPrice;
    }

    // Tooltip logic:
    // - RU language: no tooltip
    // - EN + price in USD: no tooltip
    // - EN + price not in USD: show USD price in tooltip
    el.removeAttribute("data-tooltip");

    if (lang === "en" && !isOriginalUsd && priceUsd) {
      el.setAttribute("data-tooltip", priceUsd);
    }
  });
}

function updateLanguage(lang: "en" | "ru") {
  // Update elements with data-en and data-ru attributes
  const translatableElements = document.querySelectorAll<HTMLElement>("[data-en][data-ru]");

  translatableElements.forEach((el) => {
    const text = lang === "ru" ? el.dataset.ru : el.dataset.en;
    if (text !== undefined) {
      // For elements with children (like received badge), update the text node
      const span = el.querySelector("span");
      if (span) {
        span.textContent = text;
      } else if (el.childNodes.length === 1 && el.childNodes[0].nodeType === Node.TEXT_NODE) {
        el.textContent = text;
      } else {
        el.textContent = text;
      }
    }
  });

  // Update reserve buttons based on their state
  const reserveButtons = document.querySelectorAll<HTMLButtonElement>(".reserve-btn");
  const visitorId = getVisitorId();

  reserveButtons.forEach((btn) => {
    // Skip buttons in loading state
    if (
      btn.textContent === "Reserving..." ||
      btn.textContent === "Резервируем..." ||
      btn.textContent === "Canceling..." ||
      btn.textContent === "Отменяем..."
    ) {
      return;
    }

    const reservedBy = btn.dataset.reservedBy || "";
    const isReserved = reservedBy.length > 0;
    const isOwnReservation = isReserved && reservedBy === visitorId;
    const isReceived =
      btn.dataset.enReceived &&
      (btn.textContent === "Received" || btn.textContent === "Получено");

    if (isReceived) {
      btn.textContent =
        (lang === "ru" ? btn.dataset.ruReceived : btn.dataset.enReceived) ?? null;
    } else if (isReserved && isOwnReservation) {
      btn.textContent = (lang === "ru" ? btn.dataset.ruCancel : btn.dataset.enCancel) ?? null;
    } else if (isReserved && !isOwnReservation) {
      btn.textContent =
        (lang === "ru" ? btn.dataset.ruReserved : btn.dataset.enReserved) ?? null;
    } else {
      btn.textContent = (lang === "ru" ? btn.dataset.ruReserve : btn.dataset.enReserve) ?? null;
    }
  });
}

// Initialize when the page loads
document.addEventListener("DOMContentLoaded", initializeWishlist);
