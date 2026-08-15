/**
 * The two orders a wishlist is ever shown in. The public page renders one, the
 * admin panel switches between both, and the admin page's SSR pass sorts with
 * the same comparator the panel will use the moment it hydrates — so the list
 * never rearranges itself under the owner's cursor.
 *
 * A module of its own rather than a corner of `@lib/wishlist`, because that one
 * reaches for `astro:env/server` and a React hook in the browser cannot import
 * it. Three copies of these comparators used to drift apart for exactly that
 * reason.
 */

/** What either comparator reads. Both the public and the admin item satisfy it. */
export type SortableItem = {
  id: number;
  received: boolean;
  weight: number;
  createdAt: Date;
};

/** Anything that can answer "is this item id reserved" — a Map or a Set will do. */
export type ReservedLookup = { has(id: number): boolean };

/**
 * What visitors see, in three tiers: things still going, then things somebody
 * has already claimed, then things already received. Inside each tier, the
 * order the owner dragged them into.
 *
 * The middle tier is the point. A visitor is here to pick something they can
 * actually buy, and a reserved card is one they cannot — so leaving it among
 * the live ones spends their attention on a dead end, and on a phone, where a
 * card is about a screen, a half-claimed list is thirty screens of dead ends
 * between the things they came for. Sinking them costs the owner nothing:
 * dragging still decides everything within a tier, and a cancelled reservation
 * puts the card straight back where it was.
 *
 * A factory now, like its sibling, and for the same reason: the reservation
 * lives outside the item. The public page happens to carry `isReserved` on
 * each row, but the admin panel's preview of this order does not — its
 * reservations are a Map beside the items — and a comparator that read a field
 * would have quietly sorted that preview as if nothing were reserved.
 *
 * `priority` is deliberately not consulted. It used to outrank `weight`, which
 * gave the list two ranking mechanisms fighting over one order: dragging writes
 * weights only, so a drag across a priority boundary saved without complaint and
 * then sprang back on the next load. Dragging is now the only thing that decides
 * order; priority survives as a label on the card.
 *
 * `createdAt` only breaks ties among items that share a weight, which in
 * practice means ones nobody has dragged yet — a new item is born above them all
 * (the create endpoint hands it the highest weight) and stays where it is put.
 */
export function comparePublic(
  reserved: ReservedLookup,
): (a: SortableItem, b: SortableItem) => number {
  return (a, b) => {
    if (a.received !== b.received) return a.received ? 1 : -1;
    // Only among things still wanted. A received item may well have carried a
    // reservation on its way here, and ordering the received tail by that would
    // rearrange it for a reason nobody looking at it can see.
    if (!a.received) {
      const aReserved = reserved.has(a.id);
      const bReserved = reserved.has(b.id);
      if (aReserved !== bReserved) return aReserved ? 1 : -1;
    }
    if (a.weight !== b.weight) return b.weight - a.weight;
    return b.createdAt.getTime() - a.createdAt.getTime();
  };
}

/**
 * The owner's working order, which is not about desirability at all: whatever
 * needs acting on floats up. Reserved items first, then the newest.
 *
 * A factory, unlike its sibling — the reservations live outside the item, so the
 * comparator has to be handed them: `items.sort(compareAdmin(reservations))`.
 */
export function compareAdmin(
  reserved: ReservedLookup,
): (a: SortableItem, b: SortableItem) => number {
  return (a, b) => {
    const aReserved = reserved.has(a.id);
    const bReserved = reserved.has(b.id);
    if (aReserved !== bReserved) return aReserved ? -1 : 1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  };
}
