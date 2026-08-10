import { expect, test } from "vitest";
import {
  insertionAt,
  isNoOpInsertion,
  applyMove,
  type CardBox,
} from "./grid-reorder";

/**
 * A grid of `columns` cards per row, each 100×100 with a 20px gutter — the
 * admin panel's own gap, at a size the arithmetic below stays readable in.
 * Card 0 spans x 0–100, card 1 spans 120–220, and so on; row 1 starts at y 120.
 */
function grid(count: number, columns: number): CardBox[] {
  return Array.from({ length: count }, (_, i) => {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const left = col * 120;
    const top = row * 120;
    return { left, right: left + 100, top, bottom: top + 100 };
  });
}

test("an empty grid takes its first item at the front", () => {
  expect(insertionAt([], 500, 500).index).toBe(0);
});

test("the left half of a card is the gap before it", () => {
  const boxes = grid(6, 3);
  expect(insertionAt(boxes, 130, 50).index).toBe(1);
});

test("the right half of a card is the gap after it", () => {
  const boxes = grid(6, 3);
  expect(insertionAt(boxes, 210, 50).index).toBe(2);
});

test("the gutter between two cards is the gap they share", () => {
  const boxes = grid(6, 3);
  expect(insertionAt(boxes, 110, 50).index).toBe(1);
});

/**
 * The bug the old per-card marker had: these are one gap, and the cursor near
 * either end of it has to name the same index. Card 2 ends row 0, card 3 opens
 * row 1, and index 3 is the gap between them whichever side you approach from.
 */
test("the end of a row and the start of the next are the same gap", () => {
  const boxes = grid(6, 3);
  // Past the right edge of card 2, which closes row 0 …
  expect(insertionAt(boxes, 350, 50).index).toBe(3);
  // … and before the left edge of card 3, which opens row 1. One gap, one index,
  // approached from opposite ends of the screen.
  expect(insertionAt(boxes, -10, 170).index).toBe(3);
});

/** …and the card and side it names are the end of that gap the cursor is at, so
    the beam can be drawn where the cursor is rather than a screen away. */
test("one gap is named at whichever end the cursor is at", () => {
  const boxes = grid(6, 3);
  expect(insertionAt(boxes, 350, 50)).toEqual({
    index: 3,
    card: 2,
    edge: "after",
  });
  expect(insertionAt(boxes, -10, 170)).toEqual({
    index: 3,
    card: 3,
    edge: "before",
  });
});

test("a cursor inside a row ignores the row above it", () => {
  const boxes = grid(6, 3);
  // Just inside row 1's band, over card 4. Card 1 sits directly above and is
  // barely further away in raw pixels; the row the cursor is *in* decides.
  expect(insertionAt(boxes, 130, 130).index).toBe(4);
});

/**
 * The case a flat nearest-edge search gets wrong. Six columns, a last row
 * holding two cards, and a cursor out in the empty tail of it: card 5 in the
 * row above shares its x exactly, so raw distance would drag the drop back up a
 * row instead of putting it at the end where the cursor plainly is.
 */
test("the empty tail of a half-filled last row is the end of the list", () => {
  const boxes = grid(8, 6);
  expect(insertionAt(boxes, 650, 170).index).toBe(8);
});

test("past the last card is the end of the list", () => {
  const boxes = grid(6, 3);
  expect(insertionAt(boxes, 400, 400).index).toBe(6);
});

/** Below the grid the beam still tracks the cursor's column rather than jumping
    to the end — the drop lands where it is drawn, which is the point. */
test("below the grid the column still decides", () => {
  const boxes = grid(6, 3);
  expect(insertionAt(boxes, 240, 400).index).toBe(5);
});

test("above the first row is the front of the list", () => {
  const boxes = grid(6, 3);
  expect(insertionAt(boxes, 10, -200).index).toBe(0);
});

test("a single column reads top to bottom", () => {
  const boxes = grid(3, 1);
  expect(insertionAt(boxes, 50, 10).index).toBe(0);
  expect(insertionAt(boxes, 50, 90).index).toBe(1);
  // The gutter between the first two cards is the gap they share.
  expect(insertionAt(boxes, 50, 110).index).toBe(1);
  expect(insertionAt(boxes, 50, 250).index).toBe(2);
  expect(insertionAt(boxes, 50, 400).index).toBe(3);
});

test("both gaps touching an item mean 'leave it alone'", () => {
  expect(isNoOpInsertion(2, 2)).toBe(true);
  expect(isNoOpInsertion(2, 3)).toBe(true);
  expect(isNoOpInsertion(2, 1)).toBe(false);
  expect(isNoOpInsertion(2, 4)).toBe(false);
});

test("moving forward accounts for the item leaving its own slot", () => {
  expect(applyMove(["a", "b", "c", "d"], 0, 3)).toEqual(["b", "c", "a", "d"]);
});

test("moving backward inserts at the gap as counted", () => {
  expect(applyMove(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]);
});

test("moving to the end", () => {
  expect(applyMove(["a", "b", "c"], 0, 3)).toEqual(["b", "c", "a"]);
});

test("moving to the front", () => {
  expect(applyMove(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
});

test("a move that changes nothing returns null", () => {
  expect(applyMove(["a", "b", "c"], 1, 1)).toBeNull();
  expect(applyMove(["a", "b", "c"], 1, 2)).toBeNull();
});

test("out-of-range indices return null rather than a mangled list", () => {
  expect(applyMove(["a", "b"], -1, 0)).toBeNull();
  expect(applyMove(["a", "b"], 2, 0)).toBeNull();
  expect(applyMove(["a", "b"], 0, 3)).toBeNull();
});

test("every gap is reachable and the list keeps its members", () => {
  const list = ["a", "b", "c", "d", "e"];
  for (let from = 0; from < list.length; from++) {
    for (let at = 0; at <= list.length; at++) {
      const moved = applyMove(list, from, at);
      if (moved === null) continue;
      expect([...moved].sort()).toEqual([...list].sort());
      expect(moved).toHaveLength(list.length);
    }
  }
});
