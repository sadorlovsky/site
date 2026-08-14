// The message a reserver leaves for the wishlist owner.
//
// One popover for the page, anchored to whichever card's bead was pressed
// (components/wishlist/ReservationMessage.astro explains why it can't live
// inside the card). Everything about where it lands is Floating UI's, including
// `autoUpdate` — the anchor moves under it constantly: the grid reflows on a
// filter change, the card lifts 8px on hover, and the page scrolls.
//
// Messages are held in a Map keyed by item id rather than on the DOM. They only
// ever arrive for the visitor who wrote them, and a data attribute on a card is
// a place for other people's scripts to read them from.
//
// Below 600px the panel is not that lens but a sheet at the bottom edge; see
// "The sheet" below, and the block of the same name in styles/wishlist.css.

import { actions } from "astro:actions";
import { computePosition, autoUpdate, offset, flip, shift } from "@floating-ui/dom";
import type { Placement } from "@floating-ui/dom";
import type { Lang } from "@lib/i18n";
import { getVisitorId } from "./visitor-id";

const CLOSE_DURATION = 220; // must outlast the CSS exit transition
/** The sheet's slide is 0.36s, and it is the exit the same rule applies to. */
const SHEET_CLOSE_DURATION = 380;
/** This page's phone line — where the filters become a bar on the bottom edge. */
const SHEET_QUERY = "(max-width: 600px)";
/** Under this, the visual viewport shrank for a toolbar and not for a keyboard. */
const KEYBOARD_FLOOR = 120;

let lang: Lang = "en";
let popover: HTMLElement | null = null;
let textarea: HTMLTextAreaElement | null = null;
let counter: HTMLElement | null = null;
let errorLine: HTMLElement | null = null;
let dismissBtn: HTMLButtonElement | null = null;
let saveBtn: HTMLButtonElement | null = null;
let closeBtn: HTMLButtonElement | null = null;
let scrim: HTMLElement | null = null;

let anchor: HTMLButtonElement | null = null;
let stopFollowing: (() => void) | null = null;
let closeTimer: number | undefined;
let sheetMedia: MediaQueryList | null = null;
let scrimTimer: number | undefined;
let stopWatchingKeyboard: (() => void) | null = null;
/** A write is in flight. `setBusy` disables the buttons; this covers the rest. */
let saving = false;

/** itemId → the message this visitor saved on their own reservation. */
const messages = new Map<number, string>();

function itemIdOf(el: HTMLElement | null): number | null {
  const raw = el?.dataset.itemId;
  if (!raw) return null;
  const id = Number.parseInt(raw, 10);
  return Number.isNaN(id) ? null : id;
}

/* -------------------------------------------------------------------------
   The bead in the card footer
   ------------------------------------------------------------------------- */

function beadOf(article: Element | null): HTMLButtonElement | null {
  return article?.querySelector<HTMLButtonElement>(".message-btn") ?? null;
}

/**
 * Reflect "does this reservation carry a message?" onto the bead: a filled
 * state, and a tooltip that offers to edit rather than to write.
 *
 * The swap happens on `data-tooltip-en`/`-ru` rather than on `data-tooltip`
 * itself. Three separate passes rewrite `data-tooltip` from those two —
 * LangInit's first run, the language switcher's, and this page's own — and at
 * least one of them lands after the reservation fetch resolves, so writing only
 * the derived attribute got overwritten with "Leave a message" on a bead that
 * already held one. Moving the state into the source keeps every pass correct
 * without any of them knowing this feature exists.
 */
function syncBead(bead: HTMLButtonElement) {
  const itemId = itemIdOf(bead);
  const has = itemId !== null && !!messages.get(itemId);
  bead.classList.toggle("has-message", has);

  const en = has ? bead.dataset.tooltipEditEn : bead.dataset.tooltipWriteEn;
  const ru = has ? bead.dataset.tooltipEditRu : bead.dataset.tooltipWriteRu;
  if (!en || !ru) return;

  bead.dataset.tooltipEn = en;
  bead.dataset.tooltipRu = ru;
  bead.setAttribute("data-tooltip", lang === "ru" ? ru : en);
}

/** Called when a reservation becomes (or is found to be) this visitor's. */
export function showMessageBead(
  article: Element | null,
  { open = false } = {},
): void {
  const bead = beadOf(article);
  if (!bead) return;
  bead.hidden = false;
  syncBead(bead);
  // Auto-opening right after a reservation is the one moment the offer makes
  // sense unprompted. Focus follows only on a device with a real pointer: on a
  // phone it would throw up the keyboard over the card the visitor just acted on.
  if (open) {
    openPopover(bead, {
      focus: window.matchMedia("(hover: hover) and (pointer: fine)").matches,
    });
  }
}

/**
 * Called when a reservation is cancelled or turns out to be someone else's.
 *
 * `forget: false` takes the bead off the card but keeps the message cached, for
 * the optimistic half of a cancel: if the server refuses, `showMessageBead`
 * puts it back with its message intact.
 */
export function hideMessageBead(
  article: Element | null,
  { forget = true } = {},
): void {
  const bead = beadOf(article);
  if (!bead) return;
  bead.hidden = true;
  bead.classList.remove("has-message");
  if (anchor === bead) closePopover({ restoreFocus: false });
  if (forget) forgetMessage(article);
}

/** Drops the cached message once the reservation holding it is really gone. */
export function forgetMessage(article: Element | null): void {
  const itemId = itemIdOf(beadOf(article));
  if (itemId !== null) messages.delete(itemId);
}

/** Seeds the cache from the reservations fetch, before any bead is revealed. */
export function primeMessages(seed: Map<number, string>): void {
  messages.clear();
  seed.forEach((message, itemId) => messages.set(itemId, message));
}

/* -------------------------------------------------------------------------
   The popover
   ------------------------------------------------------------------------- */

/** Scale the panel out of the bead it belongs to, not out of its own middle. */
function originFor(placement: Placement): string {
  const [side, alignment] = placement.split("-");
  const vertical = side === "top" ? "bottom" : side === "bottom" ? "top" : "center";
  const horizontal =
    alignment === "end" ? "right" : alignment === "start" ? "left" : "center";
  return `${horizontal} ${vertical}`;
}

function position() {
  if (!popover || !anchor) return;
  // A sheet is positioned by its edges. `autoUpdate` is stopped when the shape
  // changes, but a frame already in flight would still land here and write the
  // inline left/top that beats them.
  if (isSheet()) return;
  computePosition(anchor, popover, {
    strategy: "fixed",
    placement: "top-end",
    middleware: [
      offset(10),
      flip({ fallbackPlacements: ["bottom-end", "top-start", "bottom-start"] }),
      // crossAxis too: flip only chooses a side, and on a short viewport — a
      // phone in landscape, or a bead sitting right against the bottom edge
      // under the mobile filter bar — neither side has room for the whole
      // panel. Overlapping the bead beats hanging off the screen.
      shift({ padding: 12, crossAxis: true }),
    ],
  }).then(({ x, y, placement }) => {
    if (!popover) return;
    popover.style.left = `${x}px`;
    popover.style.top = `${y}px`;
    popover.style.setProperty("--popover-origin", originFor(placement));
  });
}

/* -------------------------------------------------------------------------
   The sheet

   Which shape the panel wears is a media query's answer, but three parts of
   wearing it are not CSS's to give: Floating UI has to stop writing left/top,
   the kit's control sizes have to step up for a thumb, and the sheet has to
   ride above whatever the software keyboard is covering.
   ------------------------------------------------------------------------- */

function isSheet(): boolean {
  return sheetMedia?.matches ?? false;
}

/** The grid must not scroll behind an open sheet: it is a modal, not a popover. */
function lockPage(locked: boolean) {
  document.body.style.overflow = locked ? "hidden" : "";
}

function hideScrim() {
  if (!scrim) return;
  scrim.classList.remove("is-open");
  window.clearTimeout(scrimTimer);
  // It leaves after the sheet has, so its fade is not cut short.
  scrimTimer = window.setTimeout(() => {
    if (scrim && !scrim.classList.contains("is-open")) scrim.hidden = true;
  }, SHEET_CLOSE_DURATION);
}

/**
 * A sheet pinned to the bottom edge and a software keyboard want the same
 * pixels, and the sheet loses: `position: fixed` is measured against the layout
 * viewport, which the keyboard does not shrink, so the field the whole sheet
 * exists for ends up underneath it. `visualViewport` reports the difference and
 * the sheet rides up by exactly that much.
 *
 * The floor is there because iOS reports a shrunken visual viewport for its own
 * collapsing toolbars with no keyboard on screen at all, and a sheet hovering
 * 50px above the bottom edge for no reason is worse than one that never moved.
 * Nothing between a toolbar and a keyboard is that size.
 */
function watchKeyboard(on: boolean) {
  const viewport = window.visualViewport;
  if (!on || !viewport) {
    stopWatchingKeyboard?.();
    stopWatchingKeyboard = null;
    return;
  }
  if (stopWatchingKeyboard) return;

  const measure = () => {
    if (!popover) return;
    const covered = window.innerHeight - viewport.height - viewport.offsetTop;
    const inset = covered > KEYBOARD_FLOOR ? Math.round(covered) : 0;
    popover.style.setProperty("--sheet-keyboard", `${inset}px`);
  };

  viewport.addEventListener("resize", measure);
  viewport.addEventListener("scroll", measure);
  stopWatchingKeyboard = () => {
    viewport.removeEventListener("resize", measure);
    viewport.removeEventListener("scroll", measure);
  };
  measure();
}

/**
 * Puts the shape the viewport asked for onto the panel.
 *
 * Runs on every open, and again whenever the breakpoint is crossed while the
 * panel is up — re-shaping rather than closing, because the panel may be
 * holding text that exists nowhere else and turning a phone sideways is not a
 * decision to discard it.
 */
function applyShape() {
  if (!popover || !textarea) return;
  const sheet = isSheet();

  // A sheet over a scrim with the page locked behind it is modal. An anchored
  // popover is not, and must not claim to be: `aria-modal` hides the rest of
  // the document, and the card this is about is the rest of the document.
  if (sheet) popover.setAttribute("aria-modal", "true");
  else popover.removeAttribute("aria-modal");

  // On a phone this is not glass but the veil. Dropping the class is cheaper —
  // and truer in the DOM — than out-specifying its four declarations from a
  // page stylesheet.
  popover.classList.toggle("liquid-glass", !sheet);

  // The kit's own steps, swapped rather than copied: 44px under a thumb, 32px
  // under a cursor, each bringing the padding, radius and type that go with it.
  textarea.classList.toggle("kit-input--lg", sheet);
  textarea.classList.toggle("kit-input--sm", !sheet);
  for (const button of [dismissBtn, saveBtn]) {
    button?.classList.toggle("kit-btn--lg", sheet);
    button?.classList.toggle("kit-btn--sm", !sheet);
  }

  if (sheet) {
    stopFollowing?.();
    stopFollowing = null;
    // Whatever Floating UI last wrote outranks the sheet's own edges.
    popover.style.left = "";
    popover.style.top = "";
    popover.style.removeProperty("--popover-origin");
    lockPage(true);
    watchKeyboard(true);
    // Only when the panel is already up. On the way in, the scrim needs the
    // same frame of closed styles the sheet does, and `openPopover` gives the
    // two of them that frame together.
    if (popover.classList.contains("is-open") && scrim) {
      window.clearTimeout(scrimTimer);
      scrim.hidden = false;
      scrim.classList.add("is-open");
    }
  } else {
    lockPage(false);
    watchKeyboard(false);
    hideScrim();
    popover.style.removeProperty("--sheet-keyboard");
    if (anchor && !stopFollowing) {
      stopFollowing = autoUpdate(anchor, popover, position);
    }
  }
}

/**
 * Tab stays inside the sheet, and only inside the sheet. The anchored popover
 * is not modal: tabbing off its last button and back into the card it belongs
 * to is how it is meant to be left.
 */
function trapTab(event: KeyboardEvent) {
  if (event.key !== "Tab" || !popover || !anchor || !isSheet()) return;
  const stops = Array.from(
    popover.querySelectorAll<HTMLElement>(
      "button:not([disabled]), textarea:not([disabled])",
    ),
  );
  if (stops.length === 0) return;

  const active = document.activeElement;
  const inside = popover.contains(active);
  const leaving = event.shiftKey ? active === stops[0] : active === stops.at(-1);
  if (!leaving && inside) return;

  event.preventDefault();
  (event.shiftKey ? stops.at(-1) : stops[0])?.focus();
}

function setError(message: string | null) {
  if (!errorLine) return;
  errorLine.textContent = message ?? "";
  errorLine.hidden = !message;
}

function setBusy(busy: boolean) {
  if (!popover) return;
  popover.setAttribute("aria-busy", String(busy));
  if (dismissBtn) dismissBtn.disabled = busy;
  if (saveBtn) saveBtn.disabled = busy;
}

function updateCounter() {
  if (!textarea || !counter) return;
  counter.textContent = `${textarea.value.length}/${textarea.maxLength}`;
}

/**
 * The dismiss button is "Cancel" until there is something to remove, at which
 * point it becomes the way to remove it. Two buttons for one slot would leave a
 * dead "Delete" sitting there for every visitor who has yet to write anything.
 */
function syncDismissButton() {
  if (!dismissBtn) return;
  const itemId = itemIdOf(anchor);
  const hasSaved = itemId !== null && !!messages.get(itemId);
  const label = hasSaved
    ? lang === "ru"
      ? dismissBtn.dataset.ruDelete
      : dismissBtn.dataset.enDelete
    : lang === "ru"
      ? dismissBtn.dataset.ruCancel
      : dismissBtn.dataset.enCancel;
  if (label) dismissBtn.textContent = label;
  dismissBtn.classList.toggle("kit-btn--danger", hasSaved);
  dismissBtn.classList.toggle("kit-btn--ghost", !hasSaved);
}

function openPopover(bead: HTMLButtonElement, { focus = true } = {}) {
  if (!popover || !textarea) return;
  const itemId = itemIdOf(bead);
  if (itemId === null) return;

  if (anchor && anchor !== bead) anchor.setAttribute("aria-expanded", "false");
  window.clearTimeout(closeTimer);
  stopFollowing?.();
  // Nulled as well as called: `applyShape` starts a fresh follow only when
  // nothing is following, and a stopped cleanup left in the variable reads as
  // one that is still running.
  stopFollowing = null;

  anchor = bead;
  textarea.value = messages.get(itemId) ?? "";
  textarea.placeholder =
    (lang === "ru"
      ? textarea.dataset.placeholderRu
      : textarea.dataset.placeholderEn) ?? "";
  setError(null);
  setBusy(false);
  updateCounter();
  syncDismissButton();

  const sheet = isSheet();
  popover.hidden = false;
  if (sheet && scrim) {
    window.clearTimeout(scrimTimer);
    scrim.hidden = false;
  }
  // Shape first: it is what decides whether the closed styles the next line
  // freezes are a lens scaled out of its bead or a sheet below the edge. It
  // also starts the follow, on the shape that has an anchor to follow.
  applyShape();
  // The entrance transition needs a frame with the closed styles applied.
  void popover.offsetHeight;
  popover.classList.add("is-open");
  if (sheet) scrim?.classList.add("is-open");
  bead.setAttribute("aria-expanded", "true");

  if (focus) {
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  } else if (sheet) {
    // A modal must not leave focus out on the page it has just covered. The
    // close button rather than the field, because this path is the panel
    // opening by itself after a reservation and a keyboard is not what that
    // moment asked for — the same reason the focus was declined here at all.
    closeBtn?.focus();
  }
}

function closePopover({ restoreFocus = true } = {}) {
  if (!popover || popover.hidden) return;

  const returnTo = anchor;
  const sheet = isSheet();
  // Read before anything moves it: the sheet gives the keyboard back by blurring
  // below, which would otherwise answer the question this asks.
  const hadFocus = popover.contains(document.activeElement);

  popover.classList.remove("is-open");
  hideScrim();
  lockPage(false);
  watchKeyboard(false);
  anchor?.setAttribute("aria-expanded", "false");
  stopFollowing?.();
  stopFollowing = null;
  anchor = null;

  // Hand the keyboard back while the sheet is still leaving rather than when it
  // has gone. Focus in a field that is about to be `hidden` lands on <body>
  // anyway, and on iOS it takes the keyboard with it a beat too late.
  if (sheet && hadFocus) (document.activeElement as HTMLElement | null)?.blur();

  window.clearTimeout(closeTimer);
  closeTimer = window.setTimeout(() => {
    if (popover && !popover.classList.contains("is-open")) {
      popover.hidden = true;
      // Cleared here and not above: dropping it while the sheet is still on
      // screen would slam it down the keyboard's height first.
      popover.style.removeProperty("--sheet-keyboard");
    }
  }, sheet ? SHEET_CLOSE_DURATION : CLOSE_DURATION);

  // Only pull focus back if it was still inside the panel we just dismissed —
  // clicking elsewhere on the page has already put it where it belongs.
  if (restoreFocus && returnTo && hadFocus) {
    returnTo.focus();
  }
}

/** Writes the textarea's contents (or, when empty, removes what was there). */
async function commit() {
  // ⌘/Ctrl+Enter reaches the textarea, which `setBusy` leaves enabled, so a held
  // shortcut would otherwise stack round trips on top of each other.
  if (saving) return;
  if (!textarea || !anchor) return;
  const bead = anchor;
  const itemId = itemIdOf(bead);
  const visitorId = getVisitorId();
  if (itemId === null || !visitorId) return;

  const value = textarea.value.trim();
  if (value === (messages.get(itemId) ?? "")) {
    closePopover();
    return;
  }

  setError(null);
  setBusy(true);
  saving = true;
  const { data, error } = await actions.setReservationMessage({
    itemId,
    visitorId,
    message: value,
  });
  saving = false;

  // One panel serves every card, and clicking another bead re-anchors it while
  // this request is open — only the buttons were disabled, not the beads. If
  // that happened, the panel now belongs to a different reservation: its busy
  // state, its error line and its unsaved text are none of this write's
  // business. The bead and the cache still are, since both are keyed by item.
  const stillOurs = anchor === bead;
  if (stillOurs) setBusy(false);

  // Stay open on failure: the panel is holding text that exists nowhere else.
  if (error) {
    if (stillOurs) {
      setError(
        lang === "ru"
          ? "Не удалось сохранить. Попробуйте ещё раз."
          : "Couldn't save that. Try again.",
      );
    }
    return;
  }

  if (data.message) messages.set(itemId, data.message);
  else messages.delete(itemId);
  syncBead(bead);
  if (stillOurs) closePopover();
}

/* -------------------------------------------------------------------------
   Wiring
   ------------------------------------------------------------------------- */

export function initReservationMessages(initialLang: Lang): void {
  lang = initialLang;
  popover = document.getElementById("reservation-message");
  if (!popover) return;

  textarea = popover.querySelector(".message-popover-input");
  counter = popover.querySelector(".message-popover-count");
  errorLine = popover.querySelector(".message-popover-error");
  dismissBtn = popover.querySelector(".message-popover-dismiss");
  saveBtn = popover.querySelector(".message-popover-save");
  closeBtn = popover.querySelector(".message-popover-close");
  scrim = document.getElementById("reservation-message-scrim");

  sheetMedia = window.matchMedia(SHEET_QUERY);
  sheetMedia.addEventListener("change", () => {
    if (anchor) applyShape();
  });

  // Delegated: beads are hidden at render time and revealed later, and the grid
  // is rebuilt whenever a category filter runs.
  document.addEventListener("click", (event) => {
    const bead = (event.target as HTMLElement).closest<HTMLButtonElement>(
      ".message-btn",
    );
    if (bead) {
      event.preventDefault();
      if (anchor === bead) closePopover();
      else openPopover(bead);
      return;
    }

    // Anywhere else outside the panel dismisses it. The Reserve button is not
    // excluded: cancelling a reservation takes the message with it, and its own
    // handler closes this anyway.
    if (anchor && !popover!.contains(event.target as Node)) {
      closePopover({ restoreFocus: false });
    }
  });

  saveBtn?.addEventListener("click", commit);

  closeBtn?.addEventListener("click", () => closePopover());

  dismissBtn?.addEventListener("click", () => {
    const itemId = itemIdOf(anchor);
    const hasSaved = itemId !== null && !!messages.get(itemId);
    if (!hasSaved) {
      closePopover();
      return;
    }
    // "Delete" is "save an empty message" — same round trip, same rollback.
    if (textarea) textarea.value = "";
    void commit();
  });

  textarea?.addEventListener("input", () => {
    updateCounter();
    setError(null);
  });

  textarea?.addEventListener("keydown", (event) => {
    // ⌘/Ctrl+Enter saves; a bare Enter belongs to the textarea.
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void commit();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && anchor) {
      event.stopPropagation();
      closePopover();
    }
  });

  document.addEventListener("keydown", trapTab);
}

/** The language switcher fires while the popover may be open. */
export function setReservationMessagesLang(next: Lang): void {
  lang = next;
  document
    .querySelectorAll<HTMLButtonElement>(".message-btn")
    .forEach((bead) => syncBead(bead));
  syncDismissButton();
  if (textarea) {
    textarea.placeholder =
      (next === "ru"
        ? textarea.dataset.placeholderRu
        : textarea.dataset.placeholderEn) ?? "";
  }
}
