import { actions } from "astro:actions";
import type { Lang } from "@lib/i18n";

const VISITOR_ID_KEY = "wishlist-visitor-id";
let currentLang: Lang = "en";
let activePopover: HTMLElement | null = null;

function getVisitorId(): string {
  return localStorage.getItem(VISITOR_ID_KEY) || "";
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
  initializePopovers();
}

async function fetchAndApplyReservations() {
  try {
    const response = await fetch("/api/wishlist/reservations");
    if (!response.ok) {
      // Still show buttons on error, using SSR data
      showButtons();
      return;
    }

    const reservations: Record<number, string> = await response.json();

    // Update each item's reservation status
    document
      .querySelectorAll<HTMLButtonElement>(".reserve-btn")
      .forEach((button) => {
        const itemId = button.dataset.itemId;
        if (!itemId) return;

        const reservedBy = reservations[parseInt(itemId)] || "";
        // Update the data attribute with fresh data
        button.dataset.reservedBy = reservedBy;
      });

    // Show buttons after data is loaded
    showButtons();
  } catch {
    // Still show buttons on error, using SSR data
    showButtons();
  }
}

function showButtons() {
  const visitorId = getVisitorId();

  document
    .querySelectorAll<HTMLButtonElement>(".reserve-btn")
    .forEach((button) => {
      const reservedBy = button.dataset.reservedBy || "";
      const isReserved = reservedBy.length > 0;
      const isOwnReservation = isReserved && reservedBy === visitorId;

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

  reserveButtons.forEach((button) => {
    // Skip received items
    if (button.disabled) {
      return;
    }

    const reservedBy = button.dataset.reservedBy || "";
    const isReserved = reservedBy.length > 0;
    const isOwnReservation = isReserved && reservedBy === visitorId;

    // Get badge and message button elements
    const article = button.closest("article");
    const badge = article?.querySelector(
      ".own-reservation-badge",
    ) as HTMLElement;
    const wrapper = button.closest(".reserve-wrapper");
    const messageBtn = wrapper?.querySelector(".message-btn") as HTMLElement;

    // Set initial button state
    if (isReserved) {
      if (isOwnReservation) {
        // Own reservation - show Cancel, badge, and message button
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
        if (messageBtn) {
          messageBtn.hidden = false;
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

      // Get badge and message button for this item
      const itemArticle = this.closest("article");
      const itemBadge = itemArticle?.querySelector(
        ".own-reservation-badge",
      ) as HTMLElement;
      const itemWrapper = this.closest(".reserve-wrapper");
      const itemMessageBtn = itemWrapper?.querySelector(
        ".message-btn",
      ) as HTMLElement;

      if (isCurrentlyReserved && isOwn) {
        // Cancel reservation - optimistic UI
        const previousState = {
          reservedBy: this.dataset.reservedBy,
          textContent: this.textContent,
          hasClass: this.classList.contains("own-reservation"),
          badgeHidden: itemBadge?.hidden,
          messageBtnHidden: itemMessageBtn?.hidden,
        };

        // Hide popover if open
        const popover = itemWrapper?.querySelector(
          ".reserve-popover",
        ) as HTMLElement;
        if (popover) {
          hidePopover(popover);
        }

        // Optimistically update UI
        this.dataset.reservedBy = "";
        this.textContent =
          (currentLang === "ru"
            ? this.dataset.ruReserve
            : this.dataset.enReserve) ?? null;
        this.classList.remove("own-reservation");
        if (itemBadge) itemBadge.hidden = true;
        if (itemMessageBtn) itemMessageBtn.hidden = true;
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
          if (itemMessageBtn)
            itemMessageBtn.hidden = previousState.messageBtnHidden ?? true;
          alert(error.message || "Failed to cancel reservation");
        }
      } else if (!isCurrentlyReserved) {
        // Make reservation - optimistic UI
        const previousState = {
          reservedBy: this.dataset.reservedBy,
          textContent: this.textContent,
          hasClass: this.classList.contains("own-reservation"),
          badgeHidden: itemBadge?.hidden,
          messageBtnHidden: itemMessageBtn?.hidden,
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
        // Show message button with animated glow border
        if (itemMessageBtn) {
          itemMessageBtn.hidden = false;
          // Add glow elements and animation (skip if reduced motion)
          const prefersReducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
          ).matches;
          if (!prefersReducedMotion) {
            const glowEffect = document.createElement("span");
            glowEffect.className = "glow-effect";
            const glowBlur = document.createElement("span");
            glowBlur.className = "glow-blur";
            itemMessageBtn.appendChild(glowBlur);
            itemMessageBtn.appendChild(glowEffect);
            itemMessageBtn.classList.add("glow-border");
          }
          itemMessageBtn.classList.add("show-tooltip");
          setTimeout(() => {
            itemMessageBtn.classList.remove("glow-border", "show-tooltip");
            itemMessageBtn
              .querySelectorAll(".glow-effect, .glow-blur")
              .forEach((el) => el.remove());
          }, 4000);
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
          if (itemMessageBtn)
            itemMessageBtn.hidden = previousState.messageBtnHidden ?? true;
          alert(error.message || "Failed to reserve item");
        }
      }
    });
  });
}

function showPopover(popover: HTMLElement | null) {
  if (!popover) return;

  // Close any other open popover
  if (activePopover && activePopover !== popover) {
    hidePopover(activePopover);
  }

  // Calculate popover width and arrow position based on card
  const card = popover.closest(".wishlist-item") as HTMLElement;
  const popoverContent = popover.querySelector(
    ".popover-content",
  ) as HTMLElement;
  const wrapper = popover.closest(".reserve-wrapper") as HTMLElement;
  const messageBtn = wrapper?.querySelector(".message-btn") as HTMLElement;

  if (card && popoverContent && messageBtn && wrapper) {
    const cardWidth = card.offsetWidth;
    // Popover width = card width
    popoverContent.style.width = `${cardWidth}px`;

    // Calculate where the arrow should be positioned
    // Arrow needs to point at center of message button
    const wrapperRect = wrapper.getBoundingClientRect();
    const btnRect = messageBtn.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();

    // Center of button relative to card left edge
    const btnCenterFromCard = btnRect.left + btnRect.width / 2 - cardRect.left;

    // Arrow position as percentage of popover width
    const arrowLeftPercent = (btnCenterFromCard / cardWidth) * 100;

    // Set arrow position via CSS custom property
    popoverContent.style.setProperty("--arrow-left", `${arrowLeftPercent}%`);

    // Position popover so it aligns with card
    const wrapperFromCard = wrapperRect.left - cardRect.left;
    popover.style.left = `${-wrapperFromCard}px`;
    popover.style.transform = "translateY(8px) scale(0.95)";
  }

  // Check if there's an existing message
  const existingMessage = popover.dataset.message || "";
  const hasMessage = existingMessage.length > 0;

  // Update popover content for current language and mode
  updatePopoverLanguage(popover, currentLang, hasMessage);

  // Pre-fill textarea with existing message
  const textarea = popover.querySelector(
    ".popover-textarea",
  ) as HTMLTextAreaElement;
  if (textarea) {
    textarea.value = existingMessage;
  }

  // Show popover with animation
  popover.hidden = false;
  // Force reflow for animation
  popover.offsetHeight;
  popover.classList.add("visible");
  activePopover = popover;

  // Focus textarea and move cursor to end
  if (textarea) {
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }, 100);
  }
}

function hidePopover(popover: HTMLElement | null) {
  if (!popover) return;

  popover.classList.remove("visible");
  // Clear textarea
  const textarea = popover.querySelector(
    ".popover-textarea",
  ) as HTMLTextAreaElement;
  if (textarea) {
    textarea.value = "";
  }

  // Hide after animation
  setTimeout(() => {
    popover.hidden = true;
  }, 250);

  if (activePopover === popover) {
    activePopover = null;
  }
}

function updatePopoverLanguage(
  popover: HTMLElement,
  lang: "en" | "ru",
  hasMessage: boolean = false,
) {
  // Update title
  const title = popover.querySelector(".popover-title") as HTMLElement;
  if (title) {
    title.textContent =
      (lang === "ru" ? title.dataset.ru : title.dataset.en) ?? null;
  }

  // Update label
  const label = popover.querySelector(".popover-label") as HTMLElement;
  if (label) {
    label.textContent =
      (lang === "ru" ? label.dataset.ru : label.dataset.en) ?? null;
  }

  // Update textarea placeholder
  const textarea = popover.querySelector(
    ".popover-textarea",
  ) as HTMLTextAreaElement;
  if (textarea) {
    textarea.placeholder =
      (lang === "ru"
        ? textarea.dataset.placeholderRu
        : textarea.dataset.placeholderEn) ?? "";
  }

  // Update skip/delete button based on mode
  const skipBtn = popover.querySelector(
    ".popover-btn-skip",
  ) as HTMLElement | null;
  if (skipBtn) {
    if (hasMessage) {
      skipBtn.textContent =
        (lang === "ru" ? skipBtn.dataset.ruDelete : skipBtn.dataset.enDelete) ??
        null;
      skipBtn.classList.add("delete-mode");
    } else {
      skipBtn.textContent =
        (lang === "ru" ? skipBtn.dataset.ruSkip : skipBtn.dataset.enSkip) ??
        null;
      skipBtn.classList.remove("delete-mode");
    }
  }

  // Update save button
  const saveBtn = popover.querySelector(
    ".popover-btn-save",
  ) as HTMLElement | null;
  if (saveBtn) {
    saveBtn.textContent =
      (lang === "ru" ? saveBtn.dataset.ru : saveBtn.dataset.en) ?? null;
  }
}

function initializePopovers() {
  // Handle message button clicks
  document.querySelectorAll(".message-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      // Stop glow animation immediately
      btn.classList.remove("glow-border", "show-tooltip");
      btn
        .querySelectorAll(".glow-effect, .glow-blur")
        .forEach((el) => el.remove());
      const wrapper = btn.closest(".reserve-wrapper");
      const popover = wrapper?.querySelector(".reserve-popover") as HTMLElement;
      if (popover) {
        showPopover(popover);
      }
    });
  });

  // Handle Skip and Save buttons
  document.querySelectorAll(".reserve-popover").forEach((popover) => {
    const skipBtn = popover.querySelector(".popover-btn-skip");
    const saveBtn = popover.querySelector(".popover-btn-save");
    const textarea = popover.querySelector(
      ".popover-textarea",
    ) as HTMLTextAreaElement;

    skipBtn?.addEventListener("click", async () => {
      const isDeleteMode = skipBtn.classList.contains("delete-mode");

      if (isDeleteMode) {
        // Delete the message
        const wrapper = popover.closest(".reserve-wrapper");
        const reserveBtn = wrapper?.querySelector(
          ".reserve-btn",
        ) as HTMLButtonElement;
        const itemId = reserveBtn?.dataset.itemId;
        const visitorId = getVisitorId();

        if (itemId && visitorId) {
          const { error } = await actions.deleteReservationMessage({
            itemId: parseInt(itemId),
            visitorId,
          });

          if (!error) {
            // Update local data attribute
            (popover as HTMLElement).dataset.message = "";
          } else {
            console.error("Failed to delete message:", error.message);
          }
        }
      }

      hidePopover(popover as HTMLElement);
    });

    saveBtn?.addEventListener("click", async () => {
      const message = textarea?.value.trim();
      // Get itemId from the reserve button in the same wrapper
      const wrapper = popover.closest(".reserve-wrapper");
      const reserveBtn = wrapper?.querySelector(
        ".reserve-btn",
      ) as HTMLButtonElement;
      const itemId = reserveBtn?.dataset.itemId;
      const visitorId = getVisitorId();

      if (message && itemId && visitorId) {
        const { error } = await actions.saveReservationMessage({
          itemId: parseInt(itemId),
          visitorId,
          message,
        });

        if (!error) {
          // Update local data attribute
          (popover as HTMLElement).dataset.message = message;
        } else {
          console.error("Failed to save message:", error.message);
        }
      }

      hidePopover(popover as HTMLElement);
    });

    // Close on Escape key
    textarea?.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        hidePopover(popover as HTMLElement);
      }
    });
  });

  // Close popover when clicking outside
  document.addEventListener("click", (e) => {
    if (!activePopover) return;

    const target = e.target as HTMLElement;
    const isClickInsidePopover = activePopover.contains(target);
    const isClickOnReserveBtn = target.closest(".reserve-btn");
    const isClickOnMessageBtn = target.closest(".message-btn");

    if (!isClickInsidePopover && !isClickOnReserveBtn && !isClickOnMessageBtn) {
      hidePopover(activePopover);
    }
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
