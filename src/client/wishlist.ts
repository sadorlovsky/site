import { actions } from "astro:actions";
import type { Lang } from "@lib/i18n";

const VISITOR_ID_KEY = "wishlist-visitor-id";
let currentLang: Lang = "en";

function getVisitorId(): string {
  return localStorage.getItem(VISITOR_ID_KEY) || "";
}

export function initializeWishlist() {
  // Check if language was set by inline script
  const isRussian = document.documentElement.classList.contains("lang-ru");
  currentLang = isRussian ? "ru" : "en";

  // Apply language translations
  if (currentLang === "ru") {
    updateLanguage("ru");
    updateAriaLabels("ru");
  }

  // Update prices based on language
  updatePricesForLanguage(currentLang);

  initializeReserveButtons();
  initializeLangChangeListener();
}

function initializeReserveButtons() {
  const reserveButtons =
    document.querySelectorAll<HTMLButtonElement>(".reserve-btn");
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
    const badge = article?.querySelector(
      ".own-reservation-badge",
    ) as HTMLElement;

    // Set initial button state
    if (isReserved) {
      if (isOwnReservation) {
        // Own reservation - show Cancel and badge
        button.textContent =
          (currentLang === "ru"
            ? button.dataset.ruCancel
            : button.dataset.enCancel) ?? null;
        button.classList.add("own-reservation");
        if (badge) {
          badge.hidden = false;
          // Update badge text for current language
          const span = badge.querySelector("span");
          if (span) {
            span.textContent =
              (currentLang === "ru" ? badge.dataset.ru : badge.dataset.en) ??
              null;
          }
        }
      } else {
        // Someone else's reservation - show Reserved (disabled)
        button.textContent =
          (currentLang === "ru"
            ? button.dataset.ruReserved
            : button.dataset.enReserved) ?? null;
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
      const itemBadge = itemArticle?.querySelector(
        ".own-reservation-badge",
      ) as HTMLElement;

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
          (currentLang === "ru"
            ? this.dataset.ruReserve
            : this.dataset.enReserve) ?? null;
        this.classList.remove("own-reservation");
        if (itemBadge) itemBadge.hidden = true;
        // Update aria-label
        const reserveAriaLabel =
          currentLang === "ru"
            ? this.dataset.ariaLabelRuReserve
            : this.dataset.ariaLabelEnReserve;
        if (reserveAriaLabel) this.setAttribute("aria-label", reserveAriaLabel);

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
          (currentLang === "ru"
            ? this.dataset.ruCancel
            : this.dataset.enCancel) ?? null;
        this.classList.add("own-reservation");
        if (itemBadge) {
          itemBadge.hidden = false;
          const badgeSpan = itemBadge.querySelector("span");
          if (badgeSpan) {
            badgeSpan.textContent =
              (currentLang === "ru"
                ? itemBadge.dataset.ru
                : itemBadge.dataset.en) ?? null;
          }
        }
        // Update aria-label
        const cancelAriaLabel =
          currentLang === "ru"
            ? this.dataset.ariaLabelRuCancel
            : this.dataset.ariaLabelEnCancel;
        if (cancelAriaLabel) this.setAttribute("aria-label", cancelAriaLabel);

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

function initializeLangChangeListener() {
  // Listen for lang-change event from LangSwitcher component
  window.addEventListener("lang-change", ((
    event: CustomEvent<{ lang: Lang; storageKey: string }>,
  ) => {
    const { lang } = event.detail;
    if (lang === currentLang) return;

    currentLang = lang;

    // Update wishlist-specific elements
    updateLanguage(lang);
    updateAriaLabels(lang);
    updatePricesForLanguage(lang);
  }) as EventListener);
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
  const translatableElements =
    document.querySelectorAll<HTMLElement>("[data-en][data-ru]");

  translatableElements.forEach((el) => {
    const text = lang === "ru" ? el.dataset.ru : el.dataset.en;
    if (text !== undefined) {
      // For elements with children (like received badge), update the text node
      const span = el.querySelector("span");
      if (span) {
        span.textContent = text;
      } else if (
        el.childNodes.length === 1 &&
        el.childNodes[0].nodeType === Node.TEXT_NODE
      ) {
        el.textContent = text;
      } else {
        el.textContent = text;
      }
    }
  });

  // Update reserve buttons based on their state
  const reserveButtons =
    document.querySelectorAll<HTMLButtonElement>(".reserve-btn");
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
        (lang === "ru" ? btn.dataset.ruReceived : btn.dataset.enReceived) ??
        null;
    } else if (isReserved && isOwnReservation) {
      btn.textContent =
        (lang === "ru" ? btn.dataset.ruCancel : btn.dataset.enCancel) ?? null;
    } else if (isReserved && !isOwnReservation) {
      btn.textContent =
        (lang === "ru" ? btn.dataset.ruReserved : btn.dataset.enReserved) ??
        null;
    } else {
      btn.textContent =
        (lang === "ru" ? btn.dataset.ruReserve : btn.dataset.enReserve) ?? null;
    }
  });
}

function updateAriaLabels(lang: "en" | "ru") {
  // Update elements with data-aria-label-en and data-aria-label-ru
  const elements = document.querySelectorAll<HTMLElement>(
    "[data-aria-label-en][data-aria-label-ru]",
  );
  elements.forEach((el) => {
    const label =
      lang === "ru" ? el.dataset.ariaLabelRu : el.dataset.ariaLabelEn;
    if (label) {
      el.setAttribute("aria-label", label);
    }
  });

  // Update reserve buttons aria-labels based on state
  const reserveButtons =
    document.querySelectorAll<HTMLButtonElement>(".reserve-btn");
  const visitorId = getVisitorId();

  reserveButtons.forEach((btn) => {
    const reservedBy = btn.dataset.reservedBy || "";
    const isReserved = reservedBy.length > 0;
    const isOwnReservation = isReserved && reservedBy === visitorId;

    let ariaLabel: string | undefined;

    if (isReserved && isOwnReservation) {
      ariaLabel =
        lang === "ru"
          ? btn.dataset.ariaLabelRuCancel
          : btn.dataset.ariaLabelEnCancel;
    } else if (isReserved) {
      ariaLabel =
        lang === "ru"
          ? btn.dataset.ariaLabelRuReserved
          : btn.dataset.ariaLabelEnReserved;
    } else {
      ariaLabel =
        lang === "ru"
          ? btn.dataset.ariaLabelRuReserve
          : btn.dataset.ariaLabelEnReserve;
    }

    if (ariaLabel) {
      btn.setAttribute("aria-label", ariaLabel);
    }
  });
}

// Initialize immediately - module is dynamically imported after DOMContentLoaded
initializeWishlist();
