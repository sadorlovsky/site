/**
 * Where a drag would drop, in a grid that wraps.
 *
 * The admin panel lays its cards out in a CSS grid of one to six columns, and
 * the thing being dragged lands *between* two of them. That gap is the unit
 * this module works in: an insertion index in `0..list.length`, where `k` means
 * "before the item currently at k", and `list.length` means "at the very end".
 *
 * Working in gaps rather than in "this card, on its left or right side" is what
 * makes a wrapping grid behave. The end of one row and the start of the next
 * are the same gap — index k — even though they sit at opposite edges of the
 * screen, and a drop measured as a card plus a side has no way to say so. The
 * panel used to answer "after the last card of row 1" and "before the first
 * card of row 2" as two different drops, and drew them a screen apart.
 *
 * A module of its own, next to `@lib/wishlist-sort`, for the same reason that
 * one exists: this is arithmetic, it is easy to get subtly wrong exactly at the
 * row boundaries, and it is worth a test that doesn't need a browser.
 */

/** A card's box on the page. Page coordinates, not viewport ones — the page can
    scroll mid-drag, and these are measured once, when the drag begins. */
export type CardBox = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

/** Sub-pixel slack when deciding whether two cards share a row. */
const ROW_TOLERANCE = 1;

/** A run of boxes sharing a row, as a half-open range over the box array. */
type Row = { start: number; end: number; top: number; bottom: number };

/** How far outside `lo..hi` a value falls; zero anywhere inside it. */
function bandDistance(value: number, lo: number, hi: number): number {
  if (value < lo) return lo - value;
  if (value > hi) return value - hi;
  return 0;
}

/**
 * The rows, read straight off the boxes. A grid in its default flow lays cards
 * out in source order, so a row is simply a run of consecutive boxes sharing a
 * top edge — no need to know the column count, which is a media query's
 * business and changes four times between a phone and a wide monitor.
 */
function rowsOf(boxes: readonly CardBox[]): Row[] {
  const rows: Row[] = [];

  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i];
    const open = rows[rows.length - 1];

    if (open && Math.abs(box.top - open.top) <= ROW_TOLERANCE) {
      open.end = i + 1;
      open.bottom = Math.max(open.bottom, box.bottom);
    } else {
      rows.push({ start: i, end: i + 1, top: box.top, bottom: box.bottom });
    }
  }

  return rows;
}

/**
 * A gap, named twice over: `index` is where the item would land, and `card` +
 * `edge` are the side of the card the cursor is actually pointing at.
 *
 * Both, because one gap has two ends. The end of a row and the start of the
 * next are the same index, and a beam drawn only ever at the index — always the
 * left of the following card — leaps a screen's width away from the cursor the
 * moment it crosses a row boundary. `card`/`edge` say which end to draw it at,
 * which is the end the cursor is at. The drop is the same either way.
 */
export type Insertion = {
  index: number;
  card: number;
  edge: "before" | "after";
};

/**
 * The gap nearest to a point — for any point on the page, including the gutters
 * between cards and the empty space past the last one. That generality is half
 * the fix: the gutters belonged to no card, so an indicator driven by each
 * card's own `dragover` blinked out every time the cursor crossed one.
 *
 * The search is hierarchical rather than a single nearest-edge sweep, because a
 * grid is: pick the row the cursor is in (or nearest to), then the card within
 * it, then the side. A flat sweep gets the tail of a half-empty last row wrong
 * — the cursor sits in the last row's band with no card near it horizontally,
 * and the card directly above wins on raw distance, so dropping into the empty
 * space after the final card silently meant "back up into the previous row".
 */
export function insertionAt(
  boxes: readonly CardBox[],
  x: number,
  y: number,
): Insertion {
  if (boxes.length === 0) return { index: 0, card: 0, edge: "before" };

  const rows = rowsOf(boxes);

  // A single column carries no horizontal information: every card's left and
  // right edge is the same distance from the cursor, so the side has to be read
  // off y instead. Asked of the grid as a whole, not of one row — a six-column
  // grid whose last row holds one card still flows left to right.
  const stacked = rows.every((row) => row.end - row.start === 1);

  let row = rows[0];
  let rowDistance = Infinity;
  for (const candidate of rows) {
    const distance = bandDistance(y, candidate.top, candidate.bottom);
    if (distance < rowDistance) {
      rowDistance = distance;
      row = candidate;
    }
  }

  let index = row.start;
  let columnDistance = Infinity;
  for (let i = row.start; i < row.end; i++) {
    const distance = bandDistance(x, boxes[i].left, boxes[i].right);
    if (distance < columnDistance) {
      columnDistance = distance;
      index = i;
    }
  }

  const box = boxes[index];
  const past = stacked
    ? y > (box.top + box.bottom) / 2
    : x > (box.left + box.right) / 2;

  return {
    index: past ? index + 1 : index,
    card: index,
    edge: past ? "after" : "before",
  };
}

/**
 * Whether dropping at `insertAt` would put the item back where it already is.
 *
 * Two indices mean that, not one: the gap before an item and the gap after it
 * are both "don't move". The panel uses this to keep the beam off a drop that
 * would change nothing, so the feedback never promises a move it won't make.
 */
export function isNoOpInsertion(from: number, insertAt: number): boolean {
  return insertAt === from || insertAt === from + 1;
}

/**
 * The list with one item moved into a gap, or `null` if nothing would change.
 *
 * `insertAt` is counted against the list as it stands *now*, before the item is
 * lifted out — so once it has been removed, every gap past it has shifted down
 * by one.
 */
export function applyMove<T>(
  list: readonly T[],
  from: number,
  insertAt: number,
): T[] | null {
  if (from < 0 || from >= list.length) return null;
  if (insertAt < 0 || insertAt > list.length) return null;
  if (isNoOpInsertion(from, insertAt)) return null;

  const next = list.slice();
  const [moved] = next.splice(from, 1);
  next.splice(insertAt > from ? insertAt - 1 : insertAt, 0, moved);
  return next;
}
