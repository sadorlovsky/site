// The id that identifies a visitor to the reservation endpoints. Minted by the
// inline script in WishlistPage.astro before anything else runs, so by the time
// a module reads it, it exists.
//
// Its own module because two of them need it — the reserve buttons and the
// message popover — and the popover is imported *by* the reserve-button module,
// so sharing it from there would be a cycle.

const VISITOR_ID_KEY = "wishlist-visitor-id";

export function getVisitorId(): string {
  return localStorage.getItem(VISITOR_ID_KEY) || "";
}

/**
 * True when that inline script had to mint the id rather than read one back.
 *
 * A visitor seeing this page for the first time holds no reservations, so the
 * server's guess — "taken" means "someone else's" — cannot be wrong about them,
 * and their buttons need not wait for the per-visitor fetch to confirm it.
 * Someone who cleared their storage lands here too, and the answer is still
 * right: their old id is gone, so the fetch would call those cards other's
 * anyway.
 */
export function isFirstVisit(): boolean {
  return document.documentElement.dataset.wishlistNewVisitor === "true";
}
