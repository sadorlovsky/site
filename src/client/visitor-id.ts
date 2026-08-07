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
