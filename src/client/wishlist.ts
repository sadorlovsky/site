import { actions } from "astro:actions";
import type { Lang } from "@lib/i18n";
import { showSnackbar } from "./snackbar";

const VISITOR_ID_KEY = "wishlist-visitor-id";
const RESERVATION_TOKENS_KEY = "wishlist-reservation-tokens";
let currentLang: Lang = "en";

function getVisitorId(): string {
  return localStorage.getItem(VISITOR_ID_KEY) || "";
}

function getReservationTokens(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(RESERVATION_TOKENS_KEY) || "{}");
  } catch {
    return {};
  }
}

function getReservationToken(itemId: string): string | null {
  const tokens = getReservationTokens();
  return tokens[itemId] ?? null;
}

function setReservationToken(itemId: string, token: string): void {
  const tokens = getReservationTokens();
  tokens[itemId] = token;
  localStorage.setItem(RESERVATION_TOKENS_KEY, JSON.stringify(tokens));
}

function clearReservationToken(itemId: string): void {
  const tokens = getReservationTokens();
  delete tokens[itemId];
  localStorage.setItem(RESERVATION_TOKENS_KEY, JSON.stringify(tokens));
}

export async function initializeWishlist() {
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

  // Fetch fresh reservations from API and update UI
  await fetchAndApplyReservations();

  initializeReserveButtons();
  initializeLangChangeListener();
}

async function fetchAndApplyReservations() {
  try {
    const response = await fetch("/api/wishlist/reservations");
    if (!response.ok) {
      // Still show buttons on error, using SSR data
      showButtons();
      return;
    }

    const reservations: Record<number, "reserved" | "confirmed"> =
      await response.json();

    // Update each item's reservation status
    document
      .querySelectorAll<HTMLButtonElement>(".reserve-btn")
      .forEach((button) => {
        const itemId = button.dataset.itemId;
        if (!itemId) return;

        const status = reservations[parseInt(itemId)] ?? null;
        // Update the data attribute with fresh data
        button.dataset.reservationStatus = status ?? "";
        if (!status || status === "confirmed") {
          clearReservationToken(itemId);
        }
      });

    // Show buttons after data is loaded
    showButtons();
  } catch {
    // Still show buttons on error, using SSR data
    showButtons();
  }
}

function showButtons() {
  const tokens = getReservationTokens();

  document
    .querySelectorAll<HTMLButtonElement>(".reserve-btn")
    .forEach((button) => {
      const itemId = button.dataset.itemId;
      if (!itemId) return;
      const status = button.dataset.reservationStatus;
      const isReserved = status === "reserved" || status === "confirmed";
      const isOwnReservation = status === "reserved" && !!tokens[itemId];

      // Set correct text based on language and state
      if (isReserved && isOwnReservation) {
        button.textContent =
          (currentLang === "ru"
            ? button.dataset.ruCancel
            : button.dataset.enCancel) ?? null;
      } else if (isReserved) {
        button.textContent =
          (currentLang === "ru"
            ? button.dataset.ruReserved
            : button.dataset.enReserved) ?? null;
      } else {
        button.textContent =
          (currentLang === "ru"
            ? button.dataset.ruReserve
            : button.dataset.enReserve) ?? null;
      }

      // Show button
      button.classList.remove("reserve-btn--loading");
    });
}

function initializeReserveButtons() {
  const reserveButtons =
    document.querySelectorAll<HTMLButtonElement>(".reserve-btn");
  const visitorId = getVisitorId();
  const tokens = getReservationTokens();

  reserveButtons.forEach((button) => {
    // Skip received items
    if (button.disabled) {
      return;
    }

    const itemId = button.dataset.itemId;
    if (!itemId) return;
    const status = button.dataset.reservationStatus;
    const isReserved = status === "reserved" || status === "confirmed";
    const isOwnReservation = status === "reserved" && !!tokens[itemId];

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

      const reservationToken = getReservationToken(itemId);
      const status = this.dataset.reservationStatus;
      const isCurrentlyReserved =
        status === "reserved" || status === "confirmed";
      const isOwn = status === "reserved" && !!reservationToken;

      // Get badge for this item
      const itemArticle = this.closest("article");
      const itemBadge = itemArticle?.querySelector(
        ".own-reservation-badge",
      ) as HTMLElement;

      if (isCurrentlyReserved && isOwn) {
        // Cancel reservation - optimistic UI
        const previousState = {
          previousStatus: status,
          textContent: this.textContent,
          hasClass: this.classList.contains("own-reservation"),
          badgeHidden: itemBadge?.hidden,
          reservationToken,
        };

        // Optimistically update UI
        this.dataset.reservationStatus = "";
        this.textContent =
          (currentLang === "ru"
            ? this.dataset.ruReserve
            : this.dataset.enReserve) ?? null;
        this.classList.remove("own-reservation");
        if (itemBadge) itemBadge.hidden = true;
        clearReservationToken(itemId);
        // Update aria-label
        const reserveAriaLabel =
          currentLang === "ru"
            ? this.dataset.ariaLabelRuReserve
            : this.dataset.ariaLabelEnReserve;
        if (reserveAriaLabel) this.setAttribute("aria-label", reserveAriaLabel);

        // Make API call in background
        const { error } = await actions.unreserve({
          itemId: parseInt(itemId),
          reservationToken,
        });

        // Rollback on error
        if (error) {
          this.dataset.reservationStatus = previousState.previousStatus ?? "";
          this.textContent = previousState.textContent;
          if (previousState.hasClass) this.classList.add("own-reservation");
          if (itemBadge) itemBadge.hidden = previousState.badgeHidden ?? false;
          if (previousState.reservationToken) {
            setReservationToken(itemId, previousState.reservationToken);
          }
          showSnackbar(error.message || "Failed to cancel reservation");
        }
      } else if (!isCurrentlyReserved) {
        // Make reservation - optimistic UI
        const previousState = {
          previousStatus: status,
          textContent: this.textContent,
          hasClass: this.classList.contains("own-reservation"),
          badgeHidden: itemBadge?.hidden,
        };

        // Optimistically update UI
        this.dataset.reservationStatus = "reserved";
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
        const { data, error } = await actions.reserve({
          itemId: parseInt(itemId),
          visitorId,
        });

        // Rollback on error
        if (error) {
          this.dataset.reservationStatus = previousState.previousStatus ?? "";
          this.textContent = previousState.textContent;
          if (!previousState.hasClass) this.classList.remove("own-reservation");
          if (itemBadge) itemBadge.hidden = previousState.badgeHidden ?? true;

          // If banned, refetch all reservations to update UI
          if (error.code === "FORBIDDEN") {
            await fetchAndApplyReservations();
            initializeReserveButtons();
          }

          showSnackbar(error.message || "Failed to reserve item");
        } else if (data?.reservationToken) {
          setReservationToken(itemId, data.reservationToken);
        } else {
          this.dataset.reservationStatus = previousState.previousStatus ?? "";
          this.textContent = previousState.textContent;
          if (!previousState.hasClass) this.classList.remove("own-reservation");
          if (itemBadge) itemBadge.hidden = previousState.badgeHidden ?? true;
          showSnackbar("Reservation token missing");
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
  const tokens = getReservationTokens();

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

    const itemId = btn.dataset.itemId;
    if (!itemId) return;
    const status = btn.dataset.reservationStatus;
    const isReserved = status === "reserved" || status === "confirmed";
    const isOwnReservation = status === "reserved" && !!tokens[itemId];
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
  const tokens = getReservationTokens();

  reserveButtons.forEach((btn) => {
    const itemId = btn.dataset.itemId;
    if (!itemId) return;
    const status = btn.dataset.reservationStatus;
    const isReserved = status === "reserved" || status === "confirmed";
    const isOwnReservation = status === "reserved" && !!tokens[itemId];

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
