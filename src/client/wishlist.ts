import { actions } from "astro:actions";
import type { Lang } from "@lib/i18n";
import { initTooltips } from "./tooltip";
import { getVisitorId } from "./visitor-id";
import {
  forgetMessage,
  hideMessageBead,
  initReservationMessages,
  primeMessages,
  setReservationMessagesLang,
  showMessageBead,
} from "./reservation-message";

let currentLang: Lang = "en";

/**
 * Whose reservation a card is carrying, as the button's `data-reservation`.
 *
 * The server renders "other" for anything taken, because it has no idea who is
 * looking; the per-visitor fetch below is what promotes a card to "mine". The
 * button stays hidden (`.reserve-btn--loading`) until that lands, so the
 * pessimistic first guess is never on screen.
 */
type ReservationState = "none" | "mine" | "other";

function reservationOf(button: HTMLElement): ReservationState {
  return (button.dataset.reservation as ReservationState) || "none";
}

/** Backoff between attempts at the reservations fetch, in ms. */
const RESERVATION_RETRY_DELAYS = [300, 1000, 2500];

/**
 * False once the fetch above has given up. Nothing on the page knows whose
 * reservations are whose at that point — the SSR attribute says "other" for
 * everything taken, because the server has no idea who is looking.
 */
let reservationsKnown = true;

/**
 * A badge's translations live on its inner label, not on the badge itself: the
 * badge also holds a state dot, and anything carrying data-en gets its
 * textContent rewritten wholesale by LangInit — children and all.
 */
function setBadgeLabel(badge: HTMLElement | null, lang: Lang): void {
  const label = badge?.querySelector<HTMLElement>(".badge-label");
  if (!label) return;
  const text = lang === "ru" ? label.dataset.ru : label.dataset.en;
  if (text) label.textContent = text;
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

  initReservationMessages(currentLang);

  // Fetch fresh reservations from API and update UI
  await fetchAndApplyReservations();

  initializeReserveButtons();
  initializeLangChangeListener();
}

/** One row of /api/wishlist/reservations, which answers per visitor. */
type ReservationResponse = { mine: boolean; message?: string };

async function loadReservations(): Promise<boolean> {
  const visitorId = getVisitorId();

  try {
    // The id travels as a header, not a query parameter: it is this feature's
    // only credential, and a URL ends up in every access log on the way.
    const response = await fetch("/api/wishlist/reservations", {
      headers: { "X-Visitor-Id": visitorId },
    });
    if (!response.ok) return false;

    const reservations: Record<number, ReservationResponse> =
      await response.json();
    const ownMessages = new Map<number, string>();

    // Update each item's reservation status
    document
      .querySelectorAll<HTMLButtonElement>(".reserve-btn")
      .forEach((button) => {
        const itemId = button.dataset.itemId;
        if (!itemId) return;

        const id = parseInt(itemId);
        const state = reservations[id];
        button.dataset.reservation = !state
          ? "none"
          : state.mine
            ? "mine"
            : "other";
        if (state?.mine && state.message) ownMessages.set(id, state.message);
      });

    primeMessages(ownMessages);
    return true;
  } catch {
    return false;
  }
}

async function fetchAndApplyReservations() {
  if (await loadReservations()) {
    // Show buttons after data is loaded
    showButtons();
    return;
  }

  for (const delay of RESERVATION_RETRY_DELAYS) {
    await new Promise((resolve) => setTimeout(resolve, delay));
    if (await loadReservations()) {
      showButtons();
      return;
    }
  }

  // Falling back to the SSR attribute here used to tell the visitor holding a
  // reservation that it was someone else's — disabled button, no Cancel, no
  // bead, no way back short of a reload. Say so instead, and offer the reload.
  reservationsKnown = false;
  showButtons();
}

/* =============================================================================
   When reserving fails

   The server answers with a code rather than a sentence, which is the only
   reason this can be said in two languages: its own `message` is written once,
   in English, for a page that is read in both.

   The codes are not interchangeable, either. Two of them mean the card on
   screen is simply out of date — someone else got there first, or the present
   has already been given — and for those, putting the button back the way it
   was is the wrong answer: it invites a second click on something that cannot
   succeed. Those reconcile the card to what the server just said instead. The
   rest are genuinely "try again".
   ============================================================================= */

type ReserveErrorCode =
  | "CONFLICT"
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "OFFLINE"
  | "UNKNOWN";

const RESERVE_ERRORS: Record<
  "reserve" | "unreserve",
  Partial<Record<ReserveErrorCode, { en: string; ru: string }>>
> = {
  reserve: {
    CONFLICT: {
      en: "Someone else reserved this first.",
      ru: "Кто-то успел раньше.",
    },
    BAD_REQUEST: {
      en: "This one has already been given.",
      ru: "Этот подарок уже подарили.",
    },
    NOT_FOUND: {
      en: "This item is no longer on the list.",
      ru: "Этого пункта больше нет в списке.",
    },
    FORBIDDEN: {
      en: "Reserving is switched off at the moment.",
      ru: "Резервирование сейчас выключено.",
    },
  },
  unreserve: {
    NOT_FOUND: {
      en: "That reservation is already gone.",
      ru: "Этой резервации уже нет.",
    },
    FORBIDDEN: {
      en: "Only whoever made this reservation can cancel it.",
      ru: "Отменить резервацию может только тот, кто её сделал.",
    },
  },
};

const RESERVE_ERROR_FALLBACK: Record<
  "OFFLINE" | "UNKNOWN",
  { en: string; ru: string }
> = {
  /* Named for what the visitor can do about it rather than for what failed:
     "offline" is a state they can check and fix, where "network error" is a
     description of our problem. */
  OFFLINE: {
    en: "Couldn't reach the server. Check your connection and try again.",
    ru: "Не удалось связаться с сервером. Проверьте соединение и попробуйте ещё раз.",
  },
  UNKNOWN: {
    en: "That didn't go through. Please try again.",
    ru: "Не получилось. Попробуйте ещё раз.",
  },
};

/** The two codes that mean the card is stale rather than the action unlucky. */
function isTerminal(code: ReserveErrorCode): boolean {
  return code === "CONFLICT" || code === "BAD_REQUEST";
}

function errorTextFor(
  action: "reserve" | "unreserve",
  code: ReserveErrorCode,
  lang: Lang,
): string {
  const pair =
    RESERVE_ERRORS[action][code] ??
    RESERVE_ERROR_FALLBACK[code === "OFFLINE" ? "OFFLINE" : "UNKNOWN"];
  return lang === "ru" ? pair.ru : pair.en;
}

/** Paint the message, and remember what it was so a language switch can
    rewrite it — an error that stays in the language it happened in is how the
    switcher ends up looking broken. */
function showReserveError(
  article: Element | null,
  action: "reserve" | "unreserve",
  code: ReserveErrorCode,
): void {
  const el = article?.querySelector<HTMLElement>(".reserve-error");
  if (!el) return;
  el.dataset.action = action;
  el.dataset.code = code;
  el.textContent = errorTextFor(action, code, currentLang);
  el.hidden = false;
}

function clearReserveError(article: Element | null): void {
  const el = article?.querySelector<HTMLElement>(".reserve-error");
  if (!el || el.hidden) return;
  el.hidden = true;
  el.textContent = "";
  delete el.dataset.action;
  delete el.dataset.code;
}

function setReserveErrorsLang(lang: Lang): void {
  document
    .querySelectorAll<HTMLElement>(".reserve-error:not([hidden])")
    .forEach((el) => {
      const action = el.dataset.action as "reserve" | "unreserve" | undefined;
      const code = el.dataset.code as ReserveErrorCode | undefined;
      if (action && code) el.textContent = errorTextFor(action, code, lang);
    });
}

/** What came back, as one of our codes. An Astro action rejects rather than
    resolving when the request never reached the server at all, which is the
    case worth telling apart: everything else is the server declining, and this
    one is the visitor's train going into a tunnel. */
function codeOf(error: unknown): ReserveErrorCode {
  const code = (error as { code?: string } | null)?.code;
  if (
    code === "CONFLICT" ||
    code === "BAD_REQUEST" ||
    code === "NOT_FOUND" ||
    code === "FORBIDDEN" ||
    // Not a server code: the one the catch above puts here when the request
    // never got that far. It has to pass through, or the reader is told to try
    // again with no hint that the thing to check is their own connection.
    code === "OFFLINE"
  ) {
    return code;
  }
  return "UNKNOWN";
}

/** The retry button's label doubles as its accessible name. */
function setRetryLabel(button: HTMLButtonElement, lang: Lang): void {
  const text =
    (lang === "ru" ? button.dataset.ruRetry : button.dataset.enRetry) ?? null;
  button.textContent = text;
  if (text) button.setAttribute("aria-label", text);
}

function showButtons() {
  document
    .querySelectorAll<HTMLButtonElement>(".reserve-btn")
    .forEach((button) => {
      const reservation = reservationOf(button);
      const isReserved = reservation !== "none";

      // Get badge elements
      const article = button.closest("article");
      const reservedBadge = article?.querySelector(
        ".reserved-badge",
      ) as HTMLElement;

      // The fetch never landed, so on a taken card "whose" is unknown rather
      // than "someone else's" — the SSR attribute only ever says the latter.
      // The badge stays (it is true either way) but the button stays live and
      // asks for another try instead of locking the holder out of their Cancel.
      // A free card needs none of this: "nobody has it" is the server's to know.
      if (!reservationsKnown && isReserved) {
        setRetryLabel(button, currentLang);
        button.classList.add("reserve-btn--retry");
        if (reservedBadge) {
          reservedBadge.hidden = false;
          setBadgeLabel(reservedBadge, currentLang);
        }
        button.classList.remove("reserve-btn--loading");
        return;
      }

      // Set correct text based on language and state
      if (reservation === "mine") {
        button.textContent =
          (currentLang === "ru"
            ? button.dataset.ruCancel
            : button.dataset.enCancel) ?? null;
        if (reservedBadge) reservedBadge.hidden = true;
      } else if (isReserved) {
        // Someone else's reservation - hide button, show badge
        button.style.visibility = "hidden";
        button.style.pointerEvents = "none";
        button.disabled = true;
        if (reservedBadge) {
          reservedBadge.hidden = false;
          setBadgeLabel(reservedBadge, currentLang);
        }
      } else {
        button.textContent =
          (currentLang === "ru"
            ? button.dataset.ruReserve
            : button.dataset.enReserve) ?? null;
        if (reservedBadge) reservedBadge.hidden = true;
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
    // The reservations fetch gave up. Reserving or cancelling blind would be a
    // guess; fetching again on a fresh page is not.
    if (button.classList.contains("reserve-btn--retry")) {
      button.addEventListener("click", () => location.reload());
      return;
    }

    // Skip received items
    if (button.disabled) {
      return;
    }

    const reservation = reservationOf(button);

    // Get badge elements (in the item-image section)
    const article = button.closest("article");
    const ownBadge = article?.querySelector(
      ".own-reservation-badge",
    ) as HTMLElement;
    const reservedBadge = article?.querySelector(
      ".reserved-badge",
    ) as HTMLElement;

    // Set initial button state
    if (reservation !== "none") {
      if (reservation === "mine") {
        // Own reservation - show Cancel, own badge, and the message bead
        button.textContent =
          (currentLang === "ru"
            ? button.dataset.ruCancel
            : button.dataset.enCancel) ?? null;
        button.classList.add("own-reservation");
        showMessageBead(article);
        if (ownBadge) {
          ownBadge.hidden = false;
          setBadgeLabel(ownBadge, currentLang);
        }
        if (reservedBadge) reservedBadge.hidden = true;
      } else {
        // Someone else's reservation - hide button, show reserved badge
        button.style.visibility = "hidden";
        button.style.pointerEvents = "none";
        button.disabled = true;
        if (reservedBadge) {
          reservedBadge.hidden = false;
          setBadgeLabel(reservedBadge, currentLang);
        }
        if (ownBadge) ownBadge.hidden = true;
      }
    }

    button.addEventListener("click", async function () {
      const itemId = this.dataset.itemId;
      if (!itemId) return;

      const current = reservationOf(this);

      // Get badge for this item
      const itemArticle = this.closest("article");
      const itemBadge = itemArticle?.querySelector(
        ".own-reservation-badge",
      ) as HTMLElement;

      /* A fresh attempt clears the last one's verdict. Left up, an old
         "couldn't reach the server" sits under a card that is at this moment
         succeeding, and the reader has no way to tell which sentence is the
         current one. */
      clearReserveError(itemArticle);

      if (current === "mine") {
        // Cancel reservation - optimistic UI
        const previousState = {
          reservation: this.dataset.reservation,
          textContent: this.textContent,
          hasClass: this.classList.contains("own-reservation"),
          badgeHidden: itemBadge?.hidden,
        };

        // Optimistically update UI
        this.dataset.reservation = "none";
        this.textContent =
          (currentLang === "ru"
            ? this.dataset.ruReserve
            : this.dataset.enReserve) ?? null;
        this.classList.remove("own-reservation");
        if (itemBadge) itemBadge.hidden = true;
        // The message goes with the reservation, but only once the server has
        // agreed to delete it — a rollback has to be able to put it back.
        hideMessageBead(itemArticle, { forget: false });
        // Update aria-label
        const reserveAriaLabel =
          currentLang === "ru"
            ? this.dataset.ariaLabelRuReserve
            : this.dataset.ariaLabelEnReserve;
        if (reserveAriaLabel) this.setAttribute("aria-label", reserveAriaLabel);

        // Make API call in background. The await is wrapped because a request
        // that never arrives rejects instead of resolving with `error`, and
        // that path used to leave the optimistic state on screen for good: the
        // card said the reservation was cancelled, the server had never heard,
        // and nothing on the page ever said otherwise.
        let error: unknown = null;
        try {
          ({ error } = await actions.unreserve({
            itemId: parseInt(itemId),
            visitorId,
          }));
        } catch {
          error = { code: "OFFLINE" };
        }

        // Rollback on error
        if (error) {
          this.dataset.reservation = previousState.reservation;
          this.textContent = previousState.textContent;
          if (previousState.hasClass) this.classList.add("own-reservation");
          if (itemBadge) itemBadge.hidden = previousState.badgeHidden ?? false;
          showMessageBead(itemArticle);
          showReserveError(itemArticle, "unreserve", codeOf(error));
        } else {
          clearReserveError(itemArticle);
          forgetMessage(itemArticle);
        }
      } else if (current === "none") {
        // Make reservation - optimistic UI
        const previousState = {
          reservation: this.dataset.reservation,
          textContent: this.textContent,
          hasClass: this.classList.contains("own-reservation"),
          badgeHidden: itemBadge?.hidden,
        };

        // Optimistically update UI
        this.dataset.reservation = "mine";
        this.textContent =
          (currentLang === "ru"
            ? this.dataset.ruCancel
            : this.dataset.enCancel) ?? null;
        this.classList.add("own-reservation");
        if (itemBadge) {
          itemBadge.hidden = false;
          setBadgeLabel(itemBadge, currentLang);
        }
        // Update aria-label
        const cancelAriaLabel =
          currentLang === "ru"
            ? this.dataset.ariaLabelRuCancel
            : this.dataset.ariaLabelEnCancel;
        if (cancelAriaLabel) this.setAttribute("aria-label", cancelAriaLabel);

        // Make API call in background — see the note on the cancel path above
        // for why this one is wrapped.
        let error: unknown = null;
        try {
          ({ error } = await actions.reserve({
            itemId: parseInt(itemId),
            visitorId,
          }));
        } catch {
          error = { code: "OFFLINE" };
        }

        // Rollback on error
        if (error) {
          const code = codeOf(error);
          if (isTerminal(code)) {
            /* Not a rollback: the card was wrong, not unlucky. Someone else
               holds this present, or it has already been given, and putting
               "Reserve" back would be offering a button that cannot work. It
               goes to the state the server just described instead, which is
               also the state a reload would have shown. */
            this.dataset.reservation = "other";
            this.textContent =
              (currentLang === "ru"
                ? this.dataset.ruReserved
                : this.dataset.enReserved) ?? null;
            this.classList.remove("own-reservation");
            const reservedAria =
              currentLang === "ru"
                ? this.dataset.ariaLabelRuReserved
                : this.dataset.ariaLabelEnReserved;
            if (reservedAria) this.setAttribute("aria-label", reservedAria);
            /* The card wears one of two badges, and this path swaps which. The
               optimistic click had just raised "you reserved this"; the truth
               is that somebody else did, so that one goes and the neutral
               "reserved" takes its place. Showing the optimistic badge here
               left a card whose badge, button and message each said something
               different. */
            if (itemBadge) itemBadge.hidden = true;
            const takenBadge = itemArticle?.querySelector<HTMLElement>(
              ".reserved-badge",
            );
            if (takenBadge) {
              takenBadge.hidden = false;
              setBadgeLabel(takenBadge, currentLang);
            }
          } else {
            this.dataset.reservation = previousState.reservation;
            this.textContent = previousState.textContent;
            if (!previousState.hasClass) {
              this.classList.remove("own-reservation");
            }
            if (itemBadge) itemBadge.hidden = previousState.badgeHidden ?? true;
          }
          showReserveError(itemArticle, "reserve", code);
        } else {
          clearReserveError(itemArticle);
          // Offering to write on a reservation is only honest once there is one
          // — `setReservationMessage` has nothing to attach to until the insert
          // lands. So the bead (and the invitation) waits for the round trip
          // even though the button itself did not.
          showMessageBead(itemArticle, { open: true });
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
    setReservationMessagesLang(lang);
    setReserveErrorsLang(lang);
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
  // Every price on a card, the footer's and the per-option ones alike — they
  // carry the same data attributes and want the same treatment.
  const priceElements = document.querySelectorAll<HTMLElement>(
    "[data-price-original]",
  );

  priceElements.forEach((el) => {
    const originalPrice = el.dataset.priceOriginal || "";
    const priceUsd = el.dataset.priceUsd;
    const priceRub = el.dataset.priceRub;
    const isOriginalUsd = el.dataset.originalIsUsd === "true";
    // "from", on a footer price that is the cheapest of several options
    const prefix =
      (lang === "ru" ? el.dataset.pricePrefixRu : el.dataset.pricePrefixEn) ??
      "";

    // Set displayed price based on language
    const price =
      lang === "ru" && priceRub ? formatRubPrice(priceRub) : originalPrice;
    el.textContent = prefix ? `${prefix} ${price}` : price;

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
    // Writing textContent replaces every child, so the contract is that a
    // translatable element owns nothing but its own text. Where an element does
    // have children — a badge with a state dot — the attributes go on the inner
    // label instead, and that label is what this loop finds.
    if (text !== undefined) el.textContent = text;
  });

  // Update tooltip translations
  const tooltipElements = document.querySelectorAll<HTMLElement>(
    "[data-tooltip-en][data-tooltip-ru]",
  );

  tooltipElements.forEach((el) => {
    const tooltip = lang === "ru" ? el.dataset.tooltipRu : el.dataset.tooltipEn;
    if (tooltip) {
      el.setAttribute("data-tooltip", tooltip);
    }
  });

  // Update reserve buttons based on their state
  const reserveButtons =
    document.querySelectorAll<HTMLButtonElement>(".reserve-btn");

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

    // A retry button has no reservation state to render — only its own label.
    if (btn.classList.contains("reserve-btn--retry")) {
      setRetryLabel(btn, lang);
      return;
    }

    const reservation = reservationOf(btn);
    const isReceived =
      btn.dataset.enReceived &&
      (btn.textContent === "Received" || btn.textContent === "Получено");

    if (isReceived) {
      btn.textContent =
        (lang === "ru" ? btn.dataset.ruReceived : btn.dataset.enReceived) ??
        null;
    } else if (reservation === "mine") {
      btn.textContent =
        (lang === "ru" ? btn.dataset.ruCancel : btn.dataset.enCancel) ?? null;
    } else if (reservation === "other") {
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

  reserveButtons.forEach((btn) => {
    // updateLanguage already gave it one, matching what it says.
    if (btn.classList.contains("reserve-btn--retry")) return;

    const reservation = reservationOf(btn);

    let ariaLabel: string | undefined;

    if (reservation === "mine") {
      ariaLabel =
        lang === "ru"
          ? btn.dataset.ariaLabelRuCancel
          : btn.dataset.ariaLabelEnCancel;
    } else if (reservation === "other") {
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
initTooltips();
