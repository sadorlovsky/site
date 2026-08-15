import { actions } from "astro:actions";
import type { Lang } from "@lib/i18n";
import { initTooltips } from "./tooltip";
import { getVisitorId, isFirstVisit } from "./visitor-id";
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
 * looking; the per-visitor fetch below is what promotes a card to "mine". A
 * taken card's button stays hidden (`.reserve-btn--loading`) until that lands,
 * so the pessimistic first guess is never on screen.
 *
 * Only a taken card, though. A free one says "none", which no answer can
 * contradict — nobody's reservation is going to appear out of a request — so it
 * is shown straight away rather than held back with the rest. Same for every
 * card on a first visit: see isFirstVisit().
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
 * Items this visitor has reserved or cancelled by hand, by item id.
 *
 * The buttons answer clicks before the reservations fetch does — that is the
 * whole point of wiring them early — so a press can land while the request is
 * still out, and what comes back is then a picture of the world from before it.
 * Applied blindly it walks a just-reserved card back to "Reserve" while the
 * reservation sits in the database, and the visitor is looking at a button that
 * disagrees with the server. A click is newer than the answer to a question
 * asked before it, so the fetch does not get to speak for these.
 */
const locallyDecided = new Set<number>();

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

  // Wiring before revealing, and the order is load-bearing: showButtons hides a
  // card it believes is someone else's by disabling the button, and a disabled
  // button is one this function declines to wire. Run it the other way round
  // and every card the server called taken spends the session inert — including
  // the ones the fetch below is about to hand back as free.
  initializeReserveButtons();
  initializeLangChangeListener();

  // Everything the fetch cannot contradict goes on screen now. A free card is
  // one of those: "nobody has it" is the server's to know, and no answer turns
  // it into someone's reservation — so it has no business waiting on a request
  // that took 365-415ms warm and 2.26s on a cold function, to say `{}`. On a
  // first visit the taken cards are safe too, since a visitor with a fresh id
  // owns none of them.
  showButtons(isFirstVisit() ? "all" : "free");

  // What is genuinely per-visitor still comes from the network, and the cards
  // it can still change — someone else's reservation that is really this
  // visitor's — stay hidden until it lands, exactly as before.
  await fetchAndApplyReservations();
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
        if (locallyDecided.has(id)) return;

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

/**
 * Which buttons this pass is allowed to reveal.
 *
 * "free" is the pass that runs before the fetch: it settles the cards whose
 * answer is already known and leaves every taken one hidden, so the server's
 * pessimistic "someone else's" still never reaches the screen. "all" is the
 * pass after the fetch — and the first-visit pass, where there is nothing left
 * to learn.
 */
type ButtonScope = "free" | "all";

/**
 * Undo the hiding below, so a pass can disagree with the one before it.
 *
 * "Someone else's" is the only state that writes to the button rather than to
 * its text, and it writes inline — which stuck, because nothing put it back.
 * /wishlist is served from the ISR cache and neither reserving nor cancelling
 * revalidates it, so the `isReserved` in the HTML is as old as the cache entry;
 * the per-visitor fetch correcting it to "free" is ordinary, not exotic. Before
 * this, that correction left the card with a hidden button, no badge, and no
 * way to reserve it. The retry button was invisible for the same reason.
 */
function revealButton(button: HTMLButtonElement): void {
  button.style.visibility = "";
  button.style.pointerEvents = "";
  button.classList.remove("reserve-btn--taken");
  button.disabled = false;
}

/**
 * The accessible name for the state a button has just been put into.
 *
 * One function because the three names are one decision. They were written out
 * at four call sites, and one of them — the branch that hands a returning
 * holder their Cancel — simply forgot, leaving a button labelled "Отменить"
 * that announced "Зарезервировано". A visible label and a spoken one
 * describing different buttons is worse than either being wrong.
 */
function setStateAriaLabel(
  button: HTMLButtonElement,
  state: "reserve" | "cancel" | "reserved",
): void {
  const key = (
    { reserve: "Reserve", cancel: "Cancel", reserved: "Reserved" } as const
  )[state];
  const label =
    currentLang === "ru"
      ? button.dataset[`ariaLabelRu${key}`]
      : button.dataset[`ariaLabelEn${key}`];
  if (label) button.setAttribute("aria-label", label);
}

/**
 * Someone else has this one: the pill says so and stops being pressable.
 *
 * It used to hide itself instead, which left a footer holding a price and a
 * gap where the control belongs — and a gap reads as a card that failed to
 * load, not as a present that is spoken for. On a phone, where a card is
 * roughly a screen, a half-claimed list turned into thirty of those in a row.
 *
 * `disabled` rather than `aria-disabled`: there is nothing to press, and
 * leaving thirty inert pills in the tab order costs a keyboard reader far more
 * than the announcement is worth. The card still says "reserved" out loud —
 * the badge over the photograph carries the same word.
 */
function markTaken(button: HTMLButtonElement): void {
  button.textContent =
    (currentLang === "ru"
      ? button.dataset.ruReserved
      : button.dataset.enReserved) ?? null;
  setStateAriaLabel(button, "reserved");
  button.classList.add("reserve-btn--taken");
  button.disabled = true;
}

function showButtons(scope: ButtonScope = "all") {
  document
    .querySelectorAll<HTMLButtonElement>(".reserve-btn")
    .forEach((button) => {
      const reservation = reservationOf(button);
      const isReserved = reservation !== "none";

      if (scope === "free" && isReserved) return;

      // Whatever an earlier pass concluded about this card, this one is about
      // to conclude it again from scratch — so start from a button that is
      // simply a button. Only the "someone else's" branch below hides one, and
      // only it hides one again.
      revealButton(button);

      // Get badge elements
      const article = button.closest("article");
      // The card's own half of that reset — see revealButton. Only the
      // "someone else's" branch puts it back.
      article?.classList.remove("item-taken");
      const reservedBadge = article?.querySelector(
        ".reserved-badge",
      ) as HTMLElement;
      const ownBadge = article?.querySelector(
        ".own-reservation-badge",
      ) as HTMLElement;

      // The fetch never landed, so on a taken card "whose" is unknown rather
      // than "someone else's" — the SSR attribute only ever says the latter.
      // The badge stays (it is true either way) but the button stays live and
      // asks for another try instead of locking the holder out of their Cancel.
      // A free card needs none of this: "nobody has it" is the server's to know.
      if (!reservationsKnown && isReserved) {
        setRetryLabel(button, currentLang);
        button.classList.add("reserve-btn--retry");
        // Reserving or cancelling blind would be a guess; fetching again on a
        // fresh page is not. This is where the button *becomes* a retry, and so
        // where the reload has to be attached: initializeReserveButtons ran
        // long before the fetch had given up and saw an ordinary button. Its
        // own handler stays on and does nothing here — it acts on "mine" and
        // "none", and this branch only ever runs on a taken card.
        if (!button.dataset.retryWired) {
          button.dataset.retryWired = "true";
          button.addEventListener("click", () => location.reload());
        }
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
        // …and the accessible name with it. updateAriaLabels ran before the
        // per-visitor fetch answered, off the server's pessimistic "other", so
        // without this the holder's button reads "Отменить" and announces
        // "Зарезервировано: …" — the visible label and the spoken one
        // describing different buttons. Every branch here now names itself;
        // markTaken does the same for the branch below.
        setStateAriaLabel(button, "cancel");
        // The whole of "this one is yours" is settled here, not split with
        // initializeReserveButtons as it used to be. That split is what broke
        // an own reservation on reload: the buttons were wired before the
        // per-visitor answer arrived, read the server's pessimistic "other",
        // and hid themselves with inline styles that this pass never removed —
        // leaving a card with no button and no badge at all.
        button.classList.add("own-reservation");
        showMessageBead(article);
        if (ownBadge) {
          ownBadge.hidden = false;
          setBadgeLabel(ownBadge, currentLang);
        }
        if (reservedBadge) reservedBadge.hidden = true;
      } else if (isReserved) {
        // Someone else's reservation — the pill states it and the badge agrees
        markTaken(button);
        article?.classList.add("item-taken");
        if (reservedBadge) {
          reservedBadge.hidden = false;
          setBadgeLabel(reservedBadge, currentLang);
        }
        if (ownBadge) ownBadge.hidden = true;
      } else {
        button.textContent =
          (currentLang === "ru"
            ? button.dataset.ruReserve
            : button.dataset.enReserve) ?? null;
        setStateAriaLabel(button, "reserve");
        if (reservedBadge) reservedBadge.hidden = true;
        if (ownBadge) ownBadge.hidden = true;
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
    // Every button gets wired, and the two guards that used to stand here are
    // gone. Both belonged to an older order of events, when this ran after the
    // fetch: the retry one now fires where the retry is made, and the
    // `disabled` one was written for received items — which render no reserve
    // button at all — so all it ever caught were the buttons showButtons had
    // just hidden, the very cards the fetch can still hand back as free.

    // What the card looks like is showButtons' business alone. This function
    // runs before the per-visitor fetch has answered, so anything it decided
    // here would be decided from the server's pessimistic guess.
    button.addEventListener("click", async function () {
      const itemId = this.dataset.itemId;
      if (!itemId) return;

      const id = parseInt(itemId);
      const current = reservationOf(this);
      // Someone else's, or unknown-whose after the fetch gave up. Nothing to
      // toggle; a retry button carries its own handler.
      if (current === "other") return;

      // Past here the visitor has decided something about this card, and an
      // answer to a question asked before the click does not get to undo it.
      locallyDecided.add(id);

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
        setStateAriaLabel(this, "reserve");

        // Make API call in background. The await is wrapped because a request
        // that never arrives rejects instead of resolving with `error`, and
        // that path used to leave the optimistic state on screen for good: the
        // card said the reservation was cancelled, the server had never heard,
        // and nothing on the page ever said otherwise.
        let error: unknown = null;
        try {
          ({ error } = await actions.unreserve({
            itemId: id,
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
        setStateAriaLabel(this, "cancel");

        // Make API call in background — see the note on the cancel path above
        // for why this one is wrapped.
        let error: unknown = null;
        try {
          ({ error } = await actions.reserve({
            itemId: id,
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
            this.classList.remove("own-reservation");
            // The same inert pill a card reserved by somebody else wears on
            // arrival — label, accessible name and all. Reached from the other
            // direction, but it is the identical state, and writing it out a
            // second time here is how the two would drift.
            markTaken(this);
            itemArticle?.classList.add("item-taken");
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

/**
 * Both numbers a price shows, for one language.
 *
 * The second one used to be a `data-tooltip` on a non-focusable span, which
 * made it a mouse-only fact on a page whose readers are mostly holding a
 * phone; and in Russian there was no second number at all — the roubles simply
 * replaced the shop's price, a computed figure with nothing marking it as one.
 * It is text now, on both, and the tilde marks whichever number this site
 * worked out rather than quoted.
 *
 * Kept in step with applyPrices in WishlistPage.astro, which paints the same
 * two nodes before this module lands.
 */
function priceParts(
  el: HTMLElement,
  lang: Lang,
): { value: string; alt: string } {
  const originalPrice = el.dataset.priceOriginal || "";
  const priceUsd = el.dataset.priceUsd;
  const priceRub = el.dataset.priceRub;
  const isOriginalUsd = el.dataset.originalIsUsd === "true";
  const isOriginalRub = el.dataset.originalIsRub === "true";

  if (lang === "ru") {
    if (!priceRub) return { value: originalPrice, alt: "" };
    const roubles = formatRubPrice(priceRub);
    return isOriginalRub
      ? { value: roubles, alt: "" }
      : { value: `~${roubles}`, alt: originalPrice };
  }

  return {
    value: originalPrice,
    alt: !isOriginalUsd && priceUsd ? `~${priceUsd}` : "",
  };
}

function updatePricesForLanguage(lang: "en" | "ru") {
  // Every price on a card, the footer's and the per-option ones alike — they
  // carry the same data attributes and want the same treatment.
  const priceElements = document.querySelectorAll<HTMLElement>(
    "[data-price-original]",
  );

  priceElements.forEach((el) => {
    // "from", on a footer price that is the cheapest of several options
    const prefix =
      (lang === "ru" ? el.dataset.pricePrefixRu : el.dataset.pricePrefixEn) ??
      "";
    const { value, alt } = priceParts(el, lang);

    // Never the host's own textContent: it has two children and that would
    // replace them both.
    const valueEl = el.querySelector<HTMLElement>(".price-value");
    const altEl = el.querySelector<HTMLElement>(".price-alt");
    if (valueEl) valueEl.textContent = prefix ? `${prefix} ${value}` : value;
    if (altEl) {
      altEl.textContent = alt;
      altEl.hidden = !alt;
    }

    // The conversion is on the card now, so nothing here wants a tooltip. The
    // attribute is cleared rather than left alone because a price rendered
    // before this change may still be carrying one.
    el.removeAttribute("data-tooltip");
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
