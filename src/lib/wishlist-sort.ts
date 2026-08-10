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
 * What visitors see: things still wanted first, in the order the owner dragged
 * them into, and everything already received at the end.
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
export function comparePublic(a: SortableItem, b: SortableItem): number {
  if (a.received !== b.received) return a.received ? 1 : -1;
  if (a.weight !== b.weight) return b.weight - a.weight;
  return b.createdAt.getTime() - a.createdAt.getTime();
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
